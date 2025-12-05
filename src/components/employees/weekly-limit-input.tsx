"use client";

import { Control, Controller } from "react-hook-form";

type WeeklyLimitInputProps = {
  control: Control<any>;
  disabled?: boolean;
  errors?: any;
};

export function WeeklyLimitInput({ control, disabled, errors }: WeeklyLimitInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="weeklyLimitHours" className="block text-sm font-medium text-slate-700">
        Weekly Hour Limit
      </label>
      <Controller
        name="weeklyLimitHours"
        control={control}
        render={({ field }) => (
          <input
            type="number"
            id="weeklyLimitHours"
            min={0}
            max={168}
            value={field.value ?? ""}
            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={disabled}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
            placeholder="e.g., 40"
          />
        )}
      />
      <p className="text-xs text-slate-500">Maximum 168 hours (7 days). Leave empty for no limit.</p>
      {errors?.weeklyLimitHours && (
        <p className="text-xs text-rose-600">{errors.weeklyLimitHours.message}</p>
      )}
    </div>
  );
}

