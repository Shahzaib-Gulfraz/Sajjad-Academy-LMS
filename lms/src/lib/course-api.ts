import { apiAuthRequest } from './api';

export interface CourseChapter {
  id: string;
  chapterNumber: number;
  chapterName: string;
  description?: string;
  topics: CourseTopic[];
  materialIds: string[];
}

export interface CourseTopic {
  id: string;
  topicName: string;
  materialIds: string[];
}

export interface CourseData {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  name: string;
  description: string;
  chapters: CourseChapter[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch a course by ID
 */
export async function fetchCourse(courseId: string): Promise<CourseData> {
  return apiAuthRequest(`/courses/${courseId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Fetch a course by classId and subjectId
 */
export async function fetchCourseByClassAndSubject(
  classId: string,
  subjectId: string
): Promise<CourseData> {
  return apiAuthRequest(
    `/courses/by-class-subject/${encodeURIComponent(classId)}/${encodeURIComponent(subjectId)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Ensure a course exists for the given class/subject pair.
 */
export async function ensureCourseByClassAndSubject(
  classId: string,
  subjectId: string,
  name: string,
): Promise<CourseData> {
  return apiAuthRequest(
    `/courses/ensure/${encodeURIComponent(classId)}/${encodeURIComponent(subjectId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }
  );
}

/**
 * Create a new course
 */
export async function createCourse(dto: {
  classId: string;
  subjectId: string;
  name: string;
  description?: string;
  chapters?: CourseChapter[];
}): Promise<CourseData> {
  return apiAuthRequest(`/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

/**
 * Update a course (description, chapters array)
 */
export async function updateCourse(
  courseId: string,
  dto: {
    description?: string;
    chapters?: CourseChapter[];
  }
): Promise<CourseData> {
  return apiAuthRequest(`/courses/${courseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

/**
 * Add a new chapter to a course
 */
export async function addChapter(
  courseId: string,
  dto: {
    chapterNumber: number;
    chapterName: string;
    description?: string;
  }
): Promise<CourseData> {
  return apiAuthRequest(`/courses/${courseId}/chapters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

/**
 * Update a chapter in a course
 */
export async function updateChapter(
  courseId: string,
  chapterId: string,
  dto: {
    chapterNumber?: number;
    chapterName?: string;
    description?: string;
  }
): Promise<CourseData> {
  return apiAuthRequest(`/courses/${courseId}/chapters/${chapterId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

/**
 * Delete a chapter from a course
 */
export async function deleteChapter(courseId: string, chapterId: string): Promise<CourseData> {
  return apiAuthRequest(`/courses/${courseId}/chapters/${chapterId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Add a new topic to a chapter
 */
export async function addTopic(
  courseId: string,
  chapterId: string,
  dto: {
    topicName: string;
  }
): Promise<CourseData> {
  return apiAuthRequest(`/courses/${courseId}/chapters/${chapterId}/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
}

/**
 * Delete a topic from a chapter
 */
export async function deleteTopic(
  courseId: string,
  chapterId: string,
  topicId: string
): Promise<CourseData> {
  return apiAuthRequest(`/courses/${courseId}/chapters/${chapterId}/topics/${topicId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}
