const mongoose = require('mongoose');
const argon2 = require('argon2');
require('dotenv').config();

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['ADMIN', 'TEACHER', 'STUDENT'] },
    refreshTokenHash: String,
    lastLogin: Date,
  },
  { timestamps: true, collection: 'users' }
);

// Student Schema
const studentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    admissionNo: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    grade: { type: String, required: true, trim: true },
    guardian: { type: String, required: true, trim: true },
    guardianPhone: { type: String, required: true, trim: true },
    subjects: [String],
    status: { type: String, default: 'Active' },
  },
  { timestamps: true, collection: 'students' }
);

const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);

async function createStudentWithAuth() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms';
    console.log(`Connecting to MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB_NAME || 'lms',
    });
    console.log('✓ Connected to MongoDB\n');

    // Generate unique email and password
    const timestamp = Date.now();
    const email = `student${timestamp}@school.edu.pk`;
    const plainPassword = `Student@${Math.floor(Math.random() * 10000)}`;
    const passwordHash = await argon2.hash(plainPassword);

    // User data
    const newUser = {
      name: 'Zara Khan',
      email,
      passwordHash,
      role: 'STUDENT',
    };

    console.log('Creating user account...');
    const user = new User(newUser);
    const savedUser = await user.save();
    console.log('✓ User account created\n');

    // Student data
    const newStudent = {
      userId: savedUser._id,
      admissionNo: `S-${timestamp}`,
      name: 'Zara Khan',
      email,
      grade: 'Grade 9',
      guardian: 'Ali Khan',
      guardianPhone: '+92-321-5678901',
      subjects: ['English', 'Mathematics', 'Science', 'Social Studies', 'Urdu'],
      status: 'Active',
    };

    console.log('Creating student record...');
    const student = new Student(newStudent);
    const savedStudent = await student.save();
    console.log('✓ Student record created\n');

    console.log('═'.repeat(60));
    console.log('✓ STUDENT CREATED SUCCESSFULLY');
    console.log('═'.repeat(60));
    console.log('\n📋 STUDENT DETAILS:');
    console.log('─'.repeat(60));
    console.log(`  • ID:             ${savedStudent._id}`);
    console.log(`  • Admission No:   ${savedStudent.admissionNo}`);
    console.log(`  • Name:           ${savedStudent.name}`);
    console.log(`  • Grade:          ${savedStudent.grade}`);
    console.log(`  • Guardian:       ${savedStudent.guardian}`);
    console.log(`  • Phone:          ${savedStudent.guardianPhone}`);
    console.log(`  • Subjects:       ${savedStudent.subjects.join(', ')}`);
    console.log(`  • Status:         ${savedStudent.status}`);

    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log('─'.repeat(60));
    console.log(`  • Email:          ${email}`);
    console.log(`  • Password:       ${plainPassword}`);

    console.log('\n📱 HOW TO LOGIN:');
    console.log('─'.repeat(60));
    console.log(`  1. Go to: http://localhost:8080 (or http://localhost:5173)`);
    console.log(`  2. Click on "Student Login"`);
    console.log(`  3. Enter email: ${email}`);
    console.log(`  4. Enter password: ${plainPassword}`);
    console.log('\n' + '═'.repeat(60) + '\n');

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('✗ Error:', error.message);
    if (error.code === 11000) {
      console.error('  Student or user with this email already exists');
    }
    process.exit(1);
  }
}

createStudentWithAuth();
