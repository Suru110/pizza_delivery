import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Pizza from './models/Pizza.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
console.log('Using MONGO_URI:', MONGO_URI);

async function testConnection() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Successfully connected to MongoDB.');
    const pizzas = await Pizza.find({});
    console.log('Number of pizzas found in DB:', pizzas.length);
    pizzas.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name} - ${p.description.includes('(Veg)') ? 'Veg' : 'Non-Veg'} - $${p.price}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Connection error:', error);
    process.exit(1);
  }
}

testConnection();
