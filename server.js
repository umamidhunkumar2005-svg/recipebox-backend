require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize the Express app
const app = express();
const PORT = 5000;

// Middleware: Allows your server to read JSON data
app.use(express.json());
app.use(cors());

// Import Routes
const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes'); // Added Recipe Routes

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes); // Added Recipe Route usage

// Connect to Database
console.log("🔗 Connecting to database:", process.env.MONGO_URI); // This will prove it's reading the cloud link!

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
