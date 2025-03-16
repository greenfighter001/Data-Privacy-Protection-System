import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema with role-based access control
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("user"), // admin, manager, user
  status: text("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

// Encryption keys
export const encryptionKeys = pgTable("encryption_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  keyId: text("key_id").notNull().unique(),
  algorithm: text("algorithm").notNull(),
  keyData: text("key_data").notNull(), // Encrypted key data
  iv: text("iv").notNull(), // Initialization vector for key encryption
  status: text("status").notNull().default("active"), // active, inactive, revoked, expired
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  lastUsed: timestamp("last_used"),
});

// Encryption operations history
export const encryptionOperations = pgTable("encryption_operations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  keyId: integer("key_id").references(() => encryptionKeys.id),
  operation: text("operation").notNull(), // encrypt, decrypt
  algorithm: text("algorithm").notNull(),
  resourceName: text("resource_name"),
  status: text("status").notNull(), // success, failed
  timestamp: timestamp("timestamp").defaultNow(),
});

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // USER_LOGIN, FILE_ENCRYPT, etc.
  resource: text("resource"),
  status: text("status").notNull(), // SUCCESS, FAILED
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: json("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertKeySchema = createInsertSchema(encryptionKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true,
});

export const insertOperationSchema = createInsertSchema(encryptionOperations).omit({
  id: true,
  timestamp: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type EncryptionKey = typeof encryptionKeys.$inferSelect;
export type InsertEncryptionKey = z.infer<typeof insertKeySchema>;
export type EncryptionOperation = typeof encryptionOperations.$inferSelect;
export type InsertEncryptionOperation = z.infer<typeof insertOperationSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type LoginData = z.infer<typeof loginSchema>;
