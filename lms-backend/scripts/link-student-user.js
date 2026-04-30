const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const studentSchema = new mongoose.Schema({}, { strict: false, collection: 'students' });
const User = mongoose.model('UserLinkFix', userSchema);
const Student = mongoose.model('StudentLinkFix', studentSchema);

(async () => {
  const email = 'student1776421660360@school.edu.pk';
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'lms' });

  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  const student = await Student.findOne({ email: email.toLowerCase() }).lean();

  console.log('user found:', !!user, user?._id?.toString?.());
  console.log('student found:', !!student, student?._id?.toString?.(), 'userId=', student?.userId?.toString?.());

  if (user && student) {
    await Student.updateOne({ _id: student._id }, { $set: { userId: user._id } });
    const updated = await Student.findById(student._id).lean();
    console.log('updated userId:', updated?.userId?.toString?.());
  }

  await mongoose.disconnect();
})();
