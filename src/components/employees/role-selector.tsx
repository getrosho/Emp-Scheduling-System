"use client";

import { Control, Controller } from "react-hook-form";
import { EmployeeRole } from "@/generated/prisma/enums";

type RoleSelectorProps = {
  control: Control<any>;
  disabled?: boolean;
  errors?: any;
};

export function RoleSelector({ control, disabled, errors }: RoleSelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="role" className="block text-sm font-medium text-slate-700">
        Role *
      </label>
      <Controller
        name="role"
        control={control}
        render={({ field }) => (
          <select
            id="role"
            {...field}
            disabled={disabled}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
          >
            <option value={EmployeeRole.EMPLOYEE}>Employee</option>
            <option value={EmployeeRole.MANAGER}>Manager</option>
            <option value={EmployeeRole.ADMIN}>Admin</option>
          </select>
        )}
      />
      {errors?.role && (
        <p className="text-xs text-rose-600">{errors.role.message}</p>
      )}
    </div>
  );
}

