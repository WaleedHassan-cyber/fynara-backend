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
    brand: {
        type: String,
        required: false, // optional
    },
    price: {
        type: Number,
        required: true,
    },
    oldPrice: {
        type: Number,
        required: false, // optional
    },
    desc: {
        type: String,
        required: true,
    },
    reviews: {
        type: Number,
        default: 0,
    },
    colors: [
        {
            type: String, // hex code string e.g. "#D12B2B"
        },
    ],
    sizes: [
        {
            type: String, // e.g. "XS", "M", "L"
        },
    ],
    images: [
        {
            url: { type: String, required: true },
            public_id: { type: String },
        },
    ],
    inStock: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Product', productSchema);
