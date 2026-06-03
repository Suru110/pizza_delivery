import express from 'express';
import Inventory from '../models/Inventory.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/inventory
// @desc    Get all inventory items (open to all authenticated users for pizza customizer)
router.get('/', authenticate, async (req, res) => {
  try {
    const items = await Inventory.find({});
    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ message: 'Server error fetching inventory.' });
  }
});

// @route   PUT /api/inventory/:id
// @desc    Update stock, threshold, or price of an item (Admin only)
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { stock, threshold, price, name } = req.body;
    const item = await Inventory.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found.' });
    }

    if (stock !== undefined) item.stock = stock;
    if (threshold !== undefined) item.threshold = threshold;
    if (price !== undefined) item.price = price;
    if (name !== undefined) item.name = name;

    await item.save();
    res.json(item);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ message: 'Server error updating inventory item.' });
  }
});

// @route   POST /api/inventory/refill
// @desc    Admin batch refill or reset stock (Admin only)
router.post('/refill', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, stock }
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid payload. Array of items required.' });
    }

    const updatedItems = [];
    for (const update of items) {
      const item = await Inventory.findById(update.id);
      if (item) {
        item.stock = update.stock;
        await item.save();
        updatedItems.push(item);
      }
    }
    
    res.json({ message: 'Inventory refilled successfully', updatedItems });
  } catch (error) {
    console.error('Error refilling inventory:', error);
    res.status(500).json({ message: 'Server error refilling inventory.' });
  }
});

// @route   POST /api/inventory/seed
// @desc    Seed initial items if empty (Admin only)
router.post('/seed', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const count = await Inventory.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Inventory is already seeded.' });
    }

    const defaultItems = [
      // Bases
      { name: 'Thin Crust', category: 'base', stock: 100, threshold: 20, price: 5.00 },
      { name: 'Thick Crust', category: 'base', stock: 100, threshold: 20, price: 6.00 },
      { name: 'Gluten-Free Crust', category: 'base', stock: 50, threshold: 10, price: 8.00 },
      { name: 'Stuffed Crust', category: 'base', stock: 80, threshold: 15, price: 7.50 },
      { name: 'Flatbread', category: 'base', stock: 90, threshold: 15, price: 5.50 },
      
      // Sauces
      { name: 'Classic Marinara', category: 'sauce', stock: 100, threshold: 20, price: 1.00 },
      { name: 'Creamy Alfredo', category: 'sauce', stock: 80, threshold: 15, price: 1.50 },
      { name: 'Basil Pesto', category: 'sauce', stock: 70, threshold: 15, price: 2.00 },
      { name: 'Tangy BBQ', category: 'sauce', stock: 90, threshold: 15, price: 1.25 },
      { name: 'Spicy Buffalo', category: 'sauce', stock: 80, threshold: 15, price: 1.25 },
      
      // Cheeses
      { name: 'Mozzarella', category: 'cheese', stock: 120, threshold: 25, price: 1.50 },
      { name: 'Cheddar', category: 'cheese', stock: 90, threshold: 15, price: 1.75 },
      { name: 'Parmesan', category: 'cheese', stock: 100, threshold: 15, price: 1.50 },
      { name: 'Feta Cheese', category: 'cheese', stock: 60, threshold: 10, price: 2.25 },
      { name: 'Vegan Cheese', category: 'cheese', stock: 50, threshold: 10, price: 2.50 },
      
      // Veggies
      { name: 'Cherry Tomatoes', category: 'veggies', stock: 150, threshold: 20, price: 0.75 },
      { name: 'Button Mushrooms', category: 'veggies', stock: 120, threshold: 20, price: 0.80 },
      { name: 'Red Onions', category: 'veggies', stock: 150, threshold: 20, price: 0.60 },
      { name: 'Bell Peppers', category: 'veggies', stock: 120, threshold: 20, price: 0.75 },
      { name: 'Black Olives', category: 'veggies', stock: 100, threshold: 15, price: 0.90 },
      { name: 'Baby Spinach', category: 'veggies', stock: 80, threshold: 15, price: 0.85 },
      { name: 'Jalapenos', category: 'veggies', stock: 90, threshold: 15, price: 0.75 },
      
      // Meats
      { name: 'Pepperoni', category: 'meat', stock: 110, threshold: 20, price: 1.75 },
      { name: 'Grilled Chicken', category: 'meat', stock: 90, threshold: 15, price: 2.00 },
      { name: 'Italian Sausage', category: 'meat', stock: 80, threshold: 15, price: 1.90 },
      { name: 'Crispy Bacon', category: 'meat', stock: 70, threshold: 15, price: 2.25 }
    ];

    await Inventory.insertMany(defaultItems);
    res.status(201).json({ message: 'Default inventory seeded successfully.' });
  } catch (error) {
    console.error('Error seeding inventory:', error);
    res.status(500).json({ message: 'Server error seeding inventory.' });
  }
});

export default router;
