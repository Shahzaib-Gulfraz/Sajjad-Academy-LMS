require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'lms' });
    const cols = await mongoose.connection.db.listCollections().toArray();
    const names = cols.map((c) => c.name);
    console.log('collections:', names.join(', '));

    const today = new Date();
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + diffToMonday);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4);

    const ws = weekStart.toISOString().slice(0, 10);
    const we = weekEnd.toISOString().slice(0, 10);
    console.log('weekStart', ws, 'weekEnd', we);

    const slots = await mongoose.connection.db.collection('timetable_slots').find({ date: { $gte: ws, $lte: we } }).toArray();
    console.log('slots_count', slots.length);
    const byClass = {};
    slots.forEach((s) => {
      const k = s.className?.toString() || 'unknown';
      byClass[k] = (byClass[k] || 0) + 1;
    });
    console.log('byClass', byClass);
    console.log(slots.slice(0, 10));

    const total = await mongoose.connection.db.collection('timetable_slots').countDocuments();
    console.log('total_slots_in_collection', total);
    if (total > 0) {
      const sample = await mongoose.connection.db.collection('timetable_slots').find().sort({ date: 1 }).limit(1).toArray();
      const latest = await mongoose.connection.db.collection('timetable_slots').find().sort({ date: -1 }).limit(1).toArray();
      console.log('earliest_slot', sample[0]);
      console.log('latest_slot', latest[0]);
    }

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
