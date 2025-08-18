import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || randomBytes(32).toString("base64");
if (!process.env.ENCRYPTION_KEY) {
  console.warn(
    "ENCRYPTION_KEY not found in environment variables. Using random key (messages will not persist across restarts)"
  );
}

export function encrypt(text: string): { encryptedData: string; iv: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(ENCRYPTION_KEY, "base64"),
    iv
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  const encryptedData = encrypted + authTag.toString("hex");

  return {
    encryptedData,
    iv: iv.toString("hex"),
  };
}

export function decrypt(encryptedData: string, iv: string): string {
  try {
    const authTag = Buffer.from(encryptedData.slice(-32), "hex");
    const encrypted = encryptedData.slice(0, -32);

    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(ENCRYPTION_KEY, "base64"),
      Buffer.from(iv, "hex")
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt message");
  }
}
