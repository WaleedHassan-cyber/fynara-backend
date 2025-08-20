const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Target",
    required: true,
  },
  totalEarned:{
    type: Number,
    required: true,
  },
  profitLoss: {
    type: Number,
    required: true,
  },
  categoryBreakdown: {
    type: Map,
    of: Number, // Key-value pairs for category and its amount
  },
  dateGenerated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Report", reportSchema);
