import nodemailer from "nodemailer";
import config from "./env.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.MAIL_USER,
    pass: config.MAIL_PASS,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Error connecting to email server:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

export default transporter;