const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../model/User");

const JWT_SECRET = "tnp_secret_key";

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, rollNo, branch, role } = req.body;

    // Validate input
    if (!password || password.trim().length < 6) {
      return res.json({ success: false, message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.json({ success: false, message: "User already exists" });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      rollNo,
      branch,
      role: role || "student"  // Default to student if not specified
    });

    res.json({ success: true, message: "Registered successfully" });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});


// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.json({ success: false, message: "Wrong password" });
    }

    // Create JWT token with role
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        rollNo: user.rollNo,
        branch: user.branch
      }
    });

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.json({ success: false, message: "Server error" });
  }
});

module.exports = router;