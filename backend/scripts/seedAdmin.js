import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import userModel from "../src/models/user.model.js";
import config from "../src/config/env.js";

// Get the email from the command line
const email = process.argv[2];

// Stop if no email was provided
if (!email) {
  console.log("Usage: node scripts/seedAdmin.js someone@example.com");
  process.exit(1);
}

// Connect to MongoDB before updating the user
await mongoose.connect(config.MONGO_URI);

// Find the user by email and change their role to admin
const user = await userModel.findOneAndUpdate(
  { email },
  { role: "admin" },
  { new: true }
);

// Check whether the user actually exists
if (!user) {
  console.log(
    "No user found with that email — make sure they've already registered."
  );
} else {
  console.log(`${user.username} is now an admin.`);
}

// Close the database connection when done
await mongoose.disconnect();