import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import inventoryRoutes from './routes/inventory.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import couponRoutes from './routes/coupons.js';

// Import Inventory model for seeding
import Inventory from './models/Inventory.js';
import Pizza from './models/Pizza.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5174', // Fallback for secondary ports (dev only)
  'http://localhost:3000'  // Fallback for secondary ports (dev only)
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(new Error('CORS Policy block'), false);
  },
  credentials: true
}));

app.use(express.json());

// Set up Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT'],
    credentials: true
  }
});

// Share socket.io reference with Express app to trigger events from routes
app.set('io', io);

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User joins a personal room named after their User ID to receive private status updates
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`User socket ${socket.id} joined room: ${userId}`);
    }
  });

  // Admin joins the admin group
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log(`Socket ${socket.id} joined admin-room`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coupons', couponRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Pizza Delivery API is running.' });
});

// Seeding Helper on Startup
async function seedDatabase() {
  try {
    // Seed Inventory if empty
    const inventoryCount = await Inventory.countDocuments();
    if (inventoryCount === 0) {
      console.log('Seeding default inventory items...');
      const defaultInventory = [
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
      await Inventory.insertMany(defaultInventory);
      console.log('Seeded inventory.');
    }

    // Seed preset menu if it does not contain exactly 10 items or needs image updates
    const menuCount = await Pizza.countDocuments();
    const hasBadImages = await Pizza.exists({
      $or: [
        { image: { $regex: /loremflickr/i } },
        { image: { $regex: /bing/i } }
      ]
    });
    
    if (menuCount !== 10 || hasBadImages) {
      console.log('Seeding/resetting default menu items to contain 5 Veg and 5 Non-Veg pizzas with high-quality images...');
      await Pizza.deleteMany({});
      const defaultPizzas = [
        // 5 VEG PIZZAS
        {
          name: 'Classic Margherita',
          description: 'A traditional favorite with classic marinara sauce, fresh mozzarella cheese, and sweet cherry tomatoes. (Veg)',
          price: 11.99,
          image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Garden Veggie Supreme',
          description: 'A garden mix of bell peppers, red onions, button mushrooms, baby spinach, black olives, marinara, and mozzarella. (Veg)',
          price: 14.49,
          image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Four Cheese Fantasy',
          description: 'A rich blend of Mozzarella, Cheddar, Parmesan, and Feta cheese on a garlic butter base. (Veg)',
          price: 13.99,
          image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Paneer Tikka Burst',
          description: 'Spicy paneer chunks, crisp capsicum, onions, and red paprika on a tandoori sauce base. (Veg)',
          price: 15.99,
          image: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Mushroom & Truffle Oil',
          description: 'Roasted mushrooms, caramelized onions, mozzarella, finished with a drizzle of premium truffle oil. (Veg)',
          price: 16.49,
          image: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=600&auto=format&fit=crop&q=80'
        },
        // 5 NON-VEG PIZZAS
        {
          name: 'Double Pepperoni',
          description: 'Loaded with a double serving of spicy pepperoni slices, classic marinara, and melted mozzarella cheese.',
          price: 13.99,
          image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Smokey BBQ Chicken',
          description: 'Tender grilled chicken, crispy bacon, red onions, tangy BBQ sauce base, topped with mozzarella and cheddar cheese.',
          price: 15.99,
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Meat Lover\'s Dream',
          description: 'A hearty feast featuring spicy sausage, smoked bacon, ham, and pepperoni on a rich tomato base.',
          price: 17.99,
          image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Spicy Buffalo Blast',
          description: 'Grilled chicken, jalapenos, blue cheese crumbles, spicy buffalo sauce base, mozzarella, and a ranch drizzle.',
          price: 15.49,
          image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600&auto=format&fit=crop&q=80'
        },
        {
          name: 'Chicken Supreme',
          description: 'Herbed chicken pieces, black olives, sliced mushrooms, and bell peppers with mozzarella cheese.',
          price: 16.49,
          image: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=600&auto=format&fit=crop&q=80'
        }
      ];
      await Pizza.insertMany(defaultPizzas);
      console.log('Seeded 10 menu pizzas (5 Veg, 5 Non-Veg) with verified Unsplash URLs.');
    }
  } catch (error) {
    console.error('Error seeding database:', error.message);
  }
}

// Connect to MongoDB & Start Server
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pizza_delivery'; // Dev fallback only
const PORT = process.env.PORT || 5000;

console.log('Connecting to MongoDB...');
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully.');
    
    // Seed initial database items
    await seedDatabase();

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB database connection error:', err.message);
    console.warn('\n⚠️ BACKEND CANNOT START WITHOUT MONGODB RUNNING! ⚠️');
    console.warn('Please check that MongoDB is installed and running, or configure MONGO_URI in your backend/.env file.\n');
  });
