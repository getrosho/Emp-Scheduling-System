"use client";

import { UseFormRegister, FieldErrors } from "react-hook-form";

type NotesInputProps = {
  register: UseFormRegister<any>;
  errors?: FieldErrors<any>;
};

export function NotesInput({ register, errors }: NotesInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
        Admin Notes
      </label>
      <textarea
        id="notes"
        rows={4}
        {...register("notes")}
        className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        placeholder="Add notes about this employee..."
      />
      {errors?.notes && (
        <p className="text-xs text-rose-600">
          {typeof errors.notes === "object" && "message" in errors.notes
            ? String(errors.notes.message)
            : typeof errors.notes === "string"
              ? errors.notes
              : "Invalid input"}
        </p>
      )}
    </div>
  );
}

