"use client";

import { Control, Controller } from "react-hook-form";
import { useLocations } from "@/hooks/use-locations";

type LocationSelectorProps = {
  control: Control<any>;
  allowedLocationIds?: string[]; // For managers - only show these locations
  disabled?: boolean;
  errors?: any;
};

export function LocationSelector({ control, allowedLocationIds, disabled, errors }: LocationSelectorProps) {
  const { data: locationsData } = useLocations();
  
  const locations = locationsData?.locations ?? [];
  const availableLocations = allowedLocationIds
    ? locations.filter((loc) => allowedLocationIds.includes(loc.id))
    : locations;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">Preferred Locations</label>
      {availableLocations.length === 0 ? (
        <p className="text-sm text-slate-500">No locations available</p>
      ) : (
        <Controller
          name="preferredLocationIds"
          control={control}
          render={({ field }) => (
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-3">
              {availableLocations.map((location) => (
                <label
                  key={location.id}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer rounded"
                >
                  <input
                    type="checkbox"
                    checked={field.value?.includes(location.id) || false}
                    onChange={(e) => {
                      const current = field.value || [];
                      if (e.target.checked) {
                        field.onChange([...current, location.id]);
                      } else {
                        field.onChange(current.filter((id: string) => id !== location.id));
                      }
                    }}
                    disabled={disabled}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-slate-700">{location.label}</span>
                </label>
              ))}
            </div>
          )}
        />
      )}
      {errors?.preferredLocationIds && (
        <p className="text-xs text-rose-600">{errors.preferredLocationIds.message}</p>
      )}
    </div>
  );
}

