import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  generateKey, 
  encryptData, 
  decryptData, 
  revokeKey, 
  generateKeyBackup, 
  restoreKeyBackup,
  ALGORITHMS 
} from "./encryption";
import { resetAnomalyDetection } from "./anomaly-detection";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);

  // Middleware to ensure user is authenticated
  const ensureAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };

  // Middleware to ensure user has admin role
  const ensureAdmin = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };

  // API routes
  app.get("/api/dashboard/stats", ensureAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get user's keys
      const keys = await storage.getUserKeys(userId);
      const activeKeys = keys.filter(key => key.status === "active").length;
      
      // Get recent encryption operations
      const operations = await storage.getOperationsByUser(userId, 100);
      const totalEncryptions = operations.filter(op => op.operation === "encrypt").length;
      const totalDecryptions = operations.filter(op => op.operation === "decrypt").length;
      
      // Get total users (admin only)
      let totalUsers = 1; // Default to just the user themselves
      if (req.user?.role === "admin") {
        const users = await storage.listUsers();
        totalUsers = users.length;
      }
      
      res.json({
        totalEncryptions,
        totalDecryptions,
        activeKeys,
        totalUsers
      });
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  app.get("/api/dashboard/recent-activity", ensureAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      let limit = parseInt(req.query.limit as string) || 5;
      
      // Get recent logs for this user, or all logs for admin
      const filters: any = {};
      if (req.user?.role !== "admin") {
        filters.userId = userId;
      }
      
      const logs = await storage.getAuditLogs(filters, limit);
      
      // Format the logs for frontend
      const activity = await Promise.all(
        logs.map(async (log) => {
          let userName = req.user?.fullName || "Unknown";
          
          // If admin and viewing logs from other users
          if (req.user?.role === "admin" && log.userId !== userId) {
            const user = await storage.getUser(log.userId!);
            userName = user?.fullName || "Unknown";
          }
          
          return {
            id: log.id,
            action: log.action,
            status: log.status,
            timestamp: log.timestamp,
            user: userName,
            resource: log.resource
          };
        })
      );
      
      res.json(activity);
    } catch (error) {
      console.error("Error getting recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Encryption routes
  app.post("/api/encrypt", ensureAuth, async (req, res) => {
    try {
      const { keyId, data, resourceName } = req.body;
      
      if (!keyId || !data) {
        return res.status(400).json({ message: "Key ID and data are required" });
      }
      
      const result = await encryptData(
        req.user!.id,
        data,
        keyId,
        resourceName || "text"
      );
      
      res.json(result);
    } catch (error) {
      console.error("Encryption error:", error);
      res.status(500).json({ message: (error as Error).message || "Encryption failed" });
    }
  });

  app.post("/api/decrypt", ensureAuth, async (req, res) => {
    try {
      const { keyId, data, resourceName } = req.body;
      
      if (!keyId || !data) {
        return res.status(400).json({ message: "Key ID and encrypted data are required" });
      }
      
      const result = await decryptData(
        req.user!.id,
        data,
        keyId,
        resourceName || "text"
      );
      
      res.json(result);
    } catch (error) {
      console.error("Decryption error:", error);
      res.status(500).json({ message: (error as Error).message || "Decryption failed" });
    }
  });

  // Operation history
  app.get("/api/operations", ensureAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const operations = await storage.getOperationsByUser(userId, limit);
      
      res.json(operations);
    } catch (error) {
      console.error("Error fetching operations:", error);
      res.status(500).json({ message: "Failed to fetch operation history" });
    }
  });

  // Key management routes
  app.get("/api/keys", ensureAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const keys = await storage.getUserKeys(userId);
      
      // Don't send sensitive key data to the client
      const safeKeys = keys.map(key => ({
        id: key.id,
        name: key.name,
        keyId: key.keyId,
        algorithm: key.algorithm,
        status: key.status,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
        expiresAt: key.expiresAt,
        lastUsed: key.lastUsed
      }));
      
      res.json(safeKeys);
    } catch (error) {
      console.error("Error fetching keys:", error);
      res.status(500).json({ message: "Failed to fetch keys" });
    }
  });

  app.post("/api/keys", ensureAuth, async (req, res) => {
    try {
      const { name, algorithm } = req.body;
      
      if (!name || !algorithm) {
        return res.status(400).json({ message: "Name and algorithm are required" });
      }
      
      if (!Object.values(ALGORITHMS).includes(algorithm)) {
        return res.status(400).json({ message: "Invalid algorithm" });
      }
      
      const key = await generateKey(req.user!.id, name, algorithm);
      
      // Don't send sensitive key data to the client
      const safeKey = {
        id: key.id,
        name: key.name,
        keyId: key.keyId,
        algorithm: key.algorithm,
        status: key.status,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
        expiresAt: key.expiresAt,
        lastUsed: key.lastUsed
      };
      
      res.status(201).json(safeKey);
    } catch (error) {
      console.error("Error creating key:", error);
      res.status(500).json({ message: "Failed to create key" });
    }
  });

  app.post("/api/keys/:id/revoke", ensureAuth, async (req, res) => {
    try {
      const keyId = parseInt(req.params.id);
      
      if (isNaN(keyId)) {
        return res.status(400).json({ message: "Invalid key ID" });
      }
      
      await revokeKey(req.user!.id, keyId);
      
      res.json({ message: "Key revoked successfully" });
    } catch (error) {
      console.error("Error revoking key:", error);
      res.status(500).json({ message: "Failed to revoke key" });
    }
  });

  app.post("/api/keys/backup", ensureAuth, async (req, res) => {
    try {
      const backup = await generateKeyBackup(req.user!.id);
      res.json(backup);
    } catch (error) {
      console.error("Error creating key backup:", error);
      res.status(500).json({ message: "Failed to create key backup" });
    }
  });

  app.post("/api/keys/restore", ensureAuth, async (req, res) => {
    try {
      const { backup } = req.body;
      
      if (!backup) {
        return res.status(400).json({ message: "Backup data is required" });
      }
      
      const result = await restoreKeyBackup(req.user!.id, backup);
      res.json(result);
    } catch (error) {
      console.error("Error restoring key backup:", error);
      res.status(500).json({ message: "Failed to restore key backup" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", ensureAdmin, async (req, res) => {
    try {
      const users = await storage.listUsers();
      
      // Don't send password hashes
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id", ensureAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { role, status, fullName, email } = req.body;
      const updateData: any = {};
      
      if (role) updateData.role = role;
      if (status) updateData.status = status;
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Record the action
      await storage.recordAuditLog({
        userId: req.user!.id,
        action: "USER_UPDATE",
        resource: updatedUser.username,
        status: "SUCCESS",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        details: { updates: Object.keys(updateData) }
      });
      
      // Don't send password hash
      const { password, ...safeUser } = updatedUser;
      
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Security Alerts endpoints
  app.get("/api/security/alerts", ensureAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user?.role === "admin";
      
      // Default filters for security alerts
      const filters: any = {
        action: "ANOMALY_DETECTED",
      };
      
      // Non-admin users can only see their own alerts
      if (!isAdmin) {
        filters.userId = userId;
      } else if (req.query.userId) {
        // Admin can filter by user ID
        filters.userId = parseInt(req.query.userId as string);
      }
      
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getAuditLogs(filters, limit);
      
      // Format alerts for the frontend
      const alerts = await Promise.all(
        logs.map(async (log) => {
          let userName = "Unknown";
          
          if (log.userId) {
            const user = await storage.getUser(log.userId);
            userName = user?.fullName || "Unknown";
          }
          
          // Parse details if it's a string
          let details = log.details;
          if (typeof details === 'string') {
            try {
              details = JSON.parse(details);
            } catch (e) {
              details = { error: "Unable to parse details" };
            }
          }
          
          return {
            id: log.id,
            timestamp: log.timestamp,
            type: log.resource, // anomaly type is stored in resource field
            severity: details?.severity || "medium",
            user: {
              id: log.userId,
              name: userName
            },
            details
          };
        })
      );
      
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching security alerts:", error);
      res.status(500).json({ message: "Failed to fetch security alerts" });
    }
  });
  
  // Clear security alerts for a user (resets anomaly detection)
  app.post("/api/security/alerts/clear", ensureAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      const isAdmin = req.user?.role === "admin";
      
      // Only admins can clear alerts for other users
      const targetUserId = isAdmin && userId ? parseInt(userId) : req.user!.id;
      
      // Reset anomaly detection for the user
      resetAnomalyDetection(targetUserId);
      
      // Record the action
      await storage.recordAuditLog({
        userId: req.user!.id,
        action: "ALERTS_CLEARED",
        resource: targetUserId.toString(),
        status: "SUCCESS",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        details: { clearedBy: isAdmin ? "admin" : "self" }
      });
      
      res.json({ message: "Security alerts cleared successfully" });
    } catch (error) {
      console.error("Error clearing security alerts:", error);
      res.status(500).json({ message: "Failed to clear security alerts" });
    }
  });

  // Audit log routes
  app.get("/api/logs", ensureAuth, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      // Filter parameters
      const filters: any = {};
      
      if (!req.user || req.user.role !== "admin") {
        // Non-admin users can only see their own logs
        filters.userId = req.user!.id;
      } else {
        // Admin can filter by user ID
        if (req.query.userId) {
          filters.userId = parseInt(req.query.userId as string);
        }
      }
      
      if (req.query.action) {
        filters.action = req.query.action;
      }
      
      if (req.query.status) {
        filters.status = req.query.status;
      }
      
      const logs = await storage.getAuditLogs(filters, limit, offset);
      const total = await storage.countAuditLogs(filters);
      
      // Format logs for the frontend
      const formattedLogs = await Promise.all(
        logs.map(async (log) => {
          let userName = "Unknown";
          
          if (log.userId) {
            const user = await storage.getUser(log.userId);
            userName = user?.fullName || "Unknown";
          }
          
          return {
            ...log,
            userName
          };
        })
      );
      
      res.json({
        logs: formattedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Error handler for Zod validation errors
  app.use((err: Error, req: Request, res: Response, next: Function) => {
    if (err instanceof ZodError) {
      const formattedError = fromZodError(err);
      return res.status(400).json({ message: formattedError.message });
    }
    next(err);
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
