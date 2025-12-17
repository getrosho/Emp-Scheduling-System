"use client";

import { Control, Controller } from "react-hook-form";
import { useObjects } from "@/hooks/use-objects";

type ObjectSelectorProps = {
  control: Control<any>;
  allowedObjectIds?: string[]; // For managers - only show these objects
  disabled?: boolean;
  errors?: any;
};

export function ObjectSelector({ control, allowedObjectIds, disabled, errors }: ObjectSelectorProps) {
  const { data: objectsData } = useObjects();
  
  const objects = objectsData?.objects ?? [];
  const availableObjects = allowedObjectIds
    ? objects.filter((obj) => allowedObjectIds.includes(obj.id))
    : objects;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">Preferred Objects</label>
      {availableObjects.length === 0 ? (
        <p className="text-sm text-slate-500">No objects available</p>
      ) : (
        <Controller
          name="preferredObjectIds"
          control={control}
          render={({ field }) => (
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-3">
              {availableObjects.map((object) => (
                <label
                  key={object.id}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer rounded"
                >
                  <input
                    type="checkbox"
                    checked={field.value?.includes(object.id) || false}
                    onChange={(e) => {
                      const current = field.value || [];
                      if (e.target.checked) {
                        field.onChange([...current, object.id]);
                      } else {
                        field.onChange(current.filter((id: string) => id !== object.id));
                      }
                    }}
                    disabled={disabled}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-slate-700">{object.label}</span>
                </label>
              ))}
            </div>
          )}
        />
      )}
      {errors?.preferredObjectIds && (
        <p className="text-xs text-rose-600">{errors.preferredObjectIds.message}</p>
      )}
    </div>
  );
}

