export const percentageToCambridgeGrade = (percentage: number): string => {
  if (percentage >= 90) return "A*";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "F/G";
};

export const cambridgeGradeColor = (grade: string) => {
  if (grade.startsWith("A")) return "text-success";
  if (grade.startsWith("B")) return "text-info";
  if (grade.startsWith("C")) return "text-warning";
  if (grade.startsWith("D") || grade.startsWith("E")) return "text-warning";
  return "text-destructive";
};
