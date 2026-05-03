const express = require("express");
const router = express.Router();

const User = require("../model/User");
const Course = require("../model/Course");
const Attendance = require("../model/Attendance");
const Project = require("../model/Project");
const Certification = require("../model/Certification");
const Remark = require("../model/Remark");

const { verifyToken } = require("../middleware/authMiddleware");

// ================= ADMIN CHECK =================
const adminOnly = async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin only" });
  }
  next();
};

// 🔥 Apply middleware globally
router.use(verifyToken, adminOnly);

// ================= USERS =================
router.get("/users", async (req, res) => {
  const users = await User.find().select("-password");
  res.json({ success: true, users });
});

router.delete("/users/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ================= COURSES =================
router.get("/courses", async (req, res) => {
  try {
    const courses = await Course.find();
    // Add enrolled flag for current user
    const coursesWithEnrollment = courses.map(course => ({
      ...course.toObject(),
      enrolled: course.enrolledStudents.includes(req.userId)
    }));
    res.json({ success: true, courses: coursesWithEnrollment });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post("/courses", async (req, res) => {
  const course = new Course(req.body);
  await course.save();
  res.json({ success: true, message: "Course added" });
});

router.delete("/courses/:id", async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ================= ATTENDANCE =================
router.post("/attendance", async (req, res) => {
  const att = new Attendance(req.body);
  await att.save();
  res.json({ success: true });
});

router.get("/attendance", async (req, res) => {
  const attendance = await Attendance.find()
    .populate("studentId", "name")
    .populate("courseId", "title");

  res.json({ success: true, records: attendance });
});

router.delete("/attendance/:id", async (req, res) => {
  await Attendance.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ================= REMARKS =================
router.get("/remarks", async (req, res) => {
  const remarks = await Remark.find().populate("studentId", "name rollNo");
  res.json({ success: true, remarks });
});

router.post("/remarks", async (req, res) => {
  const remark = new Remark(req.body);
  await remark.save();
  res.json({ success: true });
});

router.delete("/remarks/:id", async (req, res) => {
  await Remark.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ================= PROJECTS =================
router.get("/projects", async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("student", "name rollNo branch")
      .sort({ createdAt: -1 });
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/projects/:id", async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= CERTIFICATIONS =================
router.get("/certifications", async (req, res) => {
  try {
    const certifications = await Certification.find()
      .populate("studentId", "name rollNo branch")
      .sort({ issueDate: -1 });
    res.json({ success: true, certifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/certifications/:id", async (req, res) => {
  try {
    await Certification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= STATS =================
router.get("/stats", async (req, res) => {
  res.json({
    success: true,
    stats: {
      users: await User.countDocuments(),
      students: await User.countDocuments({ role: "student" }),
      courses: await Course.countDocuments(),
      attendance: await Attendance.countDocuments(),
      remarks: await Remark.countDocuments()
    }
  });
});

// ================= REPORTS =================
router.get("/reports", async (req, res) => {
  try {
    const type = req.query.type;

    if (type === "attendance") {
      const records = await Attendance.find()
        .populate("studentId", "name rollNo")
        .populate("courseId", "title")
        .sort({ date: -1 });

      const data = records.map(r => ({
        Student: r.studentId?.name || "—",
        "Roll No": r.studentId?.rollNo || "—",
        Course: r.courseId?.title || "N/A",
        Date: r.date ? new Date(r.date).toLocaleDateString() : "—",
        Status: r.status
      }));

      return res.json({
        success: true,
        report: {
          columns: ["Student", "Roll No", "Course", "Date", "Status"],
          data
        }
      });
    }

    if (type === "enrollment") {
      const users = await User.find({ role: "student" });
      const data = users.map(u => ({
        Name: u.name,
        Email: u.email,
        "Roll No": u.rollNo || "—",
        Branch: u.branch || "—",
        "Registered On": u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"
      }));

      return res.json({
        success: true,
        report: {
          columns: ["Name", "Email", "Roll No", "Branch", "Registered On"],
          data
        }
      });
    }

    if (type === "performance") {
      const students = await User.find({ role: "student" });
      const data = await Promise.all(students.map(async (student) => {
        const attended = await Attendance.countDocuments({
          studentId: student._id,
          status: "present"
        });
        const total = await Attendance.countDocuments({ studentId: student._id });
        const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

        return {
          Student: student.name,
          "Total Classes": total,
          "Present": attended,
          "Absent": total - attended,
          "Attendance %": percentage + "%"
        };
      }));

      return res.json({
        success: true,
        report: {
          columns: ["Student", "Total Classes", "Present", "Absent", "Attendance %"],
          data
        }
      });
    }

    if (type === "certification") {
      const records = await Certification.find()
        .populate("studentId", "name rollNo")
        .populate("courseId", "title")
        .sort({ issuedDate: -1 });

      const data = records.map(r => ({
        Student: r.studentId?.name || "—",
        "Roll No": r.studentId?.rollNo || "—",
        Course: r.courseId?.title || "—",
        "Issued Date": r.issuedDate ? new Date(r.issuedDate).toLocaleDateString() : "—",
        Status: r.status || "Issued"
      }));

      return res.json({
        success: true,
        report: {
          columns: ["Student", "Roll No", "Course", "Issued Date", "Status"],
          data
        }
      });
    }

    res.json({
      success: false,
      message: "Invalid report type",
      report: { columns: [], data: [] }
    });

  } catch (err) {
    console.error("❌ Report error:", err);
    res.status(500).json({
      success: false,
      message: "Error generating report",
      error: err.message,
      report: { columns: [], data: [] }
    });
  }
});

module.exports = router;