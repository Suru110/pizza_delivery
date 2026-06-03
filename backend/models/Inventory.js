import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['base', 'sauce', 'cheese', 'veggies', 'meat'],
  },
  stock: {
    type: Number,
    required: true,
    default: 100,
  },
  threshold: {
    type: Number,
    required: true,
    default: 20,
  },
  price: {
    type: Number,
    required: true,
    default: 0,
  },
}, {
  timestamps: true,
});

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
