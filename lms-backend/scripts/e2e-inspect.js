require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'lms' });
    const db = mongoose.connection.db;

    console.log('--- sample students ---');
    const students = await db.collection('students').find().limit(10).toArray();
    students.forEach(s => console.log({ id: s._id.toString(), userId: s.userId?.toString(), grade: s.grade, enrolledCourseIds: s.enrolledCourseIds, enrolledCourses: s.enrolledCourses }));

    console.log('\n--- sample classes ---');
    const classes = await db.collection('classes').find().limit(10).toArray();
    classes.forEach(c => console.log({ id: c._id.toString(), name: c.name, subjects: c.subjects }));

    console.log('\n--- sample timetable_slots (all) ---');
    const slots = await db.collection('timetable_slots').find().limit(20).toArray();
    slots.forEach(s => console.log({ id: s._id.toString(), date: s.date, className: s.className, subject: s.subject, teacherId: s.teacherId }));

    // Show type analysis for className fields
    console.log('\n--- className types in timetable_slots ---');
    const typeCounts = await db.collection('timetable_slots').aggregate([
      { $project: { classNameType: { $type: '$className' } } },
      { $group: { _id: '$classNameType', count: { $sum: 1 } } }
    ]).toArray();
    console.log(typeCounts);

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
