const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const User = require('../models/User'); 
const jwt = require('jsonwebtoken');

console.log("👉 Recipe routes file has successfully loaded!");

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

router.get('/', authenticate, async (req, res) => {
  try {
    const recipes = await Recipe.find({ author: req.user.id }).populate('author', 'username');
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recipes' });
  }
});

router.get('/feed', authenticate, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    const feedRecipes = await Recipe.find({
      author: { $in: currentUser.following }
    })
    .populate('author', 'username profilePicture') 
    .sort({ createdAt: -1 }); 

    res.json(feedRecipes);
  } catch (error) {
    console.error("🔥 Feed Error:", error);
    res.status(500).json({ message: 'Error fetching the social feed' });
  }
});

router.get('/explore', authenticate, async (req, res) => {
  try {
    const exploreRecipes = await Recipe.find({ 
      author: { $ne: req.user.id } 
    })
    .populate('author', 'username profilePicture')
    .sort({ createdAt: -1 }); 

    res.json(exploreRecipes);
  } catch (error) {
    console.error("🔥 Explore Error:", error);
    res.status(500).json({ message: 'Error fetching the explore feed' });
  }
});

// --- 🌟 NEW: GET A SPECIFIC CHEF'S RECIPES ---
router.get('/chef/:id', authenticate, async (req, res) => {
  try {
    const recipes = await Recipe.find({ author: req.params.id })
      .populate('author', 'username profilePicture bio')
      .sort({ createdAt: -1 });
    res.json(recipes);
  } catch (error) {
    console.error("Chef Recipes Error:", error);
    res.status(500).json({ message: 'Error fetching chef recipes' });
  }
});

router.get('/search', authenticate, async (req, res) => {
  try {
    const { query, tag } = req.query;
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
