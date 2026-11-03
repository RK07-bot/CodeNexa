
import config from "../config/env.js";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export const sendEmail = async ({ email, subject, html }) => {
  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": config.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: config.BREVO_SENDER_NAME,
          email: config.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email,
          },
        ],
        subject,
        htmlContent: html,
      }),
    });

    const responseText = await response.text();

    let responseData = {};

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = {};
    }

    if (!response.ok) {
      const errorMessage =
        responseData.message ||
        responseData.code ||
        `HTTP ${response.status}`;

      throw new Error(`Brevo API request failed: ${errorMessage}`);
    }

    console.log(
      "Email accepted by Brevo:",
      responseData.messageId || "Message ID unavailable"
    );

    return responseData;
  } catch (error) {
    console.error("Error sending email through Brevo:", error.message);

    throw new Error("Failed to send email through Brevo", {
      cause: error,
    });
  }
};
