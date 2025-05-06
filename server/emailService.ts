import nodemailer from 'nodemailer';
import { User } from '@shared/schema';
import { ShoppingItem } from './coach';

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  secure: true,
  port: 465,
  tls: {
    rejectUnauthorized: true
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Send plan ready notification
export async function sendPlanReadyEmail(
  user: User,
  email: string,
  planId: number,
  shoppingList?: ShoppingItem[]
): Promise<boolean> {
  try {
    // Create shopping list summary if available
    let shoppingListHtml = '';
    if (shoppingList && shoppingList.length > 0) {
      const totalCost = shoppingList.reduce(
        (sum, item) => sum + (item.estimatedCost || 0),
        0
      );
      
      shoppingListHtml = `
        <h3>Shopping List Overview</h3>
        <p>Your plan includes a complete shopping list with ${shoppingList.length} items, totaling approximately £${totalCost.toFixed(2)}.</p>
        <p>Here are some key items from your list:</p>
        <ul>
          ${shoppingList.slice(0, 5).map(item => `
            <li>
              <strong>${item.name}</strong> (${item.quantity}) - 
              £${item.estimatedCost?.toFixed(2) || '0.00'} 
              ${item.store ? `from ${item.store}` : ''}
            </li>
          `).join('')}
          ${shoppingList.length > 5 ? `<li>...and ${shoppingList.length - 5} more items</li>` : ''}
        </ul>
      `;
    }

    // Build email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.5;">
        <h2 style="color: #3b82f6;">Your Fitness Plan is Ready!</h2>
        <p>Hello ${user.username},</p>
        <p>Your personalized fitness and nutrition plan has been successfully created and is now ready to view in your account!</p>
        
        ${shoppingListHtml}
        
        <div style="margin: 30px 0;">
          <a href="${process.env.APP_URL || 'http://localhost:5000'}/fitness-coach" 
             style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Your Plan
          </a>
        </div>
        
        <p>Your plan includes:</p>
        <ul>
          <li>Personalized workout routines with 5-8 exercises per session</li>
          <li>Custom meal plans tailored to your preferences</li>
          <li>Complete shopping list with budget optimization</li>
          <li>Detailed nutrition breakdown and macro targets</li>
        </ul>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    `;

    // Send email
    const emailOptions: EmailOptions = {
      to: email,
      subject: "Your Fitness Plan is Ready! 💪",
      html: emailHtml,
    };

    await transporter.sendMail({
      from: process.env.EMAIL_USER ? `"TrackMadeEazE" <${process.env.EMAIL_USER}>` : '"Fitness App" <notifications@fitness-app.com>',
      ...emailOptions,
    });

    console.log(`Plan ready email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send plan ready email:", error);
    return false;
  }
}

// Check if email credentials are configured
export function hasEmailCredentials(): boolean {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

// Test the email connection
export async function verifyEmailConnection(): Promise<boolean> {
  // First check if credentials are even set
  if (!hasEmailCredentials()) {
    console.warn("Email verification failed: No email credentials configured");
    return false;
  }
  
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("Email service configuration error:", error);
    return false;
  }
}