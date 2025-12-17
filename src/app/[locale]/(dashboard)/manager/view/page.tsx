"use client";

import { useState } from "react";
import { useMyEmployee } from "@/hooks/use-my-employee";
import { usePendingShifts } from "@/hooks/use-pending-shifts";
import { useEmployeeAvailabilityDates, useUpdateEmployeeAvailabilityDates } from "@/hooks/use-availability-dates";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate, isSameDay, isToday, isPast } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ClockIcon, PersonIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Role } from "@/generated/prisma/enums";

type AvailabilityStatus = "available" | "unavailable" | "none";
type TabType = "availability" | "shifts";

export default function ManagerViewPage() {
  const locale = useLocale();
  const t = useTranslations("manager.view");
  const tCommon = useTranslations("common");
  const tAvailability = useTranslations("availability");
  const tConfirmation = useTranslations("confirmation");
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("availability");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const { data: myEmployeeData, isLoading: employeeLoading, isError: employeeError } = useMyEmployee();
  const employee = myEmployeeData?.employee;
  const employeeId = employee?.id;
  
  // If employee record doesn't exist, show a message (managers might not have employee records yet)
  if (!employeeLoading && !employee && !employeeError) {
    // Employee record doesn't exist - this is OK, manager can still use the system
    // They just won't see availability/assigned shifts until they're added as an employee
  }

  const monthStr = format(currentMonth, "yyyy-MM");
  const { data: availabilityData, isLoading: availabilityLoading } = useEmployeeAvailabilityDates(
    employeeId || "",
    monthStr
  );
  const updateAvailability = useUpdateEmployeeAvailabilityDates();
  const { data: pendingShiftsData, isLoading: shiftsLoading } = usePendingShifts(user?.role);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dateLocale = locale === "de" ? de : enUS;

  // Create a map of date -> availability status
  const availabilityMap = new Map<string, AvailabilityStatus>();
  
  if (availabilityData?.availability) {
    availabilityData.availability.forEach((av) => {
      if (av.date) {
        const dateStr = format(new Date(av.date), "yyyy-MM-dd");
        if (av.isAvailable === true) {
          availabilityMap.set(dateStr, "available");
        } else if (av.isAvailable === false) {
          availabilityMap.set(dateStr, "unavailable");
        } else {
          availabilityMap.set(dateStr, "none");
        }
      }
    });
  }

  const handleDateClick = async (date: Date) => {
    if (!employeeId) return;
    
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
        employeeId,
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
  const pendingShifts = pendingShiftsData?.shifts || [];

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
        <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("availability")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
            activeTab === "availability"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {t("availabilityTab")}
        </button>
        <button
          onClick={() => setActiveTab("shifts")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
            activeTab === "shifts"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          )}
        >
          <ClockIcon className="h-4 w-4" />
          {t("assignedShiftsTab")}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "availability" && (
        <div className="space-y-6">
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
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(new Date())}
            >
              {tCommon("today")}
            </Button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border-2 border-green-500 bg-green-100" />
              <span className="text-sm text-slate-700">{tAvailability("available")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border-2 border-red-500 bg-red-100" />
              <span className="text-sm text-slate-700">{tAvailability("unavailable")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border-2 border-slate-300 bg-slate-50" />
              <span className="text-sm text-slate-700">{tAvailability("noSelection")}</span>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="mt-4 text-slate-600">{tCommon("loading")}</p>
            </div>
          )}

          {/* Calendar Grid */}
          {!isLoading && employeeId && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="grid grid-cols-7 gap-2">
                {/* Weekday Headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {daysInMonth.map((day) => {
                  const status = getDateStatus(day);
                  const isPastDate = isPast(day) && !isToday(day);
                  const isTodayDate = isToday(day);
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateClick(day)}
                      disabled={isPastDate}
                      className={cn(
                        "relative h-12 rounded-lg border-2 transition-all",
                        isPastDate && "opacity-50 cursor-not-allowed",
                        !isPastDate && "hover:scale-105 cursor-pointer",
                        status === "available" && "border-green-500 bg-green-100",
                        status === "unavailable" && "border-red-500 bg-red-100",
                        status === "none" && "border-slate-300 bg-slate-50",
                        isTodayDate && "ring-2 ring-blue-500 ring-offset-2"
                      )}
                      title={
                        isPastDate
                          ? tAvailability("pastDateTooltip")
                          : `${format(day, "MMM d")}: ${
                              status === "available"
                                ? tAvailability("available")
                                : status === "unavailable"
                                ? tAvailability("unavailable")
                                : tAvailability("noSelection")
                            }`
                      }
                    >
                      <span className="text-sm font-medium text-slate-900">{getDate(day)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Instructions */}
              <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  <strong>{tAvailability("instructions")}:</strong> {tAvailability("instructionsText")}
                </p>
              </div>
            </div>
          )}

          {!employeeId && !isLoading && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <PersonIcon className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-4 text-slate-600">{t("noEmployeeRecord")}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "shifts" && (
        <div className="space-y-6">
          {/* Assigned Shifts List */}
          {shiftsLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
              <p className="mt-4 text-slate-600">{tCommon("loading")}</p>
            </div>
          ) : pendingShifts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <ClockIcon className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-4 text-slate-600">{t("noAssignedShifts")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{shift.title}</h3>
                  {shift.description && (
                    <p className="text-sm text-slate-600 mb-4">{shift.description}</p>
                  )}
                  
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{format(new Date(shift.date), "EEEE, MMMM d, yyyy", { locale: dateLocale })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4" />
                      <span>
                        {format(new Date(shift.startTime), "HH:mm", { locale: dateLocale })} -{" "}
                        {format(new Date(shift.endTime), "HH:mm", { locale: dateLocale })}
                      </span>
                    </div>
                    {(shift.object || shift.objectLabel) && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{shift.object?.label || shift.objectLabel}</span>
                      </div>
                    )}
                  </div>

                  {/* Co-Workers */}
                  {shift.coWorkers && shift.coWorkers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        {tConfirmation("coWorkers")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {shift.coWorkers.map((coWorker) => (
                          <div
                            key={coWorker.id}
                            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1"
                          >
                            <PersonIcon className="h-3 w-3 text-slate-600" />
                            <span className="text-xs text-slate-700">{coWorker.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

