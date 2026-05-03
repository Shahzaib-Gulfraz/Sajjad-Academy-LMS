const mongoose = require('mongoose');
require('dotenv').config();

const userSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const studentSchema = new mongoose.Schema({}, { strict: false, collection: 'students' });

const User = mongoose.model('OrphanCleanupUser', userSchema);
const Student = mongoose.model('OrphanCleanupStudent', studentSchema);

const shouldWrite = process.argv.includes('--write');

async function cleanupOrphanStudentUsers() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms';
  const dbName = process.env.MONGODB_DB_NAME || 'lms';

  console.log(`Connecting to MongoDB: ${mongoUri} (${dbName})`);
  await mongoose.connect(mongoUri, { dbName });

  const studentUsers = await User.find({ role: 'STUDENT' }).lean();
  console.log(`Found ${studentUsers.length} student user(s)`);

  const orphanUsers = [];

  for (const user of studentUsers) {
    const byUserId = await Student.findOne({ userId: user._id }).lean();
    const byEmail = await Student.findOne({ email: user.email.toLowerCase() }).lean();

    if (!byUserId && !byEmail) {
      orphanUsers.push(user);
    }
  }

  if (orphanUsers.length === 0) {
    console.log('No orphan student users found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${orphanUsers.length} orphan student user(s):`);
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
  console.log(`Deleted ${result.deletedCount || 0} orphan student user(s).`);

  await mongoose.disconnect();
}

cleanupOrphanStudentUsers().catch((error) => {
  console.error('Cleanup failed:', error.message);
  process.exitCode = 1;
});