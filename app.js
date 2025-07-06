require("dotenv").config();
const express = require("express");
const app = express();

const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const User = require("./models/User.js"); // Import the User model
const Product = require("./models/Product.js");
const upload = require("./config/upload.js");
const cloudinary = require("./config/cloudinary.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(cookieParser());
const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // Adjust the origin as needed
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

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
                secure: process.env.NODE_ENV === "production", // Use secure cookies in production
                sameSite: "Strict",
                maxAge: 24 * 60 * 60 * 1000, // 1 day
              });
              return res.status(200).json({
                user: {
                  id: user._id,
                  email: user.email,
                  username: user.username,
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

app.post('/api/create', upload.array('images', 4), async (req, res) => {
  try {
    console.log("FILES RECEIVED:", req.files);
    console.log("BODY RECEIVED:", req.body);

    const { productName, type, label, desc, price } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No images uploaded" });
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
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().lean();

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

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

    res.status(200).json({ message: "Product and images deleted successfully." });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
