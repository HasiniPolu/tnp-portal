const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const JWT_SECRET = process.env.JWT_SECRET || "tnp_secret_key_2026";

/* ───────────────── AUTH ───────────────── */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ success: false, message: "No token" });

  try {
    req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

/* ───────────────── SCHEMAS ───────────────── */
const ProjectSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    technologies: String,
    link: String,
    description: String,
  },
  { timestamps: true }
);

const Project =
  mongoose.models.Project || mongoose.model("Project", ProjectSchema);

/* ───────────────── CREATE PROJECT ───────────────── */
router.post("/", auth, async (req, res) => {
  try {
    const { title, technologies, link, description } = req.body;

    if (!title) {
      return res.json({ success: false, message: "Title required" });
    }

    const studentId = req.user.userId || req.user.id || req.user._id;

    const project = await Project.create({
      student: studentId,
      title,
      technologies,
      link,
      description,
    });

    res.json({ success: true, project });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ───────────────── STUDENT PROJECTS ───────────────── */
router.get("/my", auth, async (req, res) => {
  try {
    const studentId = req.user.userId || req.user.id || req.user._id;
    const projects = await Project.find({ student: studentId }).sort({
      createdAt: -1,
    });

    res.json({ success: true, projects });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ───────────────── ADMIN ALL PROJECTS ───────────────── */
router.get("/all", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.json({ success: false, message: "Admins only" });
    }

    const projects = await Project.find()
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;