import config from "../config/env.js";
import transporter from "../config/email.js";
import nodemailer from "nodemailer";

export const sendEmail = async ({email,subject,html}) => {
  try {
    const info = await transporter.sendMail({
      from:`"Authentication App" <${config.MAIL_USER}>` , // sender address
      to:email, // list of receivers
      subject, // Subject line
      html:html, // html body
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error("Error sending email:", error);

    throw new Error("Failed to send email");
  }
};
