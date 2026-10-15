/**
 * Dynamic Exam Timing Utilities
 * Accurately parses, calculates, and formats exam timing strings from real input data.
 * Prevents hardcoding of shifts or times.
 */

/**
 * Parses time string (e.g. "09:30", "9:30 AM", "13:30", "1:30 PM", "14:00") into { hours: number, minutes: number } (24-hour)
 */
export function parseTimeString(timeStr?: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 9, minutes: 30 };

  const cleaned = timeStr.trim();
  const match12 = cleaned.match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);

  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3]?.toUpperCase();

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    return { hours, minutes };
  }

  // Fallback for simple integer hour like "9" or "14"
  const simpleMatch = cleaned.match(/^(\d{1,2})/);
  if (simpleMatch) {
    const hours = parseInt(simpleMatch[1], 10);
    return { hours, minutes: 0 };
  }

  return { hours: 9, minutes: 30 };
}

/**
 * Formats hours and minutes into "hh:mm AM/PM" (e.g. "09:30 AM", "01:30 PM", "10:00 AM")
 */
export function format12HourTime(hours: number, minutes: number): string {
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  let h12 = hours % 12;
  if (h12 === 0) h12 = 12;

  const hStr = h12.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');

  return `${hStr}:${mStr} ${meridiem}`;
}

/**
 * Calculates end time given a start time string and duration in minutes
 */
export function calculateEndTimeString(startTimeStr: string, durationMinutes: number = 180): string {
  const { hours, minutes } = parseTimeString(startTimeStr);
  const totalStartMinutes = hours * 60 + minutes;
  const totalEndMinutes = (totalStartMinutes + durationMinutes) % (24 * 60);

  const endHours = Math.floor(totalEndMinutes / 60);
  const endMinutes = totalEndMinutes % 60;

  return format12HourTime(endHours, endMinutes);
}

/**
 * Generates normalized timing range string, e.g. "09:30 AM to 12:30 PM" or "10:00 AM to 01:00 PM"
 */
export function formatTimingRange(
  startTime?: string,
  durationMinutes: number = 180,
  explicitTimeRange?: string
): string {
  if (explicitTimeRange) {
    const cleaned = explicitTimeRange.trim();

    // Already in "Timing ... to ..." format
    if (cleaned.toLowerCase().includes('to')) {
      const parts = cleaned.replace(/^timing\s+/i, '').split(/\s+to\s+/i);
      if (parts.length === 2) {
        const start = normalizeSingleTimeString(parts[0]);
        const end = normalizeSingleTimeString(parts[1]);
        if (start && end) return `${start} to ${end}`;
      }
      return cleaned.replace(/^timing\s+/i, '');
    }

    // In "09:30AM-12:30PM" or "09:30 AM - 12:30 PM" format
    if (cleaned.includes('-')) {
      const parts = cleaned.split('-');
      if (parts.length === 2) {
        const start = normalizeSingleTimeString(parts[0]);
        const end = normalizeSingleTimeString(parts[1]);
        if (start && end) return `${start} to ${end}`;
      }
    }
  }

  // Calculate from real startTime + duration
  if (startTime) {
    const { hours, minutes } = parseTimeString(startTime);
    const startStr = format12HourTime(hours, minutes);
    const endStr = calculateEndTimeString(startTime, durationMinutes);
    return `${startStr} to ${endStr}`;
  }

  return '';
}

/**
 * Formats the official header string for classroom sheets:
 * "Timing 09:30 AM to 12:30 PM" or "Timing 10:00 AM to 01:00 PM"
 */
export function formatTimingDisplay(
  timeRange?: string,
  time?: string,
  durationMinutes?: number
): string {
  if (timeRange && timeRange.toLowerCase().startsWith('timing')) {
    // If it's already "Timing ...", normalize internal spacing
    return timeRange.replace(/^timing\s*/i, 'Timing ');
  }

  const range = formatTimingRange(time, durationMinutes || 180, timeRange);
  if (!range) return '';
  return `Timing ${range}`;
}

/**
 * Normalizes single time string like "09:30AM", "9:30", "13:30", "1:30 PM" to "09:30 AM"
 */
function normalizeSingleTimeString(t: string): string {
  const trimmed = t.trim();
  const parsed = parseTimeString(trimmed);
  return format12HourTime(parsed.hours, parsed.minutes);
}
