"use client";

import { useState } from "react";
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult,
  DroppableProvided,
  DroppableStateSnapshot,
  DraggableProvided,
  DraggableStateSnapshot,
} from "react-beautiful-dnd";
import { useShifts } from "@/hooks/use-shifts";
import { useEmployees } from "@/hooks/use-employees";
import { useCreateAssignment } from "@/hooks/use-assignments";
import { CalendarIcon, PersonIcon } from "@radix-ui/react-icons";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import type { Employee } from "@/types/employees";

export default function PlannerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: shiftsData, isLoading: shiftsLoading, refetch: refetchShifts } = useShifts({
    from: startOfDay(selectedDate).toISOString(),
    to: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  });
  const { data: employeesData, isLoading: employeesLoading } = useEmployees();
  const createAssignment = useCreateAssignment();
  const [dragError, setDragError] = useState<string | null>(null);

  const handleDragEnd = async (result: DropResult) => {
    setDragError(null);
    
    // If dropped outside a droppable area, do nothing
    if (!result.destination) {
      return;
    }

    // If dropped in the same place, do nothing
    if (result.source.droppableId === result.destination.droppableId && result.source.index === result.destination.index) {
      return;
    }

    // Extract employee ID and shift ID from the drag result
    const employeeId = result.draggableId;
    const shiftId = result.destination.droppableId;

    // Don't allow dropping employees on the employees list
    if (result.destination.droppableId === "employees-list") {
      return;
    }

    // Validate that we have valid IDs (CUIDs start with 'c' or 'C')
    if (!employeeId || !shiftId || !employeeId.match(/^[cC][^\s-]{8,}$/) || !shiftId.match(/^[cC][^\s-]{8,}$/)) {
      setDragError("Invalid employee or shift ID. Please try again.");
      console.error("Invalid IDs:", { employeeId, shiftId });
      return;
    }

    try {
      await createAssignment.mutateAsync({
        type: "EMPLOYEE",
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
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Handle specific error cases
      if (errorMessage.includes("not available")) {
        errorMessage = "This employee is not available for this shift time.";
      } else if (errorMessage.includes("Invalid cuid") || errorMessage.includes("Invalid format")) {
        errorMessage = "Invalid employee or shift data. Please refresh the page and try again.";
      } else if (errorMessage.includes("conflict") || errorMessage.includes("already assigned")) {
        errorMessage = "This employee is already assigned to another shift at this time.";
      }
      
      setDragError(errorMessage);
      console.error("Assignment error:", error);
    }
  };

  // Get assigned employees for each shift
  const employees = employeesData?.employees ?? [];
  const getAssignedEmployees = (shift: any) => {
    return shift.shiftAssignments?.map((assignment: any) => {
      const employee = employees.find((emp: Employee) => emp.id === assignment.userId);
      return {
        id: assignment.userId,
        name: assignment.user?.name || employee?.fullName || "Unknown",
      };
    }) || [];
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd} ignoreContainerClipping={false}>
      <section className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Workforce Planning</p>
          <h1 className="text-3xl font-semibold text-slate-900">Shift Planner</h1>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="rounded-lg border border-slate-300 px-4 py-2"
          />
          <p className="text-sm text-slate-600">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
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
            {shiftsLoading && <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded bg-slate-100" />)}</div>}
            {shiftsData?.shifts && shiftsData.shifts.length > 0 ? (
              <div className="space-y-2">
                {shiftsData.shifts.map((shift) => {
                  const assignedEmployees = getAssignedEmployees(shift);
                  return (
                    <Droppable key={shift.id} droppableId={shift.id} isCombineEnabled={false} isDropDisabled={false}>
                      {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`rounded-lg border-2 p-3 transition-colors ${
                            snapshot.isDraggingOver
                              ? "border-blue-400 bg-blue-50"
                              : "border-slate-200 bg-white"
                          } shadow-sm`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: shift.colorTag || "#2563eb" }}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">{shift.title}</p>
                              <p className="text-xs text-slate-500">
                                {format(new Date(shift.startTime), "h:mm a")} - {format(new Date(shift.endTime), "h:mm a")}
                              </p>
                            </div>
                          </div>
                          
                          {/* Show assigned employees */}
                          {assignedEmployees.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium text-slate-600">Assigned:</p>
                              {assignedEmployees.map((emp: { id: string; name: string }) => (
                                <div key={emp.id} className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1">
                                  <PersonIcon className="h-3 w-3 text-slate-500" />
                                  <p className="text-xs text-slate-700">{emp.name}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Drop zone indicator */}
                          {snapshot.isDraggingOver && (
                            <div className="mt-2 rounded border-2 border-dashed border-blue-300 bg-blue-50 p-2 text-center">
                              <p className="text-xs text-blue-600">Drop employee here</p>
                            </div>
                          )}
                          
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                <CalendarIcon className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">No shifts scheduled</p>
              </div>
            )}
          </div>

          {/* Available Employees */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 font-semibold text-slate-900">Available Employees</h2>
            {employeesLoading && (
              <div className="grid gap-3 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            )}
            {employees.length > 0 ? (
              <Droppable droppableId="employees-list" isCombineEnabled={false} isDropDisabled={true}>
                {(provided: DroppableProvided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="grid gap-3 md:grid-cols-2"
                  >
                    {employees
                      .map((employee: Employee, index: number) => (
                        <Draggable key={employee.id} draggableId={employee.id} index={index}>
                          {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...(provided.draggableProps as any)}
                              {...(provided.dragHandleProps as any)}
                              className={`rounded-lg border-2 p-3 transition-all cursor-grab active:cursor-grabbing ${
                                snapshot.isDragging
                                  ? "border-blue-400 bg-blue-50 shadow-lg"
                                  : "border-slate-200 bg-white shadow-sm hover:shadow-md"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                                  <PersonIcon className="h-5 w-5 text-slate-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-900">
                                    {employee.fullName}
                                  </p>
                                  <p className="text-xs text-slate-500">{employee.role}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                <PersonIcon className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">No employees available</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>Drag & Drop:</strong> Drag employees from the right onto shifts on the left to assign them. The shift will highlight when you drag over it.
          </p>
        </div>
      </section>
    </DragDropContext>
  );
}

