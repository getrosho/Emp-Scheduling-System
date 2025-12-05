"use client";

import { Control, Controller } from "react-hook-form";

type SubcontractorToggleProps = {
  control: Control<any>;
  disabled?: boolean;
  errors?: any;
};

export function SubcontractorToggle({ control, disabled, errors }: SubcontractorToggleProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">Subcontractor</label>
      <Controller
        name="subcontractor"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={field.value || false}
                onChange={(e) => field.onChange(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-sm text-slate-700">
                This employee is a subcontractor
              </span>
            </label>
          </div>
        )}
      />
      {errors?.subcontractor && (
        <p className="text-xs text-rose-600">{errors.subcontractor.message}</p>
      )}
    </div>
  );
}

