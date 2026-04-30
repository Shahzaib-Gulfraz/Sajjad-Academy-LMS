require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'lms' });
    const db = mongoose.connection.db;

    console.log('=== DB Inspection ===\n');
    
    // Get all timetable slots
    console.log('--- All Timetable Slots ---');
    const slots = await db.collection('timetable_slots').find().toArray();
    slots.forEach((slot, idx) => {
      console.log(`\nSlot ${idx}:`, {
        id: slot._id.toString(),
        date: slot.date,
        className: slot.className,
        classNameType: typeof slot.className,
        classNameIsObjectId: mongoose.Types.ObjectId.isValid(slot.className?.toString ? slot.className.toString() : slot.className),
        subject: slot.subject,
        subjectType: typeof slot.subject,
        teacherId: slot.teacherId,
        teacherIdType: typeof slot.teacherId,
      });
    });

    console.log('\n\n--- Classes Collection ---');
    const classes = await db.collection('classes').find().limit(3).toArray();
    classes.forEach((cls, idx) => {
      console.log(`\nClass ${idx}:`, {
        id: cls._id.toString(),
        name: cls.name,
        subjects: cls.subjects,
      });
    });

    // Try to resolve each slot
    console.log('\n\n--- Attempting to Resolve Slots ---');
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      console.log(`\n=== Slot ${i} Resolution ===`);
      
      const classNameValue = slot.className?.toString ? slot.className.toString() : slot.className;
      const isObjectId = mongoose.Types.ObjectId.isValid(classNameValue);
      
      console.log('className:', classNameValue, '| isObjectId:', isObjectId);
      
      if (isObjectId) {
        const classDoc = await db.collection('classes').findOne({ _id: new mongoose.Types.ObjectId(classNameValue) });
        console.log('Resolved class:', classDoc?.name || 'NOT FOUND');
      } else {
        const classDoc = await db.collection('classes').findOne({ $or: [{ name: classNameValue }, { _id: classNameValue }] });
        console.log('Resolved class (by name or id string):', classDoc?.name || 'NOT FOUND');
      }

      // Resolve subject
      const subjectValue = slot.subject;
      console.log('subject:', subjectValue);
      const classForSubject = await db.collection('classes').findOne({ 'subjects.id': subjectValue });
      if (classForSubject) {
        const subj = classForSubject.subjects.find(s => s.id === subjectValue);
        console.log('Resolved subject:', subj?.name || 'NOT FOUND');
      } else {
        console.log('Resolved subject: NOT FOUND in any class');
      }
    }

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
