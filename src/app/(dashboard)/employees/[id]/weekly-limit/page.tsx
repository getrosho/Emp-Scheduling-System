"use client";

import { useParams, useRouter } from "next/navigation";
import { useEmployee, useUpdateEmployee } from "@/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { WeeklyLimitInput } from "@/components/employees/weekly-limit-input";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { weeklyLimitFormSchema } from "@/lib/validations/employees";

export default function WeeklyLimitPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data, isLoading, isError, error } = useEmployee(id);
  const updateEmployee = useUpdateEmployee();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isDirty },
    reset,
  } = useForm<z.input<typeof weeklyLimitFormSchema>>({
    resolver: zodResolver(weeklyLimitFormSchema),
    defaultValues: {
      weeklyLimitHours: data?.employee?.weeklyLimitHours ?? undefined,
    },
  });

  // Reset form when data loads
  useEffect(() => {
    if (data?.employee) {
      reset({
        weeklyLimitHours: data.employee.weeklyLimitHours ?? undefined,
      });
    }
  }, [data?.employee?.weeklyLimitHours, reset]);

  const onSubmit: SubmitHandler<z.input<typeof weeklyLimitFormSchema>> = async (formData) => {
    setIsSubmitting(true);
    try {
      await updateEmployee.mutateAsync({
        id,
        data: {
          weeklyLimitHours: formData.weeklyLimitHours,
        },
      });

      router.push(`/employees/${id}`);
    } catch (error: any) {
      console.error("Failed to update weekly limit:", error);
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
            Manage Weekly Limit - {employee.fullName}
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
              : "Failed to update weekly limit. Please try again."}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Weekly Hour Limit</h2>
          <WeeklyLimitInput control={control} disabled={isSubmitting || updateEmployee.isPending} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/employees/${id}`}>
            <Button type="button" variant="outline" disabled={isSubmitting || updateEmployee.isPending}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || updateEmployee.isPending || !isDirty}>
            {isSubmitting || updateEmployee.isPending ? "Saving..." : "Save Weekly Limit"}
          </Button>
        </div>
      </form>
    </section>
  );
}

