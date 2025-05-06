import nodemailer from 'nodemailer';

// Check if email is properly formatted
function isValidEmail(email: string): boolean {
  return email.includes('@') && email.includes('.') && email.split('@')[1].includes('.');
}

// Check if we have valid email credentials
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn("EMAIL_USER or EMAIL_PASS environment variables not set. Email functionality will not work.");
}

if (process.env.EMAIL_USER && !isValidEmail(process.env.EMAIL_USER)) {
  console.warn(`EMAIL_USER "${process.env.EMAIL_USER}" appears to be incomplete or improperly formatted.`);
  console.warn("Please update the EMAIL_USER environment variable with a complete email address.");
}

// Create a transporter if credentials are available
const transporter = (process.env.EMAIL_USER && process.env.EMAIL_PASS)
  ? nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail', // defaults to gmail, but can be changed via env var
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // This should be an App Password for Gmail
      },
      // Additional security settings for Gmail
      secure: true, // Use SSL/TLS
      port: 465, // Secure SMTP port
      // Required for some Gmail accounts with advanced security settings
      tls: {
        rejectUnauthorized: true
      }
    })
  : null; // No transporter if credentials are missing

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    // If no real credentials, try to use test account
    const emailTransporter = (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) 
      ? await createTestAccount() 
      : transporter;
    
    if (!emailTransporter) {
      throw new Error('Email configuration is missing and test account creation failed');
    }

    // Configure mail options
    const mailOptions = {
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    };

    // Send the email
    const info = await emailTransporter.sendMail(mailOptions);
    
    // If using Ethereal, log the test URL
    if (!hasValidEmailCredentials) {
      console.log('Email sent using Ethereal test service. Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string, 
  resetToken: string,
  username: string
): Promise<boolean> {
  // Get app URL from environment or use a default
  const appUrl = process.env.APP_URL ? process.env.APP_URL : 'https://trackmadeease.replit.app';
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
  
  const emailContent = {
    to: email,
    from: process.env.EMAIL_USER ? `"TrackMadeEazE" <${process.env.EMAIL_USER}>` : 'trackmadeeze@gmail.com', // Use configured email or default
    subject: 'TrackMadeEazE - Password Reset',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4F46E5;">TrackMadeEazE</h1>
        </div>
        <div>
          <p>Hello ${username},</p>
          <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          <p>To reset your password, click on the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>Best regards,<br>TrackMadeEazE Team</p>
        </div>
      </div>
    `,
  };

  return sendEmail(emailContent);
}

/**
 * Send a welcome email to new users after registration
 */
export async function sendWelcomeEmail(
  email: string,
  username: string
): Promise<boolean> {
  const appUrl = process.env.APP_URL ? process.env.APP_URL : 'https://trackmadeease.replit.app';
  
  const emailContent = {
    to: email,
    from: process.env.EMAIL_USER ? `"TrackMadeEazE" <${process.env.EMAIL_USER}>` : 'trackmadeease@gmail.com',
    subject: 'Welcome to TrackMadeEazE - Your Fitness Journey Begins!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4F46E5;">Welcome to TrackMadeEazE!</h1>
        </div>
        <div>
          <p>Hello ${username},</p>
          <p>Thank you for registering with TrackMadeEazE, your all-in-one fitness and nutrition tracking platform!</p>
          
          <p style="font-weight: bold; margin-top: 20px;">Your account is currently pending admin approval.</p>
          <p>You will receive another email once your account has been approved, and then you can start using all of our features.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #4F46E5; margin-top: 0;">Key Features You'll Have Access To:</h3>
            <ul>
              <li><strong>AI Fitness Coach:</strong> Get personalized workout and meal plans based on your goals</li>
              <li><strong>Workout Tracking:</strong> Log your exercises and track your strength progression</li>
              <li><strong>Nutrition Management:</strong> Monitor your calorie and protein intake with accurate information</li>
              <li><strong>Comprehensive Exercise Library:</strong> Access exercise tutorials with videos organized by muscle groups</li>
              <li><strong>Meal Recipe Library:</strong> Discover delicious, nutritious meals with detailed instructions</li>
              <li><strong>Weekly Progress Views:</strong> See your workout and nutrition logs organized by day</li>
              <li><strong>Mobile-Friendly Interface:</strong> Access your fitness data anywhere, anytime</li>
            </ul>
          </div>
          
          <p>Once approved, you can start your fitness journey by:</p>
          <ol>
            <li>Creating your personalized fitness plan through our AI Fitness Coach</li>
            <li>Logging your daily workouts and meals</li>
            <li>Tracking your weight and progress</li>
            <li>Exploring our exercise and meal libraries</li>
          </ol>
          
          <p>We look forward to helping you achieve your fitness goals!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6b7280; font-style: italic;">Please wait for the approval email before trying to log in.</p>
          </div>
          
          <p>Best regards,<br>TrackMadeEazE Team</p>
        </div>
      </div>
    `,
  };

  return sendEmail(emailContent);
}

/**
 * Send account approval notification to users
 */
export async function sendAccountApprovalEmail(
  email: string,
  username: string
): Promise<boolean> {
  const appUrl = process.env.APP_URL ? process.env.APP_URL : 'https://trackmadeease.replit.app';
  const loginUrl = `${appUrl}/auth`;
  
  const emailContent = {
    to: email,
    from: process.env.EMAIL_USER ? `"TrackMadeEazE" <${process.env.EMAIL_USER}>` : 'trackmadeease@gmail.com',
    subject: 'TrackMadeEazE - Your Account Has Been Approved!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4F46E5;">Account Approved!</h1>
        </div>
        <div>
          <p>Hello ${username},</p>
          <p>Great news! Your TrackMadeEazE account has been approved, and you now have full access to all features.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Log In Now</a>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4F46E5;">
            <h3 style="color: #4F46E5; margin-top: 0;">Getting Started:</h3>
            <ol>
              <li>Log in to your account</li>
              <li>Complete your profile and set your fitness goals</li>
              <li>Use the AI Fitness Coach to generate your personalized workout and meal plans</li>
              <li>Start tracking your workouts and nutrition</li>
            </ol>
          </div>
          
          <p>Here are some tips to make the most of TrackMadeEazE:</p>
          <ul>
            <li>Log your workouts and meals consistently for the best results and insights</li>
            <li>Update your weight regularly to track your progress</li>
            <li>Explore our exercise library for proper form and technique</li>
            <li>Try recipes from our meal library that match your nutritional needs</li>
          </ul>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>We're excited to be part of your fitness journey!</p>
          
          <p>Best regards,<br>TrackMadeEazE Team</p>
        </div>
      </div>
    `,
  };

  return sendEmail(emailContent);
}