"use client";

import { DayOfWeek } from "@/generated/prisma/enums";
import { Control, Controller, useWatch } from "react-hook-form";

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

type AvailabilityEditorProps = {
  control: Control<any>;
  errors?: any;
  disabled?: boolean;
};

export function AvailabilityEditor({ control, errors, disabled = false }: AvailabilityEditorProps) {
  const availability = useWatch({ control, name: "availability" });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Availability</h3>
      <div className="space-y-2">
        {dayOrder.map((day, index) => {
          const dayAvailability = availability?.[index];
          const isAvailable = dayAvailability?.start && dayAvailability?.end;
          
          return (
            <div key={day} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="w-24 text-sm font-medium text-slate-700">{dayNames[day]}</div>
              <Controller
                name={`availability.${index}.start`}
                control={control}
                render={({ field }) => (
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Start</label>
                    <input
                      type="time"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      disabled={disabled}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
                      placeholder="HH:mm"
                    />
                  </div>
                )}
              />
              <Controller
                name={`availability.${index}.end`}
                control={control}
                render={({ field }) => (
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">End</label>
                    <input
                      type="time"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      disabled={disabled}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
                      placeholder="HH:mm"
                    />
                  </div>
                )}
              />
              <div className="w-24 text-xs text-slate-500 pt-6 text-center">
                {isAvailable ? (
                  <span className="text-green-600 font-medium">Available</span>
                ) : (
                  <span className="text-slate-400">Unavailable</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {errors?.availability && (
        <p className="text-xs text-rose-600">{errors.availability.message}</p>
      )}
    </div>
  );
}

