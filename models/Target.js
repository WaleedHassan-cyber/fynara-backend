// models/Target.js
const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
   startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'completed'],
    default: 'active',
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Target', targetSchema);
