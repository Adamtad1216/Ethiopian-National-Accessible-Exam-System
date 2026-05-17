export function isWithinScheduledWindow(exam: {
  status: string;
  startTime?: Date | null;
  endTime?: Date | null;
}): boolean {
  if (exam.status !== "published") {
    return false;
  }

  if (!exam.startTime || !exam.endTime) {
    return false;
  }

  const now = Date.now();
  return exam.startTime.getTime() <= now && exam.endTime.getTime() >= now;
}

export function getTodayWindow(now = new Date()): {
  startOfToday: Date;
  startOfTomorrow: Date;
} {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  return { startOfToday, startOfTomorrow };
}
