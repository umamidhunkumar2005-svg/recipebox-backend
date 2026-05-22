const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const jwt = require('jsonwebtoken');

// --- SECURITY GUARD MIDDLEWARE (Matches your setup!) ---
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

// @route   POST /api/users/:id/follow
// @desc    Follow or Unfollow a user (Toggle)
// @access  Private (Requires Token)
router.post('/:id/follow', authenticate, async (req, res) => {
  try {
    const loggedInUserId = req.user.id; // Adjusted to match your JWT payload perfectly
    const targetUserId = req.params.id; // From the URL

    // 1. Prevent users from following themselves
    if (loggedInUserId === targetUserId) {
      return res.status(400).json({ message: "You cannot follow yourself." });
    }

    // 2. Find both users in the database
    const loggedInUser = await User.findById(loggedInUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "Chef not found." });
    }

    // 3. Check if they are already following
    const isFollowing = loggedInUser.following.includes(targetUserId);

    if (isFollowing) {
      // 🔴 UNFOLLOW LOGIC
      loggedInUser.following = loggedInUser.following.filter(id => id.toString() !== targetUserId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== loggedInUserId);
      
      await Promise.all([loggedInUser.save(), targetUser.save()]); 
      return res.status(200).json({ message: `You unfollowed @${targetUser.username}` });
    
    } else {
      // 🟢 FOLLOW LOGIC
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
