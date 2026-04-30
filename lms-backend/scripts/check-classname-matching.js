require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'lms' });
    const col = mongoose.connection.db.collection('timetable_slots');

    // Collect some sample className values to test
    const docs = await col.find().limit(20).toArray();
    console.log('sample docs', docs.map(d => ({ id: d._id.toString(), className: d.className })));

    for (const doc of docs) {
      const className = doc.className && doc.className.toString();
      if (!className) continue;
      const asStringCount = await col.countDocuments({ className: className });
      const asObjectCount = mongoose.Types.ObjectId.isValid(className)
        ? await col.countDocuments({ className: new mongoose.Types.ObjectId(className) })
        : 0;
      console.log('className', className, 'matchesAsString', asStringCount, 'matchesAsObjectId', asObjectCount);
    }

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
