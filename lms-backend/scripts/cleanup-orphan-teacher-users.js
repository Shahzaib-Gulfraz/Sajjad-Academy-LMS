const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const teacherSchema = new mongoose.Schema({}, { strict: false, collection: 'teachers' });

const User = mongoose.model('OrphanCleanupTeacherUser', userSchema);
const Teacher = mongoose.model('OrphanCleanupTeacher', teacherSchema);

const shouldWrite = process.argv.includes('--write');

async function cleanupOrphanTeacherUsers() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms';
  const dbName = process.env.MONGODB_DB_NAME || 'lms';

  console.log(`Connecting to MongoDB: ${mongoUri} (${dbName})`);
  await mongoose.connect(mongoUri, { dbName });

  const teacherUsers = await User.find({ role: 'TEACHER' }).lean();
  console.log(`Found ${teacherUsers.length} teacher user(s)`);

  const orphanUsers = [];

  for (const user of teacherUsers) {
    const byUserId = await Teacher.findOne({ userId: user._id }).lean();
    const byEmail = await Teacher.findOne({ email: user.email.toLowerCase() }).lean();

    if (!byUserId && !byEmail) {
      orphanUsers.push(user);
    }
  }

  if (orphanUsers.length === 0) {
    console.log('No orphan teacher users found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${orphanUsers.length} orphan teacher user(s):`);
  for (const user of orphanUsers) {
    console.log(`- ${user._id} | ${user.email} | systemId=${user.systemId || ''}`);
  }

  if (!shouldWrite) {
    console.log('\nDry run only. Re-run with --write to delete these users.');
    await mongoose.disconnect();
    return;
  }

  const ids = orphanUsers.map((user) => user._id);
  const result = await User.deleteMany({ _id: { $in: ids } });
  console.log(`Deleted ${result.deletedCount || 0} orphan teacher user(s).`);

  await mongoose.disconnect();
}

cleanupOrphanTeacherUsers().catch((error) => {
  console.error('Cleanup failed:', error.message);
  process.exitCode = 1;
});
