import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import User from '../models/User.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { sendLowStockAlertEmail } from '../utils/mailer.js';

const router = express.Router();

const getWalletDiscountPercent = (points) => {
  const redeemablePoints = Math.floor(points / 50) * 50;
  return Math.min(100, Math.floor((redeemablePoints / 50) * 2.5));
};

// Initialize Razorpay
// Wrap in try-catch/fallback in case keys are empty or invalid
let razorpay;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_ID !== 'rzp_test_dummykeyid123') {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
} catch (err) {
  console.warn('Razorpay SDK failed to initialize. Using dummy simulation mode.', err.message);
}

// Ingredients mapping for predefined pizzas
const presetIngredientsMap = {
  'Classic Margherita': {
    base: 'Thin Crust',
    sauce: 'Classic Marinara',
    cheese: 'Mozzarella',
    veggies: ['Cherry Tomatoes'],
    meats: []
  },
  'Double Pepperoni': {
    base: 'Thin Crust',
    family: 'Thin Crust', // aliases or normalized names
    sauce: 'Classic Marinara',
    cheese: 'Mozzarella',
    veggies: [],
    meats: ['Pepperoni']
  },
  'Garden Veggie Supreme': {
    base: 'Thin Crust',
    sauce: 'Classic Marinara',
    cheese: 'Mozzarella',
    veggies: ['Bell Peppers', 'Red Onions', 'Button Mushrooms', 'Baby Spinach', 'Black Olives'],
    meats: []
  },
  'Smokey BBQ Chicken': {
    base: 'Thick Crust',
    sauce: 'Tangy BBQ',
    cheese: 'Mozzarella',
    veggies: ['Red Onions'],
    meats: ['Grilled Chicken', 'Crispy Bacon']
  },
  'Spicy Buffalo Blast': {
    base: 'Thin Crust',
    sauce: 'Spicy Buffalo',
    cheese: 'Mozzarella',
    veggies: ['Jalapenos'],
    meats: ['Grilled Chicken']
  }
};

// Helper: Resolve an order item's ingredients
const resolveIngredients = (item) => {
  if (item.isCustom) {
    return {
      base: item.base,
      sauce: item.sauce,
      cheese: item.cheese,
      veggies: item.veggies || [],
      meats: item.meats || []
    };
  }
  
  const preset = presetIngredientsMap[item.name];
  if (preset) {
    return preset;
  }
  
  // Default fallback if unknown preset
  return {
    base: item.base || 'Thin Crust',
    sauce: item.sauce || 'Classic Marinara',
    cheese: item.cheese || 'Mozzarella',
    veggies: item.veggies || [],
    meats: item.meats || []
  };
};

// Helper: Aggregate all required ingredients in an order
const calculateTotalIngredientsNeeded = (items) => {
  const requirements = {}; // name -> quantity

  items.forEach(item => {
    const ingredients = resolveIngredients(item);
    const qty = item.quantity || 1;

    // Add base
    if (ingredients.base) {
      requirements[ingredients.base] = (requirements[ingredients.base] || 0) + qty;
    }
    // Add sauce
    if (ingredients.sauce) {
      requirements[ingredients.sauce] = (requirements[ingredients.sauce] || 0) + qty;
    }
    // Add cheese
    if (ingredients.cheese) {
      requirements[ingredients.cheese] = (requirements[ingredients.cheese] || 0) + qty;
    }
    // Add veggies
    if (ingredients.veggies) {
      ingredients.veggies.forEach(v => {
        requirements[v] = (requirements[v] || 0) + qty;
      });
    }
    // Add meats
    if (ingredients.meats) {
      ingredients.meats.forEach(m => {
        requirements[m] = (requirements[m] || 0) + qty;
      });
    }
  });

  return requirements;
};

// Helper: Check stock availability
const checkStockAvailability = async (requirements) => {
  const outOfStock = [];
  for (const [name, qtyNeeded] of Object.entries(requirements)) {
    const item = await Inventory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (!item || item.stock < qtyNeeded) {
      outOfStock.push({
        name,
        needed: qtyNeeded,
        available: item ? item.stock : 0
      });
    }
  }
  return outOfStock;
};

// Helper: Decrement stock levels and trigger threshold warnings
const deductInventoryAndAlert = async (requirements) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@pizzadelivery.com';
  
  for (const [name, qtyNeeded] of Object.entries(requirements)) {
    const item = await Inventory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (item) {
      const oldStock = item.stock;
      item.stock = Math.max(0, item.stock - qtyNeeded);
      await item.save();

      // Trigger email alert if stock falls below threshold
      if (item.stock < item.threshold && oldStock >= item.threshold) {
        console.log(`Alert! ${item.name} stock (${item.stock}) is below threshold (${item.threshold}). Triggering alert email...`);
        await sendLowStockAlertEmail(adminEmail, item.name, item.stock, item.threshold);
      }
    }
  }
};

// @route   GET /api/orders
// @desc    Get user orders (Users see their own, admins see all)
router.get('/', authenticate, async (req, res) => {
  try {
    let orders;
    if (req.user.role === 'admin') {
      // Admins see all non-pending orders
      orders = await Order.find({ paymentStatus: { $ne: 'pending' } }).populate('user', 'name email').sort({ createdAt: -1 });
    } else {
      // Users see their own non-pending orders
      orders = await Order.find({ user: req.user.id, paymentStatus: { $ne: 'pending' } }).sort({ createdAt: -1 });
    }
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error fetching orders.' });
  }
});

// @route   POST /api/orders
// @desc    Create a new order, check stock, generate Razorpay payment order
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, deliveryAddress, discountApplied, pointsUsed } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty. Cannot create order.' });
    }

    const baseTotal = items.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
    const couponDiscount = Math.min(Math.max(Number(discountApplied) || 0, 0), baseTotal);
    const payableBeforeWallet = Math.max(0, baseTotal - couponDiscount);
    const user = await User.findById(req.user.id);
    const availablePoints = user ? user.rewardPoints : 0;
    const requestedPoints = Math.max(Number(pointsUsed) || 0, 0);
    const pointsToUse = Math.min(
      Math.floor(requestedPoints / 50) * 50,
      Math.floor(availablePoints / 50) * 50,
      2000
    );
    const walletDiscountPercent = getWalletDiscountPercent(pointsToUse);
    const walletDiscount = payableBeforeWallet * (walletDiscountPercent / 100);
    const finalTotal = Math.max(0, payableBeforeWallet - walletDiscount);
    const pointsEarned = Math.floor(finalTotal);

    // 1. Check stock availability before checking out
    const requirements = calculateTotalIngredientsNeeded(items);
    const outOfStockItems = await checkStockAvailability(requirements);

    if (outOfStockItems.length > 0) {
      const details = outOfStockItems.map(item => `${item.name} (Need: ${item.needed}, Available: ${item.available})`).join(', ');
      return res.status(400).json({ 
        message: 'Some ingredients are out of stock. Please modify your order.',
        outOfStock: outOfStockItems,
        details 
      });
    }

    // 2. Create local pending order record
    const newOrder = new Order({
      user: req.user.id,
      items,
      totalAmount: finalTotal,
      deliveryAddress: deliveryAddress || 'Pickup',
      discountApplied: couponDiscount,
      pointsUsed: pointsToUse,
      pointsEarned: pointsEarned || 0,
      paymentStatus: 'pending',
      orderStatus: 'Order Received'
    });

    await newOrder.save();

    // 3. Create Razorpay order (real or mock)
    let rzpOrder = null;
    if (razorpay) {
      try {
        const options = {
          amount: Math.round(finalTotal * 100), // amount in paise
          currency: 'INR',
          receipt: `receipt_order_${newOrder._id.toString().substring(0, 10)}`,
        };
        rzpOrder = await razorpay.orders.create(options);
        newOrder.razorpayOrderId = rzpOrder.id;
        await newOrder.save();
      } catch (err) {
        console.warn('Razorpay order creation failed, falling back to mock.', err.message);
      }
    }

    // Fallback to mock Razorpay order if SDK wasn't initialized or failed
    if (!newOrder.razorpayOrderId) {
      newOrder.razorpayOrderId = `order_mock_${newOrder._id.toString().substring(14)}`;
      await newOrder.save();
    }

    res.status(201).json({
      order: newOrder,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummykeyid123',
      isMock: newOrder.razorpayOrderId.startsWith('order_mock_')
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error creating order.' });
  }
});

// @route   POST /api/orders/verify-payment
// @desc    Verify payment signature, complete order, update inventory, alert low stock
router.post('/verify-payment', authenticate, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      order_id,
      is_simulated 
    } = req.body;

    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    let isSuccess = false;

    // A. Check for simulated successful payment
    if (is_simulated || (razorpay_order_id && razorpay_order_id.startsWith('order_mock_'))) {
      isSuccess = true;
      order.razorpayPaymentId = razorpay_payment_id || `pay_mock_${Date.now().toString().slice(-6)}`;
      order.razorpayOrderId = razorpay_order_id || order.razorpayOrderId;
    } else if (razorpay && razorpay_signature) {
      // B. Real Razorpay signature verification
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature === razorpay_signature) {
        isSuccess = true;
        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpayOrderId = razorpay_order_id;
      }
    }

    if (!isSuccess) {
      order.paymentStatus = 'failed';
      await order.save();
      return res.status(400).json({ message: 'Payment verification failed.' });
    }

    // 1. Update order payment status
    order.paymentStatus = 'paid';
    await order.save();

    // 2. Deduct inventory and send email alerts if thresholds are breached
    const requirements = calculateTotalIngredientsNeeded(order.items);
    await deductInventoryAndAlert(requirements);

    // 2.5 Grant points to user and deduct used points
    const user = await User.findById(order.user);
    if (user) {
      if (order.pointsUsed > 0) {
        user.rewardPoints = Math.max(0, user.rewardPoints - order.pointsUsed);
      }
      user.rewardPoints += order.pointsEarned;
      await user.save();
    }

    // 3. Emit websocket event for order dashboard updates
    const io = req.app.get('io');
    if (io) {
      // Notify both all admins (to show new order) and the specific user (to update tracking)
      io.emit('new-order', order);
      io.to(order.user.toString()).emit('order-update', order);
    }

    res.json({ message: 'Payment verified and order confirmed successfully.', order });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Server error verifying payment.' });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order preparation/delivery status (Admin only)
router.put('/:id/status', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Order Received', 'Sent to kitchen', 'Sent to delivery', 'Delivered'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status.' });
    }

    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    order.orderStatus = status;
    await order.save();

    // Trigger real-time status update to client via Socket.io
    const io = req.app.get('io');
    if (io) {
      // Emit to user room so the client dashboard updates instantly
      io.to(order.user._id.toString()).emit('order-update', order);
      // Also emit globally for admin dashboards
      io.emit('order-status-changed-admin', order);
    }

    res.json({ message: `Order status updated to: ${status}`, order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error updating order status.' });
  }
});

// @route   POST /api/orders/:id/rate
// @desc    Rate and review a delivered order
router.post('/:id/rate', authenticate, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (order.orderStatus !== 'Delivered') return res.status(400).json({ message: 'Order must be delivered to rate' });

    order.rating = rating;
    order.review = review;
    await order.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
