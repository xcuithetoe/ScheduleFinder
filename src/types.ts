export type DayOfWeek = 'M' | 'Tu' | 'W' | 'Th' | 'F' | 'Sa' | 'Su';

export const DAY_NAMES: Record<DayOfWeek, string> = {
  M: 'Monday',
  Tu: 'Tuesday',
  W: 'Wednesday',
  Th: 'Thursday',
  F: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
};

export const ORDERED_DAYS: DayOfWeek[] = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];
export const WEEKDAYS: DayOfWeek[] = ['M', 'Tu', 'W', 'Th', 'F'];

export interface MeetingSession {
  day: DayOfWeek;
  startMinutes: number; // minutes from 00:00 (e.g. 9:00 AM = 540)
  endMinutes: number;   // minutes from 00:00 (e.g. 10:00 AM = 600)
  displayTime: string;  // e.g. "10:00 AM - 11:00 AM"
}

export interface TimeSlot {
  id: string;
  rawString: string;
  sessions: MeetingSession[];
  isValid: boolean;
  validationError?: string;
  startsBefore9AM: boolean;
}

export type CourseSectionType = 'lecture' | 'discussion';

export interface Course {
  id: number; // 0-indexed course #n
  name: string;
  lectures: TimeSlot[];
  discussions: TimeSlot[];
  lectureRowIndex: number;    // 0-indexed: 2n
  discussionRowIndex: number; // 0-indexed: 2n + 1
}

export interface ScheduledMeeting {
  courseId: number;
  courseName: string;
  type: CourseSectionType;
  slotIndex: number;
  rawSlotString: string;
  session: MeetingSession;
  colorIndex: number;
}

export interface DaySchedule {
  day: DayOfWeek;
  dayName: string;
  meetings: ScheduledMeeting[]; // sorted by start time
  gaps: {
    fromMeetingIndex: number;
    toMeetingIndex: number;
    gapMinutes: number;
  }[];
}

export interface ScheduleMetrics {
  totalClasses: number;
  daysWithClasses: number;
  minGapMinutes: number;      // Spacing between consecutive classes (Infinity if none)
  avgGapMinutes: number;      // Average spacing
  maxGapMinutes: number;
  maxClassesInAnyDay: number;
  dayCountVariance: number;   // Daily load balance (lower is more balanced)
  compositeScore: number;     // Distribution score (higher is better)
}

export interface CandidateSchedule {
  id: string;
  rank: number;
  courseSelections: {
    courseId: number;
    courseName: string;
    lectureSlotIndex: number;
    discussionSlotIndex?: number;
    lectureSlot: TimeSlot;
    discussionSlot?: TimeSlot;
  }[];
  daySchedules: Record<DayOfWeek, DaySchedule>;
  allMeetings: ScheduledMeeting[];
  metrics: ScheduleMetrics;
}

export interface ParseResult {
  courses: Course[];
  warnings: string[];
  errors: string[];
  totalRows: number;
}

export interface SolverDiagnostics {
  totalCombinationsChecked: number;
  filteredEarlySlotsCount: number;
  overlapConflicts: number;
  maxDayClassesConflicts: number;
  minGapConflicts: number;
  unsolvableReason?: string;
}

export interface SolverResult {
  schedules: CandidateSchedule[];
  diagnostics: SolverDiagnostics;
  executionTimeMs: number;
}
