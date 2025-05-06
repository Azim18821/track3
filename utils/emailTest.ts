/**
 * Email Service Test Utility
 * 
 * This script tests the email service using Ethereal.email (a fake SMTP service)
 * Run this script with: `npx tsx emailTest.ts`
 * 
 * Purpose:
 * - Verify nodemailer is properly installed and configured
 * - Test email template formatting without sending real emails
 * - Get a preview URL to inspect the email in a browser
 * 
 * Note: This uses Ethereal.email which creates temporary test accounts for email testing.
 * No real emails are sent to actual recipients.
 */

import nodemailer from 'nodemailer';

async function testEmailService() {
  console.log('Testing email service with Ethereal account...');
  
  try {
    // Create test account (no need for existing credentials)
    const testAccount = await nodemailer.createTestAccount();
    console.log('Created Ethereal test account:', testAccount.user);
    
    // Create a testing transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    // Define email content
    const mailOptions = {
      from: `"TrackMadeEazE" <${testAccount.user}>`,
      to: testAccount.user,
      subject: 'TrackMadeEazE Email Test',
      text: 'This is a test email to verify that Nodemailer is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4F46E5;">TrackMadeEazE</h1>
          </div>
          <div>
            <p><strong>Email Test Successful!</strong></p>
            <p>This email confirms that the Nodemailer integration is working correctly.</p>
            <p>Time sent: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error testing email service:', error);
  }
}

// Only run this test directly, not when imported
if (require.main === module) {
  testEmailService();
}