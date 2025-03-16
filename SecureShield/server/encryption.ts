import { 
  randomBytes, 
  createCipheriv, 
  createDecipheriv, 
  publicEncrypt, 
  privateDecrypt,
  generateKeyPairSync,
  createHash,
  createECDH,
  createSign,
  createVerify,
  ECDH
} from 'crypto';
import { storage } from './storage';
import { EncryptionKey, InsertEncryptionKey } from '@shared/schema';

// Supported encryption algorithms
export const ALGORITHMS = {
  AES_256_CBC: 'aes-256-cbc',
  AES_128_CBC: 'aes-128-cbc',
  RSA_2048: 'rsa-2048',
  ECC_P256: 'ecc-p256'
};

// Master key for encrypting stored keys (in a real application, this would be securely stored)
const MASTER_KEY = process.env.MASTER_KEY || randomBytes(32).toString('hex');
const MASTER_IV = process.env.MASTER_IV || randomBytes(16).toString('hex');

// Encrypt data using AES
export function encryptAES(data: string, key: Buffer, iv: Buffer): { encrypted: string, iv: string } {
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encrypted,
    iv: iv.toString('hex')
  };
}

// Decrypt data using AES
export function decryptAES(encrypted: string, key: Buffer, iv: Buffer): string {
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Encrypt data using RSA
export function encryptRSA(data: string, publicKey: string): string {
  const buffer = Buffer.from(data, 'utf8');
  const encrypted = publicEncrypt({
    key: publicKey,
    padding: 1 // RSA_PKCS1_PADDING
  }, buffer);
  return encrypted.toString('hex');
}

// Decrypt data using RSA
export function decryptRSA(data: string, privateKey: string): string {
  const buffer = Buffer.from(data, 'hex');
  const decrypted = privateDecrypt({
    key: privateKey,
    padding: 1 // RSA_PKCS1_PADDING
  }, buffer);
  return decrypted.toString('utf8');
}

// Sign data using ECC (ECDSA)
export function signECC(data: string, privateKey: string): string {
  const sign = createSign('SHA256');
  sign.update(data);
  sign.end();
  const signature = sign.sign(privateKey, 'hex');
  return signature;
}

// Verify signature using ECC (ECDSA)
export function verifyECC(data: string, signature: string, publicKey: string): boolean {
  const verify = createVerify('SHA256');
  verify.update(data);
  verify.end();
  return verify.verify(publicKey, signature, 'hex');
}

// Encrypt data using hybrid approach with ECC and AES
// This combines ECDH key exchange with AES symmetric encryption
export function encryptWithECC(data: string, publicKey: string): string {
  try {
    // Generate temporary ECDH key pair
    const ecdh = createECDH('prime256v1');
    ecdh.generateKeys();
    
    // Use ECDH to create a shared secret with the public key
    const sharedSecret = deriveSharedSecretFromPublicKey(ecdh, publicKey);
    
    // Use the shared secret to encrypt with AES
    const iv = randomBytes(16);
    const aesKey = createHash('sha256').update(sharedSecret).digest();
    const result = encryptAES(data, aesKey, iv);
    
    // Format as: ephemeralPublicKey:iv:encrypted
    const ephemeralPublicKey = ecdh.getPublicKey().toString('hex');
    return `${ephemeralPublicKey}:${result.iv}:${result.encrypted}`;
  } catch (error) {
    console.error('Error in ECC encryption:', error);
    throw new Error(`ECC encryption failed: ${(error as Error).message}`);
  }
}

// Decrypt data using ECC and AES
export function decryptWithECC(encryptedData: string, privateKey: string): string {
  try {
    if (!encryptedData || !encryptedData.includes(':')) {
      throw new Error('Invalid encrypted data format for ECC decryption');
    }
    
    // Parse the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error(`Expected 3 parts in encrypted data (ephemeralPublicKey:iv:encrypted), got ${parts.length}`);
    }
    
    const [ephemeralPublicKeyHex, ivHex, encrypted] = parts;
    
    // Recreate ECDH with the private key
    const ecdh = createECDH('prime256v1');
    
    // Load the private key (need to convert PEM format to raw private key)
    const privateKeyObj = loadECPrivateKey(privateKey);
    ecdh.setPrivateKey(privateKeyObj.privateKey);
    
    // Derive the same shared secret using the ephemeral public key
    const ephemeralPublicKey = Buffer.from(ephemeralPublicKeyHex, 'hex');
    const sharedSecret = ecdh.computeSecret(ephemeralPublicKey);
    
    // Use the shared secret to decrypt with AES
    const aesKey = createHash('sha256').update(sharedSecret).digest();
    const iv = Buffer.from(ivHex, 'hex');
    
    return decryptAES(encrypted, aesKey, iv);
  } catch (error) {
    console.error('Error in ECC decryption:', error);
    throw new Error(`ECC decryption failed: ${(error as Error).message}`);
  }
}

// Helper function to derive a shared secret from a public key in PEM format
function deriveSharedSecretFromPublicKey(ecdh: ECDH, publicKeyPem: string): Buffer {
  // Extract the public key from PEM format
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  let pemContents = publicKeyPem.substring(
    publicKeyPem.indexOf(pemHeader) + pemHeader.length,
    publicKeyPem.indexOf(pemFooter)
  ).replace(/\n/g, '');
  
  // Decode the base64 content
  const derBuffer = Buffer.from(pemContents, 'base64');
  
  // Skip the ASN.1 structure to get just the public key point
  // Note: This is a simplified approach - a proper implementation would parse the ASN.1
  const publicKeyPoint = extractPublicKeyFromDER(derBuffer);
  
  // Compute the shared secret
  return ecdh.computeSecret(publicKeyPoint);
}

// Extract public key point from DER encoded key
function extractPublicKeyFromDER(derBuffer: Buffer): Buffer {
  // This is a simplified implementation
  // In practice, you'd use a proper ASN.1 parser
  // For prime256v1, the public key point is typically at the end of the buffer
  // Skip the ASN.1 header and get the point
  // The actual offset depends on the DER structure, which can vary
  
  // For demonstration purposes, we'll use a library or extract it manually
  // This implementation assumes a specific structure for prime256v1 keys
  // A real implementation should handle different key formats properly
  
  // In many cases, the public key point starts at byte 26 for SPKI format keys
  // But this is not guaranteed for all keys and formats
  try {
    // Look for the bit string tag (0x03) followed by the length and a zero byte
    let offset = 0;
    while (offset < derBuffer.length) {
      if (derBuffer[offset] === 0x03) { // bit string tag
        // Skip tag, length, and unused bits byte
        offset += 2; // Skip the tag and length byte
        offset += 1; // Skip the unused bits byte (should be 0x00)
        
        // The rest should be the public key point (with 0x04 prefix for uncompressed point)
        return derBuffer.slice(offset);
      }
      offset++;
    }
    
    // If we couldn't find the key format we expected, try a different approach
    // For some formats, the key may be close to the end
    return derBuffer.slice(derBuffer.length - 65); // Uncompressed point is 65 bytes
  } catch (error) {
    throw new Error(`Failed to extract public key from DER: ${error.message}`);
  }
}

// Helper function to load an EC private key from PEM format
function loadECPrivateKey(privateKeyPem: string): { privateKey: Buffer } {
  // Extract the private key from PEM format
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  let pemContents = privateKeyPem.substring(
    privateKeyPem.indexOf(pemHeader) + pemHeader.length,
    privateKeyPem.indexOf(pemFooter)
  ).replace(/\n/g, '');
  
  // Decode the base64 content
  const derBuffer = Buffer.from(pemContents, 'base64');
  
  // Extract the private key value
  // This is a simplified approach - a proper implementation would parse the ASN.1
  const privateKey = extractPrivateKeyFromDER(derBuffer);
  
  return { privateKey };
}

// Extract private key from DER encoded key
function extractPrivateKeyFromDER(derBuffer: Buffer): Buffer {
  // This is a simplified implementation
  // In practice, you'd use a proper ASN.1 parser
  
  try {
    // For PKCS8 encoded EC private keys, the private key is inside an octet string
    // Look for the octet string tag (0x04) followed by the length
    let offset = 0;
    while (offset < derBuffer.length) {
      if (derBuffer[offset] === 0x04) { // octet string tag
        offset++; // Move past the tag
        
        // Get the length - might be complex if the length is more than 127 bytes
        let length = derBuffer[offset];
        offset++;
        
        // If the high bit is set, the length field is multi-byte
        if (length & 0x80) {
          const lengthBytes = length & 0x7F;
          length = 0;
          for (let i = 0; i < lengthBytes; i++) {
            length = (length << 8) | derBuffer[offset];
            offset++;
          }
        }
        
        // Check if this is a private key (typically 32 bytes for P-256)
        if (length === 32) {
          return derBuffer.slice(offset, offset + length);
        }
        
        // Skip this octet string
        offset += length;
      } else {
        offset++;
      }
    }
    
    // If we can't find the private key through the above method,
    // make an educated guess based on key size
    // For P-256, the private key is typically 32 bytes
    for (let i = 0; i < derBuffer.length - 32; i++) {
      // Look for a length byte indicating 32 bytes followed by 32 bytes of data
      if (derBuffer[i] === 0x20) { // 32 in hex
        return derBuffer.slice(i + 1, i + 33);
      }
    }
    
    throw new Error('Could not find private key in DER encoding');
  } catch (error) {
    throw new Error(`Failed to extract private key from DER: ${error.message}`);
  }
}

// Generate an encryption key based on algorithm
export async function generateKey(
  userId: number,
  name: string,
  algorithm: string
): Promise<EncryptionKey> {
  let keyData: any;
  const keyId = `K-${Date.now()}-${randomBytes(4).toString('hex')}`;
  
  switch (algorithm) {
    case ALGORITHMS.AES_256_CBC:
      keyData = {
        key: randomBytes(32).toString('hex') // 256 bits
      };
      break;
    case ALGORITHMS.AES_128_CBC:
      keyData = {
        key: randomBytes(16).toString('hex') // 128 bits
      };
      break;
    case ALGORITHMS.RSA_2048:
      const rsaKeys = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      keyData = {
        publicKey: rsaKeys.publicKey,
        privateKey: rsaKeys.privateKey
      };
      break;
    case ALGORITHMS.ECC_P256:
      const ecKeys = generateKeyPairSync('ec', {
        namedCurve: 'prime256v1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      keyData = {
        publicKey: ecKeys.publicKey,
        privateKey: ecKeys.privateKey
      };
      break;
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
  
  // Encrypt the key data with the master key
  const iv = randomBytes(16);
  const keyDataStr = JSON.stringify(keyData);
  const { encrypted } = encryptAES(keyDataStr, Buffer.from(MASTER_KEY, 'hex'), iv);
  
  // Store the key in the database
  const keyRecord: InsertEncryptionKey = {
    name,
    userId,
    keyId,
    algorithm,
    keyData: encrypted,
    iv: iv.toString('hex'),
    status: 'active',
    expiresAt: null
  };
  
  return await storage.createKey(keyRecord);
}

// Retrieve and decrypt a key for use
export async function getDecryptedKey(keyId: number): Promise<any> {
  const key = await storage.getKey(keyId);
  if (!key) {
    throw new Error('Key not found');
  }
  
  if (key.status !== 'active') {
    throw new Error(`Key is not active (status: ${key.status})`);
  }
  
  // Decrypt the key data
  const iv = Buffer.from(key.iv, 'hex');
  const decrypted = decryptAES(key.keyData, Buffer.from(MASTER_KEY, 'hex'), iv);
  
  // Update the last used timestamp
  await storage.updateKey(key.id, { lastUsed: new Date() });
  
  return JSON.parse(decrypted);
}

// Import anomaly detection
import { detectAnomalies, recordAnomaly } from './anomaly-detection';

// Encrypt data with a specific key
export async function encryptData(
  userId: number,
  data: string,
  keyId: number,
  resourceName: string = 'text'
): Promise<{ encrypted: string, status: string }> {
  try {
    const key = await storage.getKey(keyId);
    if (!key) {
      throw new Error('Key not found');
    }
    
    const keyData = await getDecryptedKey(keyId);
    let encrypted: string;
    
    switch (key.algorithm) {
      case ALGORITHMS.AES_256_CBC:
      case ALGORITHMS.AES_128_CBC: {
        const iv = randomBytes(16);
        const result = encryptAES(data, Buffer.from(keyData.key, 'hex'), iv);
        encrypted = `${result.iv}:${result.encrypted}`;
        break;
      }
      case ALGORITHMS.RSA_2048:
        encrypted = encryptRSA(data, keyData.publicKey);
        break;
      case ALGORITHMS.ECC_P256:
        encrypted = encryptWithECC(data, keyData.publicKey);
        break;
      default:
        throw new Error(`Unsupported algorithm: ${key.algorithm}`);
    }
    
    // Record the operation
    await storage.recordOperation({
      userId,
      keyId: key.id,
      operation: 'encrypt',
      algorithm: key.algorithm,
      resourceName,
      status: 'success'
    });
    
    // Record in audit logs
    await storage.recordAuditLog({
      userId,
      action: 'DATA_ENCRYPT',
      resource: resourceName,
      status: 'SUCCESS',
      ipAddress: null,
      userAgent: null,
      details: { algorithm: key.algorithm, keyId: key.keyId }
    });
    
    // Run anomaly detection (async, doesn't block the response)
    detectAnomalies(userId).then(anomaly => {
      if (anomaly && anomaly.detected) {
        recordAnomaly(anomaly).catch(err => 
          console.error('Error recording anomaly:', err)
        );
      }
    }).catch(err => console.error('Error in anomaly detection:', err));
    
    return { encrypted, status: 'success' };
  } catch (error) {
    // Record failed encryption
    await storage.recordAuditLog({
      userId,
      action: 'DATA_ENCRYPT',
      resource: resourceName,
      status: 'FAILED',
      ipAddress: null,
      userAgent: null,
      details: { error: (error as Error).message }
    });
    
    // Run anomaly detection for failed operations too
    detectAnomalies(userId).then(anomaly => {
      if (anomaly && anomaly.detected) {
        recordAnomaly(anomaly).catch(err => 
          console.error('Error recording anomaly:', err)
        );
      }
    }).catch(err => console.error('Error in anomaly detection:', err));
    
    throw error;
  }
}

// Decrypt data with a specific key
export async function decryptData(
  userId: number,
  encryptedData: string,
  keyId: number,
  resourceName: string = 'text'
): Promise<{ decrypted: string, status: string }> {
  try {
    const key = await storage.getKey(keyId);
    if (!key) {
      throw new Error('Key not found');
    }
    
    const keyData = await getDecryptedKey(keyId);
    let decrypted: string;
    
    switch (key.algorithm) {
      case ALGORITHMS.AES_256_CBC:
      case ALGORITHMS.AES_128_CBC: {
        const [ivHex, encrypted] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        decrypted = decryptAES(encrypted, Buffer.from(keyData.key, 'hex'), iv);
        break;
      }
      case ALGORITHMS.RSA_2048:
        decrypted = decryptRSA(encryptedData, keyData.privateKey);
        break;
      case ALGORITHMS.ECC_P256:
        decrypted = decryptWithECC(encryptedData, keyData.privateKey);
        break;
      default:
        throw new Error(`Unsupported algorithm: ${key.algorithm}`);
    }
    
    // Record the operation
    await storage.recordOperation({
      userId,
      keyId: key.id,
      operation: 'decrypt',
      algorithm: key.algorithm,
      resourceName,
      status: 'success'
    });
    
    // Record in audit logs
    await storage.recordAuditLog({
      userId,
      action: 'DATA_DECRYPT',
      resource: resourceName,
      status: 'SUCCESS',
      ipAddress: null,
      userAgent: null,
      details: { algorithm: key.algorithm, keyId: key.keyId }
    });
    
    // Run anomaly detection (async, doesn't block the response)
    detectAnomalies(userId).then(anomaly => {
      if (anomaly && anomaly.detected) {
        recordAnomaly(anomaly).catch(err => 
          console.error('Error recording anomaly:', err)
        );
      }
    }).catch(err => console.error('Error in anomaly detection:', err));
    
    return { decrypted, status: 'success' };
  } catch (error) {
    // Record failed decryption
    await storage.recordAuditLog({
      userId,
      action: 'DATA_DECRYPT',
      resource: resourceName,
      status: 'FAILED',
      ipAddress: null,
      userAgent: null,
      details: { error: (error as Error).message }
    });
    
    // Run anomaly detection for failed operations too
    detectAnomalies(userId).then(anomaly => {
      if (anomaly && anomaly.detected) {
        recordAnomaly(anomaly).catch(err => 
          console.error('Error recording anomaly:', err)
        );
      }
    }).catch(err => console.error('Error in anomaly detection:', err));
    
    throw error;
  }
}

// Revoke a key
export async function revokeKey(userId: number, keyId: number): Promise<void> {
  const key = await storage.getKey(keyId);
  if (!key) {
    throw new Error('Key not found');
  }
  
  // Update key status to revoked
  await storage.updateKey(keyId, { status: 'revoked' });
  
  // Record in audit logs
  await storage.recordAuditLog({
    userId,
    action: 'KEY_REVOKE',
    resource: key.keyId,
    status: 'SUCCESS',
    ipAddress: null,
    userAgent: null,
    details: { keyName: key.name }
  });
}

// Generate a key backup
export async function generateKeyBackup(userId: number): Promise<{ backup: string }> {
  const keys = await storage.getUserKeys(userId);
  if (keys.length === 0) {
    throw new Error('No keys found for backup');
  }
  
  const backupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    keys: keys.map(key => ({
      keyId: key.keyId,
      name: key.name,
      algorithm: key.algorithm,
      status: key.status,
      createdAt: key.createdAt,
      keyData: key.keyData,
      iv: key.iv
    }))
  };
  
  // Encrypt the backup with the master key
  const iv = randomBytes(16);
  const { encrypted } = encryptAES(JSON.stringify(backupData), Buffer.from(MASTER_KEY, 'hex'), iv);
  const backup = `${iv.toString('hex')}:${encrypted}`;
  
  // Record in audit logs
  await storage.recordAuditLog({
    userId,
    action: 'KEY_BACKUP',
    resource: 'key-backup',
    status: 'SUCCESS',
    ipAddress: null,
    userAgent: null,
    details: { keyCount: keys.length }
  });
  
  return { backup };
}

// Restore keys from a backup
export async function restoreKeyBackup(
  userId: number,
  backup: string
): Promise<{ restored: number }> {
  try {
    const [ivHex, encrypted] = backup.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    // Decrypt the backup
    const decrypted = decryptAES(encrypted, Buffer.from(MASTER_KEY, 'hex'), iv);
    const backupData = JSON.parse(decrypted);
    
    if (!backupData.keys || !Array.isArray(backupData.keys)) {
      throw new Error('Invalid backup format');
    }
    
    let restoredCount = 0;
    
    // Restore each key
    for (const keyData of backupData.keys) {
      const existingKey = await storage.getKeyByKeyId(keyData.keyId);
      
      if (!existingKey) {
        await storage.createKey({
          userId,
          keyId: keyData.keyId,
          name: keyData.name,
          algorithm: keyData.algorithm,
          keyData: keyData.keyData,
          iv: keyData.iv,
          status: keyData.status,
          expiresAt: null
        });
        restoredCount++;
      }
    }
    
    // Record in audit logs
    await storage.recordAuditLog({
      userId,
      action: 'KEY_RESTORE',
      resource: 'key-backup',
      status: 'SUCCESS',
      ipAddress: null,
      userAgent: null,
      details: { restoredCount }
    });
    
    return { restored: restoredCount };
  } catch (error) {
    // Record in audit logs
    await storage.recordAuditLog({
      userId,
      action: 'KEY_RESTORE',
      resource: 'key-backup',
      status: 'FAILED',
      ipAddress: null,
      userAgent: null,
      details: { error: (error as Error).message }
    });
    
    throw error;
  }
}
