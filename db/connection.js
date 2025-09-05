const mongoose = require("mongoose");

let isConnected = false; // Global connection state

async function connectDB() {
  if (isConnected) return; // Agar already connect hai to skip

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = db.connections[0].readyState;
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

module.exports = connectDB;
