"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateRecurringTemplate } from "@/hooks/use-recurring";
import { Button } from "@/components/ui/button";
import { RecurringRule, DayOfWeek } from "@/generated/prisma/enums";

export default function CreateRecurringTemplatePage() {
  const router = useRouter();
  const createTemplate = useCreateRecurringTemplate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rule: RecurringRule.WEEKLY,
    interval: 1,
    byWeekday: [] as DayOfWeek[],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    shiftDuration: 480, // 8 hours in minutes
    baseStartTime: "09:00",
    baseEndTime: "17:00",
    timezone: "UTC",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const durationMinutes = calculateDurationMinutes(formData.baseStartTime, formData.baseEndTime);

      await createTemplate.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        rule: formData.rule,
        interval: formData.interval,
        byWeekday: formData.byWeekday,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        shiftDuration: durationMinutes,
        baseStartTime: formData.baseStartTime,
        baseEndTime: formData.baseEndTime,
        timezone: formData.timezone,
      });
      router.push("/recurring");
    } catch (error) {
      console.error("Failed to create template:", error);
    }
  };

  const calculateDurationMinutes = (start: string, end: string): number => {
    const [startHours, startMinutes] = start.split(":").map(Number);
    const [endHours, endMinutes] = end.split(":").map(Number);
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    return endTotal - startTotal;
  };

  const toggleWeekday = (day: DayOfWeek) => {
    setFormData({
      ...formData,
      byWeekday: formData.byWeekday.includes(day)
        ? formData.byWeekday.filter((d) => d !== day)
        : [...formData.byWeekday, day],
    });
  };

  const weekdays = [
    { value: DayOfWeek.MON, label: "Monday" },
    { value: DayOfWeek.TUE, label: "Tuesday" },
    { value: DayOfWeek.WED, label: "Wednesday" },
    { value: DayOfWeek.THU, label: "Thursday" },
    { value: DayOfWeek.FRI, label: "Friday" },
    { value: DayOfWeek.SAT, label: "Saturday" },
    { value: DayOfWeek.SUN, label: "Sunday" },
  ];

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Automated Scheduling</p>
        <h1 className="text-3xl font-semibold text-slate-900">Create Recurring Template</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Template Name *
          </label>
          <input
            type="text"
            id="name"
            required
            minLength={2}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="rule" className="block text-sm font-medium text-slate-700">
              Recurring Rule *
            </label>
            <select
              id="rule"
              required
              value={formData.rule}
              onChange={(e) => setFormData({ ...formData, rule: e.target.value as RecurringRule })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value={RecurringRule.DAILY}>Daily</option>
              <option value={RecurringRule.EVERY_TWO_DAYS}>Every Two Days</option>
              <option value={RecurringRule.WEEKLY}>Weekly</option>
              <option value={RecurringRule.CUSTOM}>Custom</option>
            </select>
          </div>

          <div>
            <label htmlFor="interval" className="block text-sm font-medium text-slate-700">
              Interval
            </label>
            <input
              type="number"
              id="interval"
              required
              min={1}
              max={30}
              value={formData.interval}
              onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <p className="mt-1 text-xs text-slate-500">Repeat every N occurrences</p>
          </div>
        </div>

        {(formData.rule === RecurringRule.WEEKLY || formData.rule === RecurringRule.CUSTOM) && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Days of Week</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {weekdays.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleWeekday(day.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    formData.byWeekday.includes(day.value)
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-slate-700">
              Start Date *
            </label>
            <input
              type="date"
              id="startDate"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-slate-700">
              End Date (Optional)
            </label>
            <input
              type="date"
              id="endDate"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="baseStartTime" className="block text-sm font-medium text-slate-700">
              Start Time *
            </label>
            <input
              type="time"
              id="baseStartTime"
              required
              value={formData.baseStartTime}
              onChange={(e) => setFormData({ ...formData, baseStartTime: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label htmlFor="baseEndTime" className="block text-sm font-medium text-slate-700">
              End Time *
            </label>
            <input
              type="time"
              id="baseEndTime"
              required
              value={formData.baseEndTime}
              onChange={(e) => setFormData({ ...formData, baseEndTime: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-slate-700">
            Timezone
          </label>
          <select
            id="timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>

        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>Duration:</strong> {Math.floor(calculateDurationMinutes(formData.baseStartTime, formData.baseEndTime) / 60)}h{" "}
            {calculateDurationMinutes(formData.baseStartTime, formData.baseEndTime) % 60}m
          </p>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={createTemplate.isPending}>
            {createTemplate.isPending ? "Creating..." : "Create Template"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}

