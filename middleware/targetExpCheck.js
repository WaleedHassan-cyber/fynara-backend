const mongoose = require("mongoose");
const Target = require("../models/Target.js");
const Earning = require("../models/Earning.js");
const Report = require("../models/Report.js");

const checkAndExpireTargets = async (req, res, next) => {
  console.log("Running expiration check...");

  try {
    const now = new Date();

    // Find active targets whose endDate has passed
    const targetsToExpire = await Target.find({
      status: "active",
      endDate: { $lte: now },
    });

    console.log("Targets to expire:", targetsToExpire);

    if (targetsToExpire.length === 0) {
      console.log("No targets to expire at this time.");
      return next(); // ✅ don't stop the request
    }

    for (const target of targetsToExpire) {
      // Aggregate total earnings for this target
      const result = await Earning.aggregate([
        {
          $match: {
            targetId: new mongoose.Types.ObjectId(target._id),
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      console.log("result", result);

      const totalEarned = result.length > 0 ? result[0].totalAmount : 0;
      const profitLoss = totalEarned - target.amount;

      console.log(
        profitLoss >= 0 ? `Profit: $${profitLoss}` : `Loss: $${-profitLoss}`
      );

      // Create and save report
      const reportData = {
        targetId: target._id,
        totalEarned,
        profitLoss,
        dateGenerated: now,
      };

      console.log("Report", reportData);
      await Report.create(reportData);

      // Expire the target
      target.status = "expired";
      await target.save();
    }

    next(); // ✅ proceed to route
  } catch (error) {
    console.error(
      "Error while expiring targets and generating reports:",
      error
    );
    res.status(500).json({ message: "Error in middleware", error });
  }
};

module.exports = checkAndExpireTargets;
