import dayjs from 'dayjs';
import type { RecurrenceConfig } from '../types';

export function formatDate(date: string | Date): string {
  return dayjs(date).format('MMM D, YYYY');
}

export function formatDateShort(date: string | Date): string {
  return dayjs(date).format('MM/DD/YYYY');
}

export function isOverdue(dueDate: string): boolean {
  return dayjs(dueDate).isBefore(dayjs(), 'day');
}

export function isDueToday(dueDate: string): boolean {
  return dayjs(dueDate).isSame(dayjs(), 'day');
}

export function isUpcoming(dueDate: string, days: number = 7): boolean {
  const d = dayjs(dueDate);
  return d.isAfter(dayjs(), 'day') && d.isBefore(dayjs().add(days, 'day'), 'day');
}

export function daysUntil(dueDate: string): number {
  return dayjs(dueDate).diff(dayjs(), 'day');
}

export function formatMonthYear(date: string): string {
  return dayjs(date).format('MMM YYYY');
}

export function startOfMonth(date: string): string {
  return dayjs(date).startOf('month').format('YYYY-MM-DD');
}

export function endOfMonth(date: string): string {
  return dayjs(date).endOf('month').format('YYYY-MM-DD');
}

export function getNthWeekday(year: number, month: number, week: number, day: number): dayjs.Dayjs {
  if (week === -1) {
    const lastDay = dayjs(new Date(year, month + 1, 0));
    const diff = lastDay.day() - day;
    return diff >= 0 ? lastDay.subtract(diff, 'day') : lastDay.subtract(7 + diff, 'day');
  }
  const firstDay = dayjs(new Date(year, month, 1));
  const diff = day - firstDay.day();
  const firstOccurrence = diff >= 0 ? firstDay.add(diff, 'day') : firstDay.add(7 + diff, 'day');
  return firstOccurrence.add(week * 7, 'day');
}

function getNextWeekday(from: dayjs.Dayjs, targetDay: number): dayjs.Dayjs {
  const current = from.day();
  if (targetDay > current) return from.day(targetDay);
  return from.add(7, 'day').day(targetDay);
}

function alignToWeekday(from: dayjs.Dayjs, targetDay: number): dayjs.Dayjs {
  const current = from.day();
  if (targetDay >= current) return from.day(targetDay);
  return from.add(7, 'day').day(targetDay);
}

export function generatePaymentSchedule(
  startDate: string,
  numInstallments: number,
  totalPrice: number,
  recurrence: RecurrenceConfig,
  paymentsPerMonth: number,
  installmentAmount?: number | null
): { installmentNumber: number; dueDate: string; amount: number }[] {
  const start = dayjs(startDate);
  const amount = installmentAmount ?? totalPrice / numInstallments;
  const schedule: { installmentNumber: number; dueDate: string; amount: number }[] = [];

  if (recurrence.type === 'weekly') {
    const sortedDays = [...recurrence.weekDays].sort();
    if (sortedDays.length === 0) return schedule;
    let currentDate = start;
    let dayIndex = -1;
    for (let i = 0; i < numInstallments; i++) {
      if (i === 0) {
        currentDate = alignToWeekday(start, sortedDays[0]);
        dayIndex = 0;
      } else {
        dayIndex++;
        if (dayIndex >= sortedDays.length) {
          dayIndex = 0;
          currentDate = getNextWeekday(currentDate, sortedDays[0]);
        } else {
          currentDate = getNextWeekday(currentDate, sortedDays[dayIndex]);
        }
      }
      schedule.push({ installmentNumber: i + 1, dueDate: currentDate.format('YYYY-MM-DD'), amount });
    }
    return schedule;
  }

  if (recurrence.type === 'monthly_weekday') {
    const days = recurrence.monthWeekday.slice(0, paymentsPerMonth);
    if (days.length === 0) return schedule;
    let monthOffset = 0;
    let dayIndex = 0;
    for (let i = 0; i < numInstallments; i++) {
      if (i === 0) {
        schedule.push({ installmentNumber: 1, dueDate: start.format('YYYY-MM-DD'), amount });
        continue;
      }
      dayIndex++;
      if (dayIndex >= days.length) {
        dayIndex = 0;
        monthOffset++;
      }
      const targetMonth = start.month() + monthOffset;
      const targetYear = start.year() + Math.floor(targetMonth / 12);
      const month = targetMonth % 12;
      const { week, day } = days[dayIndex];
      let dueDate = getNthWeekday(targetYear, month, week, day);
      if (dueDate.month() !== month) {
        dueDate = dayjs(new Date(targetYear, month + 1, 0));
      }
      schedule.push({ installmentNumber: i + 1, dueDate: dueDate.format('YYYY-MM-DD'), amount });
    }
    return schedule;
  }

  const days = [...recurrence.monthDays].sort((a, b) => a - b).slice(0, paymentsPerMonth);
  let monthOffset = 0;
  let dayIndex = 0;
  for (let i = 0; i < numInstallments; i++) {
    let dueDate: dayjs.Dayjs;
    if (i === 0) {
      dueDate = start;
    } else {
      dayIndex++;
      if (dayIndex >= days.length) {
        dayIndex = 0;
        monthOffset++;
      }
      const targetMonth = start.month() + monthOffset;
      const targetYear = start.year() + Math.floor(targetMonth / 12);
      const month = targetMonth % 12;
      const maxDay = dayjs(new Date(targetYear, month + 1, 0)).date();
      const day = Math.min(days[dayIndex], maxDay);
      dueDate = dayjs(new Date(targetYear, month, day));
    }
    schedule.push({ installmentNumber: i + 1, dueDate: dueDate.format('YYYY-MM-DD'), amount });
  }
  return schedule;
}
