import type { Availability } from "@/generated/prisma/client";

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};

export function availabilityOverlaps(
  existing: Availability[],
  day: Availability["day"],
  start: string,
  end: string,
): boolean {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  return existing
    .filter((slot) => slot.day === day && slot.startTime !== null && slot.endTime !== null)
    .some((slot) => {
      // TypeScript now knows startTime and endTime are not null due to filter
      const slotStart = toMinutes(slot.startTime!);
      const slotEnd = toMinutes(slot.endTime!);
      return Math.max(slotStart, startMinutes) < Math.min(slotEnd, endMinutes);
    });
}

