import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Pizza from './models/Pizza.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pizza-delivery'; // Dev fallback only

const pizzas = [
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

const seedMenu = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');
    
    await Pizza.deleteMany({});
    console.log('Cleared existing pizzas');

    await Pizza.insertMany(pizzas);
    console.log('Successfully inserted 10 pizzas (5 Veg, 5 Non-Veg)');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedMenu();
