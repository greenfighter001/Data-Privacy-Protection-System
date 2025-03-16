import { 
  users, User, InsertUser, 
  encryptionKeys, EncryptionKey, InsertEncryptionKey,
  encryptionOperations, EncryptionOperation, InsertEncryptionOperation,
  auditLogs, AuditLog, InsertAuditLog
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Define a type for the session store
type SessionStoreType = ReturnType<typeof createMemoryStore> extends new (...args: any[]) => infer R ? R : never;

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  
  // Key operations
  createKey(key: InsertEncryptionKey): Promise<EncryptionKey>;
  getKey(id: number): Promise<EncryptionKey | undefined>;
  getKeyByKeyId(keyId: string): Promise<EncryptionKey | undefined>;
  getUserKeys(userId: number): Promise<EncryptionKey[]>;
  updateKey(id: number, keyData: Partial<EncryptionKey>): Promise<EncryptionKey | undefined>;
  
  // Encryption operations
  recordOperation(operation: InsertEncryptionOperation): Promise<EncryptionOperation>;
  getOperationsByUser(userId: number, limit?: number): Promise<EncryptionOperation[]>;
  
  // Audit logs
  recordAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: Partial<AuditLog>, limit?: number, offset?: number): Promise<AuditLog[]>;
  countAuditLogs(filters?: Partial<AuditLog>): Promise<number>;
  
  // Session store
  sessionStore: SessionStoreType;
}

export class MemStorage implements IStorage {
  private usersStore: Map<number, User>;
  private usernameIndex: Map<string, number>;
  private emailIndex: Map<string, number>;
  private keysStore: Map<number, EncryptionKey>;
  private keyIdIndex: Map<string, number>;
  private operationsStore: Map<number, EncryptionOperation>;
  private auditLogsStore: Map<number, AuditLog>;
  private userIdCounter: number;
  private keyIdCounter: number;
  private operationIdCounter: number;
  private auditLogIdCounter: number;
  sessionStore: SessionStoreType;

  constructor() {
    this.usersStore = new Map();
    this.usernameIndex = new Map();
    this.emailIndex = new Map();
    this.keysStore = new Map();
    this.keyIdIndex = new Map();
    this.operationsStore = new Map();
    this.auditLogsStore = new Map();
    this.userIdCounter = 1;
    this.keyIdCounter = 1;
    this.operationIdCounter = 1;
    this.auditLogIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // One day in milliseconds
    });
    
    // Create default admin user
    this.createUser({
      username: "admin",
      email: "admin@example.com",
      password: "$2b$10$DEuGJZlFWCT.HJw/UDGk2OLLHfZlV3dLZTpDG87UlMbKl5NOsIh5.",  // "password"
      fullName: "System Administrator",
      role: "admin",
      status: "active"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.usersStore.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const userId = this.usernameIndex.get(username);
    if (userId) {
      return this.usersStore.get(userId);
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const userId = this.emailIndex.get(email);
    if (userId) {
      return this.usersStore.get(userId);
    }
    return undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    
    // Ensure required fields
    const role = userData.role || 'user';
    const status = userData.status || 'active';
    
    const user: User = {
      ...userData,
      role,
      status,
      id,
      createdAt: now,
      lastLogin: null
    };
    
    this.usersStore.set(id, user);
    this.usernameIndex.set(user.username, id);
    this.emailIndex.set(user.email, id);
    
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.usersStore.get(id);
    
    if (!existingUser) {
      return undefined;
    }
    
    // Handle username and email changes for indices
    if (userData.username && userData.username !== existingUser.username) {
      this.usernameIndex.delete(existingUser.username);
      this.usernameIndex.set(userData.username, id);
    }
    
    if (userData.email && userData.email !== existingUser.email) {
      this.emailIndex.delete(existingUser.email);
      this.emailIndex.set(userData.email, id);
    }
    
    const updatedUser: User = {
      ...existingUser,
      ...userData
    };
    
    this.usersStore.set(id, updatedUser);
    
    return updatedUser;
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.usersStore.values());
  }

  // Key operations
  async createKey(keyData: InsertEncryptionKey): Promise<EncryptionKey> {
    const id = this.keyIdCounter++;
    const now = new Date();
    
    // Ensure required fields
    const status = keyData.status || 'active';
    
    const key: EncryptionKey = {
      ...keyData,
      status,
      id,
      createdAt: now,
      updatedAt: now,
      lastUsed: null,
      expiresAt: keyData.expiresAt || null
    };
    
    this.keysStore.set(id, key);
    this.keyIdIndex.set(key.keyId, id);
    
    return key;
  }

  async getKey(id: number): Promise<EncryptionKey | undefined> {
    return this.keysStore.get(id);
  }

  async getKeyByKeyId(keyId: string): Promise<EncryptionKey | undefined> {
    const id = this.keyIdIndex.get(keyId);
    if (id) {
      return this.keysStore.get(id);
    }
    return undefined;
  }

  async getUserKeys(userId: number): Promise<EncryptionKey[]> {
    return Array.from(this.keysStore.values())
      .filter(key => key.userId === userId);
  }

  async updateKey(id: number, keyData: Partial<EncryptionKey>): Promise<EncryptionKey | undefined> {
    const existingKey = this.keysStore.get(id);
    
    if (!existingKey) {
      return undefined;
    }
    
    // Handle keyId changes for index
    if (keyData.keyId && keyData.keyId !== existingKey.keyId) {
      this.keyIdIndex.delete(existingKey.keyId);
      this.keyIdIndex.set(keyData.keyId, id);
    }
    
    const updatedKey: EncryptionKey = {
      ...existingKey,
      ...keyData,
      updatedAt: new Date()
    };
    
    this.keysStore.set(id, updatedKey);
    
    return updatedKey;
  }

  // Encryption operations
  async recordOperation(operationData: InsertEncryptionOperation): Promise<EncryptionOperation> {
    const id = this.operationIdCounter++;
    
    // Ensure required fields
    const keyId = operationData.keyId !== undefined ? operationData.keyId : null;
    const resourceName = operationData.resourceName !== undefined ? operationData.resourceName : null;
    
    const operation: EncryptionOperation = {
      ...operationData,
      keyId,
      resourceName,
      id,
      timestamp: new Date()
    };
    
    this.operationsStore.set(id, operation);
    
    return operation;
  }

  async getOperationsByUser(userId: number, limit = 10): Promise<EncryptionOperation[]> {
    return Array.from(this.operationsStore.values())
      .filter(op => op.userId === userId)
      .sort((a, b) => {
        // Safe null handling
        const timeA = a.timestamp ? a.timestamp.getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, limit);
  }

  // Audit logs
  async recordAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const id = this.auditLogIdCounter++;
    
    // Ensure required fields
    const userId = logData.userId !== undefined ? logData.userId : null;
    const resource = logData.resource !== undefined ? logData.resource : null;
    const ipAddress = logData.ipAddress !== undefined ? logData.ipAddress : null;
    const userAgent = logData.userAgent !== undefined ? logData.userAgent : null;
    const details = logData.details || {};
    
    const log: AuditLog = {
      ...logData,
      userId,
      resource,
      ipAddress,
      userAgent,
      details,
      id,
      timestamp: new Date()
    };
    
    this.auditLogsStore.set(id, log);
    
    return log;
  }

  async getAuditLogs(filters: Partial<AuditLog> = {}, limit = 100, offset = 0): Promise<AuditLog[]> {
    const logs = Array.from(this.auditLogsStore.values())
      .filter(log => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === undefined) return true;
          return log[key as keyof AuditLog] === value;
        });
      })
      .sort((a, b) => {
        // Safe null handling
        const timeA = a.timestamp ? a.timestamp.getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.getTime() : 0;
        return timeB - timeA;
      });
    
    return logs.slice(offset, offset + limit);
  }

  async countAuditLogs(filters: Partial<AuditLog> = {}): Promise<number> {
    return (await this.getAuditLogs(filters, Number.MAX_SAFE_INTEGER)).length;
  }
}

export const storage = new MemStorage();
