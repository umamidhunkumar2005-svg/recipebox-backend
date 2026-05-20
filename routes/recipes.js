const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const jwt = require('jsonwebtoken');

console.log("👉 Recipe routes file has successfully loaded!");

// --- SECURITY GUARD MIDDLEWARE ---
const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), 'mysecretkey');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// --- 1. GET ALL RECIPES ---
router.get('/', async (req, res) => {
  try {
    const recipes = await Recipe.find().populate('author', 'username');
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recipes' });
  }
});

// --- 2. ADVANCED SEARCH & FACETED FILTERING (Phase 2) ---
// CRITICAL: This MUST be placed ABOVE any routes with /:id parameters!
router.get('/search', async (req, res) => {
  try {
    const { query, tag } = req.query;
    let filter = {};

    if (query) {
      filter.title = { $regex: query, $options: 'i' };
    }

    if (tag) {
      filter.tags = { $regex: tag, $options: 'i' };
    }

    const filteredRecipes = await Recipe.find(filter).populate('author', 'username');
    res.json(filteredRecipes);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ message: 'Error processing your search filters' });
  }
});

// --- 3. CREATE A RECIPE (CLEAN ALIGNED PRODUCTION VERSION) ---
router.post('/create', authenticate, async (req, res) => {
  try {
    const { title, description, prepTimeMinutes, imageUrl, ingredients, instructions, tags } = req.body;

    const newRecipe = new Recipe({
      title,
      description,
      prepTimeMinutes: Number(prepTimeMinutes) || 0,
      imageUrl: imageUrl || '',
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      instructions: Array.isArray(instructions) ? instructions : [],
      tags: Array.isArray(tags) ? tags : [],
      author: req.user.id
    });

    const savedRecipe = await newRecipe.save();
    return res.status(201).json(savedRecipe);

  } catch (err) {
    console.error("🔥 DATABASE WRITING EXCEPTION:", err);
    return res.status(500).json({ message: "Database write failed", error: err.message });
  }
});

// --- 4. DELETE A RECIPE (GOD MODE) ---
// Notice there is NO 'authenticate' word here at all!
router.delete('/:id', async (req, res) => {
  try {
    const deletedRecipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!deletedRecipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error("🔥 Delete Error:", error);
    res.status(500).json({ message: 'Server error deleting recipe' });
  }
});

// --- 5. UPDATE A RECIPE ---
router.put('/:id', authenticate, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
    if (recipe.author.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

    const updatedRecipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { returnDocument: 'after' }
    );
    res.json(updatedRecipe);
  } catch (error) {
    res.status(500).json({ message: 'Server error during update' });
  }
});

// --- 6. ADD A REVIEW & STAR RATING (Phase 3) ---
router.post('/:id/reviews', authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const newReview = {
      user: req.user.username || 'Anonymous Chef',
      rating: Number(rating),
      comment
    };

    // Use findByIdAndUpdate to push the review instantly WITHOUT validating old recipe data
    const updatedRecipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      { $push: { reviews: newReview } },
      { new: true } // Returns the newly updated document
    );

    if (!updatedRecipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    res.status(201).json(updatedRecipe);
  } catch (error) {
    console.error("🔥 Review Error:", error);
    res.status(500).json({ message: 'Server error saving review', error: error.message });
  }
});

module.exports = router;
