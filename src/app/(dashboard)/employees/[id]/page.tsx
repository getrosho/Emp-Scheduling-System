"use client";

import { useParams, useRouter } from "next/navigation";
import { useEmployee, useDeleteEmployee } from "@/hooks/use-employees";
import { Button } from "@/components/ui/button";
import {
  PersonIcon,
  Pencil1Icon,
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  EnvelopeOpenIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { EmployeeRole, EmployeeStatus, DayOfWeek } from "@/generated/prisma/enums";
import { format } from "date-fns";
import { useState } from "react";

const dayNames: Record<DayOfWeek, string> = {
  [DayOfWeek.MON]: "Monday",
  [DayOfWeek.TUE]: "Tuesday",
  [DayOfWeek.WED]: "Wednesday",
  [DayOfWeek.THU]: "Thursday",
  [DayOfWeek.FRI]: "Friday",
  [DayOfWeek.SAT]: "Saturday",
  [DayOfWeek.SUN]: "Sunday",
};

const dayOrder: DayOfWeek[] = [
  DayOfWeek.MON,
  DayOfWeek.TUE,
  DayOfWeek.WED,
  DayOfWeek.THU,
  DayOfWeek.FRI,
  DayOfWeek.SAT,
  DayOfWeek.SUN,
];

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data, isLoading, isError, error } = useEmployee(id);
  const deleteEmployee = useDeleteEmployee();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteEmployee.mutateAsync(id);
      setDeleteConfirm(false);
      router.push("/employees");
    } catch (error: any) {
      console.error("Failed to delete employee:", error);
      setDeleteConfirm(false);
      // Error will be shown via the mutation error state
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-100" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  if (isError || !data?.employee) {
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? (error as any).message
        : "Employee not found";
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">Error</p>
          <p className="text-sm">{errorMessage}</p>
        </div>
        <Link href="/employees">
          <Button variant="outline">Back to Employees</Button>
        </Link>
      </section>
    );
  }

  const employee = data.employee;

  // Map availability by day
  const availabilityMap = new Map<string, NonNullable<typeof employee.availability>[number]>();
  (employee.availability || []).forEach((av) => {
    if (av.day) {
      availabilityMap.set(av.day, av);
    }
  });

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Team Management</p>
          <h1 className="text-3xl font-semibold text-slate-900">
            {employee.fullName}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/employees/${id}/edit`}>
            <Button variant="outline">
              <Pencil1Icon className="mr-2 h-5 w-5" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => setDeleteConfirm(true)}
            className="text-rose-600 hover:text-rose-800"
          >
            <TrashIcon className="mr-2 h-5 w-5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {deleteEmployee.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">Error</p>
          <p className="text-sm">
            {deleteEmployee.error && typeof deleteEmployee.error === "object" && "message" in deleteEmployee.error
              ? (deleteEmployee.error as any).message
              : "Failed to delete employee. Please try again."}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Basic Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-slate-500">Full Name</p>
                <p className="mt-1 text-slate-900">{employee.fullName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Email</p>
                <div className="mt-1 flex items-center gap-2">
                  <EnvelopeOpenIcon className="h-5 w-5 text-slate-400" />
                  <p className="text-slate-900">{employee.email}</p>
                </div>
              </div>
              {employee.phone && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Phone</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-slate-400">📞</span>
                    <p className="text-slate-900">{employee.phone}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-slate-500">Role</p>
                <p className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      employee.role === EmployeeRole.ADMIN
                        ? "bg-purple-100 text-purple-800"
                        : employee.role === EmployeeRole.MANAGER
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {employee.role}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Status</p>
                <p className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      employee.status === EmployeeStatus.ACTIVE
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {employee.status}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Subcontractor</p>
                <p className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      employee.subcontractor
                        ? "bg-orange-100 text-orange-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {employee.subcontractor ? "Yes" : "No"}
                  </span>
                </p>
              </div>
            </div>
            {employee.notes && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500">Notes</p>
                <p className="mt-1 text-slate-900">{employee.notes}</p>
              </div>
            )}
          </div>

          {/* Preferred Objects */}
          {employee.preferredObjects && employee.preferredObjects.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Preferred Objects</h2>
              <div className="flex flex-wrap gap-2">
                {employee.preferredObjects.map((object) => (
                  <span
                    key={object.id}
                    className="rounded bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {object.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Availability Summary */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Availability</h2>
              <Link href={`/employees/${id}/availability`}>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  Manage
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {dayOrder.map((day) => {
                const av = availabilityMap.get(day);
                const isAvailable = av?.startTime && av?.endTime;
                return (
                  <div
                    key={day}
                    className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {dayNames[day]}
                      </p>
                      {isAvailable ? (
                        <p className="text-xs text-slate-500">
                          {av.startTime} - {av.endTime}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">Unavailable</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Weekly Hour Limit */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Weekly Limit</h2>
              <Link href={`/employees/${id}/weekly-limit`}>
                <Button variant="outline" size="sm">
                  <ClockIcon className="mr-2 h-5 w-5" />
                  Edit
                </Button>
              </Link>
            </div>
            {employee.weeklyLimitHours ? (
              <div>
                <p className="text-3xl font-semibold text-slate-900">
                  {employee.weeklyLimitHours}
                </p>
                <p className="text-sm text-slate-500">hours per week</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No limit set</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
            <div className="space-y-2">
              <Link href={`/employees/${id}/edit`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Pencil1Icon className="mr-2 h-5 w-5" />
                  Edit Employee
                </Button>
              </Link>
              <Link href={`/employees/${id}/availability`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  Manage Availability
                </Button>
              </Link>
              <Link href={`/employees/${id}/weekly-limit`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <ClockIcon className="mr-2 h-5 w-5" />
                  Manage Weekly Limit
                </Button>
              </Link>
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Metadata</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-slate-500">Created</p>
                <p className="text-slate-900">
                  {format(new Date(employee.createdAt), "MMMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Last Updated</p>
                <p className="text-slate-900">
                  {format(new Date(employee.updatedAt), "MMMM d, yyyy")}
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
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Permanently Delete Employee</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to permanently delete {employee.fullName}? This action
              will completely remove the employee from the system and cannot be undone.
              <br />
              <span className="font-medium text-rose-600 mt-1 block">
                To temporarily disable this employee, use the status toggle instead.
              </span>
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteEmployee.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {deleteEmployee.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
