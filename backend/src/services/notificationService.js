import https from "https";
import nodemailer from "nodemailer";

const isProduction = process.env.NODE_ENV === "production";

let emailTransport;

function formatPreviewMessage({ channel, destination, code }) {
  const target = channel === "sms" ? `SMS:${destination}` : `EMAIL:${destination}`;
  return `[OTP] ${target} -> ${code}`;
}

function normalizeE164(phone) {
  if (!phone) {
    return null;
  }
  const raw = String(phone).trim();
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D+/g, "");
  if (!digits) {
    return null;
  }

  // If local 10-digit number is provided, prepend default country code.
  // Example: 7735416582 -> +917735416582 when TWILIO_DEFAULT_COUNTRY_CODE=91.
  if (!hasPlus && digits.length === 10) {
    const defaultCountryCode = String(process.env.TWILIO_DEFAULT_COUNTRY_CODE || "91").replace(/\D+/g, "");
    if (!defaultCountryCode) {
      return null;
    }
    const full = `${defaultCountryCode}${digits}`;
    if (full.length < 11 || full.length > 15) {
      return null;
    }
    return `+${full}`;
  }

  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  return `+${digits}`;
}

export function isTwilioVerifyConfigured() {
  return (
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_VERIFY_SERVICE_SID
  );
}

async function sendTwilioVerifyOtp({ destination }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    throw new Error("Twilio Verify is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.");
  }

  const to = normalizeE164(destination);
  if (!to) {
    throw new Error("Destination phone must contain a valid 10-15 digit number.");
  }

  const payload = new URLSearchParams({
    To: to,
    Channel: "sms"
  });

  await new Promise((resolve, reject) => {
    const request = https.request(
      {
        method: "POST",
        hostname: "verify.twilio.com",
        path: `/v2/Services/${serviceSid}/Verifications`,
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(payload.toString())
        }
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve();
            return;
          }
          reject(new Error(`Twilio SMS failed: ${response.statusCode || "unknown"} ${body}`));
        });
      }
    );

    request.on("error", (error) => {
      reject(error);
    });
    request.write(payload.toString());
    request.end();
  });
}

export async function verifyTwilioOtp({ destination, code }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    return false;
  }

  const to = normalizeE164(destination);
  if (!to || !code) {
    return false;
  }

  const payload = new URLSearchParams({
    To: to,
    Code: String(code).trim()
  });

  return await new Promise((resolve) => {
    const request = https.request(
      {
        method: "POST",
        hostname: "verify.twilio.com",
        path: `/v2/Services/${serviceSid}/VerificationCheck`,
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(payload.toString())
        }
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (!(response.statusCode && response.statusCode >= 200 && response.statusCode < 300)) {
            resolve(false);
            return;
          }
          try {
            const parsed = JSON.parse(body || "{}");
            resolve(parsed.status === "approved" || parsed.valid === true);
          } catch {
            resolve(false);
          }
        });
      }
    );

    request.on("error", () => resolve(false));
    request.write(payload.toString());
    request.end();
  });
}

function getEmailTransport() {
  if (emailTransport) return emailTransport;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !from) {
    return null;
  }

  emailTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined
  });

  return emailTransport;
}

async function sendEmailOtp({ destination, code }) {
  const transport = getEmailTransport();
  if (!transport) {
    if (isProduction) {
      throw new Error("Email OTP delivery is not configured (set SMTP_HOST and SMTP_FROM)");
    }
    console.info(formatPreviewMessage({ channel: "email", destination, code }));
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: destination,
    subject: "Your CMS password reset code",
    text: `Use this code to reset your CMS password: ${code}\nThis code expires in ${process.env.ADMIN_RESET_OTP_EXPIRY_MINUTES || 10} minutes.`
  });
}

export async function sendPasswordResetOtp({ channel, destination, code }) {
  if (!channel || !destination || !code) {
    throw new Error("OTP delivery requires channel, destination, and code");
  }

  if (channel === "sms") {
    if (isTwilioVerifyConfigured()) {
      await sendTwilioVerifyOtp({ destination });
      return;
    }

    if (isProduction) {
      throw new Error("Password reset OTP delivery is not configured");
    }

    // Non-production: log preview and return
    console.info(formatPreviewMessage({ channel, destination, code }));
    return;
  }

  if (channel === "email") {
    await sendEmailOtp({ destination, code });
    return;
  }

  throw new Error("Unsupported OTP channel: " + String(channel));
}
