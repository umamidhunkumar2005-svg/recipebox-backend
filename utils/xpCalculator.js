const User = require('../models/User');

const addXP = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    user.xp += amount;
    
    // Simple level-up logic: Every 100 XP = 1 Level
    user.level = Math.floor(user.xp / 100) + 1;
    
    await user.save();
  } catch (err) {
    console.error("XP Calculation Error:", err);
  }
};

module.exports = { addXP };
