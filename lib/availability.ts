export type AvailabilityMonth = {
  label: string;
  startDay: number;
  totalDays: number;
  available: number[];
};

export type AvailabilityDayStatus = {
  date: string;
  is_available: boolean;
  note: string | null;
  updated_at?: string | null;
};

export type AvailabilityResponse = {
  lastUpdated: string;
  months: AvailabilityMonth[];
};

const DEFAULT_OPEN_UNTIL = "2026-06-30";

function formatDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getAvailabilityWindow(monthCount = 3, now = new Date()) {
  const start = startOfMonth(now);
  const end = endOfMonth(new Date(now.getFullYear(), now.getMonth() + monthCount - 1, 1));

  return {
    startDate: formatDateString(start),
    endDate: formatDateString(end),
  };
}

export function getDefaultAvailabilityForDate(dateString: string, now = new Date()) {
  const currentDate = new Date(`${dateString}T00:00:00`);
  const today = new Date(now);
  currentDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (currentDate < today) {
    return false;
  }

  return dateString <= DEFAULT_OPEN_UNTIL;
}

export function buildAvailabilityMonths(
  rows: AvailabilityDayStatus[],
  monthCount = 3,
  now = new Date(),
) {
  const rowMap = new Map(rows.map((row) => [row.date, row]));
  const months: AvailabilityMonth[] = [];

  for (let monthOffset = 0; monthOffset < monthCount; monthOffset += 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const monthLabel = monthDate.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
    const startDay = monthDate.getDay();
    const totalDays = endOfMonth(monthDate).getDate();
    const available: number[] = [];

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      const dateString = formatDateString(date);
      const status = rowMap.get(dateString);

      const isAvailable = status ? status.is_available : getDefaultAvailabilityForDate(dateString, now);

      if (isAvailable) {
        available.push(day);
      }
    }

    months.push({
      label: monthLabel,
      startDay,
      totalDays,
      available,
    });
  }

  return months;
}

export function getAvailabilityLastUpdated(rows: AvailabilityDayStatus[]) {
  const updatedAtValues = rows
    .map((row) => row.updated_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a));

  if (updatedAtValues.length === 0) {
    return "recently";
  }

  return new Date(updatedAtValues[0]).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function monthLabelForDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function dayNumberForDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).getDate();
}

export function isAvailableDate(
  months: AvailabilityMonth[],
  dateString: string,
) {
  const monthLabel = monthLabelForDate(dateString);
  const day = dayNumberForDate(dateString);
  const month = months.find((entry) => entry.label === monthLabel);

  if (!month) {
    return false;
  }

  return month.available.includes(day);
}

export function getDateRange(dateFrom: string, dateTo: string) {
  const dates: string[] = [];
  const start = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return dates;
  }

  const cursor = new Date(start);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function isRangeAvailable(
  months: AvailabilityMonth[],
  dateFrom: string,
  dateTo: string,
) {
  const range = getDateRange(dateFrom, dateTo);

  if (range.length === 0) {
    return false;
  }

  return range.every((date) => isAvailableDate(months, date));
}
