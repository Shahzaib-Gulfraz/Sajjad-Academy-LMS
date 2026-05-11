/**
 * Migration script: move legacy course overview/materials into materials collection.
 *
 * Run:
 *   cd lms-backend && node scripts/migrate-course-overview-materials-to-materials.js
 *
 * BACKUP FIRST.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const courseSchema = new mongoose.Schema({}, { strict: false });
const materialSchema = new mongoose.Schema({}, { strict: false });

const Course = mongoose.model('Course', courseSchema, 'courses');
const Material = mongoose.model('Material', materialSchema, 'materials');

function toObjectId(value) {
  try {
    if (!value) return null;
    return new mongoose.Types.ObjectId(String(value));
  } catch {
    return null;
  }
}

function toSafeString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function normalizeBooks(books) {
  if (!Array.isArray(books)) return [];
  return books
    .map((book) => ({
      bookTitle: toSafeString(book?.bookTitle ?? book?.title),
      author: toSafeString(book?.author),
      fileUrl: toSafeString(book?.fileUrl ?? book?.url),
    }))
    .filter((book) => book.bookTitle && book.author);
}

function normalizeMaterialType(type) {
  const allowed = new Set(['pdf', 'doc', 'ppt', 'video', 'audio', 'link', 'image', 'note', 'other']);
  const normalized = toSafeString(type, 'other').toLowerCase();
  return allowed.has(normalized) ? normalized : 'other';
}

async function upsertOverview(course) {
  const overview = course.overview ?? {};
  const now = new Date();

  const courseId = toObjectId(course._id);
  const classId = toObjectId(course.grade);
  const teacherId = toObjectId(course.primaryTeacherId ?? course.teacherId ?? course.teacherIds?.[0]);

  if (!courseId || !classId || !teacherId) {
    return { skipped: true, reason: 'missing_ids' };
  }

  const payload = {
    courseId,
    classId,
    subjectId: null,
    scope: 'overview',
    title: toSafeString(overview.title ?? course.name, toSafeString(course.name, 'Untitled')),
    type: 'overview',
    teacherId,
    teacherUserId: null,
    studentUserIds: [],
    description: toSafeString(overview.description ?? course.description),
    learningOutcome: toSafeString((overview.learningOutcomes ?? [])[0] ?? overview.description ?? course.description),
    learningOutcomes: Array.isArray(overview.learningOutcomes) ? overview.learningOutcomes.filter(Boolean).map((v) => String(v).trim()) : [],
    objectives: Array.isArray(overview.objectives) ? overview.objectives.filter(Boolean).map((v) => String(v).trim()) : [],
    thumbnailUrl: toSafeString(overview.thumbnailUrl ?? course.thumbnailUrl),
    thumbnailPublicId: toSafeString(overview.thumbnailPublicId ?? course.thumbnailPublicId),
    weeklySchedule: Array.isArray(overview.weeklySchedule) ? overview.weeklySchedule : (Array.isArray(course.weeklySchedule) ? course.weeklySchedule : []),
    recentMaterials: Array.isArray(overview.recentMaterials) ? overview.recentMaterials : (Array.isArray(course.recentMaterials) ? course.recentMaterials : []),
    chapterId: '',
    topicId: '',
    url: '',
    publicId: '',
    content: '',
    resourceType: undefined,
    originalFileName: '',
    mimeType: '',
    sizeBytes: 0,
    recommendedBooks: normalizeBooks(overview.recommendedBooks),
    createdAt: course.createdAt ?? now,
    updatedAt: now,
  };

  await Material.findOneAndUpdate(
    { courseId, scope: 'overview' },
    { $set: payload, $setOnInsert: { createdAt: payload.createdAt } },
    { upsert: true, new: true },
  );

  return { skipped: false };
}

async function migrateEmbeddedMaterials(course) {
  const courseId = toObjectId(course._id);
  const classId = toObjectId(course.grade);
  const teacherId = toObjectId(course.primaryTeacherId ?? course.teacherId ?? course.teacherIds?.[0]);

  if (!courseId || !classId || !teacherId) {
    return { inserted: 0, skipped: 1 };
  }

  const docs = Array.isArray(course.materials) ? course.materials : [];
  if (!docs.length) return { inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;

  for (const doc of docs) {
    const legacyId = toSafeString(doc?.id);
    const title = toSafeString(doc?.title);
    if (!legacyId || !title) {
      skipped += 1;
      continue;
    }

    const exists = await Material.exists({
      courseId,
      scope: 'material',
      $or: [
        { 'legacy.courseMaterialId': legacyId },
        { title, url: toSafeString(doc?.url) },
      ],
    });

    if (exists) {
      skipped += 1;
      continue;
    }

    await Material.create({
      courseId,
      classId,
      subjectId: null,
      scope: 'material',
      title,
      type: normalizeMaterialType(doc?.type),
      url: toSafeString(doc?.url),
      publicId: toSafeString(doc?.publicId),
      content: toSafeString(doc?.content),
      resourceType: doc?.resourceType,
      originalFileName: toSafeString(doc?.originalFileName),
      mimeType: toSafeString(doc?.mimeType),
      sizeBytes: Number.isFinite(Number(doc?.sizeBytes)) ? Number(doc.sizeBytes) : 0,
      teacherId,
      teacherUserId: null,
      studentUserIds: Array.isArray(doc?.studentUserIds)
        ? doc.studentUserIds.map((id) => toObjectId(id)).filter(Boolean)
        : [],
      description: toSafeString(doc?.content ?? doc?.title),
      learningOutcome: toSafeString(doc?.content ?? doc?.title),
      learningOutcomes: [],
      objectives: [],
      thumbnailUrl: '',
      thumbnailPublicId: '',
      weeklySchedule: [],
      recentMaterials: [],
      chapterId: toSafeString(doc?.chapterId),
      topicId: toSafeString(doc?.topicId),
      recommendedBooks: [],
      legacy: {
        source: 'courses.materials',
        courseMaterialId: legacyId,
      },
      createdAt: doc?.createdAt ? new Date(doc.createdAt) : new Date(),
      updatedAt: new Date(),
    });

    inserted += 1;
  }

  return { inserted, skipped };
}

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';
  console.log(`Connecting to ${mongoUri}`);

  await mongoose.connect(mongoUri);
  console.log('Connected');

  const courses = await Course.find({}).lean().exec();
  console.log(`Found ${courses.length} course docs`);

  let overviewUpserts = 0;
  let materialInserts = 0;
  let materialSkips = 0;
  let overviewSkips = 0;

  for (const course of courses) {
    const overviewResult = await upsertOverview(course);
    if (overviewResult.skipped) {
      overviewSkips += 1;
    } else {
      overviewUpserts += 1;
    }

    const materialResult = await migrateEmbeddedMaterials(course);
    materialInserts += materialResult.inserted;
    materialSkips += materialResult.skipped;
  }

  console.log('Migration completed');
  console.log(`Overview upserts: ${overviewUpserts}`);
  console.log(`Overview skips: ${overviewSkips}`);
  console.log(`Material inserts: ${materialInserts}`);
  console.log(`Material skips: ${materialSkips}`);

  await mongoose.disconnect();
  console.log('Disconnected');
}

run().catch(async (error) => {
  console.error('Migration failed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
