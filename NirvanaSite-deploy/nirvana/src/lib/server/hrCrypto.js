import crypto from "node:crypto";

function encryptionKey() {
  const configured = process.env.HR_DATA_ENCRYPTION_KEY || "";
  let key;
  if (/^[a-f0-9]{64}$/i.test(configured)) key = Buffer.from(configured, "hex");
  else key = Buffer.from(configured, "base64");
  if (key.length !== 32) {
    const error = new Error("HR_DATA_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex key.");
    error.status = 503;
    throw error;
  }
  return key;
}

export function encryptBankPayload(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return {
    encrypted_payload: ciphertext.toString("base64"),
    encryption_iv: iv.toString("base64"),
    encryption_tag: cipher.getAuthTag().toString("base64"),
    key_version: 1,
  };
}

export function decryptBankPayload(row) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(row.encryption_iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(row.encryption_tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(row.encrypted_payload, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8"));
}

export function lastFour(value) {
  const normalized = String(value || "").replace(/\s+/g, "");
  return normalized ? normalized.slice(-4).padStart(4, "•") : null;
}
