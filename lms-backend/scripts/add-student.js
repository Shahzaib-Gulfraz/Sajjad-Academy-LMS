const mongoose = require('mongoose');
require('dotenv').config();

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

const Student = mongoose.model('Student', studentSchema);

async function addStudent() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms';
    console.log(`Connecting to MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB_NAME || 'lms',
    });
    console.log('✓ Connected to MongoDB\n');

    // Student data
    const newStudent = {
      admissionNo: `STU-${Date.now()}`,
      name: 'Ahmed Hassan',
      email: `student-${Date.now()}@example.com`,
      grade: 'Grade 10',
      guardian: 'Fatima Hassan',
      guardianPhone: '+92-300-1234567',
      subjects: ['English', 'Mathematics', 'Science', 'Urdu'],
      status: 'Active',
    };

    console.log('Creating student with data:');
    console.log(JSON.stringify(newStudent, null, 2));
    console.log('');

    // Insert student
    const student = new Student(newStudent);
    const result = await student.save();

    console.log('✓ Student added successfully!');
    console.log('\nStudent details:');
    console.log('  ID:', result._id);
    console.log('  Admission No:', result.admissionNo);
    console.log('  Name:', result.name);
    console.log('  Email:', result.email);
    console.log('  Grade:', result.grade);
    console.log('  Guardian:', result.guardian);
    console.log('  Phone:', result.guardianPhone);
    console.log('  Subjects:', result.subjects.join(', '));
    console.log('  Status:', result.status);
    console.log('  Created At:', result.createdAt);

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('✗ Error:', error.message);
    if (error.code === 11000) {
      console.error('  Admission number already exists in database');
    }
    process.exit(1);
  }
}

addStudent();
