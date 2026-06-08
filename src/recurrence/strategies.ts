import dayjs from 'dayjs';
import type { RecurrenceConfig } from '../types';
import { getNthWeekday } from '../utils/dateUtils';

export interface Period {
  occurrence: string;
  start: string;
  end: string;
}

export interface RecurrenceStrategy {
  buildPeriods(today: dayjs.Dayjs, start: dayjs.Dayjs, recurrence: RecurrenceConfig): Period[];
}

export function isClientPending(
  periods: Period[],
  paidDates: string[],
  today: dayjs.Dayjs,
  start: dayjs.Dayjs
): boolean {
  const todayStr = today.format('YYYY-MM-DD');

  let currentIdx = -1;
  for (let i = periods.length - 1; i >= 0; i--) {
    if (periods[i].start <= todayStr) {
      currentIdx = i;
      break;
    }
  }

  if (currentIdx === -1) return false;
  if (dayjs(periods[currentIdx].occurrence).isBefore(start, 'day')) return false;

  const cp = periods[currentIdx];

  let currentPaidCount = paidDates.filter(d => d >= cp.start && d <= cp.end).length;
  if (currentIdx > 0) {
    const pp = periods[currentIdx - 1];
    currentPaidCount += paidDates.filter(d => d > pp.occurrence && d <= pp.end).length;
  }
  if (currentPaidCount >= 1) return false;

  if (currentIdx === 0) return true;

  const pp = periods[currentIdx - 1];
  return paidDates.filter(d => d >= pp.start && d <= pp.end).length < 2;
}

export class MonthlyStrategy implements RecurrenceStrategy {
  buildPeriods(today: dayjs.Dayjs, _start: dayjs.Dayjs, recurrence: RecurrenceConfig): Period[] {
    const paymentDays = [...recurrence.monthDays].sort((a, b) => a - b);
    const n = paymentDays.length;
    if (n === 0) return [];

    const lastOccurrences: dayjs.Dayjs[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const day = paymentDays[i];
      if (day <= today.date()) {
        lastOccurrences[i] = dayjs(new Date(today.year(), today.month(), day));
      } else {
        lastOccurrences[i] = dayjs(new Date(today.year(), today.month() - 1, day));
      }
    }

    const sorted = lastOccurrences
      .map((date, idx) => ({ idx, date }))
      .sort((a, b) => a.date.valueOf() - b.date.valueOf());

    const periods: Period[] = [];
    for (const { date: periodStart, idx } of sorted) {
      let periodEnd: dayjs.Dayjs;
      if (idx < n - 1) {
        periodEnd = dayjs(new Date(periodStart.year(), periodStart.month(), paymentDays[idx + 1]))
          .subtract(1, 'day');
      } else {
        periodEnd = dayjs(new Date(periodStart.year(), periodStart.month() + 1, paymentDays[0]))
          .subtract(1, 'day');
      }

      periods.push({
        occurrence: periodStart.format('YYYY-MM-DD'),
        start: periodStart.format('YYYY-MM-DD'),
        end: periodEnd.format('YYYY-MM-DD'),
      });
    }

    return periods;
  }
}

export class WeeklyStrategy implements RecurrenceStrategy {
  buildPeriods(today: dayjs.Dayjs, _start: dayjs.Dayjs, recurrence: RecurrenceConfig): Period[] {
    if (recurrence.weekDays.length === 0) return [];

    let thisWeekOccurrence = today.day(recurrence.weekDays[0]);
    if (thisWeekOccurrence.isAfter(today, 'day')) {
      thisWeekOccurrence = thisWeekOccurrence.subtract(1, 'week');
    }

    return [
      {
        occurrence: thisWeekOccurrence.subtract(1, 'week').format('YYYY-MM-DD'),
        start: thisWeekOccurrence.subtract(1, 'week').format('YYYY-MM-DD'),
        end: thisWeekOccurrence.subtract(1, 'day').format('YYYY-MM-DD'),
      },
      {
        occurrence: thisWeekOccurrence.format('YYYY-MM-DD'),
        start: thisWeekOccurrence.format('YYYY-MM-DD'),
        end: thisWeekOccurrence.add(1, 'week').subtract(1, 'day').format('YYYY-MM-DD'),
      },
    ];
  }
}

export class MonthlyWeekdayStrategy implements RecurrenceStrategy {
  buildPeriods(today: dayjs.Dayjs, _start: dayjs.Dayjs, recurrence: RecurrenceConfig): Period[] {
    const entries = recurrence.monthWeekday;
    if (entries.length === 0) return [];

    const times: dayjs.Dayjs[] = [];
    for (const { week, day } of entries) {
      times.push(getNthWeekday(today.year(), today.month() - 1, week, day));
      times.push(getNthWeekday(today.year(), today.month(), week, day));
    }
    times.sort((a, b) => a.valueOf() - b.valueOf());

    const occurrences: dayjs.Dayjs[] = [];
    for (const occ of times) {
      if (occurrences.length === 0 || !occ.isSame(occurrences[occurrences.length - 1], 'day')) {
        occurrences.push(occ);
      }
    }

    const periods: Period[] = [];
    for (let i = 0; i < occurrences.length; i++) {
      const periodStart = i === 0 || occurrences[i].month() !== occurrences[i - 1].month()
        ? occurrences[i].startOf('month')
        : occurrences[i];
      const periodEnd = i < occurrences.length - 1 && occurrences[i + 1].month() === occurrences[i].month()
        ? occurrences[i + 1].subtract(1, 'day')
        : occurrences[i].endOf('month');

      periods.push({
        occurrence: occurrences[i].format('YYYY-MM-DD'),
        start: periodStart.format('YYYY-MM-DD'),
        end: periodEnd.format('YYYY-MM-DD'),
      });
    }

    return periods;
  }
}

export const recurrenceStrategies: Record<string, RecurrenceStrategy> = {
  monthly: new MonthlyStrategy(),
  weekly: new WeeklyStrategy(),
  monthly_weekday: new MonthlyWeekdayStrategy(),
};
