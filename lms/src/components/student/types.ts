export type PortalStudent = {
  id: string; // The backend _id (MongoDB ObjectId)
  admissionNo: string;
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
  status: string;
  avatarUrl?: string;
  // Dynamic arrays or nested objects should be fetched independently by components,
  // not stored on the student object itself anymore to ensure fresh data.
};

export type PortalAnnouncement = {
  id: string;
  title: string;
  date: string;
  priority: "low" | "medium" | "high";
  content: string;
  author: string;
};
