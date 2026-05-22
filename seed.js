// seed.js - Database Population Script
require('dotenv').config();
const mongoose = require('mongoose');
const Recipe = require('./models/Recipe'); // Adjust path if your model is in a different folder

const dummyRecipes = [
  {
    title: "Classic Margherita Pizza",
    description: "A simple, authentic Italian pizza.",
    prepTimeMinutes: 20,
    ingredients: [
      { name: "Pizza Dough", quantity: "1", unit: "item" },
      { name: "San Marzano Tomatoes", quantity: "400", unit: "g" },
      { name: "Fresh Mozzarella", quantity: "200", unit: "g" }
    ],
    instructions: ["Preheat oven to 500F", "Stretch dough", "Add sauce and cheese", "Bake for 10 minutes"],
    tags: ["Vegetarian", "Dinner", "Italian"]
  },
  {
    title: "Avocado Toast with Egg",
    description: "The ultimate quick and healthy breakfast.",
    prepTimeMinutes: 10,
    ingredients: [
      { name: "Sourdough Bread", quantity: "2", unit: "slices" },
      { name: "Avocado", quantity: "1", unit: "item" },
      { name: "Eggs", quantity: "2", unit: "item" }
    ],
    instructions: ["Toast the bread", "Mash the avocado", "Fry the eggs", "Assemble and season"],
    tags: ["Breakfast", "Healthy", "Quick"]
  }
];

// Connect to MongoDB and Seed
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("🔗 Connected to DB. Seeding dummy recipes...");
    // Clear existing data (optional) and insert new
    await Recipe.insertMany(dummyRecipes);
    console.log("✅ Database seeded successfully!");
    process.exit();
  })
  .catch(err => {
    console.error("🔥 Seeding Error:", err);
    process.exit(1);
  });
  