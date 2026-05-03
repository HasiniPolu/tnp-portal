const mongoose = require("mongoose");

const remarkSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  date: {
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
module.exports = mongoose.models.Remark || mongoose.model("Remark", remarkSchema);