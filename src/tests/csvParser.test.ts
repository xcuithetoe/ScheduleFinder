import { describe, it, expect } from 'vitest';
import { parseScheduleCsv, parseTimeSlot, parseDays, parseTimeString } from '../utils/csvParser';

describe('CSV Parser and Time Slot Parsing', () => {
  it('should parse single time strings correctly', () => {
    expect(parseTimeString('9:00AM')).toBe(540);
    expect(parseTimeString('10:30 AM')).toBe(630);
    expect(parseTimeString('1:00PM')).toBe(780);
    expect(parseTimeString('12:00PM')).toBe(720);
    expect(parseTimeString('12:00AM')).toBe(0);
    expect(parseTimeString('14:00')).toBe(840);
  });

  it('should parse days correctly', () => {
    expect(parseDays('MWF')).toEqual(['M', 'W', 'F']);
    expect(parseDays('TuTh')).toEqual(['Tu', 'Th']);
    expect(parseDays('TTh')).toEqual(['Tu', 'Th']);
    expect(parseDays('TR')).toEqual(['Tu', 'Th']);
    expect(parseDays('F')).toEqual(['F']);
    expect(parseDays('M, W, F')).toEqual(['M', 'W', 'F']);
  });

  it('should parse time slot string into meeting sessions', () => {
    const slot = parseTimeSlot('MWF 10:00AM-11:00AM', 's1');
    expect(slot.isValid).toBe(true);
    expect(slot.startsBefore9AM).toBe(false);
    expect(slot.sessions.length).toBe(3);
    expect(slot.sessions[0].day).toBe('M');
    expect(slot.sessions[0].startMinutes).toBe(600);
    expect(slot.sessions[0].endMinutes).toBe(660);
  });

  it('should flag slots starting before 9:00 AM as invalid (Condition 4)', () => {
    const slot = parseTimeSlot('MWF 8:30AM-9:30AM', 's2');
    expect(slot.startsBefore9AM).toBe(true);
    expect(slot.isValid).toBe(false);
    expect(slot.validationError).toContain('Starts before 9:00 AM');
  });

  it('should correctly map 0-indexed rows (Row 0=Course 0 Lec, Row 1=Course 0 Dis, Row 2=Course 1 Lec, Row 3=Course 1 Dis)', () => {
    const csv = `Math 32,MWF 10:00AM-11:00AM,TuTh 9:30AM-11:00AM
Math 32,F 1:00PM-2:00PM,W 3:00PM-4:00PM
CS 61A,MWF 1:00PM-2:00PM
CS 61A,Tu 10:00AM-11:30AM,Th 10:00AM-11:30AM`;

    const result = parseScheduleCsv(csv);
    expect(result.courses.length).toBe(2);

    // Course 0
    expect(result.courses[0].id).toBe(0);
    expect(result.courses[0].name).toBe('Math 32');
    expect(result.courses[0].lectureRowIndex).toBe(0);
    expect(result.courses[0].discussionRowIndex).toBe(1);
    expect(result.courses[0].lectures.length).toBe(2);
    expect(result.courses[0].discussions.length).toBe(2);

    // Course 1
    expect(result.courses[1].id).toBe(1);
    expect(result.courses[1].name).toBe('CS 61A');
    expect(result.courses[1].lectureRowIndex).toBe(2);
    expect(result.courses[1].discussionRowIndex).toBe(3);
    expect(result.courses[1].lectures.length).toBe(1);
    expect(result.courses[1].discussions.length).toBe(2);
  });
});
