"use client";

import { useParams, useRouter } from "next/navigation";
import { useEmployee, useUpdateEmployee } from "@/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { AvailabilityEditor } from "@/components/employees/availability-editor";
import { DayOfWeek } from "@/generated/prisma/enums";
import Link from "next/link";
import { z } from "zod";
import { editEmployeeFormSchema } from "@/lib/validations/employees";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

type AvailabilityFormData = z.infer<typeof editEmployeeFormSchema>;

const dayOrder: DayOfWeek[] = [
  DayOfWeek.MON,
  DayOfWeek.TUE,
  DayOfWeek.WED,
  DayOfWeek.THU,
  DayOfWeek.FRI,
  DayOfWeek.SAT,
  DayOfWeek.SUN,
];

export default function AvailabilityPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data, isLoading, isError, error } = useEmployee(id);
  const updateEmployee = useUpdateEmployee();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map availability from API format to form format
  const availabilityMap = new Map<string, { day: DayOfWeek; start: string | null; end: string | null }>();
  if (data?.employee?.availability) {
    data.employee.availability.forEach((av) => {
      if (av.day) {
        availabilityMap.set(av.day, {
          day: av.day as DayOfWeek,
          start: av.startTime,
          end: av.endTime,
        });
      }
    });
  }

  const {
    control,
    handleSubmit,
    formState: { isDirty },
    reset,
  } = useForm<AvailabilityFormData>({
    resolver: zodResolver(editEmployeeFormSchema),
    defaultValues: {
      availability: dayOrder.map((day) => {
        const av = availabilityMap.get(day);
        return {
          day: day,
          start: av?.start ?? null,
          end: av?.end ?? null,
        };
      }),
    },
  });

  // Reset form when data loads
  useEffect(() => {
    if (data?.employee?.availability) {
      const newMap = new Map<string, { day: DayOfWeek; start: string | null; end: string | null }>();
      data.employee.availability.forEach((av) => {
        if (av.day) {
          newMap.set(av.day, {
            day: av.day as DayOfWeek,
            start: av.startTime,
            end: av.endTime,
          });
        }
      });
      reset({
        availability: dayOrder.map((day) => {
          const av = newMap.get(day);
          return {
            day: day,
            start: av?.start ?? null,
            end: av?.end ?? null,
          };
        }),
      });
    }
  }, [data?.employee?.availability, reset]);

  const onSubmit = async (formData: AvailabilityFormData) => {
    setIsSubmitting(true);
    try {
      // Transform availability to API format (all 7 days)
      const availability = formData.availability.map((av) => ({
        day: av.day,
        start: av.start,
        end: av.end,
      }));

      await updateEmployee.mutateAsync({
        id,
        data: {
          availability: availability,
        },
      });

      router.push(`/employees/${id}`);
    } catch (error: any) {
      console.error("Failed to update availability:", error);
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-3xl font-semibold text-slate-900">
            Manage Availability - {employee.fullName}
          </h1>
        </div>
        <Link href={`/employees/${id}`}>
          <Button variant="outline">Back to Employee</Button>
        </Link>
      </div>

      {/* Error Alert */}
      {updateEmployee.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">Error</p>
          <p className="text-sm">
            {updateEmployee.error && typeof updateEmployee.error === "object" && "message" in updateEmployee.error
              ? (updateEmployee.error as any).message
              : "Failed to update availability. Please try again."}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Weekly Availability</h2>
          <AvailabilityEditor control={control} disabled={isSubmitting || updateEmployee.isPending} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/employees/${id}`}>
            <Button type="button" variant="outline" disabled={isSubmitting || updateEmployee.isPending}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || updateEmployee.isPending || !isDirty}>
            {isSubmitting || updateEmployee.isPending ? "Saving..." : "Save Availability"}
          </Button>
        </div>
      </form>
    </section>
  );
}

