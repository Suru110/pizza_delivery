import express from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Coupon from '../models/Coupon.js';
import Settings from '../models/Settings.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Middleware for Admin only
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

// --- CUSTOMERS ---
router.get('/customers', authenticate, isAdmin, async (req, res) => {
  try {
    // Get all users, calculate total orders per user
    const users = await User.find({ role: 'user' }).select('-password');
    const customers = await Promise.all(users.map(async (user) => {
      const totalOrders = await Order.countDocuments({ user: user._id });
      const totalSpent = await Order.aggregate([
        { $match: { user: user._id, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || 'N/A',
        isBlocked: user.isBlocked,
        totalOrders,
        totalSpent: totalSpent[0]?.total || 0,
        rewardPoints: user.rewardPoints,
        createdAt: user.createdAt
      };
    }));
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/customers/:id/block', authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`, isBlocked: user.isBlocked });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- ANALYTICS ---
router.get('/analytics', authenticate, isAdmin, async (req, res) => {
  try {
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const totalOrders = await Order.countDocuments({ paymentStatus: 'paid' });
    const totalUsers = await User.countDocuments({ role: 'user' });

    res.json({
      revenue: totalRevenue[0]?.total || 0,
      totalOrders,
      totalUsers
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- COUPONS ---
router.get('/coupons', authenticate, isAdmin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/coupons', authenticate, isAdmin, async (req, res) => {
  try {
    const { code, discountType, discountValue, minAmount } = req.body;
    const newCoupon = new Coupon({ code, discountType, discountValue, minAmount });
    await newCoupon.save();
    res.status(201).json(newCoupon);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/coupons/:id/toggle', authenticate, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.delete('/coupons/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- SETTINGS (Dynamic Pricing) ---
router.get('/settings', async (req, res) => {
  try {
    const settingsList = await Settings.find();
    const settingsObj = {};
    settingsList.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    if (settingsObj.dynamicPricingEnabled === undefined) {
      settingsObj.dynamicPricingEnabled = false;
    }
    res.json(settingsObj);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/settings', authenticate, isAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    let setting = await Settings.findOne({ key });
    if (setting) {
      setting.value = value;
    } else {
      setting = new Settings({ key, value });
    }
    await setting.save();

    const settingsList = await Settings.find();
    const settingsObj = {};
    settingsList.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    if (settingsObj.dynamicPricingEnabled === undefined) {
      settingsObj.dynamicPricingEnabled = false;
    }
    res.json(settingsObj);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
