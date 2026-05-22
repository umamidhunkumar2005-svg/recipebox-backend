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

// --- 🌟 NEW: GET CHEFS YOU FOLLOW ---
router.get('/following', authenticate, async (req, res) => {
  try {
    // Find the logged in user, and 'populate' their following array with the actual profile data!
    const currentUser = await User.findById(req.user.id).populate('following', 'username profilePicture bio');
    
    if (!currentUser) return res.status(404).json({ message: 'User not found' });
    
    // Send the array of chef profiles back to the frontend
    res.json(currentUser.following);
  } catch (error) {
    console.error("Fetch Following Error:", error);
    res.status(500).json({ message: "Server error fetching followed chefs." });
  }
});

// @route   POST /api/users/:id/follow
// @desc    Follow or Unfollow a user (Toggle)
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
      // UNFOLLOW LOGIC
      loggedInUser.following = loggedInUser.following.filter(id => id.toString() !== targetUserId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== loggedInUserId);
      await Promise.all([loggedInUser.save(), targetUser.save()]); 
      return res.status(200).json({ message: `You unfollowed @${targetUser.username}` });
    } else {
      // FOLLOW LOGIC
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
