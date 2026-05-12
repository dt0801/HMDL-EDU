export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "instructor" | "student";
export type EnrollmentStatus = "active" | "completed" | "dropped";
export type LessonType = "video" | "document" | "text";
export type QuestionType = "mcq" | "multi" | "true_false";
export type LiveSessionStatus = "scheduled" | "canceled";
export type CourseDocumentAudience = "student" | "instructor" | "both";
export type CourseDocumentKind =
  | "procedure"
  | "template"
  | "slide"
  | "reference"
  | "policy"
  | "other";

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string | null;
  department_id: string | null;
  avatar_url: string | null;
  phone: string | null;
  profile_completed_at: string | null;
  is_active: boolean;
  created_at: string;
};
type ProfileInsert = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  department_id?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  profile_completed_at?: string | null;
  is_active?: boolean;
  created_at?: string;
};

type DepartmentRow = {
  id: string;
  name: string;
  code: string | null;
  sort_order: number;
  created_at: string;
};
type DepartmentInsert = {
  id?: string;
  name: string;
  code?: string | null;
  sort_order?: number;
  created_at?: string;
};

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  instructor_id: string | null;
  is_published: boolean;
  requires_enrollment: boolean;
  created_at: string;
  updated_at: string;
};
type CourseInsert = {
  id?: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  category?: string | null;
  instructor_id?: string | null;
  is_published?: boolean;
  requires_enrollment?: boolean;
  created_at?: string;
  updated_at?: string;
};

type LessonRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  type: LessonType;
  content_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};
type LessonInsert = {
  id?: string;
  course_id: string;
  title: string;
  description?: string | null;
  type: LessonType;
  content_url?: string | null;
  duration_seconds?: number | null;
  sort_order?: number;
  is_published?: boolean;
  created_at?: string;
};

type EnrollmentRow = {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  status: EnrollmentStatus;
};
type EnrollmentInsert = {
  id?: string;
  student_id: string;
  course_id: string;
  enrolled_at?: string;
  completed_at?: string | null;
  status?: EnrollmentStatus;
};

type LessonProgressRow = {
  id: string;
  student_id: string;
  lesson_id: string;
  watched_seconds: number;
  is_completed: boolean;
  last_watched_at: string | null;
};
type LessonProgressInsert = {
  id?: string;
  student_id: string;
  lesson_id: string;
  watched_seconds?: number;
  is_completed?: boolean;
  last_watched_at?: string | null;
};

type LiveSessionRow = {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  scheduled_start_at: string;
  duration_minutes: number;
  timezone: string;
  zoom_meeting_id: string;
  zoom_join_url: string;
  status: LiveSessionStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
type LiveSessionInsert = {
  id?: string;
  course_id: string;
  lesson_id?: string | null;
  title: string;
  description?: string | null;
  scheduled_start_at: string;
  duration_minutes?: number;
  timezone?: string;
  zoom_meeting_id: string;
  zoom_join_url: string;
  status?: LiveSessionStatus;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

type LiveSessionSecretRow = {
  session_id: string;
  zoom_start_url: string;
  created_at: string;
  updated_at: string;
};
type LiveSessionSecretInsert = {
  session_id: string;
  zoom_start_url: string;
  created_at?: string;
  updated_at?: string;
};

type CourseDocumentRow = {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  audience: CourseDocumentAudience;
  document_kind: CourseDocumentKind;
  is_published: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};
type CourseDocumentInsert = {
  id?: string;
  course_id: string;
  lesson_id?: string | null;
  title: string;
  description?: string | null;
  file_url: string;
  file_name: string;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  audience?: CourseDocumentAudience;
  document_kind?: CourseDocumentKind;
  is_published?: boolean;
  uploaded_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ExamRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  is_published: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
};
type ExamInsert = {
  id?: string;
  course_id: string;
  title: string;
  description?: string | null;
  duration_minutes?: number;
  passing_score?: number;
  max_attempts?: number;
  is_published?: boolean;
  start_at?: string | null;
  end_at?: string | null;
  created_at?: string;
};

type QuestionRow = {
  id: string;
  exam_id: string;
  content: string;
  type: QuestionType;
  points: number;
  sort_order: number;
  explanation: string | null;
};
type QuestionInsert = {
  id?: string;
  exam_id: string;
  content: string;
  type?: QuestionType;
  points?: number;
  sort_order?: number;
  explanation?: string | null;
};

type AnswerRow = {
  id: string;
  question_id: string;
  content: string;
  is_correct: boolean;
  sort_order: number;
};
type AnswerInsert = {
  id?: string;
  question_id: string;
  content: string;
  is_correct?: boolean;
  sort_order?: number;
};

type ExamAttemptRow = {
  id: string;
  exam_id: string;
  student_id: string;
  score: number | null;
  is_passed: boolean | null;
  started_at: string;
  submitted_at: string | null;
  answers_snapshot: Json | null;
};
type ExamAttemptInsert = {
  id?: string;
  exam_id: string;
  student_id: string;
  score?: number | null;
  is_passed?: boolean | null;
  started_at?: string;
  submitted_at?: string | null;
  answers_snapshot?: Json | null;
};

type CertificateRow = {
  id: string;
  student_id: string;
  course_id: string;
  issued_at: string;
  cert_number: string;
};
type CertificateInsert = {
  id?: string;
  student_id: string;
  course_id: string;
  issued_at?: string;
  cert_number?: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  link: string | null;
  created_at: string;
};
type NotificationInsert = {
  id?: string;
  user_id: string;
  title: string;
  body?: string | null;
  is_read?: boolean;
  link?: string | null;
  created_at?: string;
};

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type Database = {
  public: {
    Tables: {
      departments: {
        Row: DepartmentRow;
        Insert: DepartmentInsert;
        Update: Partial<DepartmentInsert>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: CourseRow;
        Insert: CourseInsert;
        Update: Partial<CourseInsert>;
        Relationships: Rel[];
      };
      lessons: {
        Row: LessonRow;
        Insert: LessonInsert;
        Update: Partial<LessonInsert>;
        Relationships: Rel[];
      };
      enrollments: {
        Row: EnrollmentRow;
        Insert: EnrollmentInsert;
        Update: Partial<EnrollmentInsert>;
        Relationships: Rel[];
      };
      lesson_progress: {
        Row: LessonProgressRow;
        Insert: LessonProgressInsert;
        Update: Partial<LessonProgressInsert>;
        Relationships: Rel[];
      };
      live_sessions: {
        Row: LiveSessionRow;
        Insert: LiveSessionInsert;
        Update: Partial<LiveSessionInsert>;
        Relationships: Rel[];
      };
      live_session_secrets: {
        Row: LiveSessionSecretRow;
        Insert: LiveSessionSecretInsert;
        Update: Partial<LiveSessionSecretInsert>;
        Relationships: Rel[];
      };
      course_documents: {
        Row: CourseDocumentRow;
        Insert: CourseDocumentInsert;
        Update: Partial<CourseDocumentInsert>;
        Relationships: Rel[];
      };
      exams: {
        Row: ExamRow;
        Insert: ExamInsert;
        Update: Partial<ExamInsert>;
        Relationships: Rel[];
      };
      questions: {
        Row: QuestionRow;
        Insert: QuestionInsert;
        Update: Partial<QuestionInsert>;
        Relationships: Rel[];
      };
      answers: {
        Row: AnswerRow;
        Insert: AnswerInsert;
        Update: Partial<AnswerInsert>;
        Relationships: Rel[];
      };
      exam_attempts: {
        Row: ExamAttemptRow;
        Insert: ExamAttemptInsert;
        Update: Partial<ExamAttemptInsert>;
        Relationships: Rel[];
      };
      certificates: {
        Row: CertificateRow;
        Insert: CertificateInsert;
        Update: Partial<CertificateInsert>;
        Relationships: Rel[];
      };
      notifications: {
        Row: NotificationRow;
        Insert: NotificationInsert;
        Update: Partial<NotificationInsert>;
        Relationships: Rel[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_admin_report_summary: {
        Args: Record<string, never>;
        Returns: {
          total_students: number;
          total_courses: number;
          published_courses: number;
          total_enrollments: number;
          completed_enrollments: number;
          average_score: number;
          certificates_issued: number;
        }[];
      };
      get_top_courses: {
        Args: { limit_count?: number };
        Returns: {
          course_id: string;
          course_title: string;
          enrollments_count: number;
        }[];
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_instructor_or_admin: { Args: Record<string, never>; Returns: boolean };
      current_role: { Args: Record<string, never>; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = ProfileRow;
export type Department = DepartmentRow;

/** profiles + embed departments(...) từ admin users query */
export type ProfileWithDepartmentEmbed = Profile & {
  departments: Pick<Department, "id" | "name"> | null;
};
export type Course = CourseRow;
export type Lesson = LessonRow;
export type Enrollment = EnrollmentRow;
export type LessonProgress = LessonProgressRow;
export type LiveSession = LiveSessionRow;
export type LiveSessionSecret = LiveSessionSecretRow;
export type CourseDocument = CourseDocumentRow;
export type Exam = ExamRow;
export type Question = QuestionRow;
export type Answer = AnswerRow;
export type ExamAttempt = ExamAttemptRow;
export type Certificate = CertificateRow;
export type Notification = NotificationRow;
