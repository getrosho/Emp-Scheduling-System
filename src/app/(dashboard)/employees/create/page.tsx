"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateEmployee } from "@/hooks/use-employees";
import { useLocations } from "@/hooks/use-locations";
import { Button } from "@/components/ui/button";
import { createEmployeeSchema } from "@/lib/validations/employees";
import { EmployeeRole, EmployeeStatus, DayOfWeek } from "@/generated/prisma/enums";
import { z } from "zod";


const dayOrder: DayOfWeek[] = [
  DayOfWeek.MON,
  DayOfWeek.TUE,
  DayOfWeek.WED,
  DayOfWeek.THU,
  DayOfWeek.FRI,
  DayOfWeek.SAT,
  DayOfWeek.SUN,
];

export default function CreateEmployeePage() {
  const router = useRouter();
  const createEmployee = useCreateEmployee();
  const { data: locationsData } = useLocations();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<z.input<typeof createEmployeeSchema>>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      status: EmployeeStatus.ACTIVE,
      notes: "",
      role: EmployeeRole.EMPLOYEE,
      preferredLocationIds: [],
      weeklyLimitHours: undefined,
      subcontractor: false,
      availability: dayOrder.map((day) => ({
        day,
        start: null,
        end: null,
      })),
    },
  });

  const selectedLocations = watch("preferredLocationIds") || [];

  const toggleLocation = (locationId: string) => {
    const current = selectedLocations || [];
    if (current.includes(locationId)) {
      setValue(
        "preferredLocationIds",
        current.filter((id) => id !== locationId),
      );
    } else {
      setValue("preferredLocationIds", [...current, locationId]);
    }
  };

  const onSubmit = async (data: z.output<typeof createEmployeeSchema>) => {
    try {
      await createEmployee.mutateAsync({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || undefined,
        status: data.status,
        notes: data.notes || undefined,
        role: data.role,
        preferredLocationIds: data.preferredLocationIds,
        weeklyLimitHours: data.weeklyLimitHours,
        subcontractor: data.subcontractor,
        availability: data.availability,
      });
      router.push("/employees");
    } catch (error: any) {
      console.error("Failed to create employee:", error);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Team Management</p>
        <h1 className="text-3xl font-semibold text-slate-900">Add Employee</h1>
      </div>

      {/* Error Alert */}
      {createEmployee.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">Error</p>
          <p className="text-sm">
            {createEmployee.error && typeof createEmployee.error === "object" && "message" in createEmployee.error
              ? (createEmployee.error as any).message
              : "Failed to create employee. Please try again."}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {/* Full Name */}
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
          {errors.fullName && (
            <p className="mt-1 text-xs text-rose-600">{errors.fullName.message}</p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Email */}
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
            {errors.email && (
              <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
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
            {errors.phone && (
              <p className="mt-1 text-xs text-rose-600">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-700">
              Role *
            </label>
            <select
              id="role"
              {...register("role")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value={EmployeeRole.EMPLOYEE}>Employee</option>
              <option value={EmployeeRole.MANAGER}>Manager</option>
              <option value={EmployeeRole.ADMIN}>Admin</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-xs text-rose-600">{errors.role.message}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700">
              Status *
            </label>
            <select
              id="status"
              {...register("status")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value={EmployeeStatus.ACTIVE}>Active</option>
              <option value={EmployeeStatus.INACTIVE}>Inactive</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-xs text-rose-600">{errors.status.message}</p>
            )}
          </div>

          {/* Subcontractor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subcontractor
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id="subcontractor"
                {...register("subcontractor")}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">This employee is a subcontractor</span>
            </div>
            {errors.subcontractor && (
              <p className="mt-1 text-xs text-rose-600">{errors.subcontractor.message}</p>
            )}
          </div>
        </div>

        {/* Preferred Locations */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Preferred Locations
          </label>
          {locationsData?.locations && locationsData.locations.length > 0 ? (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-3">
              {locationsData.locations.map((location) => (
                <label
                  key={location.id}
                  className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedLocations?.includes(location.id) || false}
                    onChange={() => toggleLocation(location.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">{location.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No locations available</p>
          )}
          {errors.preferredLocationIds && (
            <p className="mt-1 text-xs text-rose-600">{errors.preferredLocationIds.message}</p>
          )}
        </div>

        {/* Weekly Limit Hours */}
        <div>
          <label htmlFor="weeklyLimitHours" className="block text-sm font-medium text-slate-700">
            Weekly Hour Limit (hours)
          </label>
          <input
            type="number"
            id="weeklyLimitHours"
            min={0}
            max={168}
            {...register("weeklyLimitHours", { valueAsNumber: true })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className="mt-1 text-xs text-slate-500">Maximum 168 hours (7 days). Leave empty for no limit.</p>
          {errors.weeklyLimitHours && (
            <p className="mt-1 text-xs text-rose-600">{errors.weeklyLimitHours.message}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            {...register("notes")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {errors.notes && (
            <p className="mt-1 text-xs text-rose-600">{errors.notes.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={createEmployee.isPending}>
            {createEmployee.isPending ? "Creating..." : "Create Employee"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
