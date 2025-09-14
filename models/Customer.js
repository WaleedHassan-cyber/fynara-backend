const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  cartItems: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number, default: 1 },
      selectedColor:{type: String, default: "Main Color"},
      selectedSize: {type: String, default: "M"},
      price: Number,
    },
  ],
  address: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  token: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("Customer", customerSchema);
