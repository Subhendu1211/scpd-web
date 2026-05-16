import http from "http";
import https from "https";
import nodemailer from "nodemailer";

const isProduction = process.env.NODE_ENV === "production";
const DEFAULT_REGISTRATION_SMS_CONTENT =
  "SCPD, Govt. of Odisha: Your registration on the SCPD Portal has been completed successfully. You may now login using your registered credentials to access services. For assistance call 0674-2954518.";
const DEFAULT_COMPLAINT_SMS_CONTENT =
  "SCPD, Govt. of Odisha: Your complaint has been successfully submitted on SCPD Portal. It will be reviewed and necessary action will be taken. For assistance call 0674-2954518.";
const DEFAULT_REGISTRATION_TEMPLATE_ID = "1007658595469878380";
const DEFAULT_COMPLAINT_TEMPLATE_ID = "1007977038878676392";

let emailTransport;

function cleanProviderValue(value) {
  return String(value || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "");
}

function normalizeDepartmentId(value) {
  const cleaned = cleanProviderValue(value);
  // Common confusion: "DO56002" (letter O) instead of "D056002" (zero).
  if (/^D[Oo]\d+$/i.test(cleaned)) {
    return `D0${cleaned.slice(2)}`;
  }
  return cleaned;
}

function isTruthy(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function maskPhoneForLog(phone) {
  const value = String(phone || "");
  if (!value) {
    return "";
  }
  if (value.length <= 4) {
    return value;
  }
  return `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
}

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

function normalizePhoneDigits(phone) {
  if (!phone) {
    return null;
  }
  const digits = String(phone).replace(/\D+/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  const forceCountryCode = ["1", "true", "yes", "on"].includes(
    String(process.env.GOVT_SMS_FORCE_COUNTRY_CODE || "")
      .trim()
      .toLowerCase(),
  );
  const stripCountryCode = !["0", "false", "no", "off"].includes(
    String(process.env.GOVT_SMS_STRIP_COUNTRY_CODE || "true")
      .trim()
      .toLowerCase(),
  );
  const countryCode = String(process.env.GOVT_SMS_COUNTRY_CODE || "91")
    .replace(/\D+/g, "")
    .trim();

  // For Indian DLT routes, 10-digit recipient numbers are often expected.
  // If a stored number has country code prefix (e.g. 91XXXXXXXXXX), strip it by default.
  if (
    !forceCountryCode &&
    stripCountryCode &&
    countryCode &&
    digits.length === countryCode.length + 10 &&
    digits.startsWith(countryCode)
  ) {
    return digits.slice(countryCode.length);
  }

  if (forceCountryCode && digits.length === 10) {
    if (!countryCode) {
      return digits;
    }
    return `${countryCode}${digits}`;
  }

  return digits;
}

export function isTwilioVerifyConfigured() {
  return (
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_VERIFY_SERVICE_SID
  );
}

export function isGovtSmsConfigured() {
  return (
    !!process.env.GOVT_SMS_SOURCE &&
    !!process.env.GOVT_SMS_DEPARTMENT_ID
  );
}

function buildGovtSmsContent(code) {
  const template =
    process.env.GOVT_SMS_OTP_CONTENT || "Your OTP for SCPD login is {#var#}.";
  const otp = String(code || "").trim();
  // Accept both legacy and tagged placeholder variants.
  // Examples: {#var#}, {# var #}, #numeric#, #number#
  const replaced = template
    .replace(/\{#\s*var\s*#\}/gi, otp)
    .replace(/#\s*numeric\s*#/gi, otp)
    .replace(/#\s*number\s*#/gi, otp);
  if (replaced !== template) {
    return replaced;
  }
  return `${template} ${otp}`.trim();
}

async function sendGovtSmsMessage({ destination, content, templateId, action }) {
  const source = cleanProviderValue(process.env.GOVT_SMS_SOURCE);
  const departmentId = normalizeDepartmentId(process.env.GOVT_SMS_DEPARTMENT_ID);
  const resolvedTemplateId = cleanProviderValue(templateId || process.env.GOVT_SMS_TEMPLATE_ID);
  const endpoint =
    process.env.GOVT_SMS_API_URL || "https://govtsms.odisha.gov.in/api/api.php";

  if (!source || !departmentId || !resolvedTemplateId) {
    throw new Error(
      "Govt SMS OTP is not configured. Set GOVT_SMS_SOURCE, GOVT_SMS_DEPARTMENT_ID, and GOVT_SMS_TEMPLATE_ID.",
    );
  }

  // Common setup mistake: template name is used in department field.
  if (departmentId.includes("_")) {
    throw new Error(
      "Invalid GOVT_SMS_DEPARTMENT_ID. It looks like a template name. Use the department ID like DO56002.",
    );
  }

  const phone = normalizePhoneDigits(destination);
  if (!phone) {
    throw new Error("Destination phone must contain a valid 10-15 digit number.");
  }

  const requestUrl = new URL(endpoint);
  const payload = new URLSearchParams({
    action: cleanProviderValue(action || "singleSMS"),
    source: String(source),
    department_id: String(departmentId),
    template_id: String(resolvedTemplateId),
    sms_content: String(content),
    phonenumber: phone,
  });
  if (
    /\{#\s*var\s*#\}/i.test(String(content)) ||
    /#\s*numeric\s*#/i.test(String(content)) ||
    /#\s*number\s*#/i.test(String(content))
  ) {
    throw new Error(
      "OTP placeholder was not replaced in GOVT_SMS_OTP_CONTENT. Ensure OTP token is mapped correctly.",
    );
  }
  const logMeta =
    `endpoint=${requestUrl.hostname}${requestUrl.pathname}` +
    ` action=${cleanProviderValue(action || "singleSMS")}` +
    ` source=${source}` +
    ` department_id=${departmentId}` +
    ` template_id=${resolvedTemplateId}` +
    ` phone=${maskPhoneForLog(phone)}` +
    ` phone_len=${String(phone).length}` +
    ` cc91=${String(phone).startsWith("91")}`;
  const debugGatewayLog = isTruthy(process.env.OTP_SMS_GATEWAY_DEBUG_LOG);

  await new Promise((resolve, reject) => {
    const transport = requestUrl.protocol === "http:" ? http : https;
    const request = transport.request(
      {
        method: "POST",
        hostname: requestUrl.hostname,
        port: requestUrl.port || undefined,
        path: `${requestUrl.pathname}${requestUrl.search || ""}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(payload.toString()),
        },
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          const statusCode = response.statusCode || "unknown";
          if (!(response.statusCode && response.statusCode >= 200 && response.statusCode < 300)) {
            console.error(
              `[GOVT_SMS] HTTP_ERROR ${logMeta} status=${statusCode} body=${body}`,
            );
            reject(
              new Error(`Govt SMS failed: ${statusCode} ${body}`),
            );
            return;
          }
          try {
            const parsed = JSON.parse(body || "{}");
            if (String(parsed.status) === "1") {
              if (debugGatewayLog) {
                console.info(`[GOVT_SMS] OK ${logMeta} status=${statusCode} body=${body}`);
              }
              resolve();
              return;
            }
            console.error(
              `[GOVT_SMS] PROVIDER_REJECT ${logMeta} status=${statusCode} body=${body}`,
            );
            reject(new Error(parsed.message || "Govt SMS provider rejected the OTP."));
          } catch {
            if (/Message Send Successfully/i.test(body)) {
              if (debugGatewayLog) {
                console.info(`[GOVT_SMS] OK ${logMeta} status=${statusCode} body=${body}`);
              }
              resolve();
              return;
            }
            console.error(
              `[GOVT_SMS] UNEXPECTED_RESPONSE ${logMeta} status=${statusCode} body=${body}`,
            );
            reject(new Error(`Govt SMS returned an unexpected response: ${body}`));
          }
        });
      },
    );

    request.on("error", (error) => {
      console.error(
        `[GOVT_SMS] NETWORK_ERROR ${logMeta} error=${error?.message || error}`,
      );
      reject(error);
    });
    request.write(payload.toString());
    request.end();
  });
}

async function sendGovtSmsOtp({ destination, code }) {
  const configuredAction = cleanProviderValue(
    process.env.GOVT_SMS_OTP_ACTION || "sendOTPSMS",
  );
  const sendBothActions = isTruthy(process.env.GOVT_SMS_OTP_SEND_BOTH_ACTIONS);
  const templateId =
    process.env.GOVT_SMS_OTP_TEMPLATE_ID || process.env.GOVT_SMS_TEMPLATE_ID;
  const content = buildGovtSmsContent(code);

  try {
    await sendGovtSmsMessage({
      destination,
      content,
      templateId,
      action: configuredAction,
    });
    if (sendBothActions) {
      const backupAction =
        configuredAction.toLowerCase() === "sendotpsms" ? "singleSMS" : "sendOTPSMS";
      try {
        await sendGovtSmsMessage({
          destination,
          content,
          templateId,
          action: backupAction,
        });
        console.info(
          `[GOVT_SMS] Dual-route OTP enabled. Sent backup via action=${backupAction}.`,
        );
      } catch (backupError) {
        console.warn(
          `[GOVT_SMS] Dual-route backup action failed. action=${backupAction} reason=${backupError?.message || backupError}`,
        );
      }
    }
  } catch (error) {
    // Many setups accept OTP text only via singleSMS even when sendOTPSMS is configured.
    if (configuredAction.toLowerCase() === "singlesms") {
      throw error;
    }
    console.warn(
      `[GOVT_SMS] OTP action ${configuredAction} failed, retrying with singleSMS. reason=${error?.message || error}`,
    );
    await sendGovtSmsMessage({
      destination,
      content,
      templateId,
      action: "singleSMS",
    });
  }
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
  await sendEmailMessage({
    to: destination,
    subject: "Your SCPD CMS one-time password",
    text: `Use this one-time password to continue: ${code}\nThis code expires in ${process.env.ADMIN_RESET_OTP_EXPIRY_MINUTES || 10} minutes.`,
    strictInProduction: true,
  });
}

async function sendEmailMessage({ to, subject, text, strictInProduction = false }) {
  const transport = getEmailTransport();
  if (!transport) {
    if (strictInProduction && isProduction) {
      throw new Error("Email OTP delivery is not configured (set SMTP_HOST and SMTP_FROM)");
    }
    console.info(`[EMAIL] to=${to} subject="${subject}" text="${text}"`);
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
  });
}

export async function sendAdminOtp({ channel, destination, code, purpose }) {
  if (!channel || !destination || !code) {
    throw new Error("OTP delivery requires channel, destination, and code");
  }

  if (channel === "sms") {
    if (isGovtSmsConfigured()) {
      await sendGovtSmsOtp({ destination, code });
      return;
    }

    if (isTwilioVerifyConfigured()) {
      await sendTwilioVerifyOtp({ destination });
      return;
    }

    if (isProduction) {
      throw new Error(
        "SMS OTP delivery is not configured. Set GOVT_SMS_* or TWILIO_* settings.",
      );
    }

    const allowDevPreview = isTruthy(process.env.OTP_SMS_DEV_LOG_ONLY);
    if (allowDevPreview) {
      console.info(
        `[${purpose || "otp"}] ${formatPreviewMessage({ channel, destination, code })}`,
      );
      return;
    }

    throw new Error(
      "SMS OTP delivery is not configured. Set GOVT_SMS_* or TWILIO_* settings. For local-only preview mode, set OTP_SMS_DEV_LOG_ONLY=true.",
    );
  }

  if (channel === "email") {
    await sendEmailOtp({ destination, code });
    return;
  }

  throw new Error("Unsupported OTP channel: " + String(channel));
}

export async function sendPasswordResetOtp({ channel, destination, code }) {
  await sendAdminOtp({
    channel,
    destination,
    code,
    purpose: "password_reset",
  });
}

export async function sendPortalRegistrationNotification({ email, phone, fullName }) {
  const smsText = process.env.GOVT_SMS_REGISTRATION_CONTENT || DEFAULT_REGISTRATION_SMS_CONTENT;
  const smsTemplateId =
    process.env.GOVT_SMS_REGISTRATION_TEMPLATE_ID ||
    process.env.GOVT_SMS_TEMPLATE_ID ||
    DEFAULT_REGISTRATION_TEMPLATE_ID;

  const jobs = [];
  if (phone) {
    jobs.push(
      sendGovtSmsMessage({
        destination: phone,
        content: smsText,
        templateId: smsTemplateId,
        action: process.env.GOVT_SMS_DEFAULT_ACTION || "singleSMS",
      }),
    );
  }
  if (email) {
    jobs.push(
      sendEmailMessage({
        to: email,
        subject: "SCPD Registration Successful",
        text: `Dear ${fullName || "User"}, your registration on SCPD Portal has been completed successfully.`,
      }),
    );
  }
  await Promise.allSettled(jobs);
}

export async function sendPortalComplaintNotification({ email, phone, fullName }) {
  const smsText = process.env.GOVT_SMS_COMPLAINT_CONTENT || DEFAULT_COMPLAINT_SMS_CONTENT;
  const smsTemplateId =
    process.env.GOVT_SMS_COMPLAINT_TEMPLATE_ID ||
    process.env.GOVT_SMS_TEMPLATE_ID ||
    DEFAULT_COMPLAINT_TEMPLATE_ID;

  const jobs = [];
  if (phone) {
    jobs.push(
      sendGovtSmsMessage({
        destination: phone,
        content: smsText,
        templateId: smsTemplateId,
        action: process.env.GOVT_SMS_DEFAULT_ACTION || "singleSMS",
      }),
    );
  }
  if (email) {
    jobs.push(
      sendEmailMessage({
        to: email,
        subject: "SCPD Complaint Submitted",
        text: `Dear ${fullName || "User"}, your complaint has been submitted successfully on SCPD Portal.`,
      }),
    );
  }
  await Promise.allSettled(jobs);
}
