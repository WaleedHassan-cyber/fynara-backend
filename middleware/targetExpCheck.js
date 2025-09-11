import mongoose from "mongoose";
import Target from "../models/Target.js";
import Earning from "../models/Earning.js";
import Report from "../models/Report.js";

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
      return;
    }

    for (const target of targetsToExpire) {
      // Aggregate total earnings for this target within its duration
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
      const profitLoss = totalEarned - target.amount; // profit if positive, loss if negative

      console.log(
        profitLoss >= 0 ? `Profit: $${profitLoss}` : `Loss: $${-profitLoss}`
      );

      // Create and save the report without category breakdown
      const reportData = {
        targetId: target._id,
        totalEarned,
        profitLoss,
        dateGenerated: now,
      };
      console.log("Report", reportData);
      await Report.create(reportData);

      // Update the target's status to expired
      target.status = "expired";
      await target.save();
    }
  } catch (error) {
    console.error(
      "Error while expiring targets and generating reports:",
      error
    );
  }
};

export default checkAndExpireTargets;
