"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateEmployee } from "@/hooks/use-employees";
import { useObjects } from "@/hooks/use-objects";
import { Button } from "@/components/ui/button";
import { createEmployeeSchema } from "@/lib/validations/employees";
import { EmployeeRole, EmployeeStatus, DayOfWeek } from "@/generated/prisma/enums";
import { z } from "zod";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";

// Extended schema for form (includes firstName, lastName, password)
const createStaffFormSchema = createEmployeeSchema.extend({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  temporaryPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
  hourlyRate: z.number().min(0).optional(),
  internalId: z.string().optional(),
  startDate: z.string().optional(), // ISO date string
  // Make role and status required (not optional) for the form
  role: z.nativeEnum(EmployeeRole),
  status: z.nativeEnum(EmployeeStatus),
  subcontractor: z.boolean(),
  preferredObjectIds: z.array(z.string().cuid()),
  // Add staffType to schema
  staffType: z.enum(["employee", "subcontractor"]),
}).omit({ fullName: true, availability: true }); // Remove fullName (will be computed) and availability (employees set their own)

// Infer type directly from schema (no manual extension)
export type CreateStaffFormData = z.infer<typeof createStaffFormSchema>;

export default function CreateStaffPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  
  // Wrap translations in try-catch for build
  let t: any, tCommon: any;
  try {
    t = useTranslations("employees");
    tCommon = useTranslations("common");
  } catch (error) {
    console.error("Translation error:", error);
    t = (key: string) => key;
    tCommon = (key: string) => key;
  }
  const createEmployee = useCreateEmployee();
  const { data: objectsData } = useObjects();

  // Get initial staff type from query params or default to employee
  const initialStaffType = (searchParams.get("type") === "subcontractor" ? "subcontractor" : "employee") as "employee" | "subcontractor";

  const [staffType, setStaffType] = useState<"employee" | "subcontractor">(initialStaffType);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateStaffFormData>({
    resolver: zodResolver(createStaffFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      status: EmployeeStatus.ACTIVE,
      notes: "",
      role: EmployeeRole.EMPLOYEE,
      preferredObjectIds: [],
      weeklyLimitHours: undefined,
      subcontractor: initialStaffType === "subcontractor",
      temporaryPassword: "",
      hourlyRate: undefined,
      internalId: "",
      startDate: "",
      staffType: "employee", // Default to employee
    },
  });

  // Update subcontractor flag and staffType when staff type changes
  const handleStaffTypeChange = (type: "employee" | "subcontractor") => {
    setStaffType(type);
    setValue("subcontractor", type === "subcontractor");
    setValue("staffType", type);
  };

  const selectedObjects = watch("preferredObjectIds") || [];

  const toggleObject = (objectId: string) => {
    const current = selectedObjects || [];
    if (current.includes(objectId)) {
      setValue(
        "preferredObjectIds",
        current.filter((id) => id !== objectId),
      );
    } else {
      setValue("preferredObjectIds", [...current, objectId]);
    }
  };

  const onSubmit: SubmitHandler<CreateStaffFormData> = async (data) => {
    try {
      // Combine firstName and lastName into fullName
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      
      // Create empty availability array (employees set their own availability later)
      const dayOrder = [DayOfWeek.MON, DayOfWeek.TUE, DayOfWeek.WED, DayOfWeek.THU, DayOfWeek.FRI, DayOfWeek.SAT, DayOfWeek.SUN];
      
      await createEmployee.mutateAsync({
        fullName,
        email: data.email,
        phone: data.phone || undefined,
        status: data.status,
        notes: data.notes || undefined,
        role: data.role,
        preferredObjectIds: data.preferredObjectIds,
        weeklyLimitHours: data.weeklyLimitHours,
        subcontractor: data.subcontractor,
        // Provide empty availability array - employees set their own availability later
        availability: dayOrder.map((day) => ({
          day,
          start: null,
          end: null,
        })),
        // Note: temporaryPassword, hourlyRate, internalId, startDate would need API support
      });
      
      // Redirect based on staff type
      if (data.subcontractor) {
        router.push(`/${locale}/subcontractors`);
      } else {
        router.push(`/${locale}/employees`);
      }
    } catch (error: any) {
      console.error("Failed to create staff:", error);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
        <h1 className="text-3xl font-semibold text-slate-900">{t("addNewStaff") || "Add New Staff"}</h1>
      </div>

      {/* Error Alert */}
      {createEmployee.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">{tCommon("error")}</p>
          <p className="text-sm">
            {createEmployee.error && typeof createEmployee.error === "object" && "message" in createEmployee.error
              ? (createEmployee.error as any).message
              : "Failed to create staff"}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {/* STEP 1: Role Selector (FIRST) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            {t("staffType") || "Staff Type"} *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                {...register("staffType")}
                value="employee"
                checked={staffType === "employee"}
                onChange={() => handleStaffTypeChange("employee")}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{t("employee")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                {...register("staffType")}
                value="subcontractor"
                checked={staffType === "subcontractor"}
                onChange={() => handleStaffTypeChange("subcontractor")}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{t("subcontractor")}</span>
            </label>
          </div>
        </div>

        {/* Identity Section */}
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{t("identity") || "Identity"}</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">
                {t("firstName") || "First Name"} *
              </label>
              <input
                type="text"
                id="firstName"
                {...register("firstName")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-rose-600">{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">
                {t("lastName") || "Last Name"} *
              </label>
              <input
                type="text"
                id="lastName"
                {...register("lastName")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-rose-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{t("contact") || "Contact"}</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                {t("email")} *
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
                {t("phone")}
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
        </div>

        {/* Login Details Section */}
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{t("loginDetails") || "Login Details"}</h3>
          <div>
            <label htmlFor="temporaryPassword" className="block text-sm font-medium text-slate-700">
              {t("temporaryPassword") || "Temporary Password"} *
            </label>
            <input
              type="password"
              id="temporaryPassword"
              {...register("temporaryPassword")}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder={t("temporaryPasswordPlaceholder") || "Minimum 6 characters"}
            />
            <p className="mt-1 text-xs text-slate-500">
              {t("temporaryPasswordHint") || "Staff will use this to log in and set their own password"}
            </p>
            {errors.temporaryPassword && (
              <p className="mt-1 text-xs text-rose-600">{errors.temporaryPassword.message}</p>
            )}
          </div>
        </div>

        {/* Administrative Details Section */}
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{t("administrativeDetails") || "Administrative Details"}</h3>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Hourly Rate */}
            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-slate-700">
                {t("hourlyRate") || "Hourly Rate"}
              </label>
              <input
                type="number"
                id="hourlyRate"
                min={0}
                step="0.01"
                {...register("hourlyRate", { valueAsNumber: true })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {errors.hourlyRate && (
                <p className="mt-1 text-xs text-rose-600">{errors.hourlyRate.message}</p>
              )}
            </div>

            {/* Internal ID */}
            <div>
              <label htmlFor="internalId" className="block text-sm font-medium text-slate-700">
                {t("internalId") || "Internal ID"}
              </label>
              <input
                type="text"
                id="internalId"
                {...register("internalId")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {errors.internalId && (
                <p className="mt-1 text-xs text-rose-600">{errors.internalId.message}</p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-slate-700">
                {t("startDate") || "Start Date"}
              </label>
              <input
                type="date"
                id="startDate"
                {...register("startDate")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {errors.startDate && (
                <p className="mt-1 text-xs text-rose-600">{errors.startDate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Role and Status */}
        <div className="border-t border-slate-200 pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700">
                {tCommon("role")} *
              </label>
              <select
                id="role"
                {...register("role")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value={EmployeeRole.EMPLOYEE}>{t("employee")}</option>
                <option value={EmployeeRole.MANAGER}>{t("manager")}</option>
                <option value={EmployeeRole.ADMIN}>{t("admin")}</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-xs text-rose-600">{errors.role.message}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-700">
                {tCommon("status")} *
              </label>
              <select
                id="status"
                {...register("status")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value={EmployeeStatus.ACTIVE}>{t("active")}</option>
                <option value={EmployeeStatus.INACTIVE}>{t("inactive")}</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-xs text-rose-600">{errors.status.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Preferred Objects */}
        <div className="border-t border-slate-200 pt-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t("preferredObjects")}
          </label>
          {objectsData?.objects && objectsData.objects.length > 0 ? (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-3">
              {objectsData.objects.map((object) => (
                <label
                  key={object.id}
                  className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedObjects?.includes(object.id) || false}
                    onChange={() => toggleObject(object.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">{object.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("noObjectsAvailable") || "No objects available"}</p>
          )}
          {errors.preferredObjectIds && (
            <p className="mt-1 text-xs text-rose-600">{errors.preferredObjectIds.message}</p>
          )}
        </div>

        {/* Weekly Limit Hours */}
        <div className="border-t border-slate-200 pt-6">
          <label htmlFor="weeklyLimitHours" className="block text-sm font-medium text-slate-700">
            {t("weeklyLimit")} ({tCommon("hours") || "hours"})
          </label>
          <input
            type="number"
            id="weeklyLimitHours"
            min={0}
            max={168}
            {...register("weeklyLimitHours", { valueAsNumber: true })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className="mt-1 text-xs text-slate-500">{t("weeklyLimitHint") || "Maximum 168 hours (7 days). Leave empty for no limit."}</p>
          {errors.weeklyLimitHours && (
            <p className="mt-1 text-xs text-rose-600">{errors.weeklyLimitHours.message}</p>
          )}
        </div>

        {/* Notes */}
        <div className="border-t border-slate-200 pt-6">
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
            {t("notes")}
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
        <div className="flex gap-4 border-t border-slate-200 pt-6">
          <Button type="submit" disabled={createEmployee.isPending}>
            {createEmployee.isPending ? tCommon("creating") : t("createStaff") || "Create Staff"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {tCommon("cancel")}
          </Button>
        </div>
      </form>
    </section>
  );
}
