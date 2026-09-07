import type { Course, DayOfWeek, MeetingSession, ParseResult, TimeSlot } from '../types';

/**
 * Converts minutes from midnight (0..1440) to standard 12-hour string (e.g., "9:00 AM", "1:30 PM")
 */
export function formatMinutes(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${h12}:${mStr} ${period}`;
}

/**
 * Parses single time string into minutes from midnight.
 * Handles "9:00AM", "09:30", "1:00 PM", "13:00", "9am", "2pm", etc.
 */
export function parseTimeString(timeStr: string, defaultPeriod?: 'AM' | 'PM'): number | null {
  const clean = timeStr.trim().toUpperCase();
  // Regex to match hours, optional minutes, optional AM/PM
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  let period = match[3] as 'AM' | 'PM' | undefined;

  if (minute < 0 || minute >= 60 || hour < 0 || hour > 24) {
    return null;
  }

  // If period not specified, use defaultPeriod if provided
  if (!period && defaultPeriod) {
    period = defaultPeriod;
  }

  if (period === 'PM') {
    if (hour < 12) hour += 12;
  } else if (period === 'AM') {
    if (hour === 12) hour = 0;
  } else {
    // 24h format heuristic: if hour is between 1 and 7, assume PM for typical class schedules if no AM/PM provided
    if (hour >= 1 && hour <= 7) {
      hour += 12;
    }
  }

  return hour * 60 + minute;
}

/**
 * Parses day tokens from a string (e.g. "MWF", "TuTh", "TTh", "TR", "M, W, F", "Mon Wed Fri")
 */
export function parseDays(dayPart: string): DayOfWeek[] {
  const normalized = dayPart.trim();
  const days: DayOfWeek[] = [];

  let idx = 0;
  while (idx < normalized.length) {
    const remaining = normalized.slice(idx);

    if (remaining.startsWith('Tu') || remaining.startsWith('TU') || remaining.startsWith('tu')) {
      days.push('Tu');
      idx += 2;
    } else if (remaining.startsWith('Th') || remaining.startsWith('TH') || remaining.startsWith('th')) {
      days.push('Th');
      idx += 2;
    } else if (remaining.startsWith('Sa') || remaining.startsWith('SA') || remaining.startsWith('sa')) {
      days.push('Sa');
      idx += 2;
    } else if (remaining.startsWith('Su') || remaining.startsWith('SU') || remaining.startsWith('su')) {
      days.push('Su');
      idx += 2;
    } else if (/^M(on)?\b/i.test(remaining) || remaining.startsWith('M') || remaining.startsWith('m')) {
      days.push('M');
      idx += remaining.match(/^Mon/i) ? 3 : 1;
    } else if (/^T(ue)?\b/i.test(remaining) || remaining.startsWith('T') || remaining.startsWith('t')) {
      days.push('Tu');
      idx += remaining.match(/^Tue/i) ? 3 : 1;
    } else if (/^W(ed)?\b/i.test(remaining) || remaining.startsWith('W') || remaining.startsWith('w')) {
      days.push('W');
      idx += remaining.match(/^Wed/i) ? 3 : 1;
    } else if (/^R\b/i.test(remaining) || remaining.startsWith('R') || remaining.startsWith('r')) {
      days.push('Th');
      idx += 1;
    } else if (/^F(ri)?\b/i.test(remaining) || remaining.startsWith('F') || remaining.startsWith('f')) {
      days.push('F');
      idx += remaining.match(/^Fri/i) ? 3 : 1;
    } else if (/^S(at)?\b/i.test(remaining)) {
      days.push('Sa');
      idx += remaining.match(/^Sat/i) ? 3 : 1;
    } else {
      idx++;
    }
  }

  return Array.from(new Set(days));
}

/**
 * Parses a single slot string (e.g. "MWF 10:00AM-11:00AM")
 */
export function parseTimeSlot(rawSlot: string, slotId: string): TimeSlot {
  const trimmed = rawSlot.trim();
  if (!trimmed) {
    return {
      id: slotId,
      rawString: '',
      sessions: [],
      isValid: false,
      validationError: 'Empty slot',
      startsBefore9AM: false,
    };
  }

  const timeSplit = trimmed.split(/-(?=[^)]*(?:\s|$|[A-Za-z0-9]))/);
  if (timeSplit.length < 2) {
    return {
      id: slotId,
      rawString: trimmed,
      sessions: [],
      isValid: false,
      validationError: 'Invalid format: Missing start and end time separator (-)',
      startsBefore9AM: false,
    };
  }

  const leftPart = timeSplit[0].trim();
  const rightPart = timeSplit.slice(1).join('-').trim();

  const dayMatch = leftPart.match(/^([A-Za-z,\s]+?)\s*(\d.*)$/);
  if (!dayMatch) {
    return {
      id: slotId,
      rawString: trimmed,
      sessions: [],
      isValid: false,
      validationError: 'Invalid format: Could not separate days from start time',
      startsBefore9AM: false,
    };
  }

  const daysStr = dayMatch[1];
  const startTimeStr = dayMatch[2];
  const endTimeStr = rightPart;

  const days = parseDays(daysStr);
  if (days.length === 0) {
    return {
      id: slotId,
      rawString: trimmed,
      sessions: [],
      isValid: false,
      validationError: `Invalid days specified: "${daysStr}"`,
      startsBefore9AM: false,
    };
  }

  const endPeriodMatch = endTimeStr.toUpperCase().match(/(AM|PM)/);
  const endPeriod = endPeriodMatch ? (endPeriodMatch[1] as 'AM' | 'PM') : undefined;

  let endMinutes = parseTimeString(endTimeStr);
  let startMinutes = parseTimeString(startTimeStr, endPeriod);

  if (startMinutes === null || endMinutes === null) {
    return {
      id: slotId,
      rawString: trimmed,
      sessions: [],
      isValid: false,
      validationError: `Invalid time format in "${startTimeStr}" or "${endTimeStr}"`,
      startsBefore9AM: false,
    };
  }

  if (endMinutes <= startMinutes && endMinutes < 720) {
    endMinutes += 12 * 60;
  }

  if (endMinutes <= startMinutes) {
    return {
      id: slotId,
      rawString: trimmed,
      sessions: [],
      isValid: false,
      validationError: `End time (${formatMinutes(endMinutes)}) must be after start time (${formatMinutes(startMinutes)})`,
      startsBefore9AM: false,
    };
  }

  // Condition 4: No classes starting earlier than 9:00 AM (9 * 60 = 540)
  const startsBefore9AM = startMinutes < 540;
  let validationError: string | undefined;
  if (startsBefore9AM) {
    validationError = `Starts before 9:00 AM (${formatMinutes(startMinutes)})`;
  }

  const displayTime = `${formatMinutes(startMinutes)} - ${formatMinutes(endMinutes)}`;
  const sessions: MeetingSession[] = days.map((day) => ({
    day,
    startMinutes: startMinutes!,
    endMinutes: endMinutes!,
    displayTime,
  }));

  return {
    id: slotId,
    rawString: trimmed,
    sessions,
    isValid: !startsBefore9AM,
    validationError,
    startsBefore9AM,
  };
}

/**
 * Splits CSV lines handling quoted fields correctly.
 */
export function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (insideQuote && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses CSV text following 0-indexed row pairing:
 * Row 2n   (0, 2, 4, ...) = Course #n Lecture Available Slots
 * Row 2n+1 (1, 3, 5, ...) = Course #n Discussion Available Slots
 */
export function parseScheduleCsv(csvContent: string): ParseResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const warnings: string[] = [];
  const errors: string[] = [];
  const courses: Course[] = [];

  if (lines.length === 0) {
    return { courses: [], warnings, errors: ['CSV content is empty.'], totalRows: 0 };
  }

  // Check if first row is an actual header row (e.g. "Course,Slot 1,Slot 2" with no time data)
  let startIndex = 0;
  const firstRowCols = splitCsvLine(lines[0]);
  const hasTimeInFirstRow = firstRowCols.slice(1).some((col) => /\d/.test(col));
  const isHeader =
    !hasTimeInFirstRow &&
    firstRowCols.length > 1 &&
    /^(course|class|subject|course name|class name)$/i.test(firstRowCols[0].trim());

  if (isHeader) {
    startIndex = 1;
  }

  const dataLines = lines.slice(startIndex);
  const totalRows = dataLines.length;

  const numCourses = Math.ceil(totalRows / 2);

  for (let n = 0; n < numCourses; n++) {
    const lectureRowIdx = n * 2;
    const discussionRowIdx = n * 2 + 1;

    const lectureLine = dataLines[lectureRowIdx];
    const discussionLine = discussionRowIdx < totalRows ? dataLines[discussionRowIdx] : '';

    const lectureCols = lectureLine ? splitCsvLine(lectureLine) : [];
    const discussionCols = discussionLine ? splitCsvLine(discussionLine) : [];

    let courseName = lectureCols[0] || (discussionCols[0] ? discussionCols[0] : `Course #${n + 1}`);

    const lectureSlots: TimeSlot[] = [];
    for (let c = 1; c < lectureCols.length; c++) {
      const colVal = lectureCols[c];
      if (colVal) {
        const slot = parseTimeSlot(colVal, `c${n}-lec-${c}`);
        lectureSlots.push(slot);
        if (slot.startsBefore9AM) {
          warnings.push(`Course "${courseName}" Lecture slot "${colVal}" starts before 9:00 AM (Constraint #4) and is excluded from consideration.`);
        } else if (!slot.isValid && slot.validationError) {
          warnings.push(`Course "${courseName}" Lecture slot "${colVal}" has format issue: ${slot.validationError}`);
        }
      }
    }

    const discussionSlots: TimeSlot[] = [];
    for (let c = 1; c < discussionCols.length; c++) {
      const colVal = discussionCols[c];
      if (colVal) {
        const slot = parseTimeSlot(colVal, `c${n}-dis-${c}`);
        discussionSlots.push(slot);
        if (slot.startsBefore9AM) {
          warnings.push(`Course "${courseName}" Discussion slot "${colVal}" starts before 9:00 AM (Constraint #4) and is excluded from consideration.`);
        } else if (!slot.isValid && slot.validationError) {
          warnings.push(`Course "${courseName}" Discussion slot "${colVal}" has format issue: ${slot.validationError}`);
        }
      }
    }

    if (lectureSlots.length === 0) {
      warnings.push(`Course "${courseName}" (Row ${lectureRowIdx}) has no lecture time slots specified.`);
    }

    courses.push({
      id: n,
      name: courseName,
      lectures: lectureSlots,
      discussions: discussionSlots,
      lectureRowIndex: lectureRowIdx,
      discussionRowIndex: discussionRowIdx,
    });
  }

  return {
    courses,
    warnings,
    errors,
    totalRows,
  };
}
