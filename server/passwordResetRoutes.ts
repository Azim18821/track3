import express, { Request, Response } from 'express';
import { storage } from './storage';
import { hashPassword } from './auth';
import { sendPasswordResetEmail } from './services/email';
import { z } from 'zod';
import crypto from 'crypto';

const router = express.Router();

// Schema for requesting a password reset
const requestResetSchema = z.object({
  email: z.string().email({ message: "Invalid email address" })
});

// Schema for resetting a password
const resetPasswordSchema = z.object({
  token: z.string(),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

/**
 * Request a password reset
 * POST /api/password-reset/request
 */
router.post('/request', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = requestResetSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors
      });
    }

    const { email } = validation.data;
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal that the email doesn't exist for security reasons
      return res.status(200).json({ 
        message: "If your email is registered, you will receive a password reset link"
      });
    }

    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store the token in the database with expiry
    await storage.createPasswordResetToken(user.id, token, 1); // 1 hour expiry
    
    // Send reset email
    const emailSent = await sendPasswordResetEmail(email, token, user.username);
    
    if (!emailSent) {
      console.error(`Failed to send password reset email to ${email}`);
      return res.status(500).json({ error: "Failed to send password reset email" });
    }
    
    return res.status(200).json({ 
      message: "If your email is registered, you will receive a password reset link"
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Verify if a reset token is valid (without resetting the password)
 * GET /api/password-reset/verify?token=xxx&email=xxx
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const { token, email } = req.query;
    
    if (!token || typeof token !== 'string' || !email || typeof email !== 'string') {
      return res.status(400).json({ error: "Invalid token or email" });
    }
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid token or email" });
    }
    
    // Find token in database
    const resetToken = await storage.getPasswordResetToken(token);
    if (!resetToken) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    
    // Check if token belongs to the user
    if (resetToken.userId !== user.id) {
      return res.status(400).json({ error: "Invalid token" });
    }
    
    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: "Token has expired" });
    }
    
    // Check if token has been used
    if (resetToken.usedAt) {
      return res.status(400).json({ error: "Token has already been used" });
    }
    
    return res.status(200).json({ valid: true });
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Reset password using token
 * POST /api/password-reset/reset
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors
      });
    }
    
    const { token, email, password } = validation.data;
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid token or email" });
    }
    
    // Find token in database
    const resetToken = await storage.getPasswordResetToken(token);
    if (!resetToken) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    
    // Check if token belongs to the user
    if (resetToken.userId !== user.id) {
      return res.status(400).json({ error: "Invalid token" });
    }
    
    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: "Token has expired" });
    }
    
    // Check if token has been used
    if (resetToken.usedAt) {
      return res.status(400).json({ error: "Token has already been used" });
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(password);
    
    // Update the user's password
    await storage.updateUser(user.id, { password: hashedPassword });
    
    // Invalidate the token
    await storage.invalidatePasswordResetToken(token);
    
    return res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;