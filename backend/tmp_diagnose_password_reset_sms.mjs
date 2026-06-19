import { pool } from "./src/models/db.js";
import {
  isGovtSmsConfigured,
  isTwilioVerifyConfigured,
} from "./src/services/notificationService.js";

function maskTail(value) {
  const text = String(value || "");
  if (!text) return null;
  return `${"*".repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
}

function maskEmail(value) {
  const text = String(value || "");
  const at = text.indexOf("@");
  if (at <= 0) return null;
  return `${text[0]}***${text.slice(at)}`;
}

const resets = await pool.query(`
  SELECT
    r.id,
    r.delivery_channel,
    r.destination,
    r.created_at,
    r.expires_at,
    r.consumed_at,
    r.attempts,
    u.email
  FROM admin_password_resets r
  JOIN admin_users u ON u.id = r.admin_user_id
  ORDER BY r.created_at DESC
  LIMIT 8
`);

const logs = await pool.query(
  `
    SELECT id, action, details, created_at
    FROM admin_user_logs
    WHERE action LIKE $1
    ORDER BY created_at DESC
    LIMIT 8
  `,
  ["admin_user.password_reset.%"],
);

const otpContent = String(process.env.GOVT_SMS_OTP_CONTENT || "");

console.log(
  JSON.stringify(
    {
      notificationConfig: {
        govtSmsConfigured: isGovtSmsConfigured(),
        twilioVerifyConfigured: isTwilioVerifyConfigured(),
        otpAction: process.env.GOVT_SMS_OTP_ACTION || null,
        sendBothActions: process.env.GOVT_SMS_OTP_SEND_BOTH_ACTIONS || null,
        gatewayDebugLog: process.env.OTP_SMS_GATEWAY_DEBUG_LOG || null,
        otpContentLength: otpContent.length,
        otpContentContainsNewline: otpContent.includes("\n"),
      },
      latestResets: resets.rows.map((row) => ({
        id: row.id,
        channel: row.delivery_channel,
        destination: maskTail(row.destination),
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        consumedAt: row.consumed_at,
        attempts: row.attempts,
        email: maskEmail(row.email),
      })),
      latestLogs: logs.rows,
    },
    null,
    2,
  ),
);

await pool.end();
