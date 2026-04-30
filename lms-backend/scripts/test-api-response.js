#!/usr/bin/env node
require('dotenv').config();

(async () => {
  try {
    console.log('=== Testing API Response ===\n');
    
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'lms' });
    
    const db = mongoose.connection.db;
    const col = db.collection('timetable_slots');
    
    // Fetch all slots
    const slots = await col.find().toArray();
    
    // Simulate the resolution that backend now does
    const classes = await db.collection('classes').find().toArray();
    const classNameMap = new Map();
    const subjectNameMap = new Map();
    
    for (const cls of classes) {
      classNameMap.set(cls._id.toString(), cls.name);
      if (cls.subjects) {
        for (const subject of cls.subjects) {
          subjectNameMap.set(subject.id, subject.name);
        }
      }
    }
    
    console.log('--- Resolution Maps ---');
    console.log('classNameMap:', Array.from(classNameMap.entries()));
    console.log('subjectNameMap:', Array.from(subjectNameMap.entries()));
    
    console.log('\n--- API Response (with name resolution) ---');
    const response = slots.map(slot => {
      const classNameStr = slot.className.toString ? slot.className.toString() : slot.className;
      const resolvedClassName = classNameMap.get(classNameStr) || classNameStr;
      const resolvedSubject = subjectNameMap.get(slot.subject) || slot.subject;
      
      return {
        id: slot._id.toString(),
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        className: resolvedClassName,
        subject: resolvedSubject,
        teacherId: slot.teacherId.toString ? slot.teacherId.toString() : slot.teacherId,
      };
    });
    
    console.log(JSON.stringify(response, null, 2));
    
    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
