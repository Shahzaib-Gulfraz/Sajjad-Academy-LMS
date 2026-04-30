const mongoose = require('mongoose');
require('dotenv').config();

const { Types } = mongoose;

const studentSchema = new mongoose.Schema(
  {
    grade: mongoose.Schema.Types.Mixed,
    enrolledCourses: { type: [String], default: [] },
    enrolledCourseIds: { type: [String], default: [] },
    status: { type: String, default: 'Active' },
  },
  { timestamps: true, collection: 'students' },
);

const courseSchema = new mongoose.Schema(
  {
    name: String,
    code: String,
    grade: mongoose.Schema.Types.Mixed,
    status: { type: String, default: 'Active' },
  },
  { timestamps: true, collection: 'courses' },
);

const enrollmentSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: { type: String, default: 'Active' },
    enrolledAt: { type: Date, default: () => new Date() },
    completedTopicIds: { type: [String], default: [] },
    progress: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'course_enrollments' },
);

const Student = mongoose.model('StudentSync', studentSchema);
const Course = mongoose.model('CourseSync', courseSchema);
const Enrollment = mongoose.model('EnrollmentSync', enrollmentSchema);

function isObjectIdString(value) {
  return typeof value === 'string' && Types.ObjectId.isValid(value);
}

function asStringSet(values) {
  return new Set((values ?? []).filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim()));
}

async function findCoursesByLegacyValues(values) {
  if (!values.length) {
    return [];
  }

  const idValues = values.filter((v) => isObjectIdString(v)).map((v) => new Types.ObjectId(v));
  const textValues = values.filter((v) => !isObjectIdString(v));

  const filters = [];
  if (idValues.length > 0) {
    filters.push({ _id: { $in: idValues } });
  }
  if (textValues.length > 0) {
    filters.push({ name: { $in: textValues } });
    filters.push({ code: { $in: textValues } });
  }

  if (filters.length === 0) {
    return [];
  }

  return Course.find({
    status: 'Active',
    $or: filters,
  }).exec();
}

async function findCoursesByGradeFallback(studentGrade) {
  if (studentGrade === undefined || studentGrade === null) {
    return [];
  }

  const gradeValue = String(studentGrade).trim();
  if (!gradeValue) {
    return [];
  }

  const courses = await Course.find({ status: 'Active', grade: gradeValue }).exec();
  // Safety rule: use grade fallback only when mapping is unambiguous.
  if (courses.length === 1) {
    return courses;
  }

  return [];
}

async function run({ write }) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lms';
  const dbName = process.env.MONGODB_DB_NAME || 'lms';

  console.log(`Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri, { dbName });
  console.log(`Connected to DB: ${dbName}`);

  const students = await Student.find({ status: 'Active' }).exec();

  let matchedStudents = 0;
  let updatedStudents = 0;
  let createdEnrollments = 0;
  let existingEnrollments = 0;
  let unresolvedStudents = 0;

  for (const student of students) {
    const legacyValues = Array.from(
      new Set([
        ...asStringSet(student.enrolledCourseIds ?? []),
        ...asStringSet(student.enrolledCourses ?? []),
      ]),
    );

    let candidateCourses = await findCoursesByLegacyValues(legacyValues);
    if (candidateCourses.length === 0) {
      candidateCourses = await findCoursesByGradeFallback(student.grade);
    }

    if (candidateCourses.length === 0) {
      unresolvedStudents += 1;
      continue;
    }

    matchedStudents += 1;

    const normalizedCourseIds = new Set(student.enrolledCourseIds ?? []);
    const normalizedCourseNames = new Set(student.enrolledCourses ?? []);

    for (const course of candidateCourses) {
      const courseId = course._id.toString();
      normalizedCourseIds.add(courseId);
      normalizedCourseNames.add(course.name);

      const existing = await Enrollment.findOne({
        courseId: course._id,
        studentId: student._id,
      }).exec();

      if (existing) {
        if (existing.status !== 'Active' && write) {
          existing.status = 'Active';
          await existing.save();
        }
        existingEnrollments += 1;
      } else {
        createdEnrollments += 1;
        if (write) {
          await Enrollment.create({
            courseId: course._id,
            studentId: student._id,
            status: 'Active',
            enrolledAt: new Date(),
            completedTopicIds: [],
            progress: 0,
          });
        }
      }
    }

    const nextCourseIds = Array.from(normalizedCourseIds);
    const nextCourseNames = Array.from(normalizedCourseNames);
    const courseIdsChanged =
      JSON.stringify([...(student.enrolledCourseIds ?? [])].sort()) !==
      JSON.stringify([...nextCourseIds].sort());
    const courseNamesChanged =
      JSON.stringify([...(student.enrolledCourses ?? [])].sort()) !==
      JSON.stringify([...nextCourseNames].sort());

    if (courseIdsChanged || courseNamesChanged) {
      updatedStudents += 1;
      if (write) {
        student.enrolledCourseIds = nextCourseIds;
        student.enrolledCourses = nextCourseNames;
        await student.save();
      }
    }
  }

  console.log('\nSync Summary');
  console.log('------------');
  console.log(`students_scanned=${students.length}`);
  console.log(`students_with_course_match=${matchedStudents}`);
  console.log(`students_unresolved=${unresolvedStudents}`);
  console.log(`students_updated=${updatedStudents}${write ? '' : ' (dry-run)'}`);
  console.log(`enrollments_created=${createdEnrollments}${write ? '' : ' (dry-run)'}`);
  console.log(`enrollments_existing_or_reactivated=${existingEnrollments}`);

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

const write = process.argv.includes('--write');
run({ write })
  .then(() => {
    console.log(write ? '\nDone (write mode).' : '\nDone (dry-run). Add --write to persist changes.');
  })
  .catch((error) => {
    console.error('\nSync failed:', error);
    process.exitCode = 1;
  });
