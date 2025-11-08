const mongoose = require("mongoose")


const earningSchema = new mongoose.Schema({
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Target",  
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,   
        ref: "User",
        required: true  
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    dateEarned: {
        type: Date,
        default: Date.now
    },
    
}, {
    timestamps: true
})

module.exports = mongoose.model("Earning", earningSchema);