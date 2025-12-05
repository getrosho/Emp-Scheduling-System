"use client";

import { useForm, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { editEmployeeFormSchema } from "@/lib/validations/employees";
import { EmployeeRole, EmployeeStatus, DayOfWeek } from "@/generated/prisma/enums";
import { Role } from "@/generated/prisma/enums";
import { RoleSelector } from "./role-selector";
import { StatusToggle } from "./status-toggle";
import { LocationSelector } from "./location-selector";
import { WeeklyLimitInput } from "./weekly-limit-input";
import { AvailabilityEditor } from "./availability-editor";
import { SubcontractorToggle } from "./subcontractor-toggle";
import { NotesInput } from "./notes-input";
import { Button } from "@/components/ui/button";
import { z } from "zod";

type EditEmployeeFormData = z.infer<typeof editEmployeeFormSchema>;

type EmployeeEditFormProps = {
  employee: any;
  userRole: Role;
  allowedLocationIds?: string[]; // For managers
  onSubmit: (data: EditEmployeeFormData) => Promise<void>;
  isSubmitting: boolean;
  errors?: any;
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

export function EmployeeEditForm({
  employee,
  userRole,
  allowedLocationIds,
  onSubmit,
  isSubmitting,
  errors: externalErrors,
}: EmployeeEditFormProps) {
  const isAdmin = userRole === Role.ADMIN;
  const isManager = userRole === Role.MANAGER;
  const canEditRole = isAdmin;
  const canEditStatus = isAdmin;
  const canEditSubcontractor = isAdmin;
  const canEditLocations = isAdmin || isManager;

  // Map availability from API format to form format
  const availabilityMap = new Map<number, NonNullable<typeof employee.availability>[number]>();
  const availabilityByDayString = new Map<string, NonNullable<typeof employee.availability>[number]>();
  
  (employee.availability || []).forEach((av: any) => {
    if (av.dayOfWeek !== undefined && av.dayOfWeek !== null) {
      availabilityMap.set(av.dayOfWeek, av);
    }
    if (av.day) {
      availabilityByDayString.set(av.day, av);
    }
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
  } = useForm<EditEmployeeFormData>({
    resolver: zodResolver(editEmployeeFormSchema),
    defaultValues: {
      fullName: employee.fullName || "",
      email: employee.email || "",
      phone: employee.phone || "",
      status: employee.status || EmployeeStatus.ACTIVE,
      notes: employee.notes || "",
      role: employee.role || EmployeeRole.EMPLOYEE,
      preferredLocationIds: employee.preferredLocations?.map((loc: any) => loc.id) || [],
      weeklyLimitHours: employee.weeklyLimitHours,
      subcontractor: employee.subcontractor || false,
      availability: dayOrder.map((day, index) => {
        const dayOfWeekIndex = index === 6 ? 0 : index + 1; // Sunday is 0, Monday is 1
        const av = availabilityMap.get(dayOfWeekIndex) || 
                   availabilityByDayString.get(day) ||
                   null;
        return {
          day,
          start: av?.startTime || null,
          end: av?.endTime || null,
        };
      }),
    },
  });

  const formErrors = externalErrors || errors;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Card 1: Basic Info */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Basic Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              {...register("fullName")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {formErrors.fullName && (
              <p className="mt-1 text-xs text-rose-600">{formErrors.fullName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email *
            </label>
            <input
              type="email"
              id="email"
              {...register("email")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {formErrors.email && (
              <p className="mt-1 text-xs text-rose-600">{formErrors.email.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              {...register("phone")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {formErrors.phone && (
              <p className="mt-1 text-xs text-rose-600">{formErrors.phone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Role & Status (Admin only) */}
      {canEditRole || canEditStatus ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Role & Status</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {canEditRole && <RoleSelector control={control} errors={formErrors} />}
            {canEditStatus && <StatusToggle control={control} errors={formErrors} />}
          </div>
        </div>
      ) : null}

      {/* Card 3: Locations */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Location Assignment</h2>
        <LocationSelector
          control={control}
          allowedLocationIds={canEditLocations ? (isAdmin ? undefined : allowedLocationIds) : []}
          disabled={!canEditLocations}
          errors={formErrors}
        />
      </div>

      {/* Card 4: Weekly Limit */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Weekly Hour Limit</h2>
        <WeeklyLimitInput control={control} errors={formErrors} />
      </div>

      {/* Card 5: Availability */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <AvailabilityEditor control={control} errors={formErrors} />
      </div>

      {/* Card 6: Subcontractor (Admin only) */}
      {canEditSubcontractor && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Subcontractor</h2>
          <SubcontractorToggle control={control} errors={formErrors} />
        </div>
      )}

      {/* Card 7: Notes */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Admin Notes</h2>
        <NotesInput register={register} errors={formErrors} />
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="submit"
          disabled={!isDirty || isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

