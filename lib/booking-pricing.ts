export const DAYCARE_BASE_RATE = 44;
export const BOARDING_NIGHT_RATE = 67;
export const MEET_AND_GREET_RATE = 0;
export const BOARDING_LATE_PICKUP_HALF_DAY_RATE = 33.5;
export const BOARDING_LATE_PICKUP_FULL_DAY_RATE = 67;

export type PricingLineItem = {
  label: string;
  amount: number;
};

export type BookingPricingInput = {
  serviceType: string;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

export type BookingPricingEstimate = {
  estimatedPrice: number | null;
  lineItems: PricingLineItem[];
  nights: number;
  latePickupHours: number;
  latePickupTier: "none" | "half-day" | "full-day";
};

function getCalendarDayDifference(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diffInMs = end.getTime() - start.getTime();

  return Math.round(diffInMs / (1000 * 60 * 60 * 24));
}

function getTimeInMinutes(timeValue?: string | null) {
  if (!timeValue) {
    return null;
  }

  const [hoursText, minutesText] = timeValue.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatTimeLabel(timeValue?: string | null) {
  if (!timeValue) {
    return "Time not set";
  }

  const date = new Date(`1970-01-01T${timeValue}`);

  if (Number.isNaN(date.getTime())) {
    return timeValue;
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function calculateBookingPricing({
  serviceType,
  startDate,
  endDate,
  startTime,
  endTime,
}: BookingPricingInput): BookingPricingEstimate {
  if (serviceType === "meet-and-greet") {
    return {
      estimatedPrice: MEET_AND_GREET_RATE,
      lineItems: [{ label: "Meet & Greet", amount: MEET_AND_GREET_RATE }],
      nights: 0,
      latePickupHours: 0,
      latePickupTier: "none",
    };
  }

  if (serviceType === "daycare") {
    return {
      estimatedPrice: DAYCARE_BASE_RATE,
      lineItems: [{ label: "Daycare flat rate", amount: DAYCARE_BASE_RATE }],
      nights: 0,
      latePickupHours: 0,
      latePickupTier: "none",
    };
  }

  if (!startDate || !endDate) {
    return {
      estimatedPrice: null,
      lineItems: [],
      nights: 0,
      latePickupHours: 0,
      latePickupTier: "none",
    };
  }

  const nights = Math.max(0, getCalendarDayDifference(startDate, endDate));

  if (nights === 0) {
    return {
      estimatedPrice: null,
      lineItems: [],
      nights: 0,
      latePickupHours: 0,
      latePickupTier: "none",
    };
  }

  const lineItems: PricingLineItem[] = [
    {
      label: `${nights} night${nights === 1 ? "" : "s"} boarding (regular rate)`,
      amount: nights * BOARDING_NIGHT_RATE,
    },
  ];

  const startMinutes = getTimeInMinutes(startTime);
  const endMinutes = getTimeInMinutes(endTime);
  let latePickupHours = 0;
  let latePickupTier: BookingPricingEstimate["latePickupTier"] = "none";

  if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
    latePickupHours = Number(((endMinutes - startMinutes) / 60).toFixed(2));

    if (latePickupHours > 8) {
      latePickupTier = "full-day";
      lineItems.push({
        label: "Late pick-up extension (full day)",
        amount: BOARDING_LATE_PICKUP_FULL_DAY_RATE,
      });
    } else if (latePickupHours >= 2) {
      latePickupTier = "half-day";
      lineItems.push({
        label: "Late pick-up extension (half day)",
        amount: BOARDING_LATE_PICKUP_HALF_DAY_RATE,
      });
    }
  }

  return {
    estimatedPrice: lineItems.reduce((sum, item) => sum + item.amount, 0),
    lineItems,
    nights,
    latePickupHours,
    latePickupTier,
  };
}

export function getBookingDisplayPrice(estimatedPrice?: number | null, finalPrice?: number | null) {
  if (typeof finalPrice === "number") {
    return formatCurrency(finalPrice);
  }

  if (typeof estimatedPrice === "number") {
    return formatCurrency(estimatedPrice);
  }

  return "Estimate pending";
}
