const express = require("express");
const router = express.Router();
const Attendance = require("../model/Attendance");
const { verifyToken } = require("../middleware/authMiddleware");

// ============ IMPORTANT FIX ============
// Make sure your authMiddleware sets req.user correctly:
// req.user = decoded;
// req.userId = decoded.userId || decoded._id;

// POST /api/attendance - Mark attendance (Admin only)
router.post("/", verifyToken, async (req, res) => {
  try {
    console.log('\n========== POST /api/attendance ==========');
    console.log('User from token:', req.user);
    console.log('Request body:', req.body);

    const { studentId, courseId, date, status, remark } = req.body;

    // Validation
    if (!studentId || !date || !status) {
      console.log('❌ Validation failed - missing fields');
      return res.json({ 
        success: false, 
        message: "Student ID, date, and status are required" 
      });
    }

    if (!["present", "absent", "leave"].includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.json({ 
        success: false, 
        message: "Status must be 'present', 'absent', or 'leave'" 
      });
    }

    // Parse and normalize date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    console.log('📅 Parsed date:', attendanceDate);
    console.log('👤 Student ID:', studentId);
    console.log('📊 Status:', status);

    // Check if attendance already exists
    const existingAttendance = await Attendance.findOne({
      studentId: studentId,
      date: attendanceDate
    });

    if (existingAttendance) {
      console.log('🔄 Found existing attendance, updating...');
      existingAttendance.status = status;
      existingAttendance.courseId = courseId || null;
      existingAttendance.remark = remark || existingAttendance.remark;
      
      const updated = await existingAttendance.save();
      console.log('✅ Updated attendance:', updated.toObject());
      
      return res.json({ 
        success: true, 
        message: "Attendance updated successfully",
        attendance: updated 
      });
    }

    // Create new attendance
    console.log('✨ Creating new attendance record...');
    const attendance = new Attendance({
      studentId: studentId,
      courseId: courseId || null,
      date: attendanceDate,
      status: status,
      remark: remark
    });

    console.log('📝 Object before save:', attendance.toObject());

    const saved = await attendance.save();
    console.log('✅ ATTENDANCE SAVED:', saved.toObject());

    // Verify it was saved
    const verified = await Attendance.findById(saved._id);
    console.log('✔️ Verified in database:', verified.toObject());

    res.json({ 
      success: true, 
      message: "Attendance marked successfully",
      attendance: saved
    });

  } catch (err) {
    console.error("❌ Error marking attendance:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error marking attendance",
      error: err.message
    });
  }
});

// GET /api/attendance - Get all attendance (Admin)
router.get("/", verifyToken, async (req, res) => {
  try {
    console.log('\n========== GET /api/attendance (ALL) ==========');
    console.log('User:', req.user);

    const records = await Attendance.find()
      .populate("studentId", "name email")
      .populate("courseId", "title")
      .sort({ date: -1 })
      .lean();

    console.log(`✅ Found ${records.length} total attendance records`);

    const formattedRecords = records.map(record => ({
      _id: record._id,
      date: record.date,
      studentName: record.studentId?.name || "Unknown",
      studentId: record.studentId?._id,
      courseTitle: record.courseId?.title || "N/A",
      status: record.status,
      remark: record.remark,
      createdAt: record.createdAt
    }));

    console.log('First record sample:', formattedRecords[0] || 'No records');

    res.json({ 
      success: true, 
      records: formattedRecords,
      count: formattedRecords.length
    });

  } catch (err) {
    console.error("❌ Error fetching attendance:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching attendance records",
      error: err.message,
      records: []
    });
  }
});

// GET /api/attendance/my - Get my attendance (Student) - IMPORTANT: MUST BE BEFORE /:id
router.get("/my", verifyToken, async (req, res) => {
  try {
    console.log('\n========== GET /api/attendance/my (STUDENT) ==========');
    console.log('User from token:', req.user);
    console.log('User ID field names:', Object.keys(req.user));

    // Try multiple ways to get user ID
    const userId = req.user._id || req.user.id || req.userId;
    console.log('Using userId:', userId);

    if (!userId) {
      console.error('❌ No user ID found in token');
      return res.json({
        success: false,
        message: "User ID not found in token",
        debug: { user: req.user }
      });
    }

    // Search with logging
    console.log('📋 Searching for attendance records with studentId:', userId);
    
    const records = await Attendance.find({ studentId: userId })
      .populate("courseId", "title")
      .sort({ date: -1 })
      .lean();

    console.log(`✅ Found ${records.length} attendance records for this student`);

    if (records.length > 0) {
      console.log('First record:', records[0]);
    }

    const formattedRecords = records.map(record => ({
      _id: record._id,
      date: record.date,
      studentName: req.user.name || "You",
      courseTitle: record.courseId?.title || "N/A",
      status: record.status,
      remark: record.remark,
      createdAt: record.createdAt
    }));

    res.json({ 
      success: true, 
      records: formattedRecords,
      count: formattedRecords.length,
      debug: {
        userId: userId,
        recordsFound: records.length
      }
    });

  } catch (err) {
    console.error("❌ Error fetching my attendance:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching your attendance records",
      error: err.message,
      records: [],
      debug: { error: err.toString() }
    });
  }
});

// GET /api/attendance/student/:studentId - Get specific student's attendance
router.get("/student/:studentId", verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log('\n========== GET /api/attendance/student/:studentId ==========');
    console.log('Student ID:', studentId);

    const records = await Attendance.find({ studentId })
      .populate("courseId", "title")
      .sort({ date: -1 })
      .lean();

    console.log(`✅ Found ${records.length} records for student: ${studentId}`);

    const formattedRecords = records.map(record => ({
      _id: record._id,
      date: record.date,
      courseTitle: record.courseId?.title || "N/A",
      status: record.status,
      remark: record.remark
    }));

    res.json({ 
      success: true, 
      records: formattedRecords,
      count: formattedRecords.length
    });

  } catch (err) {
    console.error("❌ Error fetching student attendance:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching attendance",
      error: err.message,
      records: []
    });
  }
});

// DELETE /api/attendance/:id - Delete attendance record
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🗑️ Deleting attendance:", id);

    const deleted = await Attendance.findByIdAndDelete(id);
    
    if (!deleted) {
      console.log('❌ Record not found');
      return res.json({ 
        success: false, 
        message: "Attendance record not found" 
      });
    }

    console.log("✅ Deleted successfully");
    res.json({ 
      success: true, 
      message: "Attendance record deleted" 
    });

  } catch (err) {
    console.error("❌ Error deleting:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting attendance record",
      error: err.message
    });
  }
});

// PUT /api/attendance/:id - Update attendance record
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    console.log("✏️ Updating attendance:", id);
    console.log("New status:", status);

    const updated = await Attendance.findByIdAndUpdate(
      id,
      { status, remark },
      { new: true }
    ).populate("studentId", "name email").populate("courseId", "title");

    if (!updated) {
      console.log('❌ Record not found');
      return res.json({ 
        success: false, 
        message: "Attendance record not found" 
      });
    }

    console.log("✅ Updated successfully");
    res.json({ 
      success: true, 
      message: "Attendance updated",
      attendance: updated
    });

  } catch (err) {
    console.error("❌ Error updating:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error updating attendance",
      error: err.message
    });
  }
});

module.exports = router;