export interface StudentTest {
  subject: string;
  test: string;
  marks: number;
  total: number;
  date: string;
  grade: string;
}

export interface StudentAssignment {
  title: string;
  subject: string;
  due: string;
  status: string;
  score?: string;
  question?: string;
  totalMarks?: number;
  chapterName?: string;
  chapterNumber?: number;
  submissionType?: "Handwritten" | "Word" | "PDF";
  instructions?: string;
}

export interface Student {
  id: number;
  backendId?: string;
  admissionNo?: string;
  name: string;
  email: string;
  grade: string;
  avatar: string;
  gender: string;
  dob: string;
  phone: string;
  guardian: string;
  guardianPhone: string;
  address: string;
  enrollDate: string;
  status: string;
  attendance: { present: number; absent: number; late: number; total: number };
  tests: StudentTest[];
  progress: { month: string; percentage: number }[];
  assignments: StudentAssignment[];
  behavior: { date: string; type: string; note: string }[];
  fees: { total: number; paid: number; pending: number; status: string };
}

export interface Announcement {
  id: number;
  backendId?: string;
  title: string;
  date: string;
  priority?: string;
  content: string;
  author?: string;
  authorRole?: string;
  hidden?: boolean;
}

export type AnnouncementTarget = {
  targetType: "all" | "classes" | "students";
  targetClasses: string[];
  targetStudentIds: number[];
};

export interface Teacher {
  id: number;
  backendId?: string;
  employeeNo?: string;
  name: string;
  subject: string;
  email: string;
  avatar: string;
  classes: string[];
  students: number;
  phone: string;
  address: string;
  dob: string;
  gender: string;
  qualification: string;
  joinDate: string;
  emergencyContact: string;
  emergencyPhone: string;
  status?: string;
  avatarUrl?: string;
  classSubjects?: Record<string, string[]>;
}

export interface StudyMaterial {
  id: number | string;
  title: string;
  type: "pdf" | "doc" | "ppt" | "link" | "video" | "note" | "image" | "other";
  url?: string;
  publicId?: string;
  content?: string;
}

export interface CourseTopic {
  id: number;
  topicName: string;
  materials: StudyMaterial[];
}

export interface CourseChapter {
  id: number;
  chapterNumber: number;
  chapterName: string;
  description?: string;
  topics: CourseTopic[];
  materials: StudyMaterial[];
}

export interface Assignment {
  id?: number;
  title: string;
  description?: string;
  dueDate?: string;
  totalMarks?: number;
}

export interface Course {
  id?: number;
  backendId?: string;
  name: string;
  code?: string;
  teacher?: string;
  teacherId?: number;
  description?: string;
  schedule?: string;
  room?: string;
  credits?: number;
  progress?: number;
  chapters?: CourseChapter[];
  materials?: StudyMaterial[];
  recentMaterials?: StudyMaterial[];
  assignments?: Assignment[];
  pastPapers?: {
    title: string;
    year: string;
    totalMarks: number;
    file: string;
  }[];
}

export interface TimetableEntry {
  time: string;
  mon?: string;
  tue?: string;
  wed?: string;
  thu?: string;
  fri?: string;
  sat?: string;  
}

export interface TeacherAssignment {
  id: number;
  title: string;
  subject: string;
  classGrade: string;
  dueDate: string;
  totalMarks: number;
  description: string;
  createdDate: string;
  question?: string;
  chapterName?: string;
  chapterNumber?: number;
  submissionType?: "Handwritten" | "Word" | "PDF";
  instructions?: string;
  feedback?: string;
  assignedStudentIds?: number[];
  submissions: {
    studentId: number;
    studentName: string;
    studentAvatar: string;
    status: string;
    submittedDate?: string;
    fileName?: string;
    fileUrl?: string;
    marks?: number;
    feedback?: string;
  }[];
}

export interface MockTeacherQuiz {
  id: string;
  title: string;
  description: string;
  classGrade: string;
  chapterName: string;
  topicName: string;
  dueDate: string;
  questions: {
    id: string;
    text: string;
    options: { id: string; text: string }[];
    correctOptionId: string | null;
  }[];
  teacherName?: string;
  teacherId?: number;
  subject?: string;
  createdAt?: string;
}

export interface MockQuizSubmission {
  id: string;
  quizId: string;
  studentId: number;
  submittedAt: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  subject?: string;
  teacherName?: string;
  checked: boolean;
}

export const MOCK_TEACHER_QUIZZES: MockTeacherQuiz[] = [];
export const MOCK_QUIZ_SUBMISSIONS: MockQuizSubmission[] = [];
