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

// --- 1. GET ALL RECIPES (STRICTLY PRIVATE) ---
// Added 'authenticate' and locked the database search to the user's ID
router.get('/', authenticate, async (req, res) => {
  try {
    // Only find recipes where the author matches the logged-in user
    const recipes = await Recipe.find({ author: req.user.id }).populate('author', 'username');
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recipes' });
  }
});

// --- 2. ADVANCED SEARCH & FACETED FILTERING (STRICTLY PRIVATE) ---
router.get('/search', authenticate, async (req, res) => {
  try {
    const { query, tag } = req.query;
    
    // Start the filter by locking it to the active user immediately
    let filter = { author: req.user.id };

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

// --- 3. CREATE A RECIPE ---
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

// --- 4. DELETE A RECIPE (GOD MODE REVOKED) ---
// Added 'authenticate' and a strict ownership check
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // findOneAndDelete ensures we only delete if BOTH the ID matches AND the author matches the logged-in user
    const deletedRecipe = await Recipe.findOneAndDelete({ 
        _id: req.params.id, 
        author: req.user.id 
    });

    if (!deletedRecipe) {
      return res.status(404).json({ message: 'Recipe not found or you do not have permission to delete it.' });
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

// --- 6. ADD A REVIEW ---
router.post('/:id/reviews', authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const newReview = {
      user: req.user.username || 'Anonymous Chef',
      rating: Number(rating),
      comment
    };

    const updatedRecipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      { $push: { reviews: newReview } },
      { new: true } 
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
