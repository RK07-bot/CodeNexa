
import config from "../config/env.js";

export class AiError extends Error {
  constructor(message, { retryable = false } = {}) {
    super(message);
    this.retryable = retryable;
  }
}

const BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

const PRIMARY_MAX_ATTEMPTS = 3;
const FALLBACK_MAX_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 120_000;

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
    return "Gemini rejected the request";
  }

  if (status === 401 || status === 403) {
    return "The Gemini API key was rejected. Check GEMINI_API_KEY in the backend .env";
  }

  if (status === 404) {
    return "The Gemini model was not found. Check the model name in the backend .env";
  }

  return `Gemini responded with ${status}`;
};

// Extract JSON from Gemini response
const readAnswer = (data) => {
  const blocked = data.promptFeedback?.blockReason;

  if (blocked) {
    throw new AiError(
      `Gemini blocked the request (${blocked})`
    );
  }

  const candidate = data.candidates?.[0];

  if (!candidate) {
    throw new AiError("Gemini returned no answer", {
      retryable: true,
    });
  }

  const reason = candidate.finishReason;

  if (reason === "MAX_TOKENS") {
    throw new AiError("Gemini's answer was cut off", {
      retryable: true,
    });
  }

  if (
    reason &&
    reason !== "STOP" &&
    reason !== "FINISH_REASON_UNSPECIFIED"
  ) {
    throw new AiError(
      `Gemini stopped the answer (${reason})`
    );
  }

  const text = (candidate.content?.parts ?? [])
    .filter(
      (part) =>
        !part.thought && typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("");

  try {
    return JSON.parse(text);
  } catch {
    throw new AiError(
      "Gemini's answer was not valid JSON",
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
  retryDelayMs = 2000,
}) => {
  if (!isAiConfigured()) {
    throw new AiError(
      "AI drafting is not set up. Add GEMINI_API_KEY to the backend .env"
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
    (model, index, arr) =>
      model.name &&
      arr.findIndex((item) => item.name === model.name) === index
  );

  if (!models.length) {
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

    for (let attempt = 1; attempt <= model.attempts; attempt++) {
      if (attempt > 1) {
        const delay =
          retryDelayMs * 2 ** (attempt - 2);

        await sleep(delay);
      }

      try {
        const response = await fetch(
          `${BASE_URL}/${model.name}:generateContent`,
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

        // Retry rate limits and server errors
        if (
          response.status === 429 ||
          response.status >= 500
        ) {
          throw new AiError(
            `Gemini is busy (${response.status})`,
            { retryable: true }
          );
        }

        // Stop immediately for non-retryable HTTP errors
        if (!response.ok) {
          console.error(
            "Gemini error:",
            response.status,
            await response.text()
          );

          throw new AiError(
            explainStatus(response.status)
          );
        }

        let data;

        try {
          data = await response.json();
        } catch {
          throw new AiError(
            "Gemini returned an unreadable response",
            { retryable: true }
          );
        }

        const json = readAnswer(data);

        return {
          json,
          tokens:
            data.usageMetadata?.totalTokenCount ?? 0,
        };
      } catch (err) {
        if (err instanceof AiError) {
          lastError = err;

          if (!err.retryable) {
            throw err;
          }
        } else {
          console.error(
            "Gemini unreachable:",
            err.message
          );

          lastError = new AiError(
            "Gemini could not be reached",
            { retryable: true }
          );
        }

        console.warn(
          `${model.label} model attempt ${attempt}/${model.attempts} failed:`,
          lastError.message
        );
      }
    }

    // Primary model exhausted; move to fallback
    if (model.label === "Primary" &&
        models.length > 1) {
      console.warn(
        "Primary Gemini model failed. Switching to fallback model..."
      );
    }
  }

  throw lastError;
};
