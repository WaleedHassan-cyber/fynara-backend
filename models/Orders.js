const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to calculate totalAmount
orderSchema.pre('save', async function (next) {
  if (!this.isModified('products')) return next();

  await this.populate('products.product'); // ✅ Fix: Removed execPopulate

  this.totalAmount = this.products.reduce((total, item) => {
    return total + item.product.price * item.quantity;
  }, 0);

  next();
});


orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);