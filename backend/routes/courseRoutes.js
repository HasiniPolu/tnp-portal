const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Course = require("../model/Course");
 
const JWT_SECRET = process.env.JWT_SECRET || "tnp_secret_key";
 
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ success: false, message: "No token" });
  try {
    req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}
 
// GET ALL COURSES
router.get("/", auth, async (req, res) => {
  try {
    const courses = await Course.find();
    // Add enrolled flag for current user
    const coursesWithEnrollment = courses.map(course => ({
      ...course.toObject(),
      enrolled: course.enrolledStudents && course.enrolledStudents.some(id => id.toString() === req.user.id)
    }));
    res.json({ success: true, courses: coursesWithEnrollment });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});
 
// GET MY (enrolled) COURSES - student
router.get("/my", auth, async (req, res) => {
  try {
    const courses = await Course.find({ enrolledStudents: req.user.id });
    res.json({ success: true, courses });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});
 
// ADD COURSE (admin)
router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.json({ success: false, message: "Admins only" });
    const { title, instructor, duration, description } = req.body;
    if (!title) return res.json({ success: false, message: "Title required" });
    const course = await Course.create({ title, instructor, duration, description });
    res.json({ success: true, course });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});
 
// ENROLL
router.post("/enroll/:id", auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.json({ success: false, message: "Course not found" });
    
    const studentId = req.user.id || req.user._id;
    if (course.enrolledStudents && course.enrolledStudents.some(id => id.toString() === studentId)) {
      return res.json({ success: false, message: "Already enrolled" });
    }
    
    if (!course.enrolledStudents) course.enrolledStudents = [];
    course.enrolledStudents.push(studentId);
    await course.save();
    res.json({ success: true, message: "Enrolled successfully" });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});
 
// DELETE COURSE (admin)
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.json({ success: false, message: "Admins only" });
    await Course.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});
 
module.exports = router;