const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", default: null },
  date: { type: Date, required: true },
  status: { type: String, enum: ["present", "absent", "leave"], required: true },
  remark: String
}, { timestamps: true });

module.exports = mongoose.model("Attendance", attendanceSchema);