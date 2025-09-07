const mongoose = require("mongoose");
const Target = require("../models/Target.js"); // adjust path
const Earning = require("../models/Earning.js");
const Report = require("../models/Report.js");
const connectDB = require("../db/connection.js");

export default async function handler(req, res) {
  try {
    await connectDB(); // Connect to MongoDB

    const now = new Date();

    // Find active targets whose endDate has passed
    const targetsToExpire = await Target.find({
      status: "active",
      endDate: { $lte: now },
    });

    if (targetsToExpire.length === 0) {
      console.log("No targets to expire at this time.");
      return res.status(200).json({ message: "No targets to expire" });
    }

    for (const target of targetsToExpire) {
      const result = await Earning.aggregate([
        {
          $match: { targetId: new mongoose.Types.ObjectId(target._id) },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const totalEarned = result.length > 0 ? result[0].totalAmount : 0;
      const profitLoss = totalEarned - target.amount;

      // Create report
      const reportData = {
        targetId: target._id,
        totalEarned,
        profitLoss,
        dateGenerated: now,
      };
      await Report.create(reportData);

      // Update target status to expired
      target.status = "expired";
      await target.save();
    }

    res.status(200).json({ message: "Expired targets processed" });
  } catch (error) {
    console.error("Error processing targets:", error);
    res.status(500).json({ message: "Error processing targets", error });
  }
}
