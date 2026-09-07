import {
  DAY_NAMES,
  ORDERED_DAYS,
} from '../types';
import type {
  CandidateSchedule,
  Course,
  DayOfWeek,
  DaySchedule,
  ScheduleMetrics,
  ScheduledMeeting,
  SolverDiagnostics,
  SolverResult,
  TimeSlot,
} from '../types';

/**
 * Checks whether two meeting sessions on the same day conflict.
 * Conflict happens if:
 * 1. They overlap: max(s1, s2) < min(e1, e2)
 * 2. Gap between them is less than 5 minutes: |s2 - e1| < 5 or |s1 - e2| < 5
 */
export function sessionsConflict(s1: { startMinutes: number; endMinutes: number }, s2: { startMinutes: number; endMinutes: number }): {
  overlap: boolean;
  minGapViolated: boolean;
} {
  // Check overlap
  const isOverlap = Math.max(s1.startMinutes, s2.startMinutes) < Math.min(s1.endMinutes, s2.endMinutes);
  if (isOverlap) {
    return { overlap: true, minGapViolated: true };
  }

  // Check 5-minute minimum gap
  // If s1 is before s2: gap is s2.startMinutes - s1.endMinutes
  // If s2 is before s1: gap is s1.startMinutes - s2.endMinutes
  let gap: number;
  if (s1.endMinutes <= s2.startMinutes) {
    gap = s2.startMinutes - s1.endMinutes;
  } else {
    gap = s1.startMinutes - s2.endMinutes;
  }

  if (gap < 5) {
    return { overlap: false, minGapViolated: true };
  }

  return { overlap: false, minGapViolated: false };
}

/**
 * Computes distribution metrics for a list of scheduled meetings across the week.
 */
export function calculateScheduleMetrics(meetings: ScheduledMeeting[]): {
  metrics: ScheduleMetrics;
  daySchedules: Record<DayOfWeek, DaySchedule>;
} {
  const daySchedules: Record<DayOfWeek, DaySchedule> = {
    M: { day: 'M', dayName: DAY_NAMES.M, meetings: [], gaps: [] },
    Tu: { day: 'Tu', dayName: DAY_NAMES.Tu, meetings: [], gaps: [] },
    W: { day: 'W', dayName: DAY_NAMES.W, meetings: [], gaps: [] },
    Th: { day: 'Th', dayName: DAY_NAMES.Th, meetings: [], gaps: [] },
    F: { day: 'F', dayName: DAY_NAMES.F, meetings: [], gaps: [] },
    Sa: { day: 'Sa', dayName: DAY_NAMES.Sa, meetings: [], gaps: [] },
    Su: { day: 'Su', dayName: DAY_NAMES.Su, meetings: [], gaps: [] },
  };

  // Group and sort meetings per day
  for (const m of meetings) {
    daySchedules[m.session.day].meetings.push(m);
  }

  const allGaps: number[] = [];
  let maxClassesInAnyDay = 0;
  let daysWithClasses = 0;
  const dayCounts: number[] = [];

  for (const day of ORDERED_DAYS) {
    const ds = daySchedules[day];
    ds.meetings.sort((a, b) => a.session.startMinutes - b.session.startMinutes);

    const count = ds.meetings.length;
    dayCounts.push(count);
    if (count > 0) {
      daysWithClasses++;
    }
    if (count > maxClassesInAnyDay) {
      maxClassesInAnyDay = count;
    }

    // Compute gaps
    for (let i = 0; i < ds.meetings.length - 1; i++) {
      const currentMeeting = ds.meetings[i];
      const nextMeeting = ds.meetings[i + 1];
      const gapMinutes = nextMeeting.session.startMinutes - currentMeeting.session.endMinutes;
      ds.gaps.push({
        fromMeetingIndex: i,
        toMeetingIndex: i + 1,
        gapMinutes,
      });
      allGaps.push(gapMinutes);
    }
  }

  // Calculate Variance of class counts across the 5 weekdays (M-F)
  const weekdayCounts = dayCounts.slice(0, 5);
  const avgWeekdayCount = weekdayCounts.reduce((a, b) => a + b, 0) / 5;
  const dayCountVariance =
    weekdayCounts.reduce((acc, c) => acc + Math.pow(c - avgWeekdayCount, 2), 0) / 5;

  let minGapMinutes = 0;
  let avgGapMinutes = 0;
  let maxGapMinutes = 0;

  if (allGaps.length > 0) {
    minGapMinutes = Math.min(...allGaps);
    maxGapMinutes = Math.max(...allGaps);
    avgGapMinutes = Math.round((allGaps.reduce((a, b) => a + b, 0) / allGaps.length) * 10) / 10;
  } else {
    // If no multi-class days exist, spacing is effectively ideal (e.g. 1 class per day)
    minGapMinutes = 999;
    avgGapMinutes = 999;
    maxGapMinutes = 999;
  }

  // Composite distribution score formula:
  // 1. Primary: Maximize minGapMinutes (gives huge reward for spacing, e.g. minGap * 10)
  // 2. Secondary: Maximize avgGapMinutes (reward for overall breathing room, avgGap * 1)
  // 3. Balance: Penalize variance in daily load (dayCountVariance * -20)
  // 4. Spread: Reward spreading across days (daysWithClasses * 5)
  let compositeScore = 0;
  if (allGaps.length > 0) {
    compositeScore =
      minGapMinutes * 10 +
      avgGapMinutes * 1.5 -
      dayCountVariance * 25 +
      daysWithClasses * 10;
  } else {
    // High score for perfectly isolated classes
    compositeScore = 2000 - dayCountVariance * 25 + daysWithClasses * 10;
  }

  const metrics: ScheduleMetrics = {
    totalClasses: meetings.length,
    daysWithClasses,
    minGapMinutes,
    avgGapMinutes,
    maxGapMinutes,
    maxClassesInAnyDay,
    dayCountVariance: Math.round(dayCountVariance * 100) / 100,
    compositeScore: Math.round(compositeScore * 10) / 10,
  };

  return { metrics, daySchedules };
}

/**
 * Validates whether a candidate slot can be added to the current day meetings list
 * without violating:
 * 1. Overlap constraint (Condition 1)
 * 2. Max 3 classes per day constraint (Condition 2)
 * 3. 5-minute minimum gap constraint (Condition 3)
 */
function canAddSlot(
  currentDayMeetings: Record<DayOfWeek, { startMinutes: number; endMinutes: number }[]>,
  slot: TimeSlot
): { valid: boolean; reason?: 'overlap' | 'max_day_classes' | 'min_gap' } {
  for (const session of slot.sessions) {
    const dayMeetings = currentDayMeetings[session.day];

    // Check Condition 2: Max 3 classes a day
    if (dayMeetings.length >= 3) {
      return { valid: false, reason: 'max_day_classes' };
    }

    // Check Condition 1 (no overlap) & Condition 3 (min 5 min gap) against existing meetings on this day
    for (const existing of dayMeetings) {
      const conflict = sessionsConflict(existing, session);
      if (conflict.overlap) {
        return { valid: false, reason: 'overlap' };
      }
      if (conflict.minGapViolated) {
        return { valid: false, reason: 'min_gap' };
      }
    }
  }

  return { valid: true };
}

/**
 * Solves and generates all valid candidate schedules, then ranks them based on distribution score.
 */
export function solveSchedules(courses: Course[], maxSchedules: number = 500): SolverResult {
  const startTime = performance.now();

  const diagnostics: SolverDiagnostics = {
    totalCombinationsChecked: 0,
    filteredEarlySlotsCount: 0,
    overlapConflicts: 0,
    maxDayClassesConflicts: 0,
    minGapConflicts: 0,
  };

  // Filter out any slot that starts before 9:00 AM (Condition 4) or is otherwise invalid
  const validCourses = courses.map((c) => {
    const validLectures = c.lectures.filter((s) => s.isValid && !s.startsBefore9AM);
    const validDiscussions = c.discussions.filter((s) => s.isValid && !s.startsBefore9AM);

    diagnostics.filteredEarlySlotsCount +=
      c.lectures.filter((s) => s.startsBefore9AM).length +
      c.discussions.filter((s) => s.startsBefore9AM).length;

    return {
      ...c,
      validLectures,
      validDiscussions,
    };
  });

  // Check if any course has 0 valid lecture slots
  for (const c of validCourses) {
    if (c.lectures.length > 0 && c.validLectures.length === 0) {
      diagnostics.unsolvableReason = `Course "${c.name}" has no lecture slots starting at or after 9:00 AM.`;
      return {
        schedules: [],
        diagnostics,
        executionTimeMs: performance.now() - startTime,
      };
    }
    if (c.discussions.length > 0 && c.validDiscussions.length === 0) {
      diagnostics.unsolvableReason = `Course "${c.name}" has no discussion slots starting at or after 9:00 AM.`;
      return {
        schedules: [],
        diagnostics,
        executionTimeMs: performance.now() - startTime,
      };
    }
  }

  const rawSolutions: {
    courseSelections: {
      courseId: number;
      courseName: string;
      lectureSlotIndex: number;
      discussionSlotIndex?: number;
      lectureSlot: TimeSlot;
      discussionSlot?: TimeSlot;
    }[];
    allMeetings: ScheduledMeeting[];
  }[] = [];

  // Helper structures for backtracking
  const currentDayMeetings: Record<DayOfWeek, { startMinutes: number; endMinutes: number }[]> = {
    M: [],
    Tu: [],
    W: [],
    Th: [],
    F: [],
    Sa: [],
    Su: [],
  };

  const currentMeetings: ScheduledMeeting[] = [];
  const currentSelections: {
    courseId: number;
    courseName: string;
    lectureSlotIndex: number;
    discussionSlotIndex?: number;
    lectureSlot: TimeSlot;
    discussionSlot?: TimeSlot;
  }[] = [];

  function addMeetings(meetings: ScheduledMeeting[]) {
    for (const m of meetings) {
      currentDayMeetings[m.session.day].push({
        startMinutes: m.session.startMinutes,
        endMinutes: m.session.endMinutes,
      });
      currentMeetings.push(m);
    }
  }

  function removeMeetings(meetings: ScheduledMeeting[]) {
    for (const m of meetings) {
      const list = currentDayMeetings[m.session.day];
      const idx = list.findIndex(
        (x) => x.startMinutes === m.session.startMinutes && x.endMinutes === m.session.endMinutes
      );
      if (idx !== -1) {
        list.splice(idx, 1);
      }
      const mIdx = currentMeetings.indexOf(m);
      if (mIdx !== -1) {
        currentMeetings.splice(mIdx, 1);
      }
    }
  }

  /**
   * Backtracking step for course index `courseIdx`
   */
  function backtrack(courseIdx: number) {
    if (rawSolutions.length >= maxSchedules) {
      return;
    }

    if (courseIdx === validCourses.length) {
      // Found complete valid schedule
      rawSolutions.push({
        courseSelections: [...currentSelections],
        allMeetings: [...currentMeetings],
      });
      return;
    }

    const course = validCourses[courseIdx];
    const lectureOptions = course.validLectures.length > 0 ? course.validLectures : [];
    const discussionOptions = course.validDiscussions.length > 0 ? course.validDiscussions : [null];

    for (let lIdx = 0; lIdx < lectureOptions.length; lIdx++) {
      const lecSlot = lectureOptions[lIdx];
      diagnostics.totalCombinationsChecked++;

      const canAddLec = canAddSlot(currentDayMeetings, lecSlot);
      if (!canAddLec.valid) {
        if (canAddLec.reason === 'overlap') diagnostics.overlapConflicts++;
        if (canAddLec.reason === 'max_day_classes') diagnostics.maxDayClassesConflicts++;
        if (canAddLec.reason === 'min_gap') diagnostics.minGapConflicts++;
        continue;
      }

      // Add lecture
      const lecMeetings: ScheduledMeeting[] = lecSlot.sessions.map((session) => ({
        courseId: course.id,
        courseName: course.name,
        type: 'lecture',
        slotIndex: lIdx,
        rawSlotString: lecSlot.rawString,
        session,
        colorIndex: course.id % 8,
      }));

      addMeetings(lecMeetings);

      // Now iterate through discussion options for this course
      for (let dIdx = 0; dIdx < discussionOptions.length; dIdx++) {
        const disSlot = discussionOptions[dIdx];

        if (disSlot === null) {
          // No discussion needed
          currentSelections.push({
            courseId: course.id,
            courseName: course.name,
            lectureSlotIndex: lIdx,
            lectureSlot: lecSlot,
          });

          backtrack(courseIdx + 1);

          currentSelections.pop();
        } else {
          diagnostics.totalCombinationsChecked++;
          const canAddDis = canAddSlot(currentDayMeetings, disSlot);
          if (!canAddDis.valid) {
            if (canAddDis.reason === 'overlap') diagnostics.overlapConflicts++;
            if (canAddDis.reason === 'max_day_classes') diagnostics.maxDayClassesConflicts++;
            if (canAddDis.reason === 'min_gap') diagnostics.minGapConflicts++;
            continue;
          }

          // Add discussion
          const disMeetings: ScheduledMeeting[] = disSlot.sessions.map((session) => ({
            courseId: course.id,
            courseName: course.name,
            type: 'discussion',
            slotIndex: dIdx,
            rawSlotString: disSlot.rawString,
            session,
            colorIndex: course.id % 8,
          }));

          addMeetings(disMeetings);
          currentSelections.push({
            courseId: course.id,
            courseName: course.name,
            lectureSlotIndex: lIdx,
            discussionSlotIndex: dIdx,
            lectureSlot: lecSlot,
            discussionSlot: disSlot,
          });

          backtrack(courseIdx + 1);

          currentSelections.pop();
          removeMeetings(disMeetings);
        }
      }

      removeMeetings(lecMeetings);
    }
  }

  if (validCourses.length > 0) {
    backtrack(0);
  }

  // Calculate metrics and rank all found solutions
  const candidateSchedules: CandidateSchedule[] = rawSolutions.map((sol, index) => {
    const { metrics, daySchedules } = calculateScheduleMetrics(sol.allMeetings);
    return {
      id: `schedule-${index + 1}`,
      rank: 0, // Assigned after sorting
      courseSelections: sol.courseSelections,
      daySchedules,
      allMeetings: sol.allMeetings,
      metrics,
    };
  });

  // Sort candidate schedules:
  // 1. Composite score descending (higher is better)
  // 2. minGapMinutes descending (larger minimum gap is better)
  // 3. avgGapMinutes descending
  // 4. dayCountVariance ascending (more balanced is better)
  candidateSchedules.sort((a, b) => {
    if (b.metrics.compositeScore !== a.metrics.compositeScore) {
      return b.metrics.compositeScore - a.metrics.compositeScore;
    }
    if (b.metrics.minGapMinutes !== a.metrics.minGapMinutes) {
      return b.metrics.minGapMinutes - a.metrics.minGapMinutes;
    }
    if (b.metrics.avgGapMinutes !== a.metrics.avgGapMinutes) {
      return b.metrics.avgGapMinutes - a.metrics.avgGapMinutes;
    }
    return a.metrics.dayCountVariance - b.metrics.dayCountVariance;
  });

  // Assign ranks
  candidateSchedules.forEach((sch, idx) => {
    sch.rank = idx + 1;
  });

  if (candidateSchedules.length === 0 && !diagnostics.unsolvableReason) {
    diagnostics.unsolvableReason = `No valid combination of lectures and discussions satisfied all constraints (No Overlaps, Max 3 Classes/Day, Min 5-Min Gap, Start >= 9:00 AM).`;
  }

  const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    schedules: candidateSchedules,
    diagnostics,
    executionTimeMs,
  };
}
