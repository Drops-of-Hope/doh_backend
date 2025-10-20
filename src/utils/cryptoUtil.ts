import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
} from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

// Get encryption key from environment or use default for development
const ENCRYPTION_KEY =
  process.env.HEALTH_VITALS_ENCRYPTION_KEY || "default-dev-key-32-characters!!";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Derives a cryptographic key from the base encryption key using scrypt
 */
async function deriveKey(salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(ENCRYPTION_KEY, salt, 32)) as Buffer;
}

/**
 * Encrypts sensitive numeric data using AES-256-GCM
 * @param value - The numeric value to encrypt
 * @returns Base64 encoded encrypted data with IV, salt, and auth tag
 */
export async function encryptHealthVital(value: number): Promise<string> {
  try {
    const iv = randomBytes(IV_LENGTH);
    const salt = randomBytes(SALT_LENGTH);
    const key = await deriveKey(salt);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    const valueString = value.toString();
    let encrypted = cipher.update(valueString, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Combine salt + iv + authTag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, "hex"),
    ]);

    return combined.toString("base64");
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt health vital data");
  }
}

/**
 * Decrypts sensitive numeric data using AES-256-GCM
 * @param encryptedData - Base64 encoded encrypted data
 * @returns The original numeric value
 */
export async function decryptHealthVital(
  encryptedData: string
): Promise<number> {
  try {
    const combined = Buffer.from(encryptedData, "base64");

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = await deriveKey(salt);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    const value = parseFloat(decrypted);
    if (isNaN(value)) {
      throw new Error("Decrypted value is not a valid number");
    }

    return value;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt health vital data");
  }
}

/**
 * Encrypts an object with health vital data
 */
export async function encryptHealthVitalData(data: {
  weight: number;
  bp: number;
  cvsPulse: number;
}): Promise<{
  weight: string;
  bp: string;
  cvsPulse: string;
}> {
  return {
    weight: await encryptHealthVital(data.weight),
    bp: await encryptHealthVital(data.bp),
    cvsPulse: await encryptHealthVital(data.cvsPulse),
  };
}

/**
 * Decrypts an object with encrypted health vital data
 */
export async function decryptHealthVitalData(encryptedData: {
  weight: string;
  bp: string;
  cvsPulse: string;
}): Promise<{
  weight: number;
  bp: number;
  cvsPulse: number;
}> {
  return {
    weight: await decryptHealthVital(encryptedData.weight),
    bp: await decryptHealthVital(encryptedData.bp),
    cvsPulse: await decryptHealthVital(encryptedData.cvsPulse),
  };
}
