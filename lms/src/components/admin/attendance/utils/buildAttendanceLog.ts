import type { Student } from "@/types/domain";
import type { AttendanceRecord, AttendanceStatus } from "../types/attendance";
import { timeSlots, weekDays } from "./constants";

const startDate = new Date("2025-08-04");

export const buildAttendanceLog = (student: Student): AttendanceRecord[] => {
  const courses = new Set<string>();
  student.tests.forEach((test) => courses.add(test.subject));
  student.assignments.forEach((assignment) => courses.add(assignment.subject));
  const courseList = Array.from(courses);
  const fallbackCourse = student.grade;

  const total = student.attendance.total;
  const targetAbsent = student.attendance.absent;
  const targetLate = student.attendance.late;

  let absentCount = 0;
  let lateCount = 0;

  const records: AttendanceRecord[] = [];

  for (let i = 0; i < total; i += 1) {
    const classIndex = i % timeSlots.length;
    const dayIndex = i % weekDays.length;
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + Math.floor(i / 5) * 7 + dayIndex);

    let status: AttendanceStatus = "Present";
    if (
      absentCount < targetAbsent &&
      Math.random() < targetAbsent / total &&
      absentCount < targetAbsent
    ) {
      status = "Absent";
      absentCount += 1;
    } else if (
      lateCount < targetLate &&
      Math.random() < targetLate / total &&
      lateCount < targetLate
    ) {
      status = "Late";
      lateCount += 1;
    }

    const className =
      courseList.length > 0 ? courseList[i % courseList.length] : fallbackCourse;

    records.push({
      id: `${student.id}-${i}`,
      date: date.toISOString().split("T")[0],
      day: weekDays[dayIndex],
      time: timeSlots[classIndex],
      className,
      status,
    });
  }

  return records;
};
