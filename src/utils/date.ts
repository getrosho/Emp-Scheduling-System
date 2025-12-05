import {
  addDays,
  addMinutes,
  areIntervalsOverlapping,
  differenceInMinutes,
  isAfter,
  isBefore,
} from "date-fns";
import { DayOfWeek, RecurringRule } from "@/generated/prisma/enums";

export function calculateDurationMinutes(start: Date, end: Date): number {
  if (isAfter(start, end)) {
    return 0;
  }
  return differenceInMinutes(end, start);
}

export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return areIntervalsOverlapping(
    { start: startA, end: endA },
    { start: startB, end: endB },
    { inclusive: true },
  );
}

const weekdayIndex: Record<DayOfWeek, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 0,
};

function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes ?? 0, 0, 0);
  return result;
}

type RecurrenceInput = {
  rule: RecurringRule;
  interval: number;
  byWeekday: DayOfWeek[];
  startDate: Date;
  endDate?: Date | null;
  shiftDuration: number;
  baseStartTime: string;
  timezone?: string;
};

export type RecurringOccurrence = {
  startTime: Date;
  endTime: Date;
};

export function generateRecurringOccurrences(
  input: RecurrenceInput,
  rangeStart: Date,
  rangeEnd: Date,
): RecurringOccurrence[] {
  const effectiveEnd = input.endDate && isBefore(input.endDate, rangeEnd) ? input.endDate : rangeEnd;
  const occurrences: RecurringOccurrence[] = [];
  let cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= effectiveEnd) {
    if (shouldEmitOccurrence(cursor, input)) {
      const startTime = combineDateAndTime(cursor, input.baseStartTime);
      const endTime = addMinutes(startTime, input.shiftDuration);
      occurrences.push({ startTime, endTime });
    }
    cursor = addDays(cursor, 1);
  }

  return occurrences.filter((occurrence) => !isBefore(occurrence.endTime, input.startDate));
}

function shouldEmitOccurrence(date: Date, input: RecurrenceInput) {
  switch (input.rule) {
    case RecurringRule.DAILY: {
      return isIntervalMatch(date, input.startDate, input.interval);
    }
    case RecurringRule.EVERY_TWO_DAYS: {
      return isIntervalMatch(date, input.startDate, 2);
    }
    case RecurringRule.WEEKLY: {
      const dayIdx = date.getDay();
      const templateDay = input.startDate.getDay();
      const diff = Math.floor((date.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24));
      return dayIdx === templateDay && diff % (input.interval * 7) === 0;
    }
    case RecurringRule.CUSTOM: {
      const dayIdx = date.getDay();
      const allowed = input.byWeekday.map((day) => weekdayIndex[day] ?? 0);
      return allowed.includes(dayIdx);
    }
    case RecurringRule.NONE:
    default:
      return false;
  }
}

function isIntervalMatch(current: Date, base: Date, interval: number) {
  const diff = Math.floor((current.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff % interval === 0;
}

