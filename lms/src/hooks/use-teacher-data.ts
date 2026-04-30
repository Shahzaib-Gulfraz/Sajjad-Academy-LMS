import { useQuery } from "@tanstack/react-query";
import { apiAuthRequest } from "@/lib/api";
import { loadAuthSession } from "@/lib/auth";
import type { Teacher, Course, Student } from "@/types/domain";

export type BackendClass = {
  id: string;
  name: string;
  academicYear: string;
  subjects: Array<{ id: string; name: string }>;
};

export type BackendCourse = {
  id: string;
  name: string;
  code: string;
  grade: string;
  description: string;
  overviewTitle?: string;
  learningOutcomes?: string[];
  objectives?: string[];
  thumbnailUrl?: string;
  thumbnailPublicId?: string;
  schedule: string;
  weeklySchedule?: Array<{
    id?: string;
    day: string;
    startTime: string;
    endTime: string;
    topic?: string;
    location?: string;
  }>;
  recentMaterials?: Course["materials"];
  room?: string;
  credits?: number;
  chapters?: Course["chapters"];
  materials?: Course["materials"];
  teacherId: string;
  updatedAt?: string;
};

export type BackendStudent = {
  id: string;
  admissionNo: string;
  name: string;
  email: string;
  grade: string;
  guardian: string;
  guardianPhone: string;
  status: string;
};

export type BackendAssignment = {
  id: string;
  title: string;
  subject: string;
  classGrade: string;
  dueDate: string;
  teacherId: string;
  teacherName: string;
  totalMarks: number;
  description?: string;
  instructions?: string;
  assignedStudentIds?: string[];
};

export type BackendQuiz = {
  id: string;
  title: string;
  description?: string;
  classGrade: string;
  chapterName?: string;
  topicName?: string;
  dueDate: string;
  teacherId: string;
  teacherName: string;
  subject: string;
};

export type AssignmentSubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  status: string;
  submittedAt: string;
};

export type QuizSubmission = {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  total: number;
  checked: boolean;
};

export type BackendTimetableSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
};

export type BackendGradebookEntry = {
  id: string;
  teacherId: string;
  subject: string;
  classGrade: string;
  term: string;
  assessment: string;
  totalMarks: number;
  marks: { studentId: string; marks: number }[];
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value.replace(/[^0-9]/g, ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const mapStudent = (student: BackendStudent, index: number): Student => ({
  id: toNumber(student.admissionNo, index + 1),
  backendId: student.id,
  name: student.name,
  email: student.email,
  grade: student.grade,
  avatar: initials(student.name),
  gender: "",
  dob: "",
  phone: "",
  guardian: student.guardian,
  guardianPhone: student.guardianPhone,
  address: "",
  enrollDate: "",
  status: student.status,
  attendance: { present: 0, absent: 0, late: 0, total: 0 },
  tests: [],
  progress: [],
  assignments: [],
  behavior: [],
  fees: { total: 0, paid: 0, pending: 0, status: "Pending" },
});

const mapClass = (classItem: BackendClass, teacher: Teacher, index: number): Course => ({
  id: toNumber(classItem.id, index + 1),
  backendId: classItem.id,
  name: classItem.name,
  code: `CLS-${classItem.name.replace(/\s+/g, "")}`,
  teacher: teacher.name,
  teacherId: teacher.id,
  description:
    classItem.subjects.length > 0
      ? `Configured subjects: ${classItem.subjects.map(s => s.name).join(", ")}`
      : "Configured class from backend.",
  schedule: classItem.academicYear,
  room: classItem.name,
  credits: classItem.subjects.length,
  progress: 0,
  chapters: [],
  materials: [],
  assignments: [],
  pastPapers: [],
});

export const useTeacherData = (teacher: Teacher) => {
  return useQuery({
    queryKey: ["teacher-data", teacher.id],
    queryFn: async () => {
      const authTeacherId = loadAuthSession()?.user.id ?? "";
      
      const [
        classesResult,
        studentsResult,
        assignmentsResult,
        quizzesResult,
        assignmentSubmissionsResult,
        quizSubmissionsResult,
        timetableResult,
        gradebookResult,
        coursesResult,
      ] = await Promise.allSettled([
        apiAuthRequest<BackendClass[]>("/classes"),
        apiAuthRequest<BackendStudent[]>("/students"),
        apiAuthRequest<BackendAssignment[]>(
          teacher.backendId ? `/assignments?teacherId=${teacher.backendId}` : `/assignments?subject=${encodeURIComponent(teacher.subject)}`,
        ),
        apiAuthRequest<BackendQuiz[]>(
          teacher.backendId ? `/quizzes?teacherId=${teacher.backendId}` : `/quizzes?subject=${encodeURIComponent(teacher.subject)}`,
        ),
        apiAuthRequest<AssignmentSubmission[]>("/assignments/submissions/list"),
        apiAuthRequest<QuizSubmission[]>("/quizzes/submissions/list"),
        apiAuthRequest<BackendTimetableSlot[]>(
          teacher.backendId ? `/timetable/slots?teacherId=${teacher.backendId}` : "/timetable/slots",
        ),
        apiAuthRequest<BackendGradebookEntry[]>(
          authTeacherId
            ? `/gradebook/entries?teacherId=${encodeURIComponent(authTeacherId)}&page=1&pageSize=200`
            : teacher.backendId
            ? `/gradebook/entries?teacherId=${encodeURIComponent(teacher.backendId)}&page=1&pageSize=200`
            : `/gradebook/entries?subject=${encodeURIComponent(teacher.subject)}&page=1&pageSize=200`,
        ),
        apiAuthRequest<BackendCourse[]>("/courses"),
      ]);

      const classes = classesResult.status === "fulfilled" 
        ? classesResult.value
            .filter((entry) => (teacher.classes ?? []).includes(entry.id))
            .map((entry, index) => mapClass(entry, teacher, index))
        : [];

      const students = studentsResult.status === "fulfilled"
        ? studentsResult.value.map(mapStudent)
        : [];

      return {
        classes,
        students,
        assignments: assignmentsResult.status === "fulfilled" ? assignmentsResult.value : [],
        quizzes: quizzesResult.status === "fulfilled" ? quizzesResult.value : [],
        assignmentSubmissions: assignmentSubmissionsResult.status === "fulfilled" ? assignmentSubmissionsResult.value : [],
        quizSubmissions: quizSubmissionsResult.status === "fulfilled" ? quizSubmissionsResult.value : [],
        timetableSlots: timetableResult.status === "fulfilled" ? timetableResult.value : [],
        gradebookEntries: gradebookResult.status === "fulfilled" ? gradebookResult.value : [],
        backendCourses: coursesResult.status === "fulfilled" ? coursesResult.value : [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};
