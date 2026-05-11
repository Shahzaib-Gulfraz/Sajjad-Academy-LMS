import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface StudyMaterial {
  id?: string;
  title: string;
  type: 'pdf' | 'doc' | 'video' | 'link' | 'image' | 'other';
  url?: string;
  content?: string;
}

export interface CourseTopic {
  id?: string;
  topicName: string;
  description?: string;
  materials?: StudyMaterial[];
}

export interface CourseChapter {
  id?: string;
  chapterNumber: number;
  chapterName: string;
  description?: string;
  topics?: CourseTopic[];
  materials?: StudyMaterial[];
}

interface PastPaper {
  title: string;
  year: string;
  totalMarks: number;
  file: string;
}

interface Teacher {
  _id: string;
  name: string;
  email: string;
  qualification?: string;
  phone?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  teacher?: Teacher;
  teacherId: string;
  grade: string;
  description: string;
  overviewTitle?: string;
  learningOutcomes?: string[];
  objectives?: string[];
  thumbnailUrl?: string;
  schedule: string;
  weeklySchedule?: Array<{
    id?: string;
    day: string;
    startTime: string;
    endTime: string;
    topic?: string;
    location?: string;
  }>;
  room?: string;
  credits?: number;
  progress?: number;
  completedTopicIds?: string[];
  chapters?: CourseChapter[];
  materials?: StudyMaterial[];
  pastPapers?: PastPaper[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const useCourses = () => {
  const queryClient = useQueryClient();

  const {
    data: courses = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['student-courses'],
    queryFn: async () => {
      return [] as Course[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const toggleTopicMutation = useMutation({
    mutationFn: async ({ courseId, topicId, completed }: { courseId: string; topicId: string; completed: boolean }) => {
      void courseId;
      void topicId;
      void completed;
      return { progress: 0, completedTopicIds: [] as string[] };
    },
    onMutate: async ({ courseId, topicId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['student-courses'] });
      const previousCourses = queryClient.getQueryData<Course[]>(['student-courses']);
      
      queryClient.setQueryData<Course[]>(['student-courses'], (old) => {
        if (!old) return old;
        return old.map((course) => {
          if (course.id !== courseId) return course;

          const completedTopicIds = new Set(course.completedTopicIds ?? []);
          if (completed) {
            completedTopicIds.add(topicId);
          } else {
            completedTopicIds.delete(topicId);
          }

          const totalTopics = countAllTopics(course);
          const progress = totalTopics > 0
            ? Math.max(0, Math.min(100, Math.round((completedTopicIds.size / totalTopics) * 100)))
            : 0;

          return {
            ...course,
            progress,
            completedTopicIds: Array.from(completedTopicIds),
          };
        });
      });
      
      return { previousCourses };
    },
    onError: (err, variables, context) => {
      if (context?.previousCourses) {
        queryClient.setQueryData(['student-courses'], context.previousCourses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['student-courses'] });
    },
  });

  return {
    courses,
    isLoading,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
    toggleTopicCompletion: async (courseId: string, topicId: string, completed: boolean) => {
      await toggleTopicMutation.mutateAsync({ courseId, topicId, completed });
    },
    isTogglingTopicCompletion: toggleTopicMutation.isPending,
  };
};

const countAllTopics = (course: Course) =>
  (course.chapters ?? []).reduce(
    (total, chapter) => total + (chapter.topics?.length ?? 0),
    0,
  );

