"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useEmployees } from "@/hooks/use-employees";
import { useEmployeeAvailabilityDates } from "@/hooks/use-availability-dates";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type AvailabilityStatus = "available" | "unavailable" | "noData";

export default function ManagerAvailabilityGridPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("manager.availabilityGrid");
  const tCommon = useTranslations("common");
  const tEmployees = useTranslations("employees");
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStr = format(currentMonth, "yyyy-MM");
  
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({
    limit: 100, // Get all employees for the grid
  });

  const employees = employeesData?.employees || [];
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dateLocale = locale === "de" ? de : enUS;

  // Fetch availability for all employees
  const availabilityQueries = employees.map((emp) => ({
    employee: emp,
    query: useEmployeeAvailabilityDates(emp.id, monthStr),
  }));

  // Create a map: employeeId -> date -> status
  const availabilityMap = useMemo(() => {
    const map = new Map<string, Map<string, AvailabilityStatus>>();
    
    availabilityQueries.forEach(({ employee, query }) => {
      const empMap = new Map<string, AvailabilityStatus>();
      
      if (query.data?.availability) {
        query.data.availability.forEach((av) => {
          if (av.date) {
            const dateStr = format(new Date(av.date), "yyyy-MM-dd");
            if (av.isAvailable === true) {
              empMap.set(dateStr, "available");
            } else if (av.isAvailable === false) {
              empMap.set(dateStr, "unavailable");
            } else {
              empMap.set(dateStr, "noData");
            }
          }
        });
      }
      
      map.set(employee.id, empMap);
    });
    
    return map;
  }, [availabilityQueries]);

  const getCellStatus = (employeeId: string, date: Date): AvailabilityStatus => {
    const dateStr = format(date, "yyyy-MM-dd");
    const empMap = availabilityMap.get(employeeId);
    return empMap?.get(dateStr) || "noData";
  };

  const isLoading = employeesLoading || availabilityQueries.some((q) => q.query.isLoading);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
          <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
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
          <span className="text-sm text-slate-700">{t("noInfo")}</span>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-slate-600">{tCommon("loading")}</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="sticky left-0 z-10 min-w-[200px] border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  {tEmployees("title")}
                </th>
                {daysInMonth.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="min-w-[40px] border-r border-slate-200 px-2 py-3 text-center text-xs font-medium text-slate-700"
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
                    {tEmployees("noEmployees")}
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="sticky left-0 z-10 min-w-[200px] border-r border-slate-200 bg-white px-4 py-3 font-medium text-slate-900">
                      <Link
                        href={`/${locale}/employees/${employee.id}/availability`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {employee.fullName}
                      </Link>
                    </td>
                    {daysInMonth.map((day) => {
                      const status = getCellStatus(employee.id, day);
                      return (
                        <td
                          key={day.toISOString()}
                          className="border-r border-slate-100 px-2 py-3 text-center"
                          title={`${employee.fullName} - ${format(day, "MMM d")}: ${
                            status === "available"
                              ? t("available")
                              : status === "unavailable"
                              ? t("unavailable")
                              : t("noInfo")
                          }`}
                        >
                          {status === "available" && (
                            <div className="mx-auto h-3 w-3 rounded border-2 border-green-500 bg-green-100" />
                          )}
                          {status === "unavailable" && (
                            <div className="mx-auto h-3 w-3 rounded border-2 border-red-500 bg-red-100" />
                          )}
                          {status === "noData" && (
                            <div className="mx-auto h-3 w-3 rounded border-2 border-slate-300 bg-slate-50" />
                          )}
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

