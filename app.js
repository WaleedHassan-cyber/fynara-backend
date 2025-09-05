require("dotenv").config();
const express = require("express");
const app = express();
const serverless = require("serverless-http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const cron = require("node-cron");
const multer = require("multer");
const Customer = require("./models/Customer.js"); // Import the Customer model
const Product = require("./models/Product.js");
const User = require("./models/User.js"); // Import the User model
const Order = require("./models/Orders.js"); // Import the Order model
const upload = require("./config/upload.js");
const uploadProfile = require("./config/uploadProfile.js");
const cloudinary = require("./config/cloudinary.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Target = require("./models/Target.js");
const Report = require("./models/Report.js");
const Earning = require("./models/Earning.js");
const streamifier = require("streamifier");
const uploadm = multer({ storage: multer.memoryStorage() });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
const PORT = process.env.PORT || 8000;

const allowedOrigin = process.env.CLIENT_URL || 'https://shoppii-admin.vercel.app';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowedOrigin); // Allow specific origin
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Allowed methods
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allowed headers
  next();
});
// app.options('*', cors()); // Enable CORS preflight requests for all routes

app.options(/.*/, cors());

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

app.get("/", (req, res) => {
  res.send("Hello World!");
});
//Register route for Owner
if (process.env.NODE_ENV === "production") {
  app.post("/api/register", async (req, res) => {
    const { username, password, email } = req.body;
    try {
      if (!username || !password || !email) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Hash the password properly
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        username,
        email,
        password: hashedPassword,
      });

      await newUser.save(); // Await the save operation too
      res.status(200).json({ message: "User Registered Successfully" });
    } catch (error) {
      console.error("Error registering user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}
//Login route for owner
app.post("/api/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).send("Plz Enter all required feilds");
    } else {
      const user = await User.findOne({ email });
      if (!user) {
        res.status(400).send("Email or Password incorrect");
      } else {
        const validateUser = await bcrypt.compare(password, user.password);
        if (!validateUser) {
          res.status(400).send("Email or Password incorrect");
        } else {
          const payload = {
            userId: user.id,
            email: user.email,
          };
          const JWT_SECRET_KEY =
            process.env.JWT_SECRET_KEY || "THIS_IS_JWT_SECRET_KEY";
          jwt.sign(
            payload,
            JWT_SECRET_KEY,
            { expiresIn: 84600 },
            async (err, token) => {
              await User.updateOne(
                { _id: user.id },
                {
                  $set: { token },
                }
              );
              user.save();
              // Set cookie
              res.cookie("authToken", token, {
                httpOnly: true,
                secure: true, // 👈 Use secure cookies in production
                sameSite: "None", // 👈 Strict → None
                maxAge: 24 * 60 * 60 * 1000,
              });

              return res.status(200).json({
                user: {
                  id: user._id,
                  email: user.email,
                  username: user.username,
                  profileImg: user.profileImg,
                },
                token: token,
              });
            }
          );
        }
      }
    }
  } catch (error) {
    console.log("Erorr", error);
  }
});

// Memory storage (no disk usage)
app.post("/api/change-password", uploadm.single("image"), async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // 1. User find karo
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    // 2. Old password check karo
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect." });
    }

    // 3. Agar password sahi hai aur image bheji gayi hai to upload karo
    let imageUrl = user.profileImg;
    if (req.file) {
      // Purani image delete karo agar hai
      if (user.profileImg) {
        const publicId = user.profileImg.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`ecommerce/profile/${publicId}`);
      }

      // Buffer se Cloudinary pe upload karo (stream)
      const uploadStream = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "ecommerce/profile" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

      imageUrl = await uploadStream();
    }

    // 4. Password update karo
    user.password = await bcrypt.hash(newPassword, 10);
    user.profileImg = imageUrl;
    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    return res.status(200).json({
      message: "Password & Profile image updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

//register route for Customer
app.post("/api/customer/register", async (req, res) => {
  const { username, password, email, address, phone } = req.body;
  try {
    if (!username || !password || !email || !address || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Hash the password properly
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new Customer({
      username,
      email,
      password: hashedPassword,
      address,
      phone,
    });

    await newUser.save(); // Await the save operation too
    res.status(200).json({ message: "User Registered Successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
//Login route for Customer
app.post("/api/customer/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).send("Plz Enter all required feilds");
    } else {
      const user = await Customer.findOne({ email });
      if (!user) {
        res.status(400).send("Email or Password incorrect");
      } else {
        const validateUser = await bcrypt.compare(password, user.password);
        if (!validateUser) {
          res.status(400).send("Email or Password incorrect");
        } else {
          const payload = {
            userId: user.id,
            email: user.email,
          };
          const JWT_SECRET_KEY =
            process.env.JWT_SECRET_KEY || "THIS_IS_JWT_SECRET_KEY";
          jwt.sign(
            payload,
            JWT_SECRET_KEY,
            { expiresIn: 84600 },
            async (err, token) => {
              await Customer.updateOne(
                { _id: user.id },
                {
                  $set: { token },
                }
              );
              user.save();
              // Set cookie
              res.cookie("authToken", token, {
                httpOnly: true,
                secure: true, // Use secure cookies in production
                sameSite: "None",
                maxAge: 24 * 60 * 60 * 1000, // 1 day
              });
              return res.status(200).json({
                user: {
                  id: user._id,
                  username: user.username,
                  email: user.email,
                  address: user.address,
                  phone: user.phone,
                },
                token: token,
              });
            }
          );
        }
      }
    }
  } catch (error) {
    console.log("Erorr", error);
  }
});

// Example: /api/check-auth
app.get("/api/check-auth", (req, res) => {
  const token = req.cookies.authToken;
  if (!token) {
    return res.status(401).json({ isAuthenticated: false });
  }

  try {
    const JWT_SECRET_KEY =
      process.env.JWT_SECRET_KEY || "THIS_IS_JWT_SECRET_KEY";
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    res.status(200).json({
      isAuthenticated: true,
      user: { id: decoded.userId, email: decoded.email },
    });
  } catch (err) {
    return res.status(401).json({ isAuthenticated: false });
  }
});

//create products
app.post("/api/create", upload.array("images", 4), async (req, res) => {
  try {
    console.log("FILES RECEIVED:", req.files);
    console.log("BODY RECEIVED:", req.body);

    const { productName, type, label, desc, price } = req.body;

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No images uploaded" });
    }

    const images = req.files.map((file) => ({
      url: file.path,
      public_id: file.filename,
    }));

    const product = new Product({
      productName,
      type,
      label,
      desc,
      price,
      images,
    });

    await product.save();

    res.status(201).json({ success: true, product });
  } catch (err) {
    console.error("UPLOAD ERROR:", err); // 👈 proper logging
    res.status(500).json({ success: false, message: "Server Error" });
  }
});
//get products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().lean();

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

//Update products
app.post("/api/update-products", async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "No products provided." });
    }

    const validUpdates = products.filter(
      (p) =>
        typeof p._id === "string" &&
        typeof p.price !== "undefined" &&
        typeof p.inStock !== "undefined"
    );

    if (validUpdates.length === 0) {
      return res.status(400).json({ error: "No valid product updates found." });
    }

    const bulkOps = validUpdates.map((product) => ({
      updateOne: {
        filter: { _id: product._id }, // MongoDB's native _id
        update: {
          $set: {
            price: product.price,
            inStock: product.inStock,
          },
        },
      },
    }));

    const result = await Product.bulkWrite(bulkOps);

    res.json({
      message: "Products updated successfully.",
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error("Bulk update failed:", error);
    res.status(500).json({ error: "Server error while updating products." });
  }
});

//delete products
app.delete("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (let img of product.images) {
        if (img.public_id) {
          await cloudinary.uploader.destroy(img.public_id);
        }
      }
    }
    // Delete product from DB
    await product.deleteOne();

    res
      .status(200)
      .json({ message: "Product and images deleted successfully." });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//post customer Orders✅
app.post("/api/orders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { products } = req.body;

    if (!userId || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    // Validate each product item
    for (const item of products) {
      if (!item.product || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          message: "Each product must have a valid product ID and quantity",
        });
      }
    }

    // Fetch product documents from DB
    const productIds = products.map((item) => item.product);
    const productDocs = await Product.find({ _id: { $in: productIds } });

    if (productDocs.length !== productIds.length) {
      return res
        .status(400)
        .json({ message: "One or more products not found" });
    }

    // Convert productDocs to a Map for efficient lookup
    const productMap = new Map(productDocs.map((p) => [p._id.toString(), p]));

    let totalAmount = 0;

    for (const item of products) {
      const prod = productMap.get(item.product);
      if (!prod) {
        return res
          .status(400)
          .json({ message: `Product not found: ${item.product}` });
      }

      totalAmount += prod.price * item.quantity;
    }

    // Create new order
    const newOrder = new Order({
      user: userId,
      products,
      totalAmount,
      status: "Pending",
    });

    await newOrder.save();

    // Re-fetch the order with populated product details
    const populatedOrder = await Order.findById(newOrder._id)
      .populate("products.product") // make sure schema has ref
      .populate("user"); // optional: populate user info

    res
      .status(201)
      .json({ message: "Order created successfully", order: populatedOrder });
  } catch (error) {
    console.error("Error creating order:", error.stack);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

//fetch orders for a specific user✅
app.get("/api/orders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Pagination parameters (optional, but recommended for large data)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Query orders for user with projection and lean for better performance
    const orders = await Order.find({ user: userId })
      .select("status totalAmount createdAt products") // projection: only needed fields
      .populate({
        path: "products.product",
        select: "productName price images", // only needed product fields
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // returns plain JS objects instead of Mongoose documents

    // Format response to include quantity along with product details
    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      products: order.products.map((item) => ({
        productId: item.product._id,
        productName: item.product.productName,
        price: item.product.price,
        images: item.product.images,
        quantity: item.quantity,
      })),
    }));

    res.status(200).json({
      page,
      limit,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// All orders of all users✅
app.get("/api/orders", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    console.log("Fetching all orders with pagination:", {
      page,
      limit,
      skip,
    });
    // Total orders count
    const totalOrders = await Order.countDocuments();

    // Orders fetch karna with pagination
    const orders = await Order.find()
      .select("user products totalAmount status createdAt")
      .populate({
        path: "user",
        select: "username email",
      })
      .populate({
        path: "products.product",
        select: "productName price images",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format orders for cleaner response
    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      user: order.user
        ? {
            _id: order.user._id,
            username: order.user.username,
            email: order.user.email,
          }
        : null,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      products: order.products.map((item) => ({
        productId: item.product._id,
        productName: item.product.productName,
        price: item.product.price,
        images: item.product.images[0]?.url || "", // Assuming images is an array and we want the first image URL
        quantity: item.quantity,
      })),
    }));
    // console.log(JSON.stringify(formattedOrders, null, 2));
    // console.log("Total orders fetched:", formattedOrders);
    res.status(200).json({
      totalOrders, // total count of orders
      totalPages: Math.ceil(totalOrders / limit), // total pages
      page,
      limit,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/update-status/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!orderId)
    return res.status(400).json({ message: "Order ID is required." });
  if (!status) return res.status(400).json({ message: "Status is required." });

  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!updatedOrder)
      return res.status(404).json({ message: "Order not found." });

    return res.status(200).json({
      message: "Order status updated successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

app.post("/api/delete-order/:orderId", async (req, res) => {
  const { orderId } = req.params;

  if (!orderId)
    return res.status(400).json({ message: "Order ID is required." });

  try {
    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder)
      return res.status(404).json({ message: "Order not found." });

    return res.status(200).json({
      message: "Order deleted successfully.",
      order: deletedOrder,
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

app.get("/api/get-total-documents", async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await Customer.countDocuments();

    console.log("Total Products:", totalProducts);
    console.log("Total Orders:", totalOrders);
    console.log("Total Customers:", totalCustomers);
    res.status(200).json({
      totalProducts,
      totalOrders,
      totalCustomers,
    });
  } catch (error) {
    console.error("Error fetching total documents:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/set-target", async (req, res) => {
  const { amount, endDate, startDate } = req.body;
  try {
    // Validate required fields
    if (!amount || !endDate) {
      return res
        .status(400)
        .json({ message: "Amount and endDate are required." });
    }

    const target = new Target({
      amount,
      endDate,
      startDate: startDate || Date.now(), // Use startDate from body or default to now
    });

    await target.save();
    res.status(201).json({ success: true, target });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/deliverd/:userId", async (req, res) => {
  const { userId } = req.params;
  const { amount, targetId } = req.body;
  if (!amount || !targetId) {
    return res
      .status(400)
      .json({ message: "Amount and TargetId are required." });
  }
  try {
    const earning = new Earning({
      targetId,
      userId,
      amount,
    });
    await earning.save();
    res.status(201).json({ success: true, earning });
  } catch (error) {
    console.log("Error message", error);
  }
});

app.get("/api/target", async (req, res) => {
  try {
    // 1) pehle all earnings ka total nikaal lo (hamesha chahiye)
    const allEarnings = await Earning.find({});
    const allTotal = allEarnings.reduce((sum, e) => sum + Number(e.amount), 0);

    // 2) ek active target nikaalo (pura object)
    const activeTarget = await Target.findOne({ status: "active" });

    // 3) response object start karo
    let response = { allTotal };

    // 4) agar active target mila to uski earning calculate karo
    if (activeTarget) {
      const targetEarnings = await Earning.find({ targetId: activeTarget._id });
      const targetTotal = targetEarnings.reduce(
        (sum, e) => sum + Number(e.amount),
        0
      );

      // pura activeTarget object + extra fields return karo
      response.activeTarget = {
        ...activeTarget.toObject(),
        targetTotal,
      };
    }

    // 5) response bhej do
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
});

app.get("/api/reports", async (req, res) => {
  try {
    // Fetch all reports with target details
    const reports = await Report.find({})
      .populate("targetId", "amount endDate startDate") // Populate target details
      .sort({ dateGenerated: -1 }) // Sort by date generated, most recent first
      .lean(); // Use lean for better performance

    res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// This runs every hour (adjust interval as needed)
cron.schedule("*/5 * * * *", async () => {
  // Runs every 05 minutes
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
});

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
// ✅ Ye export karo
module.exports = app;
module.exports.handler = serverless(app);
