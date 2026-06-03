import express from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/user/profile
// @desc    Get user profile including addresses and favorites
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const totalOrders = await Order.countDocuments({ user: req.user.id, paymentStatus: 'paid' });
    
    // Fetch available active coupons
    const availableCoupons = await Coupon.find({ isActive: true });
    
    res.json({
      user,
      totalOrders,
      availableCoupons
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/user/profile
// @desc    Update user profile (name, phone, email)
router.post('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Update fields if provided
    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (email && email !== user.email) {
      // Check if email is already in use
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) return res.status(400).json({ message: 'Email already in use' });
      user.email = email.toLowerCase().trim();
    }
    
    await user.save();
    res.json({ message: 'Profile updated successfully', user: user.select('-password') });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/user/change-password
// @desc    Change user password with old password verification
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Get user with password field
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Old password is incorrect' });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/user/addresses
// @desc    Add a new address
router.post('/addresses', authenticate, async (req, res) => {
  try {
    const { label, address } = req.body;
    if (!label || !address) return res.status(400).json({ message: 'Label and address required' });

    const user = await User.findById(req.user.id);
    user.addresses.push({ label, address });
    await user.save();
    
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   DELETE /api/user/addresses/:addressId
// @desc    Delete an address
router.delete('/addresses/:addressId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.addressId);
    await user.save();
    
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/user/favorites/:orderId
// @desc    Toggle favorite order
router.post('/favorites/:orderId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const orderId = req.params.orderId;
    
    const index = user.favoriteOrders.indexOf(orderId);
    if (index === -1) {
      user.favoriteOrders.push(orderId);
    } else {
      user.favoriteOrders.splice(index, 1);
    }
    await user.save();
    
    res.json(user.favoriteOrders);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
