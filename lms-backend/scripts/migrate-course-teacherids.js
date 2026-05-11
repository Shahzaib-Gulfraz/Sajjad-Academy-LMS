/**
 * Migration script: Convert courses from single teacherId to teacherIds array
 * 
 * Run this AFTER the schema changes have been deployed:
 * cd lms-backend && node scripts/migrate-course-teacherids.js
 * 
 * BACKUP YOUR DATABASE FIRST!
 * mongodump --db lms --out backup/lms-$(date +%Y%m%d-%H%M%S)/
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

// Use loose schema to handle existing data
const courseSchema = new mongoose.Schema({}, { strict: false });
const Course = mongoose.model('Course', courseSchema, 'courses');

async function migrate() {
  try {
    console.log('🔄 Starting migration: teacherId → teacherIds array...\n');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';
    console.log(`📡 Connecting to: ${mongoUri}\n`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Find all courses with teacherId field
    const coursesWithTeacherId = await Course.find({ 
      teacherId: { $exists: true, $ne: null } 
    });
    console.log(`📊 Found ${coursesWithTeacherId.length} courses with teacherId field\n`);
    
    if (coursesWithTeacherId.length === 0) {
      console.log('✓ No courses to migrate. Exiting.');
      process.exit(0);
    }
    
    // Perform migration
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      let updated = 0;
      let errors = [];
      
      for (const course of coursesWithTeacherId) {
        try {
          // Skip if already migrated
          if (course.teacherIds && course.teacherIds.length > 0) {
            console.log(`  ⏭️  Course "${course.name}" already has teacherIds. Skipping.`);
            continue;
          }
          
          // Build update object
          const updateObj = {
            teacherIds: course.teacherId ? [course.teacherId] : [],
            primaryTeacherId: course.teacherId || null,
            status: course.status || 'active',
            createdAt: course.createdAt || new Date(),
            updatedAt: new Date(),
          };
          
          const result = await Course.findByIdAndUpdate(
            course._id,
            { $set: updateObj },
            { session, new: true }
          );
          
          if (result) {
            updated++;
            console.log(`  ✓ Migrated: "${course.name}" (T: ${course.teacherId})`);
          }
        } catch (courseError) {
          errors.push({
            courseId: course._id,
            courseName: course.name,
            error: courseError.message,
          });
          console.log(`  ❌ Error migrating "${course.name}": ${courseError.message}`);
        }
      }
      
      // Commit transaction
      await session.commitTransaction();
      console.log(`\n✅ Migration successful: ${updated}/${coursesWithTeacherId.length} courses updated`);
      
      if (errors.length > 0) {
        console.log(`\n⚠️  ${errors.length} courses had errors:`);
        errors.forEach(err => {
          console.log(`   - ${err.courseName}: ${err.error}`);
        });
      }
      
    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verified = await Course.countDocuments({ 
      teacherIds: { $exists: true, $type: 'array' } 
    });
    const withoutMigration = await Course.countDocuments({ 
      teacherIds: { $size: 0, $exists: true } 
    });
    
    console.log(`✓ Total courses with teacherIds array: ${verified}`);
    console.log(`✓ Courses with empty teacherIds: ${withoutMigration}`);
    
    // Check for gaps
    const withoutTeacherId = await Course.countDocuments({ 
      teacherId: { $exists: false, $eq: null } 
    });
    console.log(`✓ Courses without any teacherId set: ${withoutTeacherId}`);
    
    console.log('\n🎉 Migration verification complete!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📊 Database connection closed.');
  }
}

// Run migration
migrate().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
