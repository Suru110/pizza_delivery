import express from 'express';
import Coupon from '../models/Coupon.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/coupons/validate
// @desc    Validate a promo code
router.post('/validate', authenticate, async (req, res) => {
  try {
    const { code, cartTotal } = req.body;
    if (!code) return res.status(400).json({ message: 'Coupon code required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
    
    if (!coupon.isActive) return res.status(400).json({ message: 'Coupon is inactive or expired' });
    
    if (cartTotal < coupon.minAmount) {
      return res.status(400).json({ message: `Minimum order amount of $${coupon.minAmount} required` });
    }

    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
