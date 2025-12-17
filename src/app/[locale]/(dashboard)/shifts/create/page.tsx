"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCreateShift } from "@/hooks/use-shifts";
import { useObjects } from "@/hooks/use-objects";
import { Button } from "@/components/ui/button";
import { RecurringRule } from "@/generated/prisma/enums";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";

export default function CreateShiftPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const t = useTranslations("shifts");
  const tCommon = useTranslations("common");
  const createShift = useCreateShift();
  const { data: objectsData } = useObjects();
  
  // Get objectId and date from query params (from Month Overview click)
  const objectIdParam = searchParams.get("objectId");
  const dateParam = searchParams.get("date");
  
  // Find the object to auto-fill title
  const selectedObject = useMemo(() => {
    if (!objectIdParam || !objectsData?.objects) return null;
    return objectsData.objects.find((obj) => obj.id === objectIdParam);
  }, [objectIdParam, objectsData]);

  const [formData, setFormData] = useState<{
    title: string;
    notes: string; // Optional notes field
    date: string;
    startTime: string;
    endTime: string;
    objectId: string;
    objectLabel: string;
    workerAmountNeeded: number; // Amount of workers needed
    isRecurring: boolean;
    recurringRule: RecurringRule;
  }>({
    title: selectedObject?.label || "", // Auto-fill with Object Name
    notes: "",
    date: dateParam || new Date().toISOString().split("T")[0], // Auto-fill with date from query
    startTime: "09:00",
    endTime: "17:00",
    objectId: objectIdParam || "",
    objectLabel: "",
    workerAmountNeeded: 1, // Default to 1 worker
    isRecurring: false,
    recurringRule: RecurringRule.NONE,
  });

  // Update form when object is found
  useEffect(() => {
    if (selectedObject && !formData.title) {
      setFormData((prev) => ({ ...prev, title: selectedObject.label, objectId: selectedObject.id }));
    }
  }, [selectedObject, formData.title]);

  // Extract error message from mutation error
  const errorMessage = useMemo(() => {
    if (!createShift.error) return null;
    const err = createShift.error as any;
    
    if (err && typeof err === "object") {
      if ("message" in err && err.message) {
        return String(err.message);
      }
      if ("details" in err && err.details) {
        return String(err.details);
      }
    }
    
    if (err?.error?.message) return err.error.message;
    if (err?.response?.data?.error?.message) return err.response.data.error.message;
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.issues && Array.isArray(err.issues)) {
      return err.issues.map((issue: any) => `${issue.path?.join(".") || "field"}: ${issue.message}`).join(", ");
    }
    if (typeof err === "string") return err;
    
    return t("failedToCreate") || "Failed to create shift. Please try again.";
  }, [createShift.error, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      await createShift.mutateAsync({
        title: formData.title,
        description: formData.notes || undefined, // Store notes as description (optional)
        date: startDateTime.toISOString(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        objectId: formData.objectId || undefined,
        objectLabel: formData.objectLabel || undefined,
        skillsRequired: [], // Not shown in form, but required by API
        requiredWorkers: formData.workerAmountNeeded, // Amount of workers needed
        assignedEmployeeIds: [], // No individual assignment at creation - only worker amount
        isRecurring: formData.isRecurring,
        recurringRule: formData.recurringRule,
        colorTag: "#2563eb", // Default color, not shown in form
      });
      
      // Redirect back to Month Overview after creation
      router.push(`/${locale}/dashboard`);
    } catch (error: any) {
      console.error("Shift creation error:", error);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
        <h1 className="text-3xl font-semibold text-slate-900">{t("createShift")}</h1>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">{tCommon("error")}</p>
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {/* Shift Title - Auto-filled with Object Name */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">
            {t("shiftTitle")} *
          </label>
          <input
            type="text"
            id="title"
            required
            minLength={2}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder={t("shiftTitlePlaceholder") || "Shift Title"}
          />
          {selectedObject && (
            <p className="mt-1 text-xs text-slate-500">
              {t("autoFilledFromObject") || "Auto-filled from selected object"}
            </p>
          )}
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
              type="date"
              id="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {dateParam && (
              <p className="mt-1 text-xs text-slate-500">
                {t("autoFilledFromCalendar") || "Auto-filled from calendar"}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-slate-700">
              {t("startTime")} *
            </label>
            <input
              type="time"
              id="startTime"
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
              type="time"
              id="endTime"
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
              onChange={(e) => {
                const selected = objectsData?.objects?.find((obj) => obj.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  objectId: e.target.value,
                  title: selected?.label || formData.title, // Update title when object changes
                });
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">{t("selectObject") || "Select an object"}</option>
              {objectsData?.objects?.map((object) => (
                <option key={object.id} value={object.id}>
                  {object.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="objectLabel" className="block text-sm font-medium text-slate-700">
              {t("orEnterObjectLabel") || "Or Enter Object Label"}
            </label>
            <input
              type="text"
              id="objectLabel"
              value={formData.objectLabel}
              onChange={(e) => setFormData({ ...formData, objectLabel: e.target.value })}
              placeholder={t("objectLabelPlaceholder") || "e.g., Main Office"}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Worker Amount Needed - NEW FIELD */}
        <div>
          <label htmlFor="workerAmountNeeded" className="block text-sm font-medium text-slate-700">
            {t("workerAmountNeeded") || "Amount of Workers Needed"} *
          </label>
          <input
            type="number"
            id="workerAmountNeeded"
            required
            min={1}
            value={formData.workerAmountNeeded}
            onChange={(e) => setFormData({ ...formData, workerAmountNeeded: parseInt(e.target.value) || 1 })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className="mt-1 text-xs text-slate-500">
            {t("workerAmountHint") || "Set the number of workers required for this shift. Individual assignment happens in the Planner."}
          </p>
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
              {t("isRecurring") || "This is a recurring shift"}
            </label>
          </div>

          {formData.isRecurring && (
            <div>
              <label htmlFor="recurringRule" className="block text-sm font-medium text-slate-700">
                {t("recurringRule") || "Recurring Rule"}
              </label>
              <select
                id="recurringRule"
                value={formData.recurringRule}
                onChange={(e) => setFormData({ ...formData, recurringRule: e.target.value as RecurringRule })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value={RecurringRule.NONE}>{t("recurringNone") || "None"}</option>
                <option value={RecurringRule.DAILY}>{t("recurringDaily") || "Daily"}</option>
                <option value={RecurringRule.WEEKLY}>{t("recurringWeekly") || "Weekly"}</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={createShift.isPending}>
            {createShift.isPending ? tCommon("creating") || "Creating..." : t("createShift")}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/dashboard`)}>
            {tCommon("cancel")}
          </Button>
        </div>
      </form>
    </section>
  );
}

