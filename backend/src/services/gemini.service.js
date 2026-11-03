import config from "../config/env.js";

export class AiError extends Error {
  constructor(message, { retryable = false, retryAfterMs = null } = {}) {
    super(message);
    this.name = "AiError";
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

const BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Retry configuration
const PRIMARY_MAX_ATTEMPTS = 2;
const FALLBACK_MAX_ATTEMPTS = 2;

const REQUEST_TIMEOUT_MS = 120_000;
const MAX_BACKOFF_MS = 15_000;
const MAX_RETRY_AFTER_MS = 60_000;

const RETRYABLE_HTTP_STATUSES = new Set([
  408,
  429,
  500,
  502,
  503,
  504,
]);

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const isAiConfigured = () =>
  Boolean(config.GEMINI_API_KEY);

// Gemini response schema builders
export const schema = {
  string: (description) => ({
    type: "STRING",
    ...(description && { description }),
  }),

  integer: (description) => ({
    type: "INTEGER",
    ...(description && { description }),
  }),

  oneOf: (values) => ({
    type: "STRING",
    enum: values,
  }),

  array: (items, description) => ({
    type: "ARRAY",
    items,
    ...(description && { description }),
  }),

  object: (properties) => ({
    type: "OBJECT",
    properties,
    required: Object.keys(properties),
    propertyOrdering: Object.keys(properties),
  }),
};

// Explain Gemini HTTP errors
const explainStatus = (status) => {
  if (status === 400) {
    return "Gemini rejected the request. Check the request schema and parameters.";
  }

  if (status === 401 || status === 403) {
    return "Gemini rejected the API key or its permissions. Check GEMINI_API_KEY.";
  }

  if (status === 404) {
    return "The Gemini model or endpoint was not found. Check the configured model name.";
  }

  if (status === 429) {
    return "Gemini rate or quota limit reached";
  }

  if (status === 503) {
    return "Gemini is temporarily overloaded or unavailable";
  }

  if (status >= 500) {
    return "Gemini encountered a server error";
  }

  return `Gemini responded with HTTP ${status}`;
};

// Extract useful error details from Gemini's response
const extractApiError = (rawBody) => {
  if (!rawBody) return "";

  try {
    const parsed = JSON.parse(rawBody);

    return (
      parsed?.error?.message ||
      parsed?.message ||
      rawBody.slice(0, 500)
    );
  } catch {
    return rawBody.slice(0, 500);
  }
};

// Read Retry-After header
const parseRetryAfter = (value) => {
  if (!value) return null;

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(
      seconds * 1000,
      MAX_RETRY_AFTER_MS
    );
  }

  const date = Date.parse(value);

  if (Number.isNaN(date)) {
    return null;
  }

  return Math.min(
    Math.max(0, date - Date.now()),
    MAX_RETRY_AFTER_MS
  );
};

// Exponential backoff with jitter
const getRetryDelay = (error, attempt, retryDelayMs) => {
  if (
    error.retryAfterMs !== null &&
    error.retryAfterMs !== undefined
  ) {
    return error.retryAfterMs;
  }

  const exponentialDelay = Math.min(
    retryDelayMs * 2 ** (attempt - 1),
    MAX_BACKOFF_MS
  );

  // Prevent multiple jobs from retrying simultaneously.
  const jitter = Math.floor(Math.random() * 500);

  return exponentialDelay + jitter;
};

// Extract JSON from Gemini response
const readAnswer = (data) => {
  const blocked = data.promptFeedback?.blockReason;

  if (blocked) {
    throw new AiError(
      `Gemini blocked the request (${blocked}).`
    );
  }

  const candidate = data.candidates?.[0];

  if (!candidate) {
    throw new AiError(
      "Gemini returned no answer.",
      { retryable: true }
    );
  }

  const reason = candidate.finishReason;

  if (reason === "MAX_TOKENS") {
    throw new AiError(
      "Gemini's answer was cut off by the output-token limit.",
      { retryable: true }
    );
  }

  if (
    reason &&
    reason !== "STOP" &&
    reason !== "FINISH_REASON_UNSPECIFIED"
  ) {
    throw new AiError(
      `Gemini stopped the answer (${reason}).`
    );
  }

  const answerText = (
    candidate.content?.parts ?? []
  )
    .filter(
      (part) =>
        !part.thought &&
        typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("");

  try {
    return JSON.parse(answerText);
  } catch {
    throw new AiError(
      "Gemini returned an empty or invalid JSON answer.",
      { retryable: true }
    );
  }
};

// Generate JSON using primary and fallback models
export const generateJson = async ({
  system,
  prompt,
  responseSchema,
  temperature = 0.4,
  maxOutputTokens = 16384,
  retryDelayMs = 1500,
}) => {
  if (!isAiConfigured()) {
    throw new AiError(
      "AI drafting is not configured. Add GEMINI_API_KEY to the backend environment."
    );
  }

  const models = [
    {
      name: config.GEMINI_MODEL,
      attempts: PRIMARY_MAX_ATTEMPTS,
      label: "Primary",
    },
    {
      name: config.GEMINI_FALLBACK_MODEL,
      attempts: FALLBACK_MAX_ATTEMPTS,
      label: "Fallback",
    },
  ].filter(
    (model, index, allModels) =>
      model.name &&
      allModels.findIndex(
        (item) => item.name === model.name
      ) === index
  );

  if (models.length === 0) {
    throw new AiError(
      "No Gemini model is configured."
    );
  }

  const body = {
    systemInstruction: {
      parts: [{ text: system }],
    },

    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],

    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature,
      maxOutputTokens,
    },
  };

  let lastError;

  for (const model of models) {
    console.log(
      `Using ${model.label} Gemini model: ${model.name}`
    );

    for (
      let attempt = 1;
      attempt <= model.attempts;
      attempt++
    ) {
      try {
        const response = await fetch(
          `${BASE_URL}/${encodeURIComponent(model.name)}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": config.GEMINI_API_KEY,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(
              REQUEST_TIMEOUT_MS
            ),
          }
        );

        // Handle unsuccessful HTTP responses
        if (!response.ok) {
          const rawError = await response.text();

          const detail = extractApiError(rawError);

          const retryable = RETRYABLE_HTTP_STATUSES.has(
            response.status
          );

          throw new AiError(
            `${explainStatus(response.status)} (${response.status})${
              detail ? `: ${detail}` : "."
            }`,
            {
              retryable,
              retryAfterMs: retryable
                ? parseRetryAfter(
                    response.headers.get("retry-after")
                  )
                : null,
            }
          );
        }

        // Parse successful response
        const rawBody = await response.text();

        let data;

        try {
          data = JSON.parse(rawBody);
        } catch {
          throw new AiError(
            "Gemini returned an unreadable response body.",
            { retryable: true }
          );
        }

        const json = readAnswer(data);

        return {
          json,
          tokens:
            data.usageMetadata?.totalTokenCount ?? 0,
        };
      } catch (error) {
        if (error instanceof AiError) {
          lastError = error;
        } else if (
          error?.name === "TimeoutError" ||
          error?.name === "AbortError"
        ) {
          lastError = new AiError(
            `Gemini request timed out after ${
              REQUEST_TIMEOUT_MS / 1000
            } seconds.`,
            { retryable: true }
          );
        } else {
          lastError = new AiError(
            `Gemini network request failed: ${
              error?.message || "Unknown network error"
            }.`,
            { retryable: true }
          );
        }

        console.warn(
          `${model.label} model attempt ${attempt}/${model.attempts} failed: ${lastError.message}`
        );

        // Do not retry permanent errors such as invalid API keys.
        if (!lastError.retryable) {
          throw lastError;
        }

        // Retry only when attempts remain.
        if (attempt < model.attempts) {
          const delay = getRetryDelay(
            lastError,
            attempt,
            retryDelayMs
          );

          console.warn(
            `Retrying ${model.label} Gemini model in ${delay} ms.`
          );

          await sleep(delay);
        }
      }
    }

    // Switch to fallback after primary retries are exhausted.
    if (
      model.label === "Primary" &&
      models.length > 1
    ) {
      console.warn(
        `Primary Gemini model exhausted its retries. Switching to fallback model: ${models[1].name}`
      );
    }
  }

  throw (
    lastError ||
    new AiError(
      "Gemini generation failed for all configured models."
    )
  );
};