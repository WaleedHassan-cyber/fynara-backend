const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
    },
    label: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    price: {
        type: Number,
        required:true
    },
    desc:{
        type:String,
        required:true
    },
    images: [
    {
      url: String,
      public_id: String,
    },
],
    inStock: {
        type: Boolean,
        default: true,
    },
})

module.exports = mongoose.model('Product', productSchema);