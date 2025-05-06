/**
 * Gmail Email Service Test Utility
 * 
 * This script tests email sending using actual Gmail credentials.
 * Run this script with: `npx tsx gmailTest.ts`
 * 
 * Required environment variables:
 * - EMAIL_USER: Your Gmail or email address
 * - EMAIL_PASS: Your app password (not regular password)
 * - EMAIL_SERVICE: (Optional) Email service (default: 'Gmail')
 * 
 * Important:
 * - For Gmail, you need to enable "Less secure app access" or
 *   use an "App Password" if you have 2FA enabled.
 * - This will send an actual test email to the configured test recipient.
 * - Modify the recipient email before using if needed.
 */

import nodemailer from 'nodemailer';

export async function testGmailEmailService(testRecipient = 'admin@example.com') {
  console.log('Testing email service with email credentials...');
  
  // Check if email credentials are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ EMAIL_USER or EMAIL_PASS environment variables are not set.');
    console.log('Please set the necessary environment variables.');
    return false;
  }
  
  // Check if email has valid format
  if (!process.env.EMAIL_USER.includes('@') || !process.env.EMAIL_USER.includes('.')) {
    console.error('❌ EMAIL_USER does not appear to be a complete email address.');
    console.error('Current value:', process.env.EMAIL_USER);
    console.error('An email address should include both @ and . characters (e.g., info@example.com)');
    console.log('Please update the EMAIL_USER environment variable with a complete email address.');
    return false;
  }
  
  // Print the configured email settings
  console.log('Using the following email configuration:');
  console.log(`- EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`- EMAIL_PASS: ${'*'.repeat(process.env.EMAIL_PASS.length)} (hidden)`);
  console.log(`- EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || 'Gmail (default)'}`);
  console.log(`- Test recipient: ${testRecipient}`);
  
  // Create a custom transporter for the test
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    secure: true,
  });
  
  try {
    // Test email to send
    const mailOptions = {
      from: `"TrackMadeEazE" <${process.env.EMAIL_USER}>`,
      to: testRecipient, // Send to the provided test address
      subject: 'TrackMadeEazE Email Test',
      text: 'This is a test email to verify that the email configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4F46E5;">TrackMadeEazE</h1>
          </div>
          <div>
            <p><strong>Email Test Successful!</strong></p>
            <p>This email confirms that the email integration is working correctly.</p>
            <p>Time sent: ${new Date().toLocaleString()}</p>
            <p>Current environment:</p>
            <ul>
              <li>EMAIL_USER: ${process.env.EMAIL_USER}</li>
              <li>EMAIL_PASS: ******** (hidden for security)</li>
              <li>EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || 'Gmail (default)'}</li>
            </ul>
          </div>
        </div>
      `
    };
    
    // Send mail with defined transport object
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email test sent successfully!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Check ${testRecipient} inbox for the test email.`);
    return true;
  } catch (error) {
    console.error('❌ Error testing Gmail service:', error);
    return false;
  }
}

// Only run this test directly, not when imported
if (require.main === module) {
  testGmailEmailService();
}