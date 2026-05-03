const mongoose = require("mongoose");

const certificationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  course: {
    type: String,
    required: true,
    trim: true
  },
  certNo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  grade: {
    type: String,
    trim: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Use existing model if already compiled (e.g., by projectRoutes.js)
module.exports = mongoose.models.Certification || mongoose.model("Certification", certificationSchema);