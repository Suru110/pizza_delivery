import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendVerificationEmail, sendResetPasswordEmail } from '../utils/mailer.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields.' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // If user exists but is not verified, overwrite or re-send code
      if (!existingUser.isVerified) {
        const verificationToken = generateVerificationCode();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        existingUser.name = name;
        existingUser.password = hashedPassword;
        existingUser.verificationToken = verificationToken;
        if (role && ['admin', 'user'].includes(role)) {
          existingUser.role = role;
        }
        await existingUser.save();

        await sendVerificationEmail(email, name, verificationToken);
        const noEmailRe = !process.env.EMAIL_USER || !process.env.EMAIL_PASS;
        return res.status(200).json({ 
          message: noEmailRe 
            ? 'A new verification code has been generated — it is shown below since no email is configured.'
            : 'User already registered but unverified. A new verification code has been sent.',
          requiresVerification: true,
          email,
          devCode: noEmailRe ? verificationToken : undefined
        });
      }
      return res.status(400).json({ message: 'User already exists.' });
    }

    const verificationToken = generateVerificationCode();
    const hashedPassword = await bcrypt.hash(password, 10);

    // First user in system becomes admin automatically (convenient for setup/testing!)
    const userCount = await User.countDocuments();
    const assignedRole = role && ['admin', 'user'].includes(role) ? role : (userCount === 0 ? 'admin' : 'user');

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
      verificationToken,
      isVerified: false
    });

    await newUser.save();
    await sendVerificationEmail(email, name, verificationToken);

    // When no SMTP is configured, expose the code in the response so users can verify without email
    const noEmail = !process.env.EMAIL_USER || !process.env.EMAIL_PASS;
    res.status(201).json({
      message: noEmail
        ? 'Registration successful! No email configured — your verification code is shown below.'
        : 'Registration successful! Please check your email for the verification code.',
      requiresVerification: true,
      email,
      devCode: noEmail ? verificationToken : undefined
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// @route   POST /api/auth/verify
// @desc    Verify email address
router.post('/verify', async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ message: 'Email and verification code are required.' });
    }

    const user = await User.findOne({ email, verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid verification code or email.' });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    // Generate JWT token on verification success so they don't have to login again
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'supersecretjwtkey123!',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Email verified successfully! Welcome to Pizza Oven.',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ message: 'Server error during verification.' });
  }
});

// @route   POST /api/auth/resend-code
// @desc    Resend verification code
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User email is already verified.' });
    }

    const token = generateVerificationCode();
    user.verificationToken = token;
    await user.save();

    await sendVerificationEmail(user.email, user.name, token);
    const noEmailResend = !process.env.EMAIL_USER || !process.env.EMAIL_PASS;
    res.status(200).json({ 
      message: noEmailResend 
        ? 'A new verification code has been generated — it is shown below since no email is configured.'
        : 'A new verification code has been sent to your email.',
      devCode: noEmailResend ? token : undefined
    });
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({ message: 'Server error while resending verification code.' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Check verification status
    if (!user.isVerified) {
      // Re-send verification token
      const verificationToken = generateVerificationCode();
      user.verificationToken = verificationToken;
      await user.save();
      await sendVerificationEmail(user.email, user.name, verificationToken);

      return res.status(403).json({
        message: 'Your email is not verified. A verification code has been sent to your email.',
        requiresVerification: true,
        email: user.email
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'supersecretjwtkey123!',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset link
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't disclose if email exists or not for security, but send standard response
      return res.status(200).json({ message: 'If that email address exists, a password reset link has been sent.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    await sendResetPasswordEmail(user.email, user.name, token);

    res.status(200).json({ message: 'If that email address exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request.' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using reset token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', authenticate, async (req, res) => {
  res.json(req.user);
});

export default router;
