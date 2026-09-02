import { describe, it, expect } from 'vitest';
import { parseScheduleCsv } from '../utils/csvParser';
import { solveSchedules, sessionsConflict } from '../utils/scheduler';
import { SAMPLE_DATASETS } from '../utils/sampleData';

describe('Scheduler Constraint Solver and Ranking', () => {
  it('should detect session conflicts (overlap and <5min gap)', () => {
    const conflict1 = sessionsConflict({ startMinutes: 600, endMinutes: 660 }, { startMinutes: 630, endMinutes: 690 });
    expect(conflict1.overlap).toBe(true);

    const conflict2 = sessionsConflict({ startMinutes: 600, endMinutes: 660 }, { startMinutes: 660, endMinutes: 720 });
    expect(conflict2.overlap).toBe(false);
    expect(conflict2.minGapViolated).toBe(true);

    const conflict3 = sessionsConflict({ startMinutes: 600, endMinutes: 660 }, { startMinutes: 664, endMinutes: 720 });
    expect(conflict3.minGapViolated).toBe(true);

    const conflict4 = sessionsConflict({ startMinutes: 600, endMinutes: 660 }, { startMinutes: 665, endMinutes: 720 });
    expect(conflict4.overlap).toBe(false);
    expect(conflict4.minGapViolated).toBe(false);
  });

  it('should reject combinations with overlapping classes (Condition 1)', () => {
    const csv = `Course A,MWF 10:00AM-11:00AM
Course A,Tu 1:00PM-2:00PM
Course B,MWF 10:30AM-11:30AM
Course B,Th 1:00PM-2:00PM`;

    const { courses } = parseScheduleCsv(csv);
    const result = solveSchedules(courses);
    expect(result.schedules.length).toBe(0);
    expect(result.diagnostics.overlapConflicts).toBeGreaterThan(0);
  });

  it('should reject days with more than 3 classes (Condition 2)', () => {
    const csv = `Course A,M 9:00AM-10:00AM
Course A,Tu 1:00PM-2:00PM
Course B,M 10:30AM-11:30AM
Course B,Tu 2:30PM-3:30PM
Course C,M 12:00PM-1:00PM
Course C,Tu 4:00PM-5:00PM
Course D,M 1:30PM-2:30PM
Course D,Tu 5:30PM-6:30PM`;

    const { courses } = parseScheduleCsv(csv);
    const result = solveSchedules(courses);
    expect(result.schedules.length).toBe(0);
    expect(result.diagnostics.maxDayClassesConflicts).toBeGreaterThan(0);
  });

  it('should allow up to 3 classes in a day if gaps are >= 5 mins', () => {
    const csv = `Course A,M 9:00AM-10:00AM
Course A,Tu 1:00PM-2:00PM
Course B,M 10:15AM-11:15AM
Course B,Tu 2:30PM-3:30PM
Course C,M 12:00PM-1:00PM
Course C,Tu 4:00PM-5:00PM`;

    const { courses } = parseScheduleCsv(csv);
    const result = solveSchedules(courses);
    expect(result.schedules.length).toBe(1);
    expect(result.schedules[0].metrics.maxClassesInAnyDay).toBe(3);
  });

  it('should rank schedules that maximize spacing and distribution higher', () => {
    const csv = `Course A,M 9:00AM-10:00AM
Course A,W 1:00PM-2:00PM
Course B,M 10:10AM-11:10AM,M 11:00AM-12:00PM
Course B,W 3:00PM-4:00PM`;

    const { courses } = parseScheduleCsv(csv);
    const result = solveSchedules(courses);
    expect(result.schedules.length).toBe(2);

    const rank1 = result.schedules[0];
    const rank2 = result.schedules[1];

    expect(rank1.rank).toBe(1);
    expect(rank2.rank).toBe(2);
    expect(rank1.metrics.minGapMinutes).toBe(60);
    expect(rank2.metrics.minGapMinutes).toBe(10);
    expect(rank1.metrics.compositeScore).toBeGreaterThan(rank2.metrics.compositeScore);
  });

  it('should handle courses with no discussions (only lecture row)', () => {
    const csv = `Linear Algebra,MWF 10:00AM-11:00AM,TuTh 10:00AM-11:30AM
,
Discrete Math,MWF 1:00PM-2:00PM,TuTh 2:00PM-3:30PM
Discrete Math,F 3:00PM-4:00PM`;

    const { courses } = parseScheduleCsv(csv);
    const result = solveSchedules(courses);
    expect(result.schedules.length).toBeGreaterThan(0);
  });

  it('should successfully find and rank solutions for standard sample datasets', () => {
    for (const sample of SAMPLE_DATASETS) {
      const { courses } = parseScheduleCsv(sample.csv);
      const result = solveSchedules(courses);
      expect(result.schedules.length).toBeGreaterThan(0);
      expect(result.schedules[0].rank).toBe(1);
    }
  });
});
