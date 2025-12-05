"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useShift, useUpdateShift, useDeleteShift } from "@/hooks/use-shifts";
import { useLocations } from "@/hooks/use-locations";
import { useEmployees } from "@/hooks/use-employees";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Role, ShiftStatus } from "@/generated/prisma/enums";
import { CalendarIcon, Pencil1Icon, TrashIcon, ArrowLeftIcon, ClockIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { format } from "date-fns";
import { toShiftStatus, enumToString } from "@/lib/form-utils";

export default function ShiftDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data, isLoading, isError, error } = useShift(id);
  const { user } = useAuth();
  const { data: locationsData } = useLocations();
  const { data: employeesData } = useEmployees();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const isAdmin = user?.role === Role.ADMIN;

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    locationId: string;
    skillsRequired: string[];
    assignedEmployeeIds: string[];
    colorTag: string;
    status: ShiftStatus;
  }>({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    locationId: "",
    skillsRequired: [],
    assignedEmployeeIds: [],
    colorTag: "#2563eb",
    status: ShiftStatus.DRAFT,
  });
  const [skillInput, setSkillInput] = useState("");

  // Initialize form when data loads
  useEffect(() => {
    if (data?.shift && !isEditing) {
      const shift = data.shift;
      const startDate = new Date(shift.startTime);
      const endDate = new Date(shift.endTime);
      
      setFormData({
        title: shift.title || "",
        description: shift.description || "",
        date: format(startDate, "yyyy-MM-dd"),
        startTime: format(startDate, "HH:mm"),
        endTime: format(endDate, "HH:mm"),
        locationId: shift.locationId || "",
        skillsRequired: shift.skillsRequired || [],
        assignedEmployeeIds: shift.assignedEmployees || [],
        colorTag: shift.colorTag || "#2563eb",
        status: shift.status ? toShiftStatus(shift.status, ShiftStatus.DRAFT) : ShiftStatus.DRAFT,
      });
    }
  }, [data?.shift, isEditing]);

  const employees = employeesData?.employees || [];
  const locations = locationsData?.locations || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      const validEmployeeIds = formData.assignedEmployeeIds.filter(
        (id) => id && id.trim().length > 0
      );

      await updateShift.mutateAsync({
        id,
        data: {
          title: formData.title,
          description: formData.description || undefined,
          date: startDateTime.toISOString(),
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          locationId: formData.locationId || undefined,
          skillsRequired: formData.skillsRequired,
          assignedEmployeeIds: validEmployeeIds,
          colorTag: formData.colorTag,
          status: formData.status,
        },
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update shift:", error);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) return;

    try {
      await deleteShift.mutateAsync(id);
      setDeleteConfirm(false);
      router.push("/shifts");
    } catch (error: any) {
      console.error("Failed to delete shift:", error);
      setDeleteConfirm(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skillsRequired.includes(skillInput.trim())) {
      setFormData({ ...formData, skillsRequired: [...formData.skillsRequired, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skillsRequired: formData.skillsRequired.filter((s) => s !== skill) });
  };

  const toggleEmployee = (employeeId: string) => {
    setFormData({
      ...formData,
      assignedEmployeeIds: formData.assignedEmployeeIds.includes(employeeId)
        ? formData.assignedEmployeeIds.filter((id) => id !== employeeId)
        : [...formData.assignedEmployeeIds, employeeId],
    });
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
        <Link href="/shifts">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="mr-2 h-5 w-5" />
            Back to Shifts
          </Button>
        </Link>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {error instanceof Error ? error.message : typeof error === "string" ? error : "Shift not found"}
        </div>
      </section>
    );
  }

  const shift = data.shift;
  const startDate = new Date(shift.startTime);
  const endDate = new Date(shift.endTime);
  const location = locations.find((loc) => loc.id === shift.locationId);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/shifts">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="mr-2 h-5 w-5" />
              Back
            </Button>
          </Link>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Schedule</p>
            <h1 className="text-3xl font-semibold text-slate-900">{shift.title}</h1>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil1Icon className="mr-2 h-5 w-5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(true)}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <TrashIcon className="mr-2 h-5 w-5" />
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={updateShift.isPending}>
                  {updateShift.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {updateShift.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {updateShift.error && typeof updateShift.error === "object" && "message" in updateShift.error
            ? (updateShift.error as any).message
            : "Failed to update shift. Please try again."}
        </div>
      )}

      {deleteShift.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {deleteShift.error && typeof deleteShift.error === "object" && "message" in deleteShift.error
            ? (deleteShift.error as any).message
            : "Failed to delete shift. Please try again."}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Shift Details</h2>

            {isEditing && isAdmin ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                    Shift Title *
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

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-slate-700">
                      Date *
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
                      Start Time *
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
                      End Time *
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

                <div>
                  <label htmlFor="locationId" className="block text-sm font-medium text-slate-700">
                    Location
                  </label>
                  <select
                    id="locationId"
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">No location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    id="status"
                    value={enumToString(formData.status)}
                    onChange={(e) => setFormData({ ...formData, status: toShiftStatus(e.target.value, ShiftStatus.DRAFT) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value={ShiftStatus.DRAFT}>Draft</option>
                    <option value={ShiftStatus.PUBLISHED}>Published</option>
                    <option value={ShiftStatus.CONFIRMED}>Confirmed</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="colorTag" className="block text-sm font-medium text-slate-700">
                    Color Tag
                  </label>
                  <input
                    id="colorTag"
                    type="color"
                    value={formData.colorTag}
                    onChange={(e) => setFormData({ ...formData, colorTag: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Skills Required</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      placeholder="Add a skill"
                      className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <Button type="button" onClick={addSkill} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skillsRequired.map((skill) => (
                      <span
                        key={skill}
                        className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Employees</label>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {employees.length === 0 ? (
                      <p className="text-sm text-slate-500">No employees available</p>
                    ) : (
                      employees.map((employee) => (
                        <label
                          key={employee.id}
                          className="flex items-center gap-2 rounded p-2 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={formData.assignedEmployeeIds.includes(employee.id)}
                            onChange={() => toggleEmployee(employee.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-900">{employee.fullName}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Title</p>
                  <p className="mt-1 text-slate-900">{shift.title}</p>
                </div>

                {shift.description && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Description</p>
                    <p className="mt-1 text-slate-900 whitespace-pre-wrap">{shift.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Date</p>
                    <p className="mt-1 text-slate-900">{format(startDate, "MMM d, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Start Time</p>
                    <p className="mt-1 text-slate-900">{format(startDate, "h:mm a")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">End Time</p>
                    <p className="mt-1 text-slate-900">{format(endDate, "h:mm a")}</p>
                  </div>
                </div>

                {location && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Location</p>
                    <p className="mt-1 text-slate-900">{location.label}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      shift.status === "CONFIRMED"
                        ? "bg-green-100 text-green-800"
                        : shift.status === "PUBLISHED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {shift.status}
                  </span>
                </div>

                {shift.skillsRequired && shift.skillsRequired.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Skills Required</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {shift.skillsRequired.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {shift.assignedEmployees && shift.assignedEmployees.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Assigned Employees</p>
                    <div className="mt-1 space-y-1">
                      {shift.assignedEmployees.map((employeeId) => {
                        const employee = employees.find((emp) => emp.id === employeeId);
                        return employee ? (
                          <p key={employeeId} className="text-sm text-slate-900">
                            {employee.fullName}
                          </p>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-full"
                style={{ backgroundColor: shift.colorTag || "#2563eb" }}
              />
              <div>
                <p className="text-sm font-medium text-slate-500">Color Tag</p>
                <p className="text-xs text-slate-400">{shift.colorTag || "#2563eb"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-6 w-6 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-500">Duration</p>
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
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Permanently Delete Shift</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to permanently delete "{shift.title}"? This action
              will completely remove the shift from the system and cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteShift.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {deleteShift.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

