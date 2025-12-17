"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useShifts } from "@/hooks/use-shifts";
import { useEmployees } from "@/hooks/use-employees";
import { useAssignShift } from "@/hooks/use-shift-confirmation";
import { useEmployeesAvailabilityForDate } from "@/hooks/use-employee-availability-for-date";
import { AssignmentStatus } from "@/generated/prisma/enums";
import { CalendarIcon, PersonIcon, CheckIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { format, startOfDay } from "date-fns";
import type { Employee } from "@/types/employees";
import { cn } from "@/lib/utils";

// Draggable Employee Card Component
function DraggableEmployee({ 
  employee, 
  availabilityStatus 
}: { 
  employee: Employee;
  availabilityStatus?: {
    isAvailable: boolean | null;
    hasOverlappingConfirmedShift: boolean;
  };
}) {
  const isAvailable = availabilityStatus?.isAvailable === true;
  const isUnavailable = availabilityStatus?.isAvailable === false;
  const hasOverlap = availabilityStatus?.hasOverlappingConfirmedShift || false;
  const canDrag = isAvailable && !hasOverlap; // Only draggable if available and no overlap

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: employee.id,
    disabled: !canDrag, // Disable dragging if unavailable or has overlap
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : !canDrag ? 0.6 : 1,
  };

  // Determine border color based on availability
  let borderColor = "border-slate-200"; // Default
  if (isAvailable && !hasOverlap) {
    borderColor = "border-green-400"; // Available
  } else if (isUnavailable || hasOverlap) {
    borderColor = "border-red-400"; // Unavailable or has overlap
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      className={cn(
        "rounded-lg border-2 p-3 transition-all",
        canDrag
          ? "cursor-grab active:cursor-grabbing hover:shadow-md"
          : "cursor-not-allowed opacity-60",
        isDragging
          ? "border-blue-400 bg-blue-50 shadow-lg"
          : borderColor === "border-green-400"
          ? "border-green-400 bg-green-50 shadow-sm"
          : borderColor === "border-red-400"
          ? "border-red-400 bg-red-50 shadow-sm"
          : "border-slate-200 bg-white shadow-sm"
      )}
      title={
        !canDrag
          ? isUnavailable
            ? "Employee is unavailable on this date"
            : hasOverlap
            ? "Employee has a confirmed shift that overlaps"
            : "No availability information"
          : "Available - Drag to assign"
      }
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          isAvailable && !hasOverlap
            ? "bg-green-100"
            : isUnavailable || hasOverlap
            ? "bg-red-100"
            : "bg-slate-100"
        )}>
          {isAvailable && !hasOverlap ? (
            <CheckIcon className="h-5 w-5 text-green-600" />
          ) : isUnavailable || hasOverlap ? (
            <CrossCircledIcon className="h-5 w-5 text-red-600" />
          ) : (
            <PersonIcon className="h-5 w-5 text-slate-600" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-900">
              {employee.fullName}
            </p>
            {isAvailable && !hasOverlap && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Available
              </span>
            )}
            {isUnavailable && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Unavailable
              </span>
            )}
            {hasOverlap && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                Has Shift
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{employee.role}</p>
        </div>
      </div>
    </div>
  );
}

// Droppable Shift Card Component
function DroppableShift({
  shift,
  assignedEmployees,
  isOver,
}: {
  shift: any;
  assignedEmployees: { id: string; name: string; status: string }[];
  isOver: boolean;
}) {
  // Determine shift status
  const assignments = (shift.shiftAssignments || []) as Array<{ status: string }>;
  const hasAssignments = assignments.length > 0;
  const allConfirmed = hasAssignments && assignments.every(
    (a) => a.status === AssignmentStatus.ACCEPTED
  );
  const isLocked = allConfirmed && hasAssignments; // Locked if all confirmed

  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: `shift-${shift.id}`,
    disabled: isLocked, // Disable dropping on confirmed shifts
  });

  const showDropIndicator = (isOver || isDroppableOver) && !isLocked;

  // Status color: gray (unassigned), yellow (assigned but pending), green (confirmed)
  let statusColor = "bg-slate-400"; // gray - unassigned
  let statusText = "Unassigned";
  if (hasAssignments) {
    if (allConfirmed) {
      statusColor = "bg-green-500"; // green - confirmed
      statusText = "Confirmed";
    } else {
      statusColor = "bg-yellow-500"; // yellow - assigned but pending
      statusText = "Pending Confirmation";
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 p-3 transition-colors ${
        isLocked
          ? "border-green-300 bg-green-50 opacity-75"
          : showDropIndicator
          ? "border-blue-400 bg-blue-50"
          : "border-slate-200 bg-white"
      } shadow-sm ${isLocked ? "cursor-not-allowed" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-3 w-3 rounded-full ${statusColor}`} title={statusText} />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">{shift.title}</p>
          <p className="text-xs text-slate-500">
            {format(new Date(shift.startTime), "h:mm a")} -{" "}
            {format(new Date(shift.endTime), "h:mm a")}
          </p>
        </div>
        {isLocked && (
          <span className="text-xs text-green-700 font-medium">🔒 Locked</span>
        )}
      </div>

      {/* Show assigned employees with status */}
      {assignedEmployees.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-xs font-medium text-slate-600">Assigned:</p>
          {assignedEmployees.map((emp) => {
            const isConfirmed = emp.status === AssignmentStatus.ACCEPTED;
            const isPending = emp.status === AssignmentStatus.PENDING;
            return (
              <div
                key={emp.id}
                className={`flex items-center gap-2 rounded px-2 py-1 ${
                  isConfirmed
                    ? "bg-green-50 border border-green-200"
                    : isPending
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-slate-50"
                }`}
              >
                <PersonIcon className={`h-3 w-3 ${isConfirmed ? "text-green-600" : isPending ? "text-yellow-600" : "text-slate-500"}`} />
                <p className="text-xs text-slate-700">{emp.name}</p>
                {isConfirmed && (
                  <span className="ml-auto text-xs text-green-700">✓</span>
                )}
                {isPending && (
                  <span className="ml-auto text-xs text-yellow-700">⏳</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Drop zone indicator */}
      {showDropIndicator && (
        <div className="mt-2 rounded border-2 border-dashed border-blue-300 bg-blue-50 p-2 text-center">
          <p className="text-xs text-blue-600">Drop employee here</p>
        </div>
      )}
    </div>
  );
}

export default function PlannerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverShiftId, setDragOverShiftId] = useState<string | null>(null);
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: shiftsData, isLoading: shiftsLoading, refetch: refetchShifts } =
    useShifts({
      from: startOfDay(selectedDate).toISOString(),
      to: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
  const { data: employeesData, isLoading: employeesLoading } = useEmployees();
  const { data: availabilityData, isLoading: availabilityLoading } = useEmployeesAvailabilityForDate(selectedDate);
  const assignShift = useAssignShift();
  const [dragError, setDragError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDragError(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && typeof over.id === "string" && over.id.startsWith("shift-")) {
      setDragOverShiftId(over.id.replace("shift-", ""));
    } else {
      setDragOverShiftId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverShiftId(null);

    if (!over) {
      return;
    }

    // Extract employee ID and shift ID
    const employeeId = active.id as string;
    const overId = over.id as string;

    // Don't allow dropping employees on the employees list
    if (overId === "employees-list") {
      return;
    }

    // Extract shift ID from droppable ID (format: "shift-{shiftId}")
    const shiftId = overId.startsWith("shift-")
      ? overId.replace("shift-", "")
      : null;

    if (!shiftId) {
      return;
    }

    // Validate that we have valid IDs (CUIDs start with 'c' or 'C')
    if (
      !employeeId ||
      !shiftId ||
      !employeeId.match(/^[cC][^\s-]{8,}$/) ||
      !shiftId.match(/^[cC][^\s-]{8,}$/)
    ) {
      setDragError("Invalid employee or shift ID. Please try again.");
      console.error("Invalid IDs:", { employeeId, shiftId });
      return;
    }

    // Check if shift is confirmed (locked)
    const shift = shiftsData?.shifts?.find((s: any) => s.id === shiftId);
    if (shift) {
      const assignments = shift.shiftAssignments || [];
      const hasAssignments = assignments.length > 0;
      const allConfirmed = hasAssignments && assignments.every(
        (a: any) => a.status === AssignmentStatus.ACCEPTED
      );
      if (allConfirmed) {
        setDragError("Cannot assign to a confirmed shift. All assignments are already confirmed.");
        return;
      }
    }

    // Check employee availability
    const employeeAvailability = availabilityData?.employees?.find(
      (av) => av.employeeId === employeeId
    );
    
    if (employeeAvailability) {
      if (employeeAvailability.isAvailable === false) {
        setDragError("Cannot assign: Employee is marked as unavailable on this date.");
        return;
      }
      
      if (employeeAvailability.hasOverlappingConfirmedShift) {
        setDragError("Cannot assign: Employee has a confirmed shift that overlaps with this one.");
        return;
      }
      
      if (employeeAvailability.isAvailable === null) {
        // No availability info - allow but warn
        console.warn("No availability information for employee on this date");
      }
    }

    try {
      await assignShift.mutateAsync({
        shiftId: shiftId,
        userId: employeeId,
      });
      // Refetch shifts to show updated assignments
      refetchShifts();
    } catch (error: any) {
      // Extract error message from various possible formats
      let errorMessage = "Failed to assign employee to shift";

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      // Handle specific error cases
      if (errorMessage.includes("not available")) {
        errorMessage = "This employee is not available for this shift time.";
      } else if (
        errorMessage.includes("Invalid cuid") ||
        errorMessage.includes("Invalid format")
      ) {
        errorMessage =
          "Invalid employee or shift data. Please refresh the page and try again.";
      } else if (
        errorMessage.includes("conflict") ||
        errorMessage.includes("already assigned")
      ) {
        errorMessage =
          "This employee is already assigned to another shift at this time.";
      }

      setDragError(errorMessage);
      console.error("Assignment error:", error);
    }
  };

  // Get assigned employees for each shift
  const employees = employeesData?.employees ?? [];
  const getAssignedEmployees = (shift: any) => {
    return (
      (shift.shiftAssignments || []).map((assignment: any) => {
        const employee = employees.find(
          (emp: Employee) => emp.id === assignment.userId
        );
        return {
          id: assignment.userId,
          name: assignment.user?.name || employee?.fullName || "Unknown",
          status: assignment.status,
        };
      })
    );
  };

  const activeEmployee = activeId
    ? employees.find((emp: Employee) => emp.id === activeId)
    : null;

  // Create availability map for quick lookup
  const availabilityMap = new Map(
    availabilityData?.employees?.map((av) => [av.employeeId, av]) || []
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <section className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Workforce Planning
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Shift Planner</h1>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="rounded-lg border border-slate-300 px-4 py-2"
          />
          <p className="text-sm text-slate-600">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>

        {dragError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <p className="font-medium">Assignment Error</p>
            <p className="text-sm">{dragError}</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Shifts for selected day */}
          <div className="lg:col-span-1">
            <h2 className="mb-4 font-semibold text-slate-900">Shifts</h2>
            {shiftsLoading && (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded bg-slate-100"
                  />
                ))}
              </div>
            )}
            {shiftsData?.shifts && shiftsData.shifts.length > 0 ? (
              <div className="space-y-2">
                {shiftsData.shifts.map((shift) => {
                  const assignedEmployees = getAssignedEmployees(shift);
                  const isOver = dragOverShiftId === shift.id;
                  return (
                    <DroppableShift
                      key={shift.id}
                      shift={shift}
                      assignedEmployees={assignedEmployees}
                      isOver={isOver}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                <CalendarIcon className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">
                  No shifts scheduled
                </p>
              </div>
            )}
          </div>

          {/* Available Employees */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 font-semibold text-slate-900">
              Available Employees
            </h2>
            {(employeesLoading || availabilityLoading) && (
              <div className="grid gap-3 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded bg-slate-100"
                  />
                ))}
              </div>
            )}
            {employees.length > 0 ? (
              <div
                id="employees-list"
                className="grid gap-3 md:grid-cols-2"
              >
                {employees.map((employee: Employee) => {
                  const availabilityStatus = availabilityMap.get(employee.id);
                  return (
                    <DraggableEmployee 
                      key={employee.id} 
                      employee={employee}
                      availabilityStatus={availabilityStatus}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                <PersonIcon className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">
                  No employees available
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>Drag & Drop:</strong> Drag employees from the right onto
            shifts on the left to assign them. The shift will highlight when
            you drag over it.
          </p>
        </div>
      </section>

      <DragOverlay>
        {activeEmployee ? (
          <div className="rounded-lg border-2 border-blue-400 bg-blue-50 p-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <PersonIcon className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {activeEmployee.fullName}
                </p>
                <p className="text-xs text-slate-500">{activeEmployee.role}</p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
