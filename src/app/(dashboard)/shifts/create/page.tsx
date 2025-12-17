"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCreateShift } from "@/hooks/use-shifts";
import { useObjects } from "@/hooks/use-objects";
import { useEmployees } from "@/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { RecurringRule } from "@/generated/prisma/enums";
import type { Employee } from "@/types/employees";
import { toRecurringRule, enumToString } from "@/lib/form-utils";

export default function CreateShiftPage() {
  const router = useRouter();
  const createShift = useCreateShift();
  const { data: objectsData } = useObjects();
  const { data: employeesData } = useEmployees();
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    objectId: string;
    objectLabel: string;
    skillsRequired: string[];
    assignedEmployeeIds: string[];
    isRecurring: boolean;
    recurringRule: RecurringRule;
    colorTag: string;
  }>({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    objectId: "",
    objectLabel: "",
    skillsRequired: [],
    assignedEmployeeIds: [],
    isRecurring: false,
    recurringRule: RecurringRule.NONE,
    colorTag: "#2563eb",
  });
  const [skillInput, setSkillInput] = useState("");
  
  // Extract error message from mutation error
  const errorMessage = useMemo(() => {
    if (!createShift.error) return null;
    const err = createShift.error as any;
    
    // Direct property access (works even if non-enumerable)
    if (err && typeof err === "object") {
      // Access message directly - it exists even if not enumerable
      if ("message" in err && err.message) {
        return String(err.message);
      }
      if ("details" in err && err.details) {
        return String(err.details);
      }
    }
    
    // Try other formats
    if (err?.error?.message) return err.error.message;
    if (err?.response?.data?.error?.message) return err.response.data.error.message;
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.issues && Array.isArray(err.issues)) {
      // Zod validation errors
      return err.issues.map((issue: any) => `${issue.path?.join(".") || "field"}: ${issue.message}`).join(", ");
    }
    if (typeof err === "string") return err;
    
    return "Failed to create shift. Please try again.";
  }, [createShift.error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      // Filter out any invalid employee IDs (empty strings, etc.)
      const validEmployeeIds = formData.assignedEmployeeIds.filter(
        (id) => id && id.trim().length > 0 && id.match(/^[cC][^\s-]{8,}$/)
      );

      await createShift.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        date: startDateTime.toISOString(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        objectId: formData.objectId || undefined,
        objectLabel: formData.objectLabel || undefined,
        skillsRequired: formData.skillsRequired,
        assignedEmployeeIds: validEmployeeIds,
        isRecurring: formData.isRecurring,
        recurringRule: formData.recurringRule,
        colorTag: formData.colorTag,
      });
      router.push("/shifts");
    } catch (error: any) {
      // Error is handled by React Query and available in createShift.error
      // Log for debugging with detailed inspection
      console.error("Shift creation error caught:", error);
      console.error("Error type:", typeof error);
      console.error("Error constructor:", error?.constructor?.name);
      
      // Try to get all properties including non-enumerable ones
      if (error && typeof error === "object") {
        const props: string[] = [];
        for (const key in error) {
          props.push(key);
        }
        console.error("Error enumerable keys:", props);
        console.error("Error has message?", "message" in error);
        console.error("Error message value:", error.message);
        
        // Try to inspect the error more deeply
        try {
          const errorCopy = { ...error };
          console.error("Error spread:", errorCopy);
        } catch (e) {
          console.error("Could not spread error:", e);
        }
      }
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

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Schedule Management</p>
        <h1 className="text-3xl font-semibold text-slate-900">Create Shift</h1>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">Error</p>
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">
            Shift Title *
          </label>
          <input
            type="text"
            id="title"
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
              type="date"
              id="date"
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
              End Time *
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="objectId" className="block text-sm font-medium text-slate-700">
              Object
            </label>
            <select
              id="objectId"
              value={formData.objectId}
              onChange={(e) => setFormData({ ...formData, objectId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select an object</option>
              {objectsData?.objects?.map((object) => (
                <option key={object.id} value={object.id}>
                  {object.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="objectLabel" className="block text-sm font-medium text-slate-700">
              Or Enter Object Label
            </label>
            <input
              type="text"
              id="objectLabel"
              value={formData.objectLabel}
              onChange={(e) => setFormData({ ...formData, objectLabel: e.target.value })}
              placeholder="e.g., Main Office"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div>
          <label htmlFor="colorTag" className="block text-sm font-medium text-slate-700">
            Color Tag
          </label>
          <input
            type="color"
            id="colorTag"
            value={formData.colorTag}
            onChange={(e) => setFormData({ ...formData, colorTag: e.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label htmlFor="skills" className="block text-sm font-medium text-slate-700">
            Required Skills
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              id="skills"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Add a skill"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <Button type="button" onClick={addSkill} variant="outline">
              Add
            </Button>
          </div>
          {formData.skillsRequired.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.skillsRequired.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Assign Employees</label>
          {(() => {
            const employees = employeesData?.employees ?? [];
            return employees.length > 0 ? (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-3">
                {employees
                  .map((employee: Employee) => (
                    <label key={employee.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.assignedEmployeeIds.includes(employee.id)}
                        onChange={() => toggleEmployee(employee.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">
                        {employee.fullName}
                      </span>
                    </label>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No employees available</p>
            );
          })()}
        </div>

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
              This is a recurring shift
            </label>
          </div>

          {formData.isRecurring && (
            <div>
              <label htmlFor="recurringRule" className="block text-sm font-medium text-slate-700">
                Recurring Rule
              </label>
              <select
                id="recurringRule"
                value={enumToString(formData.recurringRule)}
                onChange={(e) => {
                  const value = toRecurringRule(e.target.value, RecurringRule.NONE);
                  setFormData({ ...formData, recurringRule: value });
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value={RecurringRule.NONE}>None</option>
                <option value={RecurringRule.DAILY}>Daily</option>
                <option value={RecurringRule.EVERY_TWO_DAYS}>Every Two Days</option>
                <option value={RecurringRule.WEEKLY}>Weekly</option>
                <option value={RecurringRule.CUSTOM}>Custom</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={createShift.isPending}>
            {createShift.isPending ? "Creating..." : "Create Shift"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}

