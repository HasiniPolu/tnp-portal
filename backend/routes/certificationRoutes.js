const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Certification = require("../model/Certification");
const { verifyToken } = require("../middleware/authMiddleware");

// Ensure upload directory exists
const uploadDir = "uploads/certifications";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// configure file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, JPEG, PNG files are allowed"));
    }
  }
});

// POST /api/certifications
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const { name, issuer, date, certId } = req.body;
    if (!name) return res.json({ success: false, message: "Name required" });

    // Use userId from token (which is set by authMiddleware)
    const studentId = req.user.userId || req.user._id || req.userId;

    const cert = new Certification({
      studentId: studentId,
      course: name,
      certNo: certId || Date.now().toString(),
      grade: issuer,
      issueDate: date || Date.now(),
      fileUrl: req.file ? "/uploads/certifications/" + req.file.filename : null
    });

    await cert.save();
    res.json({ success: true, certification: cert });
  } catch (err) {
    console.error("❌ Certification error:", err);
    res.json({ success: false, message: "Error saving certification: " + err.message });
  }
});

// GET /api/certifications/my
router.get("/my", verifyToken, async (req, res) => {
  try {
    const studentId = req.user.userId || req.user._id || req.userId;
    const certs = await Certification.find({ studentId: studentId });
    res.json({ success: true, certifications: certs });
  } catch (err) {
    console.error("❌ Fetch certifications error:", err);
    res.json({ success: false, message: "Error fetching certifications" });
  }
});

// GET /api/certifications/all (admin)
router.get("/all", verifyToken, async (req, res) => {
  try {
    const certs = await Certification.find().populate("studentId", "name email");
    res.json({ certifications: certs });
  } catch (err) {
    res.json({ success: false, message: "Error fetching all certifications" });
  }
});

module.exports = router;
