const DIGIT_MATCH = /\d+/g;

function extractDigits(value: string) {
  const matches = value.match(DIGIT_MATCH);
  return matches ? matches.join("") : "";
}

function formatPortalId(prefix: string, value: number) {
  return `${prefix}-${String(value).padStart(4, "0")}`;
}

export function extractNumericId(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const digits = extractDigits(value);
  if (!digits) {
    return null;
  }

  const numeric = Number(digits);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

export function formatStudentPortalId(value: number) {
  return formatPortalId("Stu", value);
}

export function formatTeacherPortalId(value: number) {
  return formatPortalId("Ta", value);
}

export function normalizeStudentPortalId(value: string) {
  const numeric = extractNumericId(value);
  return numeric ? formatStudentPortalId(numeric) : null;
}

export function normalizeTeacherPortalId(value: string) {
  const numeric = extractNumericId(value);
  return numeric ? formatTeacherPortalId(numeric) : null;
}

