"use client";

import { useParams, useRouter } from "next/navigation";
import { useEmployee, useUpdateEmployee } from "@/hooks/use-employees";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { EmployeeEditForm } from "@/components/employees/employee-edit-form";
import { Role, DayOfWeek } from "@/generated/prisma/enums";
import Link from "next/link";
import { z } from "zod";
import { editEmployeeFormSchema } from "@/lib/validations/employees";
import { SubmitHandler } from "react-hook-form";

const dayOrder: DayOfWeek[] = [
  DayOfWeek.MON,
  DayOfWeek.TUE,
  DayOfWeek.WED,
  DayOfWeek.THU,
  DayOfWeek.FRI,
  DayOfWeek.SAT,
  DayOfWeek.SUN,
];

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data, isLoading, isError, error } = useEmployee(id);
  const { user } = useAuth();
  const updateEmployee = useUpdateEmployee();

  // Determine RBAC permissions
  const userRole = user?.role || Role.ADMIN;
  const isAdmin = userRole === Role.ADMIN;
  const isManager = userRole === Role.MANAGER;
  
  // TODO: Get manager's allowed object IDs from user profile or session
  // For now, managers can see all objects (this should be restricted)
  const allowedObjectIds = isManager ? undefined : undefined;

  const handleSubmit: SubmitHandler<z.input<typeof editEmployeeFormSchema>> = async (formData) => {
    try {
      // Transform availability from form format (start/end) to API format
      // API expects all 7 days with start/end (nullable)
      const availability = formData.availability.map((av) => ({
        day: av.day,
        start: av.start,
        end: av.end,
      }));

      // Prepare the update payload matching the API contract
      const updatePayload: any = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
        preferredObjectIds: formData.preferredObjectIds,
        weeklyLimitHours: formData.weeklyLimitHours,
        notes: formData.notes || undefined,
        availability: availability, // Always include all 7 days
      };

      // Only include role/status if admin
      if (isAdmin) {
        updatePayload.role = formData.role;
        updatePayload.status = formData.status;
        updatePayload.subcontractor = formData.subcontractor;
      }

      await updateEmployee.mutateAsync({
        id,
        data: updatePayload,
      });

      router.push(`/employees/${id}`);
    } catch (error: any) {
      console.error("Failed to update employee:", error);
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

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Team Management</p>
          <h1 className="text-3xl font-semibold text-slate-900">Edit Employee</h1>
        </div>
        <Link href="/employees">
          <Button variant="outline">Back to Employees</Button>
        </Link>
      </div>

      {/* Error Alert */}
      {updateEmployee.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">Error</p>
          <p className="text-sm">
            {updateEmployee.error && typeof updateEmployee.error === "object" && "message" in updateEmployee.error
              ? (updateEmployee.error as any).message
              : "Failed to update employee. Please try again."}
          </p>
        </div>
      )}

      {/* Form */}
      <EmployeeEditForm
        employee={employee}
        userRole={userRole}
        allowedObjectIds={allowedObjectIds}
        onSubmit={handleSubmit}
        isSubmitting={updateEmployee.isPending}
        errors={updateEmployee.error}
      />
    </section>
  );
}
