require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize the Express app
const app = express();
const PORT = 5000;

// Middleware: Allows your server to read JSON data
// Add the { limit: '10mb' } option to your json middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Import Routes
const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes'); 
const userRoutes = require('./routes/userRoutes'); // 🌟 NEW: Added User/Social Routes

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes); 
app.use('/api/users', userRoutes); // 🌟 NEW: Activated User/Social Routes

// Connect to Database
console.log("🔗 Connecting to database:", process.env.MONGO_URI); 

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB officially connected!'))
  .catch(err => console.error('🔥 MongoDB Connection Error:', err));

// A simple test route
app.get('/', (req, res) => {
  res.send('Welcome to the RecipeBox API!');
});

// Turn the server on
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
