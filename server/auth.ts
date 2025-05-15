import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'fittracksessionsecret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days for better PWA experience
    }
  };
  
  console.log("Session configuration:", {
    secret: sessionSettings.secret ? "[SET]" : "[NOT SET]",
    resave: sessionSettings.resave,
    saveUninitialized: sessionSettings.saveUninitialized,
    cookie: {
      secure: sessionSettings.cookie?.secure,
      httpOnly: sessionSettings.cookie?.httpOnly,
      sameSite: sessionSettings.cookie?.sameSite,
      maxAge: sessionSettings.cookie?.maxAge,
    },
    env: process.env.NODE_ENV,
  });

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Trim whitespace from username for consistency
        const cleanUsername = username.trim();
        console.log(`Login attempt for username: ${cleanUsername}`);
        
        // Our getUserByUsername already uses case-insensitive matching
        const user = await storage.getUserByUsername(cleanUsername);
        if (!user) {
          console.log(`User not found: ${cleanUsername}`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        const passwordValid = await comparePasswords(password, user.password);
        console.log(`Password validation for ${cleanUsername}: ${passwordValid ? 'successful' : 'failed'}`);
        
        if (!passwordValid) {
          return done(null, false, { message: "Invalid username or password" });
        } else {
          console.log(`Login successful for: ${cleanUsername} (isApproved: ${user.isApproved}, isTrainer: ${user.isTrainer})`);
          return done(null, user);
        }
      } catch (error) {
        console.error(`Login error for ${username}:`, error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      if (req.body.email) {
        const existingEmail = await storage.getUserByEmail(req.body.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }

      // Extract trainer username from request body
      const { trainerUsername, ...userData } = req.body;

      const user = await storage.createUser({
        ...userData,
        username: userData.username.trim(), // Trim whitespace from username
        password: await hashPassword(userData.password),
        isAdmin: false,
        isApproved: false,
        registered_at: new Date(),
      });

      // Check if a trainer username was provided
      if (trainerUsername) {
        try {
          // Look up the trainer by username
          const trainer = await storage.getUserByUsername(trainerUsername);
          if (trainer && trainer.isTrainer) {
            // Create a pending trainer-client relationship
            await storage.createTrainerClientRequest({
              trainerId: trainer.id,
              clientId: user.id,
              status: "pending",
              message: `User ${user.username} requested you as their trainer during registration.`,
            });
            console.log(`Trainer request created from user ${user.id} to trainer ${trainer.id}`);
          } else if (trainer) {
            console.log(`User ${trainerUsername} exists but is not a trainer`);
          } else {
            console.log(`No trainer found with username ${trainerUsername}`);
          }
        } catch (error) {
          console.error("Error processing trainer connection:", error);
          // Continue with registration even if trainer connection fails
        }
      }
      
      // Send welcome email explaining the approval process
      try {
        const { sendWelcomeEmail } = await import('./services/email');
        if (user.email) {
          await sendWelcomeEmail(user.email, user.username);
          console.log(`Welcome email sent to ${user.email}`);
        }
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // Continue with registration even if email fails
      }

      // Only log in if the user is approved
      // Otherwise, just return the user without logging them in
      if (user.isApproved) {
        req.login(user, (err) => {
          if (err) return next(err);
          res.status(201).json(user);
        });
      } else {
        // Return user info but don't log them in
        res.status(201).json(user);
      }
    } catch (error: any) {
      res.status(500).json({ message: "Registration failed", error: error.message });
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error, user: SelectUser, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      if (!user.isApproved) {
        return res.status(403).json({ message: "Your account is pending approval" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
  
  // Endpoint to get user's fitness goals
  app.get("/api/user/fitness-goals", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUserProfile(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get goals from user profile
      const fitnessGoals = user.fitnessGoals || [];
      
      // If using legacy single goal and no multiple goals set
      if ((!fitnessGoals || fitnessGoals.length === 0) && user.fitnessGoal) {
        return res.json({ 
          primaryGoal: user.fitnessGoal,
          goals: [user.fitnessGoal]
        });
      }
      
      // Return both the array of goals and the primary goal (first one)
      return res.json({
        primaryGoal: fitnessGoals.length > 0 ? fitnessGoals[0] : null,
        goals: fitnessGoals
      });
    } catch (error) {
      console.error("Error fetching user fitness goals:", error);
      return res.status(500).json({ error: "Failed to fetch fitness goals" });
    }
  });
  
  // API endpoint to update user profile
  app.put("/api/user/update", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const updates = req.body;
      
      // Only allow updates to specific fields, now including bodyType and other onboarding data
      const allowedFields = [
        'dateOfBirth', 
        'gender', 
        'height', 
        'weight', 
        'heightUnit', 
        'weightUnit', 
        'age', 
        'fitnessGoal',        // Legacy single goal field
        'fitnessGoals',       // New field for multiple fitness goals
        'bodyType',           // Body type from onboarding
        'activityLevel',      // Activity level if collected
        'dietaryRestrictions', // Dietary restrictions if any
        'workoutDaysPerWeek',  // Preferred workout frequency
        'workoutDuration',     // Preferred workout duration
        'targetWeight',        // Target weight if provided
        'fitnessLevel',        // Beginner, intermediate, advanced
        'weeklyBudget',        // Budget for meal planning
        'aiAnalysis',          // AI-generated fitness analysis
        'hasCompletedOnboarding', // Flag for completed onboarding
        'hasAcknowledgedAnalysis' // Flag for acknowledged analysis
      ];
      
      const filteredUpdates: Record<string, any> = {};
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          // Handle dateOfBirth separately to ensure it's properly formatted
          if (field === 'dateOfBirth' && updates[field]) {
            try {
              // Log the incoming date format for debugging
              console.log(`Processing dateOfBirth: ${updates[field]}, type: ${typeof updates[field]}`);
              
              // Convert string date to Date object
              const dateObj = new Date(updates[field]);
              console.log(`Converted date object: ${dateObj.toISOString()}`);
              
              filteredUpdates[field] = dateObj;
            } catch (e) {
              console.error("Error parsing date of birth:", e, "Value was:", updates[field]);
              // Skip adding this field if it can't be parsed
            }
          } else {
            filteredUpdates[field] = updates[field];
          }
        }
      });
      
      console.log("Updating user profile with:", filteredUpdates);
      
      // Update user in database
      const updatedUser = await storage.updateUser(userId, filteredUpdates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update session with new user data
      req.login(updatedUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to update session" });
        }
        res.json(updatedUser);
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Admin endpoints
  app.get("/api/admin/users", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.post("/api/admin/approve/:id", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await storage.approveUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Send account approval email notification
      try {
        const { sendAccountApprovalEmail } = await import('./services/email');
        if (user.email) {
          await sendAccountApprovalEmail(user.email, user.username);
          console.log(`Account approval email sent to ${user.email}`);
        }
      } catch (emailError) {
        console.error("Error sending account approval email:", emailError);
        // Continue with approval even if email fails
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve user" });
    }
  });
  
  // Get a specific user details
  app.get("/api/admin/users/:id", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Update user details
  app.put("/api/admin/users/:id", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Extract updatable fields
      const { username, email, isAdmin, isTrainer } = req.body;
      
      // Validate username is unique if changing
      if (username && username !== user.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, {
        username: username || user.username,
        email: email || user.email,
        isAdmin: isAdmin !== undefined ? isAdmin : user.isAdmin,
        isTrainer: isTrainer !== undefined ? isTrainer : user.isTrainer
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Delete a user account (Admin only)
  app.delete("/api/admin/users/:id", ensureAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      
      // Prevent deleting yourself
      if (req.user && req.user.id === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Delete the user
      const success = await storage.deleteUser(userId);
      
      if (success) {
        res.status(200).json({ message: "User successfully deleted" });
      } else {
        res.status(500).json({ message: "Failed to delete user" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
}

export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ message: "Not authenticated" });
}

export function ensureAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Unauthorized access" });
}

export function ensureTrainer(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user && (req.user.isAdmin || req.user.isTrainer)) {
    return next();
  }
  
  res.status(403).json({ message: "Unauthorized access" });
}

export async function setupFirstAdminUser() {
  try {
    const adminUser = await storage.getUserByUsername("admin");
    
    if (!adminUser) {
      await storage.createUser({
        username: "admin",
        email: "admin@example.com",
        password: await hashPassword("admin123"),
        isAdmin: true,
        isApproved: true,
        registered_at: new Date(),
      });
      console.log("Admin user created successfully");
    }
  } catch (error) {
    console.error("Failed to create admin user:", error);
  }
}