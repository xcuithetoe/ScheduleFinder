export interface Meeting {
  days: string;
  time: string;
  location: string;
}

export interface Enrollment {
  enrolled: number;
  capacity: number;
  spots_left: number;
}

export interface Waitlist {
  taken: number;
  capacity: number;
}

export interface FinalExam {
  date: string; // e.g. "December 9, 2026"
  day: string;  // e.g. "Wednesday"
  time: string; // e.g. "3pm-6pm"
  location: string;
}

export interface Requisite {
  course: string;
  min_grade: string;
  is_prereq: boolean;
  is_coreq: boolean;
  type: 'Warning' | 'Enforced' | 'Info';
}

export interface DiscussionSection {
  section_id: string;
  class_id?: string;
  class_no?: string;
  instructor: string;
  status: string;
  units?: string;
  enrollment?: Enrollment | null;
  waitlist?: Waitlist | null;
  meetings: Meeting[];
}

export interface LectureSection {
  section_id: string;
  class_id?: string;
  class_no?: string;
  instructor: string;
  status: string;
  units: string;
  enrollment?: Enrollment | null;
  waitlist?: Waitlist | null;
  meetings: Meeting[];
  final_exam?: FinalExam | null;
  restrictions?: string[];
  class_notes?: string[];
  requisites?: Requisite[];
  grading?: string | null;
  impacted?: string | null;
  level?: string | null;
  course_description?: string | null;
  ge_categories?: string[];
  ge_lab_demo?: boolean;
  writing_ii?: boolean;
  diversity?: boolean;
  department?: string | null;
  department_url?: string | null;
  textbooks_url?: string | null;
  library_reserve_url?: string | null;
  materials_fee?: string | null;
  discussions?: DiscussionSection[];
}

export interface CourseData {
  course: {
    title: string;
    course_code: string;
  };
  lectures: LectureSection[];
}

export type CourseDatabase = Record<string, CourseData>;

// Standardized UCLA GE Foundation Categories
export type GECategoryId =
  | 'literary_cultural'
  | 'philosophical_linguistic'
  | 'visual_performing'
  | 'historical_analysis'
  | 'social_analysis'
  | 'life_sciences'
  | 'physical_sciences';

export interface GECategoryDef {
  id: GECategoryId;
  label: string;
  foundation: 'Arts & Humanities' | 'Society & Culture' | 'Scientific Inquiry';
  badgeColor: string;
}

export const GE_CATEGORIES: GECategoryDef[] = [
  {
    id: 'literary_cultural',
    label: 'Literary & Cultural Analysis',
    foundation: 'Arts & Humanities',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  },
  {
    id: 'philosophical_linguistic',
    label: 'Philosophical & Linguistic Analysis',
    foundation: 'Arts & Humanities',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  },
  {
    id: 'visual_performing',
    label: 'Visual & Performing Arts Analysis',
    foundation: 'Arts & Humanities',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800',
  },
  {
    id: 'historical_analysis',
    label: 'Historical Analysis',
    foundation: 'Society & Culture',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  },
  {
    id: 'social_analysis',
    label: 'Social Analysis',
    foundation: 'Society & Culture',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  },
  {
    id: 'life_sciences',
    label: 'Life Sciences',
    foundation: 'Scientific Inquiry',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  {
    id: 'physical_sciences',
    label: 'Physical Sciences',
    foundation: 'Scientific Inquiry',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
  },
];

export type ModalityOption = 'all' | 'in_person' | 'online';

export interface FilterState {
  searchQuery: string;
  selectedCategories: GECategoryId[];
  modality: ModalityOption;
  majorStanding: string; // 'all' | 'open_only' | 'no_consent' | specific major
  openSeatsOnly: boolean;
  labDemoOnly: boolean;
  writingIIOnly: boolean;
  diversityOnly: boolean;
  hideExamConflicts: boolean;
  selectedExamDate: string; // 'all' | specific date
}
