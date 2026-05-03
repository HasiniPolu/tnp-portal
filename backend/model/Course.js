const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  name: String,
  instructor: String,
  duration: String,
  description: String,
  level: String,
  credits: Number,
  status: { type: String, default: "active" },
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);