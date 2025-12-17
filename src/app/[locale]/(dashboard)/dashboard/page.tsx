"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useObjects } from "@/hooks/use-objects";
import { useShifts } from "@/hooks/use-shifts";
import { usePendingShifts } from "@/hooks/use-pending-shifts";
import { useAuth } from "@/hooks/use-auth";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate } from "date-fns";
import { AssignmentStatus, Role } from "@/generated/prisma/enums";
import { de, enUS } from "date-fns/locale";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { EnvelopeClosedIcon } from "@radix-ui/react-icons";

type ShiftStatus = "empty" | "red" | "orange" | "green";

/**
 * Determine shift status based on required workers and assignment/confirmation state
 * 
 * Rules:
 * - RED: Shift exists, but NOT all required workers are allocated
 * - ORANGE: ALL required workers are allocated, but at least ONE hasn't confirmed
 * - GREEN: ALL allocated workers (employees + subcontractors) have confirmed
 */
function getShiftStatus(shift: any): ShiftStatus {
  if (!shift) return "empty";

  const requiredWorkers = shift.requiredWorkers || 1;
  const assignments = shift.shiftAssignments || [];
  const subcontractors = shift.subcontractorDemands || [];
  
  const totalAllocated = assignments.length + subcontractors.length;

  // RED: Not all required workers are allocated
  if (totalAllocated < requiredWorkers) {
    return "red";
  }

  // Check if all assignments are confirmed
  const allAssignmentsConfirmed =
    assignments.every((a: any) => a.status === AssignmentStatus.ACCEPTED) &&
    subcontractors.every((s: any) => s.status === AssignmentStatus.ACCEPTED);

  // GREEN: All allocated workers have confirmed
  if (allAssignmentsConfirmed && totalAllocated >= requiredWorkers) {
    return "green";
  }

  // ORANGE: All required workers allocated, but at least one hasn't confirmed
  return "orange";
}

/**
 * Get worst status from multiple shifts (for same object/day)
 * Priority: RED > ORANGE > GREEN > EMPTY
 */
function getWorstStatus(statuses: ShiftStatus[]): ShiftStatus {
  if (statuses.includes("red")) return "red";
  if (statuses.includes("orange")) return "orange";
  if (statuses.includes("green")) return "green";
  return "empty";
}

export default function MonthOverviewPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tConfirmation = useTranslations("confirmation");
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dateLocale = locale === "de" ? de : enUS;

  const { data: objectsData, isLoading: objectsLoading } = useObjects();
  const { data: shiftsData, isLoading: shiftsLoading } = useShifts({
    from: monthStart.toISOString(),
    to: monthEnd.toISOString(),
  });
  const { data: pendingShiftsData } = usePendingShifts(user?.role);

  const objects = objectsData?.objects || [];
  const shifts = shiftsData?.shifts || [];
  const pendingShifts = pendingShiftsData?.shifts || [];
  // Managers are treated as workers, so they can see pending shifts too
  const isWorker = user?.role === Role.EMPLOYEE || user?.role === Role.MANAGER;

  // Create a map of shifts by object ID and date
  // Handle multiple shifts per object/day by collecting all of them
  const shiftsByObjectAndDate = useMemo(() => {
    const map = new Map<string, Map<number, any[]>>();
    
    shifts.forEach((shift: any) => {
      const objectId = shift.objectId || "no-object";
      const day = getDate(new Date(shift.date));
      
      if (!map.has(objectId)) {
        map.set(objectId, new Map());
      }
      
      const dayMap = map.get(objectId)!;
      if (!dayMap.has(day)) {
        dayMap.set(day, []);
      }
      dayMap.get(day)!.push(shift);
    });
    
    return map;
  }, [shifts]);

  /**
   * Get cell status for object + day
   * If multiple shifts exist, use worst status (RED > ORANGE > GREEN)
   */
  const getCellStatus = (objectId: string, day: number): ShiftStatus => {
    const objectShifts = shiftsByObjectAndDate.get(objectId);
    if (!objectShifts) return "empty";
    
    const shiftsForDay = objectShifts.get(day);
    if (!shiftsForDay || shiftsForDay.length === 0) return "empty";
    
    // Get status for each shift and return worst one
    const statuses = shiftsForDay.map((shift) => getShiftStatus(shift));
    return getWorstStatus(statuses);
  };

  /**
   * Get the shift to edit (for multiple shifts, pick the first one or worst status one)
   */
  const getShiftForEdit = (objectId: string, day: number): any | null => {
    const objectShifts = shiftsByObjectAndDate.get(objectId);
    if (!objectShifts) return null;
    
    const shiftsForDay = objectShifts.get(day);
    if (!shiftsForDay || shiftsForDay.length === 0) return null;
    
    // Return the first shift (or could return worst status shift)
    return shiftsForDay[0];
  };

  const handleCellClick = (objectId: string, day: number) => {
    const shift = getShiftForEdit(objectId, day);
    
    if (shift) {
      // Edit existing shift
      router.push(`/${locale}/shifts/${shift.id}`);
    } else {
      // Create new shift - pre-fill object and date
      const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      router.push(`/${locale}/shifts/create?objectId=${objectId}&date=${format(selectedDate, "yyyy-MM-dd")}`);
    }
  };

  const handleDayClick = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    router.push(`/${locale}/planner?date=${format(selectedDate, "yyyy-MM-dd")}`);
  };

  // Check if there are any orange dots (for email notification button)
  const hasOrangeDots = useMemo(() => {
    return objects.some((object) =>
      daysInMonth.some((day) => {
        const dayNum = getDate(day);
        const status = getCellStatus(object.id, dayNum);
        return status === "orange";
      })
    );
  }, [objects, daysInMonth, shiftsByObjectAndDate]);

  // Get all orange shifts for email notification
  const getOrangeShifts = useMemo(() => {
    const orangeShifts: any[] = [];
    shifts.forEach((shift: any) => {
      const status = getShiftStatus(shift);
      if (status === "orange") {
        orangeShifts.push(shift);
      }
    });
    return orangeShifts;
  }, [shifts]);

  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleSendEmailNotification = async () => {
    if (!hasOrangeDots || isSendingEmail) return;
    
    setIsSendingEmail(true);
    try {
      const monthStr = format(currentMonth, "yyyy-MM");
      const response = await fetch(`/api/notifications/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ month: monthStr }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to send email notification");
      }

      const data = await response.json();
      
      // Show success message
      alert(
        t("emailNotificationSent") || 
        `Email notification sent to ${data.recipients?.length || 0} recipient(s)`
      );
    } catch (error: any) {
      console.error("Failed to send email notification:", error);
      alert(t("emailNotificationFailed") || error.message || "Failed to send email notification");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const isLoading = objectsLoading || shiftsLoading;

  return (
    <section className="space-y-6">
      {/* Pending Shifts Section (Employee only) */}
      {isWorker && pendingShifts.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">{tConfirmation("pendingShifts")}</h2>
            <Link href={`/${locale}/employees/pending-shifts`}>
              <Button variant="outline" size="sm">
                {tCommon("view")} All
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {pendingShifts.slice(0, 3).map((shift) => (
              <div key={shift.id} className="flex items-center justify-between rounded bg-white p-3 border border-yellow-200">
                <div>
                  <p className="font-medium text-slate-900">{shift.title}</p>
                  <p className="text-sm text-slate-600">
                    {format(new Date(shift.date), "MMM d", { locale: dateLocale })} •{" "}
                    {format(new Date(shift.startTime), "HH:mm", { locale: dateLocale })} -{" "}
                    {format(new Date(shift.endTime), "HH:mm", { locale: dateLocale })}
                  </p>
                  {(shift.object || shift.objectLabel) && (
                    <p className="text-xs text-slate-500">
                      {shift.object?.label || shift.objectLabel}
                    </p>
                  )}
                </div>
                <Link href={`/${locale}/employees/pending-shifts`}>
                  <Button size="sm" variant="outline">
                    {tConfirmation("confirmShift")}
                  </Button>
                </Link>
              </div>
            ))}
            {pendingShifts.length > 3 && (
              <p className="text-sm text-slate-600 text-center">
                +{pendingShifts.length - 3} more pending shifts
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
          <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          >
            ← {tCommon("prev")}
          </Button>
          <span className="font-semibold text-slate-900 min-w-[200px] text-center">
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
          {/* Send Email Notification Button - Always visible, enabled only when Orange dots exist */}
          <Button
            variant="default"
            onClick={handleSendEmailNotification}
            disabled={!hasOrangeDots || isSendingEmail}
            className="flex items-center gap-2"
          >
            {isSendingEmail ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t("sending") || "Sending..."}
              </>
            ) : (
              <>
                <EnvelopeClosedIcon className="h-4 w-4" />
                {t("sendEmailNotification") || "Send Email Notification"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-red-500" />
          <span className="text-sm text-slate-700">{t("legend.unassigned") || "Unassigned"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-orange-500" />
          <span className="text-sm text-slate-700">{t("legend.assignedUnconfirmed")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-green-500" />
          <span className="text-sm text-slate-700">{t("legend.fullyConfirmed")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full border-2 border-slate-300 bg-white" />
          <span className="text-sm text-slate-700">{t("legend.noShift")}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-slate-600">{t("loading")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="sticky left-0 z-10 min-w-[200px] border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  {t("objects") || "Objects"}
                </th>
                {daysInMonth.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="min-w-[40px] border-r border-slate-200 px-2 py-3 text-center text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDayClick(getDate(day));
                    }}
                    title={t("clickDayTooltip", { date: format(day, "MMM d", { locale: dateLocale }) }) || `Click to open planner for ${format(day, "MMM d", { locale: dateLocale })}`}
                  >
                    {getDate(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {objects.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth.length + 1} className="px-4 py-8 text-center text-slate-500">
                    {t("noObjects")} <Link href={`/${locale}/objects/create`} className="text-blue-600 hover:underline">{t("createFirstObject")}</Link>
                  </td>
                </tr>
              ) : (
                objects.map((object) => (
                  <tr key={object.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="sticky left-0 z-10 min-w-[200px] border-r border-slate-200 bg-white px-4 py-3 font-medium text-slate-900">
                      {object.label}
                    </td>
                    {daysInMonth.map((day) => {
                      const dayNum = getDate(day);
                      const status = getCellStatus(object.id, dayNum);
                      return (
                        <td
                          key={day.toISOString()}
                          className="border-r border-slate-100 px-2 py-3 text-center cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCellClick(object.id, dayNum);
                          }}
                          title={`${object.label} - ${format(day, "MMM d", { locale: dateLocale })}: ${
                            status === "empty"
                              ? t("cellTooltip.createShift") || "Click to create shift"
                              : status === "red"
                              ? t("cellTooltip.noAssignments") || "Unassigned - Click to edit"
                              : status === "orange"
                              ? t("cellTooltip.unconfirmed") || "Assigned (pending confirmation) - Click to edit"
                              : t("cellTooltip.confirmed") || "Fully confirmed - Click to edit"
                          }`}
                        >
                          {status === "red" && (
                            <div className="mx-auto h-3 w-3 rounded-full bg-red-500" title="Unassigned" />
                          )}
                          {status === "orange" && (
                            <div className="mx-auto h-3 w-3 rounded-full bg-orange-500" title="Assigned (pending confirmation)" />
                          )}
                          {status === "green" && (
                            <div className="mx-auto h-3 w-3 rounded-full bg-green-500" title="Fully confirmed" />
                          )}
                          {status === "empty" && <span className="text-slate-300">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
