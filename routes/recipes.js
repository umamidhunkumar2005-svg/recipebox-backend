const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const User = require('../models/User'); // 🌟 NEW: Needed to check who the user follows!
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

// --- 1. GET ALL RECIPES (YOUR PRIVATE VAULT) ---
router.get('/', authenticate, async (req, res) => {
  try {
    const recipes = await Recipe.find({ author: req.user.id }).populate('author', 'username');
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recipes' });
  }
});

// --- 🌟 NEW: 1.5 GET SOCIAL FEED (RECIPES FROM FOLLOWED CHEFS) ---
router.get('/feed', authenticate, async (req, res) => {
  try {
    // 1. Find the logged-in user in the database to get their 'following' list
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    // 2. The Algorithm: Find recipes where the author's ID is inside your following array!
    const feedRecipes = await Recipe.find({
      author: { $in: currentUser.following }
    })
    .populate('author', 'username profilePicture') // Pull in the author's details
    .sort({ createdAt: -1 }); // Sort by newest posts first

    res.json(feedRecipes);
  } catch (error) {
    console.error("🔥 Feed Error:", error);
    res.status(500).json({ message: 'Error fetching the social feed' });
  }
});

// --- 🌟 NEW: 1.8 GET EXPLORE FEED (ALL OTHER CHEFS) ---
router.get('/explore', authenticate, async (req, res) => {
  try {
    // Find ALL recipes where the author is NOT ($ne) the currently logged-in user
    const exploreRecipes = await Recipe.find({ 
      author: { $ne: req.user.id } 
    })
    .populate('author', 'username profilePicture')
    .sort({ createdAt: -1 }); // Newest first

    res.json(exploreRecipes);
  } catch (error) {
    console.error("🔥 Explore Error:", error);
    res.status(500).json({ message: 'Error fetching the explore feed' });
  }
});

// --- 2. ADVANCED SEARCH & FACETED FILTERING ---
router.get('/search', authenticate, async (req, res) => {
  try {
    const { query, tag } = req.query;
    
    let filter = { author: req.user.id }; // Currently restricted to private search

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

// --- 4. DELETE A RECIPE ---
router.delete('/:id', authenticate, async (req, res) => {
  try {
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
