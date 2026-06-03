import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter = null;

// Lazy initialize transporter
function getTransporter() {
  if (transporter) return transporter;

  const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;
  
  if (hasCredentials) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // If no credentials are set, use a console fallback. 
    // This avoids slow external network requests to Ethereal during registration.
    transporter = {
      sendMail: async (options) => {
        console.log('\n==================================================');
        console.log('📬  [CONSOLE EMAIL FALLBACK]');
        console.log(`To:      ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log('--------------------------------------------------');
        // Extract the code or links from options.text or options.html
        console.log(options.text || options.html);
        console.log('==================================================\n');
        return { messageId: 'console-log-id' };
      }
    };
  }

  return transporter;
}

export async function sendVerificationEmail(email, name, token) {
  const t = getTransporter();
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?email=${encodeURIComponent(email)}&token=${token}`;
  
  const mailOptions = {
    from: `"Pizza Oven" <${process.env.EMAIL_USER || 'noreply@pizzaoven.com'}>`,
    to: email,
    subject: 'Verify your Pizza Oven account',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Welcome to Pizza Oven, ${name}!</h2>
        <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
        <div style="margin: 20px 0;">
          <a href="${verificationUrl}" style="background-color: #e65c00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p>Or use the verification code below:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #e65c00;">${token}</p>
        <p>If you did not create this account, please ignore this email.</p>
      </div>
    `,
    text: `Welcome to Pizza Oven, ${name}! Verify your account by opening this link: ${verificationUrl} or use code: ${token}`
  };

  try {
    await t.sendMail(mailOptions);
    // Always print a clear message to stdout for testing
    console.log(`\n🔑 [SECURITY] Verification Code for ${email} is: ${token}\n`);
    return true;
  } catch (error) {
    console.error(`Error sending verification email: ${error.message}`);
    return false;
  }
}

export async function sendResetPasswordEmail(email, name, token) {
  const t = getTransporter();
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"Pizza Oven" <${process.env.EMAIL_USER || 'noreply@pizzaoven.com'}>`,
    to: email,
    subject: 'Reset your Pizza Oven password',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>You requested a password reset for your Pizza Oven account. Click the button below to reset your password. This link is valid for 1 hour:</p>
        <div style="margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #e65c00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste the following link into your browser:</p>
        <p>${resetUrl}</p>
        <p>If you did not request this, please ignore this email and your password will remain secure.</p>
      </div>
    `,
    text: `Hello ${name}, reset your password using the following link: ${resetUrl}`
  };

  try {
    await t.sendMail(mailOptions);
    console.log(`\n🔄 [SECURITY] Reset Password Link for ${email} is: ${resetUrl}\n`);
    return true;
  } catch (error) {
    console.error(`Error sending reset password email: ${error.message}`);
    return false;
  }
}

export async function sendLowStockAlertEmail(adminEmail, itemName, currentStock, threshold) {
  const t = getTransporter();
  const mailOptions = {
    from: `"Pizza Oven System" <${process.env.EMAIL_USER || 'noreply@pizzaoven.com'}>`,
    to: adminEmail || 'admin@pizzadelivery.com',
    subject: `⚠️ LOW STOCK ALERT: ${itemName.toUpperCase()}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 2px solid #ff3333; border-radius: 5px;">
        <h2 style="color: #ff3333; margin-top: 0;">⚠️ Inventory Alert: Low Stock</h2>
        <p>Dear Admin,</p>
        <p>This is an automated notification that an ingredient stock has fallen below its critical threshold value.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Ingredient Name</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Current Stock</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Threshold Alert Value</th>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${itemName}</td>
            <td style="padding: 10px; border: 1px solid #ddd; color: #ff3333; font-weight: bold;">${currentStock}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${threshold}</td>
          </tr>
        </table>
        <p>Please restock this item as soon as possible to ensure uninterrupted custom pizza production.</p>
      </div>
    `,
    text: `ALERT: The ingredient ${itemName} is low in stock! Current stock is ${currentStock}, which is below the threshold of ${threshold}.`
  };

  try {
    await t.sendMail(mailOptions);
    console.log(`\n⚠️ [INVENTORY] Low stock alert sent for ${itemName}. Current stock: ${currentStock}\n`);
    return true;
  } catch (error) {
    console.error(`Error sending low stock alert: ${error.message}`);
    return false;
  }
}
