"use client";

import { useState, useMemo, useEffect } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { useObjects } from "@/hooks/use-objects";
import { AssignmentStatus, Role } from "@/generated/prisma/enums";
import { CalendarIcon, PersonIcon, RocketIcon } from "@radix-ui/react-icons";
import { format, startOfDay, parse } from "date-fns";
import { de, enUS } from "date-fns/locale";
import type { Employee } from "@/types/employees";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

// Draggable Worker Card Component (Employee or Subcontractor)
function DraggableWorker({ 
  worker, 
  availabilityStatus,
  hasReachedWeeklyLimit,
  t,
}: { 
  worker: Employee;
  availabilityStatus?: {
    isAvailable: boolean | null;
    hasOverlappingConfirmedShift: boolean;
  };
  hasReachedWeeklyLimit?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const isAvailable = availabilityStatus?.isAvailable === true;
  const isUnavailable = availabilityStatus?.isAvailable === false;
  
  // Colors are visual only - no blocking
  const canDrag = true; // Always allow dragging (colors are visual guidance only)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: worker.id,
    disabled: false, // No blocking based on availability
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  // Determine border color: Green (Available), Blue (Weekly limit), Grey (Not Available), White (No info)
  let borderColor = "border-slate-200"; // White/No indicator - default
  let bgColor = "bg-white";
  let textColor = "text-slate-900";
  let statusText = "";

  if (hasReachedWeeklyLimit) {
    borderColor = "border-blue-400"; // Blue - Reached weekly limit
    bgColor = "bg-blue-50";
    textColor = "text-blue-800";
    statusText = t("reachedWeeklyLimit");
  } else if (isAvailable) {
    borderColor = "border-green-400"; // Green - Available
    bgColor = "bg-green-50";
    textColor = "text-green-800";
    statusText = t("available");
  } else if (isUnavailable) {
    borderColor = "border-slate-400"; // Grey - Not Available
    bgColor = "bg-slate-100";
    textColor = "text-slate-700";
    statusText = t("unavailable");
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-lg border-2 p-3 transition-all shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md",
        borderColor,
        bgColor,
        isDragging && "border-blue-400 bg-blue-50 shadow-lg opacity-50"
      )}
      title={statusText || t("noAvailabilityInfo")}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          hasReachedWeeklyLimit
            ? "bg-blue-100"
            : isAvailable
            ? "bg-green-100"
            : isUnavailable
            ? "bg-slate-200"
            : "bg-slate-50"
        )}>
          {worker.subcontractor ? (
            <RocketIcon className="h-5 w-5 text-slate-600" />
          ) : (
            <PersonIcon className="h-5 w-5 text-slate-600" />
          )}
        </div>
        <div className="flex-1">
          <p className={cn("text-sm font-medium", textColor)}>
            {worker.fullName}
          </p>
          <p className="text-xs text-slate-500">{worker.role}</p>
        </div>
      </div>
    </div>
  );
}

// Droppable Slot Component (MA 1, MA 2, etc.)
function DroppableSlot({
  shiftId,
  slotIndex,
  assignedWorker,
  isOver,
  t,
}: {
  shiftId: string;
  slotIndex: number;
  assignedWorker: { id: string; name: string } | null;
  isOver: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: `slot-${shiftId}-${slotIndex}`,
  });

  const showDropIndicator = (isOver || isDroppableOver) && !assignedWorker;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border-2 p-3 transition-colors min-h-[60px] flex items-center justify-center",
        assignedWorker
          ? "border-green-300 bg-green-50"
          : showDropIndicator
          ? "border-blue-400 bg-blue-50 border-dashed"
          : "border-slate-200 bg-slate-50 border-dashed"
      )}
    >
      {assignedWorker ? (
        <div className="flex items-center gap-2 w-full">
          <PersonIcon className="h-4 w-4 text-green-600" />
          <p className="text-sm font-medium text-slate-900">{assignedWorker.name}</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-xs font-medium text-slate-500">
            {t("slotLabel", { number: slotIndex + 1 }) || `MA ${slotIndex + 1}`}
          </p>
          {showDropIndicator && (
            <p className="text-xs text-blue-600 mt-1">{t("dropHere") || "Drop here"}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlannerPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const t = useTranslations("planner");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const dateLocale = locale === "de" ? de : enUS;

  // Get date from query params (from Month Overview day click)
  const dateParam = searchParams.get("date");
  const [selectedDate, setSelectedDate] = useState(() => {
    if (dateParam) {
      try {
        return parse(dateParam, "yyyy-MM-dd", new Date());
      } catch {
        return new Date();
      }
    }
    return new Date();
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  
  const { data: shiftsData, isLoading: shiftsLoading, refetch: refetchShifts } =
    useShifts({
      from: startOfDay(selectedDate).toISOString(),
      to: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
  const { data: employeesData, isLoading: employeesLoading } = useEmployees();
  const { data: availabilityData, isLoading: availabilityLoading } = useEmployeesAvailabilityForDate(selectedDate);
  const { data: objectsData } = useObjects();
  const assignShift = useAssignShift();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Group shifts by object (LEFT COLUMN)
  const shiftsByObject = useMemo(() => {
    if (!shiftsData?.shifts || !objectsData?.objects) return new Map();
    const map = new Map<string, { object: any; shifts: any[] }>();
    
    shiftsData.shifts.forEach((shift: any) => {
      const objectId = shift.objectId || "no-object";
      const object = objectsData.objects?.find((o) => o.id === objectId);
      const objectLabel = object?.label || shift.objectLabel || t("noObject");
      
      if (!map.has(objectId)) {
        map.set(objectId, { object: { id: objectId, label: objectLabel }, shifts: [] });
      }
      map.get(objectId)!.shifts.push(shift);
    });
    
    return map;
  }, [shiftsData?.shifts, objectsData?.objects, t]);

  // Separate employees and subcontractors, include manager
  const { employees, subcontractors } = useMemo(() => {
    const allEmployees = employeesData?.employees ?? [];
    const regularEmployees = allEmployees.filter((emp: Employee) => !emp.subcontractor);
    const subs = allEmployees.filter((emp: Employee) => emp.subcontractor);
    
    // Add manager to employees list if they're not already there
    if (user && (user.role === Role.MANAGER || user.role === Role.ADMIN)) {
      const managerExists = regularEmployees.some((emp: Employee) => emp.id === user.id);
      if (!managerExists) {
        // Create a temporary employee object for the manager
        const managerEmployee: Employee = {
          id: user.id,
          fullName: user.name,
          role: user.role,
          email: `${user.id}@manager.local`,
          subcontractor: false,
        };
        regularEmployees.push(managerEmployee);
      }
    }
    
    return {
      employees: regularEmployees,
      subcontractors: subs,
    };
  }, [employeesData?.employees, user]);

  // Calculate weekly hours for each employee (for blue color coding)
  const weeklyHoursByEmployee = useMemo(() => {
    // TODO: Implement weekly hours calculation from confirmed shifts
    // For now, return empty map - this would need API support
    return new Map<string, number>();
  }, []);

  // Get assigned workers for each slot
  const getAssignedWorkersForShift = (shift: any) => {
    const allEmployees = employeesData?.employees ?? [];
    // Include manager in lookup
    const allWorkers = [...allEmployees];
    if (user && !allWorkers.find((w: Employee) => w.id === user.id)) {
      allWorkers.push({
        id: user.id,
        fullName: user.name,
        role: user.role,
        email: `${user.id}@manager.local`,
        subcontractor: false,
      } as Employee);
    }
    
    const assignments = shift.shiftAssignments || [];
    const requiredWorkers = shift.requiredWorkers || 1;
    
    // Create array of slots with assigned workers
    const slots: Array<{ id: string; name: string } | null> = [];
    
    for (let i = 0; i < requiredWorkers; i++) {
      if (i < assignments.length) {
        const assignment = assignments[i];
        const worker = allWorkers.find((w: Employee) => w.id === assignment.userId);
        const name = assignment.user?.name || worker?.fullName || "Unknown";
        slots.push({ id: assignment.userId, name });
      } else {
        slots.push(null);
      }
    }
    
    return slots;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && typeof over.id === "string" && over.id.startsWith("slot-")) {
      setDragOverSlotId(over.id);
    } else {
      setDragOverSlotId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverSlotId(null);

    if (!over) {
      return;
    }

    const workerId = active.id as string;
    const overId = over.id as string;

    // Don't allow dropping on the lists
    if (overId === "employees-list" || overId === "subcontractors-list") {
      return;
    }

    // Extract shift ID and slot index from droppable ID (format: "slot-{shiftId}-{slotIndex}")
    if (!overId.startsWith("slot-")) {
      return;
    }

    // Parse slot ID: "slot-{shiftId}-{slotIndex}"
    // CUIDs can contain hyphens, so we need to split from the end
    const withoutPrefix = overId.replace("slot-", "");
    const lastDashIndex = withoutPrefix.lastIndexOf("-");
    
    if (lastDashIndex === -1) {
      return;
    }

    const slotIndex = parseInt(withoutPrefix.substring(lastDashIndex + 1));
    const shiftId = withoutPrefix.substring(0, lastDashIndex);

    if (!shiftId || isNaN(slotIndex)) {
      return;
    }

    // Find the shift
    const shift = shiftsData?.shifts?.find((s: any) => s.id === shiftId);
    if (!shift) {
      return;
    }

    // Check if slot is already filled
    const slots = getAssignedWorkersForShift(shift);
    const slotWorker = slots[slotIndex];
    
    // Check if worker is already assigned to this shift (in a different slot)
    const existingAssignment = shift.shiftAssignments?.find(
      (a: any) => a.userId === workerId
    );
    
    if (slotWorker && slotWorker.id === workerId) {
      // Same worker in same slot - no change needed
      return;
    }
    
    if (slotWorker) {
      // Slot is filled with different worker - replace it
      // First remove the existing worker from this slot
      // Then assign the new worker
    }
    
    if (existingAssignment && !slotWorker) {
      // Worker is assigned to a different slot - move them to this slot
      // For now, just assign (API will handle uniqueness)
    }

    try {
      await assignShift.mutateAsync({
        shiftId: shiftId,
        userId: workerId,
      });
      refetchShifts();
    } catch (error: any) {
      console.error("Failed to assign worker:", error);
    }
  };

  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      // Refetch to ensure latest state
      await refetchShifts();
      // Stay on page (no redirect)
      setIsSaving(false);
    } catch (error) {
      setIsSaving(false);
      console.error("Failed to save progress:", error);
    }
  };

  const activeWorker = activeId
    ? [...employees, ...subcontractors].find((emp: Employee) => emp.id === activeId)
    : null;

  const availabilityMap = new Map(
    availabilityData?.employees?.map((av) => [av.employeeId, av]) || []
  );

  const isLoading = shiftsLoading || employeesLoading || availabilityLoading;

  // Format date header: "3. Januar 2026" (German) or "January 3, 2026" (English)
  const dateHeader = format(selectedDate, locale === "de" ? "d. MMMM yyyy" : "MMMM d, yyyy", { locale: dateLocale });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <section className="space-y-6">
        {/* Header with Date and Save Button */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
            <h1 className="text-3xl font-semibold text-slate-900">{dateHeader}</h1>
          </div>
          <Button
            onClick={handleSaveProgress}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? tCommon("saving") || "Saving..." : t("saveProgress")}
          </Button>
        </div>

        {/* Three Column Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT COLUMN - Objects & Shifts */}
          <div className="lg:col-span-1">
            <h2 className="mb-4 font-semibold text-slate-900">{t("objectsAndShifts") || "Objects & Shifts"}</h2>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : shiftsByObject.size > 0 ? (
              <div className="space-y-4">
                {Array.from(shiftsByObject.entries()).map(([objectId, { object, shifts }]) => (
                  <div key={objectId} className="space-y-2">
                    {shifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <p className="text-sm font-semibold text-slate-900">{object.label}</p>
                        <p className="text-xs text-slate-600">
                          {format(new Date(shift.startTime), "HH:mm", { locale: dateLocale })} –{" "}
                          {format(new Date(shift.endTime), "HH:mm", { locale: dateLocale })}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                <CalendarIcon className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">{t("noShiftsScheduled")}</p>
              </div>
            )}
          </div>

          {/* CENTER COLUMN - Shift Slots */}
          <div className="lg:col-span-1">
            <h2 className="mb-4 font-semibold text-slate-900">{t("shiftSlots") || "Shift Slots"}</h2>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : shiftsData?.shifts && shiftsData.shifts.length > 0 ? (
              <div className="space-y-4">
                {shiftsData.shifts.map((shift: any) => {
                  const slots = getAssignedWorkersForShift(shift);
                  const requiredWorkers = shift.requiredWorkers || 1;
                  
                  return (
                    <div key={shift.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <p className="text-sm font-medium text-slate-900 mb-3">{shift.title}</p>
                      <div className="space-y-2">
                        {Array.from({ length: requiredWorkers }, (_, index) => {
                          const slotId = `slot-${shift.id}-${index}`;
                          const isOver = dragOverSlotId === slotId;
                          return (
                            <DroppableSlot
                              key={index}
                              shiftId={shift.id}
                              slotIndex={index}
                              assignedWorker={slots[index] || null}
                              isOver={isOver}
                              t={t}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-sm text-slate-600">{t("noShiftsScheduled")}</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Assignees */}
          <div className="lg:col-span-1 space-y-6">
            {/* Employees */}
            <div>
              <h2 className="mb-4 font-semibold text-slate-900">{t("employees")}</h2>
              {isLoading ? (
                <div className="grid gap-3 md:grid-cols-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded bg-slate-100" />
                  ))}
                </div>
              ) : employees.length > 0 ? (
                <div
                  id="employees-list"
                  className="space-y-2"
                >
                  {employees.map((employee: Employee) => {
                    const availabilityStatus = availabilityMap.get(employee.id);
                    const hasReachedWeeklyLimit = weeklyHoursByEmployee.get(employee.id) !== undefined;
                    return (
                      <DraggableWorker
                        key={employee.id}
                        worker={employee}
                        availabilityStatus={availabilityStatus}
                        hasReachedWeeklyLimit={hasReachedWeeklyLimit}
                        t={t}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                  <PersonIcon className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-600">{t("noEmployeesAvailable")}</p>
                </div>
              )}
            </div>

            {/* Subcontractors */}
            {subcontractors.length > 0 && (
              <div>
                <h2 className="mb-4 font-semibold text-slate-900 flex items-center gap-2">
                  <RocketIcon className="h-5 w-5" />
                  {t("subcontractors")}
                </h2>
                <div
                  id="subcontractors-list"
                  className="space-y-2"
                >
                  {subcontractors.map((employee: Employee) => {
                    const availabilityStatus = availabilityMap.get(employee.id);
                    return (
                      <DraggableWorker
                        key={employee.id}
                        worker={employee}
                        availabilityStatus={availabilityStatus}
                        hasReachedWeeklyLimit={false}
                        t={t}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <DragOverlay>
        {activeWorker ? (
          <div className="rounded-lg border-2 border-blue-400 bg-blue-50 p-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                {activeWorker.subcontractor ? (
                  <RocketIcon className="h-5 w-5 text-slate-600" />
                ) : (
                  <PersonIcon className="h-5 w-5 text-slate-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {activeWorker.fullName}
                </p>
                <p className="text-xs text-slate-500">{activeWorker.role}</p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
