"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useEmployee } from "@/hooks/use-employees";
import { useEmployeeAvailabilityDates, useUpdateEmployeeAvailabilityDates } from "@/hooks/use-availability-dates";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate, isSameDay, isToday, isPast } from "date-fns";
import { de, enUS } from "date-fns/locale";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeftIcon } from "@radix-ui/react-icons";

type AvailabilityStatus = "available" | "unavailable" | "none";

export default function EmployeeAvailabilityPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("availability");
  const tCommon = useTranslations("common");
  const tEmployees = useTranslations("employees");
  
  const id = params.id as string;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStr = format(currentMonth, "yyyy-MM");
  const { data: employeeData, isLoading: employeeLoading } = useEmployee(id);
  const { data: availabilityData, isLoading: availabilityLoading } = useEmployeeAvailabilityDates(id, monthStr);
  const updateAvailability = useUpdateEmployeeAvailabilityDates();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Create a map of date -> availability status
  const availabilityMap = useMemo(() => {
    const map = new Map<string, AvailabilityStatus>();
    
    if (availabilityData?.availability) {
      availabilityData.availability.forEach((av) => {
        if (av.date) {
          const dateStr = format(new Date(av.date), "yyyy-MM-dd");
          if (av.isAvailable === true) {
            map.set(dateStr, "available");
          } else if (av.isAvailable === false) {
            map.set(dateStr, "unavailable");
          } else {
            map.set(dateStr, "none");
          }
        }
      });
    }
    
    return map;
  }, [availabilityData]);

  const handleDateClick = async (date: Date) => {
    // Don't allow editing past dates
    if (isPast(date) && !isToday(date)) {
      return;
    }

    const dateStr = format(date, "yyyy-MM-dd");
    const currentStatus = availabilityMap.get(dateStr) || "none";
    
    // Cycle through: none -> available -> unavailable -> none
    let newStatus: AvailabilityStatus;
    if (currentStatus === "none") {
      newStatus = "available";
    } else if (currentStatus === "available") {
      newStatus = "unavailable";
    } else {
      newStatus = "none";
    }

    // Update availability
    try {
      await updateAvailability.mutateAsync({
        employeeId: id,
        availabilities: [
          {
            date: dateStr,
            isAvailable: newStatus === "available",
          },
        ],
      });
    } catch (error) {
      console.error("Failed to update availability:", error);
    }
  };

  const getDateStatus = (date: Date): AvailabilityStatus => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availabilityMap.get(dateStr) || "none";
  };

  const isLoading = employeeLoading || availabilityLoading;
  const dateLocale = locale === "de" ? de : enUS;

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-100" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  if (!employeeData?.employee) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">{tCommon("error")}</p>
          <p className="text-sm">{tEmployees("failedToLoad")}</p>
        </div>
        <Link href={`/${locale}/employees`}>
          <Button variant="outline">{tCommon("back")}</Button>
        </Link>
      </section>
    );
  }

  const employee = employeeData.employee;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/employees/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="mr-2 h-5 w-5" />
              {tCommon("back")}
            </Button>
          </Link>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {t("title")} - {employee.fullName}
            </h1>
          </div>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <Button
          variant="outline"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
        >
          ← {tCommon("prev")}
        </Button>
        <span className="font-semibold text-slate-900">
          {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
        </span>
        <Button
          variant="outline"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
        >
          {tCommon("next")} →
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border-2 border-green-500 bg-green-100" />
          <span className="text-sm text-slate-700">{t("available")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border-2 border-red-500 bg-red-100" />
          <span className="text-sm text-slate-700">{t("unavailable")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border-2 border-slate-300 bg-slate-50" />
          <span className="text-sm text-slate-700">{tCommon("noData")}</span>
        </div>
      </div>

      {/* Error Alert */}
      {updateAvailability.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">{tCommon("error")}</p>
          <p className="text-sm">{t("failedToSave")}</p>
        </div>
      )}

      {/* Success Message */}
      {updateAvailability.isSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <p className="text-sm">{t("saved")}</p>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day, idx) => (
            <div key={idx} className="text-center text-xs font-semibold text-slate-500 py-2">
              {day}
            </div>
          ))}

          {/* Empty cells for days before month start */}
          {Array.from({ length: monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1 }).map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square" />
          ))}

          {/* Calendar days */}
          {daysInMonth.map((day) => {
            const status = getDateStatus(day);
            const isPastDate = isPast(day) && !isToday(day);
            const isTodayDate = isToday(day);
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                disabled={isPastDate || updateAvailability.isPending}
                className={`
                  aspect-square rounded-lg border-2 transition-all
                  ${isPastDate ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
                  ${isTodayDate ? "ring-2 ring-blue-500 ring-offset-2" : ""}
                  ${
                    status === "available"
                      ? "border-green-500 bg-green-100 hover:bg-green-200"
                      : status === "unavailable"
                      ? "border-red-500 bg-red-100 hover:bg-red-200"
                      : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                  }
                `}
                title={`${format(day, "MMM d, yyyy")}: ${
                  status === "available"
                    ? t("available")
                    : status === "unavailable"
                    ? t("unavailable")
                    : tCommon("noData")
                }`}
              >
                <span className="text-sm font-medium text-slate-900">{getDate(day)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>{t("title")}:</strong> {t("tapToToggle") || "Tap a date to toggle availability. Green = Available, Red = Unavailable, Gray = No selection."}
        </p>
      </div>
    </section>
  );
}

