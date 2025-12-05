"use client";

import { Control, Controller } from "react-hook-form";
import { EmployeeStatus } from "@/generated/prisma/enums";

type StatusToggleProps = {
  control: Control<any>;
  disabled?: boolean;
  errors?: any;
};

export function StatusToggle({ control, disabled, errors }: StatusToggleProps) {
  return (
    <div className="space-y-2">
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-slate-700">
          Status *
        </label>
        <p className="text-xs text-slate-500 mt-0.5">
          Temporarily enable or disable this employee. To permanently remove, use the delete action.
        </p>
      </div>
      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <select
            id="status"
            {...field}
            disabled={disabled}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
          >
            <option value={EmployeeStatus.ACTIVE}>Active</option>
            <option value={EmployeeStatus.INACTIVE}>Inactive</option>
          </select>
        )}
      />
      {errors?.status && (
        <p className="text-xs text-rose-600">{errors.status.message}</p>
      )}
    </div>
  );
}

