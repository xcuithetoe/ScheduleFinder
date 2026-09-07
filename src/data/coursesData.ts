import rawData from './course_info.json';
import type {
  CourseData,
  CourseDatabase,
  FinalExam,
  GECategoryId,
} from '../types/ge';

export const coursesDatabase: CourseDatabase = rawData as unknown as CourseDatabase;

export const coursesList: CourseData[] = Object.values(coursesDatabase).sort((a, b) =>
  a.course.course_code.localeCompare(b.course.course_code)
);

/**
 * Normalizes raw category strings to standard GECategoryId array
 */
export function getCourseGECategories(course: CourseData): GECategoryId[] {
  const categories = new Set<GECategoryId>();
  for (const lec of course.lectures) {
    const rawList = lec.ge_categories || [];
    for (const raw of rawList) {
      const lower = raw.toLowerCase();
      if (lower.includes('literary and cultural')) categories.add('literary_cultural');
      if (lower.includes('philosophical and linguistic')) categories.add('philosophical_linguistic');
      if (lower.includes('visual and performance')) categories.add('visual_performing');
      if (lower.includes('historical analysis')) categories.add('historical_analysis');
      if (lower.includes('social analysis')) categories.add('social_analysis');
      if (lower.includes('life sciences')) categories.add('life_sciences');
      if (lower.includes('physical sciences')) categories.add('physical_sciences');
    }
  }
  return Array.from(categories);
}

/**
 * Determines whether a course is in-person, online, or mixed
 */
export function getCourseModality(course: CourseData): 'in_person' | 'online' {
  let hasOnline = false;
  let hasInPerson = false;

  for (const lec of course.lectures) {
    for (const m of lec.meetings) {
      const loc = m.location.toLowerCase();
      if (loc.includes('online')) {
        hasOnline = true;
      } else if (loc && !loc.includes('no location') && !loc.includes('to be arranged')) {
        hasInPerson = true;
      }
    }
  }

  if (hasOnline && !hasInPerson) return 'online';
  return 'in_person';
}

/**
 * Checks if course carries GE Lab / Demo credit
 */
export function hasLabDemoCredit(course: CourseData): boolean {
  return course.lectures.some((l) => l.ge_lab_demo === true);
}

/**
 * Checks if course satisfies Writing II
 */
export function satisfiesWritingII(course: CourseData): boolean {
  return course.lectures.some((l) => l.writing_ii === true);
}

/**
 * Checks if course satisfies Diversity
 */
export function satisfiesDiversity(course: CourseData): boolean {
  return course.lectures.some((l) => l.diversity === true);
}

/**
 * Checks if course has open seats in any lecture or discussion
 */
export function hasOpenSeats(course: CourseData): boolean {
  return course.lectures.some((l) => {
    if (l.status.toLowerCase() === 'open') return true;
    if (l.enrollment && l.enrollment.spots_left > 0) return true;
    if (l.discussions && l.discussions.some((d) => d.status.toLowerCase() === 'open')) return true;
    return false;
  });
}

/**
 * Gets the primary final exam for a course
 */
export function getPrimaryExam(course: CourseData): FinalExam | null {
  for (const lec of course.lectures) {
    if (lec.final_exam && lec.final_exam.date && lec.final_exam.date.toLowerCase() !== 'none listed') {
      return lec.final_exam;
    }
  }
  return null;
}

/**
 * Checks if two courses have overlapping final exams
 */
export function haveConflictingExams(courseA: CourseData, courseB: CourseData): boolean {
  if (courseA.course.course_code === courseB.course.course_code) return false;
  const examA = getPrimaryExam(courseA);
  const examB = getPrimaryExam(courseB);
  if (!examA || !examB) return false;

  const dateA = examA.date.trim().toLowerCase();
  const dateB = examB.date.trim().toLowerCase();
  if (dateA !== dateB || dateA === 'none listed') return false;

  const timeA = examA.time.replace(/\s+/g, '').toLowerCase();
  const timeB = examB.time.replace(/\s+/g, '').toLowerCase();
  if (timeA === timeB) return true;

  return false;
}

/**
 * Check course restriction matching
 */
export function matchesMajorOrStanding(course: CourseData, filter: string): boolean {
  if (filter === 'all') return true;

  const allRestrictions = course.lectures.flatMap((l) => l.restrictions || []);
  const restrText = allRestrictions.join(' ').toLowerCase();

  if (filter === 'open_all') {
    // Return courses that have no restrictive major holds or department consent
    return !restrText.includes('department consent') &&
      !restrText.includes('majors only') &&
      !restrText.includes('first-year freshmen only');
  }

  if (filter === 'no_consent') {
    return !restrText.includes('department consent');
  }

  if (filter === 'freshmen') {
    return restrText.includes('freshmen') || restrText.includes('new students');
  }

  if (filter === 'transfers') {
    return restrText.includes('transfer') || restrText.includes('new transfers');
  }

  if (filter === 'humanities_majors') {
    return restrText.includes('english') || restrText.includes('literature') || restrText.includes('art') || restrText.includes('dance');
  }

  if (filter === 'social_sci_majors') {
    return restrText.includes('political science') || restrText.includes('public affairs') || restrText.includes('labor studies');
  }

  if (filter === 'stem_majors') {
    return restrText.includes('linguistics') || restrText.includes('public health');
  }

  return true;
}

export const UNIQUE_EXAM_DATES = [
  'Monday, December 7, 2026',
  'Tuesday, December 8, 2026',
  'Wednesday, December 9, 2026',
  'Thursday, December 10, 2026',
  'Friday, December 11, 2026',
];
