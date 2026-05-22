const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const jwt = require('jsonwebtoken');

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

// --- 🌟 NEW: UPDATE LOGGED-IN USER PROFILE ---
router.put('/update-profile', authenticate, async (req, res) => {
  try {
    const { bio, profilePicture } = req.body;
    
    // Find the logged-in user and update only these two fields
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { bio, profilePicture } },
      { new: true } // Return the updated document
    ).select('-password'); // Never send passwords back!

    res.json(updatedUser);
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Server error updating profile." });
  }
});

// --- GET CHEFS YOU FOLLOW ---
router.get('/following', authenticate, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).populate('following', 'username profilePicture bio');
    if (!currentUser) return res.status(404).json({ message: 'User not found' });
    res.json(currentUser.following);
  } catch (error) {
    console.error("Fetch Following Error:", error);
    res.status(500).json({ message: "Server error fetching followed chefs." });
  }
});

// --- GET SPECIFIC CHEF PROFILE ---
router.get('/:id', authenticate, async (req, res) => {
  try {
    const chef = await User.findById(req.params.id).select('-password');
    if (!chef) return res.status(404).json({ message: 'Chef not found' });
    res.json(chef);
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    res.status(500).json({ message: "Server error fetching profile." });
  }
});

// --- FOLLOW / UNFOLLOW TOGGLE ---
router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    const loggedInUserId = req.user.id; 
    const targetUserId = req.params.id; 

    if (loggedInUserId === targetUserId) {
      return res.status(400).json({ message: "You cannot follow yourself." });
    }

    const loggedInUser = await User.findById(loggedInUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) return res.status(404).json({ message: "Chef not found." });

    const isFollowing = loggedInUser.following.includes(targetUserId);

    if (isFollowing) {
      loggedInUser.following = loggedInUser.following.filter(id => id.toString() !== targetUserId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== loggedInUserId);
      await Promise.all([loggedInUser.save(), targetUser.save()]); 
      return res.status(200).json({ message: `You unfollowed @${targetUser.username}` });
    } else {
      loggedInUser.following.push(targetUserId);
      targetUser.followers.push(loggedInUserId);
      await Promise.all([loggedInUser.save(), targetUser.save()]);
      return res.status(200).json({ message: `You are now following @${targetUser.username}` });
    }

  } catch (error) {
    console.error("Follow Error:", error);
    res.status(500).json({ message: "Server error handling social action." });
  }
});

module.exports = router;
