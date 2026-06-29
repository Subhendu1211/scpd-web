const commonPasswords = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "password123",
  "admin123",
  "welcome123",
  "testingx",
]);

export const passwordPolicyMessage =
  "Password must be at least 12 characters and include uppercase, lowercase, number, and special character.";

export function validatePasswordPolicy(password: string) {
  const value = String(password || "").trim();
  if (value.length < 12) return passwordPolicyMessage;
  if (!/[a-z]/.test(value)) return passwordPolicyMessage;
  if (!/[A-Z]/.test(value)) return passwordPolicyMessage;
  if (!/[0-9]/.test(value)) return passwordPolicyMessage;
  if (!/[^A-Za-z0-9]/.test(value)) return passwordPolicyMessage;
  if (commonPasswords.has(value.toLowerCase())) {
    return "Password is too common. Choose a stronger password.";
  }
  return null;
}
