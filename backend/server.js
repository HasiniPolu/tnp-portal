const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tnp-portal', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.log('❌ DB Connection Error:', err));

// Static Files
app.use("/uploads", express.static("uploads"));

// ============ TEST ROUTES FOR DEBUGGING ============
// Remove these after you fix the attendance issue

app.post('/api/test/attendance', async (req, res) => {
  try {
    console.log('\n🧪 TEST: Creating attendance record');
    console.log('Request body:', req.body);

    const { studentId, date, status } = req.body;

    // Validate
    if (!studentId || !date || !status) {
      return res.json({ 
        success: false, 
        message: 'Missing required fields',
        received: { studentId, date, status }
      });
    }

    // Import model
    const Attendance = require('./model/Attendance');

    // Create record
    const attendance = new Attendance({
      studentId: studentId,
      date: new Date(date),
      status: status
    });

    console.log('📝 Created attendance object:', attendance.toObject());

    // Save to database
    const saved = await attendance.save();
    console.log('✅ Saved to database:', saved.toObject());

    // Verify it exists
    const found = await Attendance.findById(saved._id);
    console.log('✔️ Verified in database:', found.toObject());

    res.json({
      success: true,
      message: 'Test attendance created successfully',
      attendance: saved
    });

  } catch (err) {
    console.error('❌ TEST ERROR:', err);
    res.status(500).json({
      success: false,
      message: err.message,
      error: err.toString()
    });
  }
});

app.get('/api/test/attendance', async (req, res) => {
  try {
    console.log('\n🧪 TEST: Fetching all attendance');
    
    const Attendance = require('./model/Attendance');
    const count = await Attendance.countDocuments();
    console.log(`📊 Total attendance records: ${count}`);

    const records = await Attendance.find().limit(5).lean();
    console.log('📋 First 5 records:', records);

    res.json({
      success: true,
      total: count,
      records: records
    });

  } catch (err) {
    console.error('❌ TEST ERROR:', err);
    res.status(500).json({
      success: false,
      message: err.message,
      error: err.toString()
    });
  }
});

app.get('/api/test/db-check', async (req, res) => {
  try {
    console.log('\n🧪 TEST: Database check');
    
    const Attendance = require('./model/Attendance');
    const User = require('./model/User');
    const Course = require('./model/Course');
    
    const attCount = await Attendance.countDocuments();
    const userCount = await User.countDocuments();
    const courseCount = await Course.countDocuments();
    
    console.log('📊 Collections:', { attendances: attCount, users: userCount, courses: courseCount });

    res.json({
      success: true,
      collections: {
        attendances: attCount,
        users: userCount,
        courses: courseCount
      },
      mongodb: {
        connected: mongoose.connection.readyState === 1,
        state: mongoose.connection.readyState,
        database: mongoose.connection.name
      }
    });

  } catch (err) {
    console.error('❌ TEST ERROR:', err);
    res.status(500).json({
      success: false,
      message: err.message,
      error: err.toString()
    });
  }
});

// ============ END TEST ROUTES ============

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use("/api/certifications", require("./routes/certificationRoutes"));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// 404 Route
app.use((req, res) => {
  console.warn(`⚠️ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl 
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}`);
  console.log('\n📝 Test Endpoints Available:');
  console.log(`   POST http://localhost:${PORT}/api/test/attendance`);
  console.log(`   GET  http://localhost:${PORT}/api/test/attendance`);
  console.log(`   GET  http://localhost:${PORT}/api/test/db-check`);
  console.log(`   GET  http://localhost:${PORT}/api/health\n`);
  console.log('📌 API Routes Loaded:');
  console.log('   /api/auth');
  console.log('   /api/courses');
  console.log('   /api/attendance');
  console.log('   /api/projects');
  console.log('   /api/admin');
  console.log('   /api/certifications\n');
});

module.exports = app;