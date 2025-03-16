import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      password: string;
      fullName: string;
      role: string;
      status: string;
      createdAt: Date | null;
      lastLogin: Date | null;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "my-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        
        if (user.status !== "active") {
          return done(null, false);
        }
        
        // Update last login
        await storage.updateUser(user.id, {
          lastLogin: new Date()
        });
        
        // Record login in audit logs
        await storage.recordAuditLog({
          userId: user.id,
          action: "USER_LOGIN",
          resource: username,
          status: "SUCCESS",
          ipAddress: getClientIp(done.req),
          userAgent: done.req?.headers["user-agent"] || null,
          details: null
        });
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password, fullName, role = "user", status = "active" } = req.body;
      
      if (!username || !email || !password || !fullName) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Create user
      const userData = {
        username,
        email,
        password: await hashPassword(password),
        fullName,
        role,
        status,
      };
      
      const user = await storage.createUser(userData);
      
      // Record in audit logs
      await storage.recordAuditLog({
        userId: null,
        action: "USER_REGISTER",
        resource: username,
        status: "SUCCESS",
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
        details: { role }
      });
      
      // Remove password from response
      delete user.password;
      
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      
      if (!user) {
        // Record failed login attempt
        storage.recordAuditLog({
          userId: null,
          action: "USER_LOGIN",
          resource: req.body.username,
          status: "FAILED",
          ipAddress: getClientIp(req),
          userAgent: req.headers["user-agent"] || null,
          details: { reason: "Invalid credentials" }
        });
        
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // Remove password from response
        const userResponse = { ...user };
        delete userResponse.password;
        
        res.status(200).json(userResponse);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    // Record logout in audit logs
    if (req.isAuthenticated()) {
      storage.recordAuditLog({
        userId: req.user!.id,
        action: "USER_LOGOUT",
        resource: req.user!.username,
        status: "SUCCESS",
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
        details: null
      });
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    // Remove password from response
    const user = { ...req.user };
    delete user.password;
    
    res.json(user);
  });
}

function getClientIp(req: Request | undefined): string | undefined {
  if (!req) return undefined;
  
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) || req.socket.remoteAddress;
  }
  
  return req.socket.remoteAddress;
}