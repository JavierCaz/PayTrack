import dayjs from 'dayjs';

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

export function generatePaymentSchedule(
  startDate: string,
  numInstallments: number,
  totalPrice: number,
  paymentsPerMonth: number,
  paymentDays: number[]
): { installmentNumber: number; dueDate: string; amount: number }[] {
  const start = dayjs(startDate);
  const amount = totalPrice / numInstallments;
  const days = [...paymentDays].sort((a, b) => a - b).slice(0, paymentsPerMonth);
  const schedule: { installmentNumber: number; dueDate: string; amount: number }[] = [];

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

    schedule.push({
      installmentNumber: i + 1,
      dueDate: dueDate.format('YYYY-MM-DD'),
      amount,
    });
  }

  return schedule;
}
