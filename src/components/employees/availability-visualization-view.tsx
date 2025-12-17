"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { EnvelopeClosedIcon, PersonIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";

type CellStatus = "available" | "allocated" | "unavailable" | "noData";

type EmployeeVisualizationData = {
  id: string;
  fullName: string;
  email: string;
  days: Record<string, { isAvailable: boolean | null; allocatedHours: number }>;
  hasAnyAvailability: boolean;
};

type AvailabilityVisualizationResponse = {
  employees: EmployeeVisualizationData[];
  month: string;
};

type AvailabilityVisualizationViewProps = {
  subcontractor?: boolean;
};

export function AvailabilityVisualizationView(props: AvailabilityVisualizationViewProps = {}) {
  const { subcontractor = false } = props;
  const locale = useLocale();
  const t = useTranslations("employees.availabilityVisualization");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const { toasts, showSuccess, showError, dismissToast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStr = format(currentMonth, "yyyy-MM");
  const dateLocale = locale === "de" ? de : enUS;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["employees-availability-visualization", monthStr, subcontractor],
    queryFn: async () => {
      const data = await apiClient.get<AvailabilityVisualizationResponse>(
        `/api/employees/availability-visualization?month=${monthStr}${subcontractor ? "&subcontractor=true" : ""}`
      );
      return data;
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const employees = data?.employees || [];

  const getCellStatus = (employee: EmployeeVisualizationData, date: Date): CellStatus => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayData = employee.days[dateStr];
    
    if (!dayData) {
      return "noData"; // White/Empty - Nothing filled yet
    }
    
    if (dayData.allocatedHours > 0) {
      return "allocated"; // Blue - Allocated to a shift
    }
    
    if (dayData.isAvailable === true) {
      return "available"; // Green - Available
    }
    
    if (dayData.isAvailable === false) {
      return "unavailable"; // Grey - Not available
    }
    
    return "noData"; // White/Empty - No availability data
  };

  const getCellHours = (employee: EmployeeVisualizationData, date: Date): number => {
    const dateStr = format(date, "yyyy-MM-dd");
    return employee.days[dateStr]?.allocatedHours || 0;
  };

  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const handleSendReminder = async (employeeId: string, email: string) => {
    if (sendingReminderId === employeeId) return;
    
    setSendingReminderId(employeeId);
    try {
      // Use apiClient to ensure auth headers are included
      const data = await apiClient.post<{ success: boolean; message: string }>(
        `/api/employees/${employeeId}/send-availability-reminder`,
        {}
      );
      
      // Show success toast for 5 seconds
      showSuccess(
        t("reminderEmailSent") || `Reminder email sent to ${email}`,
        5000
      );
    } catch (error: any) {
      console.error("Failed to send reminder:", error);
      const errorMessage = error?.message || error?.error?.message || "Failed to send reminder email. Please try again.";
      // Show error toast for 5 seconds
      showError(
        t("failedToSendReminder") || errorMessage,
        5000
      );
    } finally {
      setSendingReminderId(null);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-slate-600">{tCommon("loading")}</p>
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  if (isError) {
    // Extract error message from error object
    const errorMessage = (error as any)?.message || t("failedToLoad") || "Failed to load availability data";
    return (
      <>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">{tCommon("error")}</p>
          <p className="text-sm">{errorMessage}</p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-xs mt-2 opacity-75">
              Check browser console and server logs for more details.
            </p>
          )}
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <>
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
          <div className="h-4 w-4 rounded bg-green-500" />
          <span className="text-sm text-slate-700">{t("legend.available") || "Available"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-blue-500" />
          <span className="text-sm text-slate-700">{t("legend.allocated") || "Allocated to a shift"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-slate-400" />
          <span className="text-sm text-slate-700">{t("legend.unavailable") || "Not available"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border-2 border-slate-300 bg-white" />
          <span className="text-sm text-slate-700">{t("legend.noData") || "Nothing filled yet"}</span>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 min-w-[250px] border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900">
                {t("employeeName") || "Employee"}
              </th>
              {daysInMonth.map((day) => (
                <th
                  key={day.toISOString()}
                  className="min-w-[50px] border-r border-slate-200 px-2 py-3 text-center text-xs font-medium text-slate-700"
                >
                  {getDate(day)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={daysInMonth.length + 1} className="px-4 py-8 text-center text-slate-500">
                  {t("noEmployees") || "No employees found"}
                </td>
              </tr>
            ) : (
              employees.map((employee) => {
                const hasNoAvailability = !employee.hasAnyAvailability;
                
                return (
                  <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50">
                    {/* Employee Name and Email Column */}
                    <td className="sticky left-0 z-10 min-w-[250px] border-r border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/${locale}/employees/${employee.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {employee.fullName}
                          </Link>
                          <p className="text-xs text-slate-500 truncate">{employee.email}</p>
                        </div>
                        {/* Send Reminder Button - Show for ALL staff, but MOST IMPORTANT for those with white cells */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendReminder(employee.id, employee.email)}
                          disabled={sendingReminderId === employee.id}
                          className={cn(
                            "flex-shrink-0 h-8 px-2 text-xs",
                            hasNoAvailability && "border-orange-300 text-orange-700 hover:bg-orange-50"
                          )}
                          title={t("sendReminderTooltip") || "Send email to remind him to fill his availability"}
                        >
                          {sendingReminderId === employee.id ? (
                            <>
                              <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              {tCommon("sending") || "Sending..."}
                            </>
                          ) : (
                            <>
                              <EnvelopeClosedIcon className="h-3 w-3 mr-1" />
                              {t("sendReminder") || "Remind"}
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                    
                    {/* Day Cells */}
                    {daysInMonth.map((day) => {
                      const status = getCellStatus(employee, day);
                      const hours = getCellHours(employee, day);
                      
                      let bgColor = "bg-white"; // White/Empty - default
                      let borderColor = "border-slate-200";
                      let textColor = "text-slate-400";
                      
                      if (status === "available") {
                        bgColor = "bg-green-100";
                        borderColor = "border-green-300";
                        textColor = "text-green-800";
                      } else if (status === "allocated") {
                        bgColor = "bg-blue-100";
                        borderColor = "border-blue-300";
                        textColor = "text-blue-800";
                      } else if (status === "unavailable") {
                        bgColor = "bg-slate-200";
                        borderColor = "border-slate-400";
                        textColor = "text-slate-700";
                      }
                      
                      return (
                        <td
                          key={day.toISOString()}
                          className={cn(
                            "border-r border-slate-100 px-2 py-3 text-center min-w-[50px]",
                            bgColor,
                            borderColor
                          )}
                          title={`${employee.fullName} - ${format(day, "MMM d")}: ${
                            status === "available"
                              ? t("legend.available")
                              : status === "allocated"
                              ? `${t("legend.allocated")} (${hours.toFixed(1)}h)`
                              : status === "unavailable"
                              ? t("legend.unavailable")
                              : t("legend.noData")
                          }`}
                        >
                          {status === "allocated" && hours > 0 && (
                            <span className={cn("text-xs font-medium", textColor)}>
                              {hours.toFixed(1)}h
                            </span>
                          )}
                          {status !== "allocated" && (
                            <div className={cn("mx-auto h-3 w-3 rounded", bgColor, borderColor, "border-2")} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

