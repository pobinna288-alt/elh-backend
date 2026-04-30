/**
 * El Hannora Email Service
 * Handles sending emails for password reset, verification, etc.
 * 
 * This is a stub implementation. In production, integrate with:
 * - SendGrid
 * - Mailgun
 * - AWS SES
 * - Nodemailer with SMTP
 */

// ============================================
// CONFIGURATION
// ============================================

const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || "noreply@elhannora.com",
  fromName: process.env.EMAIL_FROM_NAME || "El Hannora",
  frontendUrl: process.env.BASE_URL || process.env.FRONTEND_URL || ""
};

// ============================================
// SMTP TRANSPORT (optional – requires nodemailer + SMTP_HOST env var)
// ============================================

const SMTP_REQUIRED_ENV = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"];
let _smtpDisabledWarned = false;

const getMissingSmtpEnv = () =>
  SMTP_REQUIRED_ENV.filter((k) => !process.env[k]);

const warnSmtpDisabled = (missing = []) => {
  if (_smtpDisabledWarned) return;
  const suffix = missing.length > 0 ? ` Missing: ${missing.join(", ")}.` : "";
  console.warn(
    `[EmailService] SMTP not configured - email service disabled in MVP mode.${suffix}`
  );
  _smtpDisabledWarned = true;
};

/**
 * Validate SMTP configuration at startup without blocking process boot.
 * Returns an enabled/disabled state that callers can inspect if needed.
 */
const assertSmtpConfigured = () => {
  const missing = getMissingSmtpEnv();
  if (missing.length > 0) {
    warnSmtpDisabled(missing);
    return { enabled: false, missing };
  }
  return { enabled: true, missing: [] };
};

/**
 * Lazily create a nodemailer transporter when SMTP is fully configured.
 * In MVP mode, missing SMTP gracefully disables email without throwing.
 */
let _smtpTransporter = null;
const getSmtpTransporter = () => {
  if (_smtpTransporter) return _smtpTransporter;

  const missing = getMissingSmtpEnv();
  if (missing.length > 0) {
    warnSmtpDisabled(missing);
    return null;
  }

  try {
    // eslint-disable-next-line global-require
    const nodemailer = require("nodemailer");
    _smtpTransporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return _smtpTransporter;
  } catch (err) {
    const msg =
      "[EmailService] nodemailer not installed. " +
      "Run `npm install nodemailer` to enable SMTP delivery. " +
      `Error: ${err.message}`;
    warnSmtpDisabled();
    console.warn(msg);
    return null;
  }
};

/**
 * Low-level send helper shared by all email functions.
 *
 * - In production: sends via SMTP when configured, otherwise returns a
 *   disabled state without crashing the server.
 * - In development: logs to console when SMTP is not set up.
 */
const dispatchEmail = async ({ to, subject, html, text }) => {
  const transporter = getSmtpTransporter();

  if (transporter) {
    const info = await transporter.sendMail({
      from:    `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.from}>`,
      to,
      subject,
      text,
      html,
    });
    return { success: true, messageId: info.messageId, provider: "smtp" };
  }

  if (process.env.NODE_ENV === "production") {
    return {
      success: false,
      disabled: true,
      messageId: null,
      provider: "disabled",
    };
  }

  console.log("══════════════════════════════════════════");
  console.log(`📧  EMAIL (dev)  →  ${to}`);
  console.log(`    Subject : ${subject}`);
  if (text) console.log(text.trim());
  console.log("══════════════════════════════════════════");
  return { success: true, messageId: `dev-${Date.now()}`, provider: "console" };
};

// ============================================
// EMAIL TEMPLATES
// ============================================

const EMAIL_TEMPLATES = {
  otp: {
    subject: "Your El Hannora verification code",
    getHtml: (otp, expiryMinutes) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
    .container{max-width:600px;margin:0 auto;padding:20px}
    .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center}
    .header h1{color:white;margin:0}
    .content{padding:30px;background:#f9f9f9}
    .otp-box{font-size:36px;font-weight:bold;letter-spacing:8px;color:#667eea;
             background:#fff;border:2px solid #667eea;border-radius:8px;
             padding:20px;text-align:center;margin:20px 0}
    .warning{background:#fff3cd;padding:15px;border-radius:5px;margin:20px 0}
    .footer{padding:20px;text-align:center;color:#666;font-size:12px}
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>El Hannora</h1></div>
    <div class="content">
      <h2>Verify your email address</h2>
      <p>Use the code below to complete your sign-in. Do not share this code with anyone.</p>
      <div class="otp-box">${otp}</div>
      <div class="warning">
        <strong>This code expires in ${expiryMinutes} minutes.</strong><br>
        If you did not request this code, you can safely ignore this email.
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} El Hannora. All rights reserved.</p>
      <p>AI-Powered Ad Prediction Platform</p>
    </div>
  </div>
</body>
</html>
    `,
    getText: (otp, expiryMinutes) => `
Your El Hannora verification code is: ${otp}

This code is valid for ${expiryMinutes} minutes.
Do not share this code with anyone.

If you did not request this code, ignore this email.

© ${new Date().getFullYear()} El Hannora. All rights reserved.
    `.trim(),
  },
  passwordReset: {
    subject: "Reset Your El Hannora Password",
    getHtml: (userName, resetLink) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { padding: 30px; background: #f9f9f9; }
    .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    .warning { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>El Hannora</h1>
    </div>
    <div class="content">
      <h2>Hello ${userName},</h2>
      <p>We received a request to reset your password for your El Hannora account.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${resetLink}" class="button">Reset Password</a>
      <div class="warning">
        <strong>Important:</strong> This link will expire in 1 hour.
      </div>
      <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
      <p>If you're having trouble clicking the button, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} El Hannora. All rights reserved.</p>
      <p>AI-Powered Ad Prediction Platform</p>
    </div>
  </div>
</body>
</html>
    `,
    getText: (userName, resetLink) => `
Hello ${userName},

We received a request to reset your password for your El Hannora account.

Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

© ${new Date().getFullYear()} El Hannora. All rights reserved.
AI-Powered Ad Prediction Platform
    `
  },
  
  welcome: {
    subject: "Welcome to El Hannora!",
    getHtml: (userName, companyName) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { padding: 30px; background: #f9f9f9; }
    .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    .feature { display: flex; align-items: center; margin: 15px 0; }
    .feature-icon { font-size: 24px; margin-right: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to El Hannora!</h1>
    </div>
    <div class="content">
      <h2>Hello ${userName}!</h2>
      <p>Thank you for creating your account with El Hannora. Your workspace <strong>"${companyName}"</strong> is ready!</p>
      <h3>What you can do with El Hannora:</h3>
      <div class="feature">
        <span class="feature-icon">🤖</span>
        <span>AI-powered ad predictions to optimize your campaigns</span>
      </div>
      <div class="feature">
        <span class="feature-icon">📊</span>
        <span>Detailed analytics and performance insights</span>
      </div>
      <div class="feature">
        <span class="feature-icon">🎯</span>
        <span>Target audience recommendations</span>
      </div>
      <div class="feature">
        <span class="feature-icon">💡</span>
        <span>Creative suggestions to improve engagement</span>
      </div>
      <a href="${EMAIL_CONFIG.frontendUrl}" class="button">Get Started</a>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} El Hannora. All rights reserved.</p>
      <p>AI-Powered Ad Prediction Platform</p>
    </div>
  </div>
</body>
</html>
    `
  },
  
  passwordChanged: {
    subject: "Your El Hannora Password Has Been Changed",
    getHtml: (userName) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { padding: 30px; background: #f9f9f9; }
    .warning { background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #f5c6cb; }
    .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>El Hannora</h1>
    </div>
    <div class="content">
      <h2>Hello ${userName},</h2>
      <p>Your El Hannora password has been successfully changed.</p>
      <p>If you made this change, no further action is needed.</p>
      <div class="warning">
        <strong>Didn't make this change?</strong><br>
        If you did not reset your password, please contact our support team immediately as your account may have been compromised.
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} El Hannora. All rights reserved.</p>
      <p>AI-Powered Ad Prediction Platform</p>
    </div>
  </div>
</body>
</html>
    `
  }
};

// ============================================
// EMAIL SENDING FUNCTIONS
// ============================================

/**
 * Send password reset email
 * @param {string} to        - Recipient email
 * @param {string} userName  - Recipient name
 * @param {string} resetLink - Password reset link
 */
const sendPasswordResetEmail = async (to, userName, resetLink) => {
  const template = EMAIL_TEMPLATES.passwordReset;

  if (process.env.NODE_ENV !== "production") {
    console.log("════════════════════════════════════════");
    console.log("📧  PASSWORD RESET EMAIL (dev)");
    console.log(`    To: ${to}  |  Reset link: ${resetLink}`);
    console.log("════════════════════════════════════════");
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  return dispatchEmail({
    to,
    subject: template.subject,
    html:    template.getHtml(userName, resetLink),
    text:    template.getText(userName, resetLink),
  });
};

/**
 * Send welcome email
 * @param {string} to          - Recipient email
 * @param {string} userName    - Recipient name
 * @param {string} companyName - Company/workspace name
 */
const sendWelcomeEmail = async (to, userName, companyName) => {
  const template = EMAIL_TEMPLATES.welcome;

  if (process.env.NODE_ENV !== "production") {
    console.log("════════════════════════════════════════");
    console.log("📧  WELCOME EMAIL (dev)");
    console.log(`    To: ${to}  |  User: ${userName}  |  Company: ${companyName}`);
    console.log("════════════════════════════════════════");
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  return dispatchEmail({
    to,
    subject: template.subject,
    html:    template.getHtml(userName, companyName),
    text:    `Welcome to El Hannora, ${userName}! Your workspace "${companyName}" is ready.`,
  });
};

/**
 * Send password-changed notification email
 * @param {string} to       - Recipient email
 * @param {string} userName - Recipient name
 */
const sendPasswordChangedEmail = async (to, userName) => {
  const template = EMAIL_TEMPLATES.passwordChanged;

  if (process.env.NODE_ENV !== "production") {
    console.log("════════════════════════════════════════");
    console.log("📧  PASSWORD CHANGED EMAIL (dev)");
    console.log(`    To: ${to}`);
    console.log("════════════════════════════════════════");
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  return dispatchEmail({
    to,
    subject: template.subject,
    html:    template.getHtml(userName),
    text:    `Hello ${userName}, your El Hannora password has been changed.`,
  });
};

// ============================================
// OTP EMAIL
// ============================================

/**
 * Send a 6-digit OTP verification email.
 * @param {string} to            - Recipient email address
 * @param {string} otp           - Plain-text OTP (only passed to template; never stored)
 * @param {number} expiryMinutes - How long the code is valid
 */
const sendOtpEmail = async (to, otp, expiryMinutes = 10) => {
  const template = EMAIL_TEMPLATES.otp;

  if (process.env.NODE_ENV !== "production") {
    console.log("══════════════════════════════════════════");
    console.log("📧  OTP EMAIL (dev)");
    console.log(`    To      : ${to}`);
    console.log(`    Subject : ${template.subject}`);
    console.log(`    OTP     : ${otp}  (expires in ${expiryMinutes} min)`);
    console.log("══════════════════════════════════════════");
    return { success: true, messageId: `dev-${Date.now()}`, provider: "console" };
  }

  return dispatchEmail({
    to,
    subject: template.subject,
    html:    template.getHtml(otp, expiryMinutes),
    text:    template.getText(otp, expiryMinutes),
  });
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  EMAIL_CONFIG,
  EMAIL_TEMPLATES,
  assertSmtpConfigured,
  getSmtpTransporter,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendOtpEmail,
};
