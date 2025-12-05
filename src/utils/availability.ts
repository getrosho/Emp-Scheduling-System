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
    .filter((slot) => slot.day === day)
    .some((slot) => {
      const slotStart = toMinutes(slot.startTime);
      const slotEnd = toMinutes(slot.endTime);
      return Math.max(slotStart, startMinutes) < Math.min(slotEnd, endMinutes);
    });
}

