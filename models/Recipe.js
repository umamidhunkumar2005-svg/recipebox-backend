const mongoose = require('mongoose');

// Create a small sub-schema for reviews
const reviewSchema = new mongoose.Schema({
  user: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const RecipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  prepTimeMinutes: { type: Number, required: true },
  imageUrl: { type: String, default: '' },
  ingredients: [
    {
      name: { type: String, required: true },
      quantity: { type: String, default: '1' },
      unit: { type: String, default: 'item' }
    }
  ],
  instructions: [{ type: String, required: true }],
  tags: [{ type: String }],
  
  // NEW: Added reviews array here!
  reviews: [reviewSchema],

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Recipe', RecipeSchema);
