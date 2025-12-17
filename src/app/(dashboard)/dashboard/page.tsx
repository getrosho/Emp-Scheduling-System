"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useObjects } from "@/hooks/use-objects";
import { useShifts } from "@/hooks/use-shifts";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate, isSameDay } from "date-fns";
import { AssignmentStatus } from "@/generated/prisma/enums";
import Link from "next/link";

type ShiftStatus = "empty" | "gray" | "yellow" | "green";

function getShiftStatus(shift: any): ShiftStatus {
  if (!shift) return "empty";

  const assignments = shift.shiftAssignments || [];
  const subcontractors = shift.subcontractorDemands || [];

  // If no assignments at all, it's GRAY (unassigned)
  if (assignments.length === 0 && subcontractors.length === 0) {
    return "gray";
  }

  // Check if all assignments are confirmed
  const allAssignmentsConfirmed =
    assignments.every((a: any) => a.status === AssignmentStatus.ACCEPTED) &&
    subcontractors.every((s: any) => s.status === AssignmentStatus.ACCEPTED);

  if (allAssignmentsConfirmed && assignments.length > 0) {
    return "green"; // All confirmed
  }

  // If there are assignments but not all confirmed, it's YELLOW (assigned but pending)
  return "yellow";
}

export default function MonthOverviewPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: objectsData, isLoading: objectsLoading } = useObjects();
  const { data: shiftsData, isLoading: shiftsLoading } = useShifts({
    from: monthStart.toISOString(),
    to: monthEnd.toISOString(),
  });

  const objects = objectsData?.objects || [];
  const shifts = shiftsData?.shifts || [];

  // Create a map of shifts by object ID and date
  const shiftsByObjectAndDate = useMemo(() => {
    const map = new Map<string, Map<number, any>>();
    
    shifts.forEach((shift: any) => {
      const objectId = shift.objectId || "no-object";
      const day = getDate(new Date(shift.date));
      
      if (!map.has(objectId)) {
        map.set(objectId, new Map());
      }
      
      const dayMap = map.get(objectId)!;
      // If multiple shifts on same day, take the one with the most assignments
      if (!dayMap.has(day) || (shift.shiftAssignments?.length || 0) > (dayMap.get(day)?.shiftAssignments?.length || 0)) {
        dayMap.set(day, shift);
      }
    });
    
    return map;
  }, [shifts]);

  const getCellStatus = (objectId: string, day: number): ShiftStatus => {
    const objectShifts = shiftsByObjectAndDate.get(objectId);
    if (!objectShifts) return "empty";
    
    const shift = objectShifts.get(day);
    return getShiftStatus(shift);
  };

  const handleCellClick = (objectId: string, day: number) => {
    const objectShifts = shiftsByObjectAndDate.get(objectId);
    const shift = objectShifts?.get(day);
    
    if (shift) {
      // Edit existing shift
      router.push(`/shifts/${shift.id}`);
    } else {
      // Create new shift - need to pass object and date
      const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      router.push(`/shifts/create?objectId=${objectId}&date=${format(selectedDate, "yyyy-MM-dd")}`);
    }
  };

  const handleDayClick = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    router.push(`/planner?date=${format(selectedDate, "yyyy-MM-dd")}`);
  };

  const isLoading = objectsLoading || shiftsLoading;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">MONATSÜBERSICHT</p>
          <h1 className="text-3xl font-semibold text-slate-900">Month Overview</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50"
          >
            ← Prev
          </button>
          <span className="font-semibold text-slate-900 min-w-[200px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50"
          >
            Next →
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50"
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-slate-400" />
          <span className="text-sm text-slate-700">Unassigned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-yellow-500" />
          <span className="text-sm text-slate-700">Assigned (pending confirmation)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-green-500" />
          <span className="text-sm text-slate-700">Confirmed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full border-2 border-slate-300 bg-white" />
          <span className="text-sm text-slate-700">No shift</span>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-slate-600">Loading month overview...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="sticky left-0 z-10 min-w-[200px] border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  Objects
                </th>
                {daysInMonth.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="min-w-[40px] border-r border-slate-200 px-2 py-3 text-center text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleDayClick(getDate(day))}
                    title={`Click to open daily planning for ${format(day, "MMM d")}`}
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
                    No objects found. <Link href="/objects/create" className="text-blue-600 hover:underline">Create your first object</Link>
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
                          onClick={() => handleCellClick(object.id, dayNum)}
                          title={`${object.label} - ${format(day, "MMM d")}: ${status === "empty" ? "Create shift" : status === "gray" ? "Unassigned" : status === "yellow" ? "Assigned (pending)" : "Confirmed"}`}
                        >
                          {status === "gray" && (
                            <div className="mx-auto h-3 w-3 rounded-full bg-slate-400" title="Unassigned" />
                          )}
                          {status === "yellow" && (
                            <div className="mx-auto h-3 w-3 rounded-full bg-yellow-500" title="Assigned (pending confirmation)" />
                          )}
                          {status === "green" && (
                            <div className="mx-auto h-3 w-3 rounded-full bg-green-500" title="Confirmed" />
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
