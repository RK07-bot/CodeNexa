export const getVerifyEmailHtml = ({ email, token,username }) => {

  const appName = process.env.APP_NAME || "CodeNexa";
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verifyUrl = `${baseUrl.replace(/\/+$/, "")}/token/${encodeURIComponent(token)}`;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verify Email</title>
</head>

<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:10px;border:1px solid #e5e7eb;overflow:hidden;">

<tr>
<td
style="background:#111827;color:#ffffff;padding:20px;text-align:center;font-size:22px;font-weight:bold;">
${appName}
</td>
</tr>

<tr>
<td style="padding:35px;">

<h2 style="margin:0 0 20px;color:#111827;">
Verify your account
</h2>

<p style="font-size:16px;color:#444;line-height:1.6;">
Hello <strong>${username}</strong>,
</p>

<p style="font-size:16px;color:#444;line-height:1.6;">
Thank you for registering with <strong>${appName}</strong>.
Please click the button below to verify your email address.
</p>

<table cellpadding="0" cellspacing="0" align="center" style="margin:30px auto;">
<tr>
<td bgcolor="#111827" style="border-radius:6px;">
<a href="${verifyUrl}"
style="
display:inline-block;
padding:14px 28px;
color:#ffffff;
text-decoration:none;
font-size:16px;
font-weight:bold;
">
Verify Email
</a>
</td>
</tr>
</table>

<p style="font-size:14px;color:#666;">
If the button doesn't work, copy and paste this link into your browser:
</p>

<p style="word-break:break-all;">
<a href="${verifyUrl}" style="color:#2563eb;">
${verifyUrl}
</a>
</p>

<p style="font-size:14px;color:#666;">
If you didn't create this account, you can safely ignore this email.
</p>

</td>
</tr>

<tr>
<td
style="padding:20px;text-align:center;background:#f9fafb;font-size:12px;color:#888;">
© ${new Date().getFullYear()} ${appName}. All rights reserved.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};

export const getOtpHtml = ({ email, otp }) => {
  const appName = process.env.APP_NAME || "CodeNexa";

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OTP Verification</title>
</head>

<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:10px;border:1px solid #e5e7eb;overflow:hidden;">

<!-- Header -->
<tr>
<td style="background:#111827;color:#ffffff;padding:20px;text-align:center;font-size:22px;font-weight:bold;">
${appName}
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:35px;">

<h2 style="margin:0 0 20px;color:#111827;">
Verify Your Email
</h2>

<p style="font-size:16px;color:#444;line-height:1.6;margin:0 0 20px;">
Hello,
</p>

<p style="font-size:16px;color:#444;line-height:1.6;margin:0 0 20px;">
Use the verification code below to complete your sign-in for
<strong>${appName}</strong>.
</p>

<p style="font-size:15px;color:#666;margin-bottom:10px;">
Email:
<strong>${email}</strong>
</p>

<!-- OTP Box -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
<tr>
<td align="center">

<span
style="
display:inline-block;
background:#f3f4f6;
border:1px solid #d1d5db;
border-radius:10px;
padding:18px 28px;
font-size:34px;
font-weight:bold;
letter-spacing:10px;
color:#111827;
font-family:Courier New, monospace;
">
${otp}
</span>

</td>
</tr>
</table>

<p style="font-size:15px;color:#444;line-height:1.6;">
This verification code will expire in
<strong>5 minutes</strong>.
</p>

<p style="font-size:15px;color:#444;line-height:1.6;">
If you didn't request this code, you can safely ignore this email.
</p>

</td>
</tr>

<!-- Footer -->
<tr>
<td
style="padding:20px;text-align:center;background:#f9fafb;font-size:12px;color:#888;">
© ${new Date().getFullYear()} ${appName}. All rights reserved.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};