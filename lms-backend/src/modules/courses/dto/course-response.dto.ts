export class CourseResponseDto {
  id!: string;
  name!: string;
  code!: string;
  teacher?: object;
  teacherId!: string;
  grade!: string;
  description!: string;
  overviewTitle?: string;
  learningOutcomes?: string[];
  objectives?: string[];
  thumbnailUrl?: string;
  recentMaterials?: object[];
  schedule!: string;
  weeklySchedule?: object[];
  room?: string;
  credits?: number;
  progress?: number;
  completedTopicIds?: string[];
  chapters?: object[];
  materials?: object[];
  pastPapers?: object[];
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CoursesListResponseDto {
  data!: CourseResponseDto[];
}

export class SingleCourseResponseDto {
  data!: CourseResponseDto;
}
