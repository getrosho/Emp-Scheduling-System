"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useShift, useUpdateShift, useDeleteShift } from "@/hooks/use-shifts";
import { useObjects } from "@/hooks/use-objects";
import { useEmployees } from "@/hooks/use-employees";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Role, ShiftStatus, AssignmentStatus } from "@/generated/prisma/enums";
import { CalendarIcon, Pencil1Icon, TrashIcon, ArrowLeftIcon, ClockIcon, PersonIcon, CheckIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { format } from "date-fns";
import { toShiftStatus, enumToString } from "@/lib/form-utils";
import { useLocale, useTranslations } from "next-intl";
import { RecurringRule } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export default function ShiftDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("shifts");
  const tCommon = useTranslations("common");
  const id = params.id as string;
  const { data, isLoading, isError, error } = useShift(id);
  const { user } = useAuth();
  const { data: objectsData } = useObjects();
  const { data: employeesData } = useEmployees();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    notes: string; // Optional notes field
    date: string;
    startTime: string;
    endTime: string;
    objectId: string;
    objectLabel: string;
    workerAmountNeeded: number;
    isRecurring: boolean;
    recurringRule: RecurringRule;
    status: ShiftStatus;
  }>({
    title: "",
    notes: "",
    date: "",
    startTime: "",
    endTime: "",
    objectId: "",
    objectLabel: "",
    workerAmountNeeded: 1,
    isRecurring: false,
    recurringRule: RecurringRule.NONE,
    status: ShiftStatus.DRAFT,
  });

  // Initialize form when data loads
  useEffect(() => {
    if (data?.shift && !isEditing) {
      const shift = data.shift;
      const startDate = new Date(shift.startTime);
      const endDate = new Date(shift.endTime);
      
      setFormData({
        title: shift.title || "",
        notes: shift.description || "", // Store description as notes
        date: format(startDate, "yyyy-MM-dd"),
        startTime: format(startDate, "HH:mm"),
        endTime: format(endDate, "HH:mm"),
        objectId: shift.objectId || "",
        objectLabel: shift.objectLabel || "",
        workerAmountNeeded: (shift as any).requiredWorkers || 1,
        isRecurring: shift.isRecurring || false,
        recurringRule: shift.recurringRule || RecurringRule.NONE,
        status: shift.status ? toShiftStatus(shift.status, ShiftStatus.DRAFT) : ShiftStatus.DRAFT,
      });
    }
  }, [data?.shift, isEditing]);

  const employees = employeesData?.employees || [];
  const objects = objectsData?.objects || [];

  // Get assignment status groups (employees + subcontractors)
  const assignmentStatusGroups = useMemo(() => {
    const pending: Array<{ id: string; userId?: string; subcontractorId?: string; name: string; email?: string; status: string }> = [];
    const confirmed: Array<{ id: string; userId?: string; subcontractorId?: string; name: string; email?: string; status: string }> = [];
    
    // Process employee assignments
    if (data?.shift?.shiftAssignments) {
      const assignments = data.shift.shiftAssignments as Array<{
        id: string;
        userId: string;
        status: string;
        user?: { id: string; name: string; email: string };
      }>;
      
      assignments.forEach((a) => {
        const name = a.user?.name || employees.find((emp) => emp.id === a.userId)?.fullName || "Unknown";
        const email = a.user?.email;
        const item = { id: a.id, userId: a.userId, name, email, status: a.status };
        
        if (a.status === AssignmentStatus.PENDING) {
          pending.push(item);
        } else if (a.status === AssignmentStatus.ACCEPTED) {
          confirmed.push(item);
        }
      });
    }
    
    // Process subcontractor assignments
    if (data?.shift?.subcontractorDemands) {
      const subcontractors = data.shift.subcontractorDemands as Array<{
        id: string;
        subcontractorId: string;
        status: string;
        subcontractor?: { id: string; name: string; email: string };
      }>;
      
      subcontractors.forEach((sub) => {
        const name = sub.subcontractor?.name || "Subcontractor";
        const email = sub.subcontractor?.email;
        const item = { id: sub.id, subcontractorId: sub.subcontractorId, name, email, status: sub.status };
        
        if (sub.status === AssignmentStatus.PENDING) {
          pending.push(item);
        } else if (sub.status === AssignmentStatus.ACCEPTED) {
          confirmed.push(item);
        }
      });
    }
    
    return { pending, confirmed };
  }, [data?.shift?.shiftAssignments, data?.shift?.subcontractorDemands, employees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      await updateShift.mutateAsync({
        id,
        data: {
          title: formData.title,
          description: formData.notes || undefined, // Store notes as description
          date: startDateTime.toISOString(),
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        objectId: formData.objectId || undefined,
        objectLabel: formData.objectLabel || undefined,
        requiredWorkers: formData.workerAmountNeeded,
        skillsRequired: [], // Not shown in form, but required by API
        assignedEmployeeIds: [], // Don't update assignments here - they're managed in planner
        isRecurring: formData.isRecurring,
        recurringRule: formData.recurringRule,
        colorTag: "#2563eb", // Default color, not shown in form
        status: formData.status,
        },
      });
      setIsEditing(false);
      router.push(`/${locale}/dashboard`);
    } catch (error) {
      console.error("Failed to update shift:", error);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) return;

    try {
      await deleteShift.mutateAsync(id);
      setDeleteConfirm(false);
      router.push(`/${locale}/dashboard`);
    } catch (error: any) {
      console.error("Failed to delete shift:", error);
      setDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  if (isError || !data?.shift) {
    return (
      <section className="space-y-6">
        <Link href={`/${locale}/dashboard`}>
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="mr-2 h-5 w-5" />
            {tCommon("back")}
          </Button>
        </Link>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {error instanceof Error ? error.message : typeof error === "string" ? error : t("shiftNotFound") || "Shift not found"}
        </div>
      </section>
    );
  }

  const shift = data.shift;
  const startDate = new Date(shift.startTime);
  const endDate = new Date(shift.endTime);
  const object = objects.find((obj) => obj.id === shift.objectId);
  const requiredWorkers = (shift as any).requiredWorkers || 1;
  const assignedCount = (shift.shiftAssignments || []).length;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/dashboard`}>
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="mr-2 h-5 w-5" />
              {tCommon("back")}
            </Button>
          </Link>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
            <h1 className="text-3xl font-semibold text-slate-900">{isEditing ? t("editShift") : shift.title}</h1>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil1Icon className="mr-2 h-5 w-5" />
                  {tCommon("edit")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(true)}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <TrashIcon className="mr-2 h-5 w-5" />
                  {tCommon("delete")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  {tCommon("cancel")}
                </Button>
                <Button onClick={handleSubmit} disabled={updateShift.isPending}>
                  {updateShift.isPending ? tCommon("saving") : tCommon("save")}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {updateShift.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">{tCommon("error")}</p>
          <p className="text-sm">
            {updateShift.error && typeof updateShift.error === "object" && "message" in updateShift.error
              ? String((updateShift.error as { message: unknown }).message)
              : t("failedToUpdate") || "Failed to update shift. Please try again."}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{isEditing ? t("editShift") : t("shiftDetails")}</h2>

            {isEditing && isAdmin ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Shift Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                    {t("shiftTitle")} *
                  </label>
                  <input
                    id="title"
                    type="text"
                    required
                    minLength={2}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* Notes - Optional multiline text field */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
                    {t("notes") || "Notes"}
                  </label>
                  <textarea
                    id="notes"
                    rows={6}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder={t("notesPlaceholder") || "Enter shift notes..."}
                  />
                </div>

                {/* Date and Times */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-slate-700">
                      {t("date")} *
                    </label>
                    <input
                      id="date"
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-slate-700">
                      {t("startTime")} *
                    </label>
                    <input
                      id="startTime"
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-slate-700">
                      {t("endTime")} *
                    </label>
                    <input
                      id="endTime"
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                {/* Object Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="objectId" className="block text-sm font-medium text-slate-700">
                      {t("object")}
                    </label>
                    <select
                      id="objectId"
                      value={formData.objectId}
                      onChange={(e) => setFormData({ ...formData, objectId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">{t("selectObject")}</option>
                      {objects.map((obj) => (
                        <option key={obj.id} value={obj.id}>
                          {obj.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="objectLabel" className="block text-sm font-medium text-slate-700">
                      {t("orEnterObjectLabel")}
                    </label>
                    <input
                      id="objectLabel"
                      type="text"
                      value={formData.objectLabel}
                      onChange={(e) => setFormData({ ...formData, objectLabel: e.target.value })}
                      placeholder={t("objectLabelPlaceholder")}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                {/* Worker Amount Needed */}
                <div>
                  <label htmlFor="workerAmountNeeded" className="block text-sm font-medium text-slate-700">
                    {t("workerAmountNeeded")} *
                  </label>
                  <input
                    id="workerAmountNeeded"
                    type="number"
                    required
                    min={1}
                    value={formData.workerAmountNeeded}
                    onChange={(e) => setFormData({ ...formData, workerAmountNeeded: parseInt(e.target.value) || 1 })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="mt-1 text-xs text-slate-500">{t("workerAmountHint")}</p>
                </div>

                {/* Recurring Checkbox */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={formData.isRecurring}
                      onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isRecurring" className="text-sm font-medium text-slate-700">
                      {t("isRecurring")}
                    </label>
                  </div>

                  {formData.isRecurring && (
                    <div>
                      <label htmlFor="recurringRule" className="block text-sm font-medium text-slate-700">
                        {t("recurringRule")}
                      </label>
                      <select
                        id="recurringRule"
                        value={formData.recurringRule}
                        onChange={(e) => setFormData({ ...formData, recurringRule: e.target.value as RecurringRule })}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value={RecurringRule.NONE}>{t("recurringNone")}</option>
                        <option value={RecurringRule.DAILY}>{t("recurringDaily")}</option>
                        <option value={RecurringRule.WEEKLY}>{t("recurringWeekly")}</option>
                      </select>
                    </div>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{t("shiftTitle")}</p>
                  <p className="mt-1 text-slate-900">{shift.title}</p>
                </div>

                {shift.description && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">{t("notes")}</p>
                    <p className="mt-1 text-slate-900 whitespace-pre-wrap">{shift.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{t("date")}</p>
                    <p className="mt-1 text-slate-900">{format(startDate, "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">{t("startTime")}</p>
                    <p className="mt-1 text-slate-900">{format(startDate, "h:mm a")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">{t("endTime")}</p>
                    <p className="mt-1 text-slate-900">{format(endDate, "h:mm a")}</p>
                  </div>
                </div>

                {object && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">{t("object")}</p>
                    <p className="mt-1 text-slate-900">{object.label}</p>
                  </div>
                )}

                {/* Worker Amount Display */}
                <div>
                  <p className="text-sm font-medium text-slate-500">{t("workerAmountNeeded")}</p>
                  <p className="mt-1 text-slate-900">
                    {assignedCount} / {requiredWorkers} {t("workersNeeded") || "workers"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Assignment Status Sections - Always visible (view and edit mode) */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("assignmentStatus") || "Assignment Status"}</h2>
            
            {/* Worker Amount Needed */}
            <div className="mb-6 rounded bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">
                {t("workerAmountNeeded")}: <span className={cn(assignedCount >= requiredWorkers ? "text-green-700" : "text-orange-700")}>
                  {assignedCount} / {requiredWorkers}
                </span>
              </p>
            </div>

            {/* Assigned but not confirmed yet */}
            <div className="mb-4">
              <h3 className="mb-3 text-sm font-semibold text-orange-700">
                {t("assignedButNotConfirmed") || "Who has been assigned but not confirmed yet"}
              </h3>
                {assignmentStatusGroups.pending.length > 0 ? (
                  <div className="space-y-2">
                    {assignmentStatusGroups.pending.map((assignment) => {
                      const employee = employees.find((emp) => emp.id === assignment.userId);
                      const name = assignment.user?.name || employee?.fullName || "Unknown";
                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3"
                        >
                          <PersonIcon className="h-5 w-5 text-orange-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{name}</p>
                            {assignment.user?.email && (
                              <p className="text-xs text-slate-500">{assignment.user.email}</p>
                            )}
                          </div>
                          <span className="rounded-full bg-orange-200 px-3 py-1 text-xs font-medium text-orange-800">
                            {t("pending") || "Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">{t("noPendingAssignments") || "No pending assignments"}</p>
                )}
              </div>

              {/* Confirmed the allocation */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-green-700">
                  {t("confirmedAllocation") || "Who has confirmed the allocation"}
                </h3>
                {assignmentStatusGroups.confirmed.length > 0 ? (
                  <div className="space-y-2">
                    {assignmentStatusGroups.confirmed.map((assignment) => {
                      const employee = employees.find((emp) => emp.id === assignment.userId);
                      const name = assignment.user?.name || employee?.fullName || "Unknown";
                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3"
                        >
                          <CheckIcon className="h-5 w-5 text-green-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{name}</p>
                            {assignment.user?.email && (
                              <p className="text-xs text-slate-500">{assignment.user.email}</p>
                            )}
                          </div>
                          <span className="rounded-full bg-green-200 px-3 py-1 text-xs font-medium text-green-800">
                            {t("confirmed") || "Confirmed"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">{t("noConfirmedAssignments") || "No confirmed assignments"}</p>
                )}
              </div>
            </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-6 w-6 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-500">{t("duration") || "Duration"}</p>
                <p className="text-slate-900">
                  {Math.floor((shift.durationMinutes || 0) / 60)}h {(shift.durationMinutes || 0) % 60}m
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t("deleteShift")}</h3>
            <p className="text-sm text-slate-600 mb-4">
              {t("deleteConfirmMessage", { title: shift.title })}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteShift.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {deleteShift.isPending ? tCommon("deleting") || "Deleting..." : tCommon("delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

