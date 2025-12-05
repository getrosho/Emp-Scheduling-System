"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useLocation, useUpdateLocation, useDeleteLocation } from "@/hooks/use-locations";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Role } from "@/generated/prisma/enums";
import { TargetIcon, Pencil1Icon, TrashIcon, ArrowLeftIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateLocationSchema } from "@/lib/validations";
import { z } from "zod";

type UpdateLocationFormData = z.infer<typeof updateLocationSchema>;

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data, isLoading, isError, error } = useLocation(id);
  const { user } = useAuth();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const isAdmin = user?.role === Role.ADMIN;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<UpdateLocationFormData>({
    resolver: zodResolver(updateLocationSchema),
    defaultValues: {
      label: data?.location?.label || "",
      address: data?.location?.address || "",
      city: data?.location?.city || "",
      state: data?.location?.state || "",
      postalCode: data?.location?.postalCode || "",
      notes: data?.location?.notes || "",
    },
  });

  // Reset form when data loads or when exiting edit mode
  useEffect(() => {
    if (data?.location && !isEditing) {
      reset({
        label: data.location.label || "",
        address: data.location.address || "",
        city: data.location.city || "",
        state: data.location.state || "",
        postalCode: data.location.postalCode || "",
        notes: data.location.notes || "",
      });
    }
  }, [data?.location, isEditing, reset]);

  const onSubmit = async (formData: UpdateLocationFormData) => {
    if (!isAdmin) return;
    
    try {
      await updateLocation.mutateAsync({
        id,
        data: formData,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update location:", error);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    
    try {
      await deleteLocation.mutateAsync(id);
      setDeleteConfirm(false);
      router.push("/locations");
    } catch (error: any) {
      console.error("Failed to delete location:", error);
      setDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  if (isError || !data?.location) {
    return (
      <section className="space-y-6">
        <Link href="/locations">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="mr-2 h-5 w-5" />
            Back to Locations
          </Button>
        </Link>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {error || "Location not found"}
        </div>
      </section>
    );
  }

  const location = data.location;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/locations">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="mr-2 h-5 w-5" />
              Back
            </Button>
          </Link>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Work Site</p>
            <h1 className="text-3xl font-semibold text-slate-900">{location.label}</h1>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil1Icon className="mr-2 h-5 w-5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(true)}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <TrashIcon className="mr-2 h-5 w-5" />
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit(onSubmit)}
                  disabled={updateLocation.isPending || !isDirty}
                >
                  {updateLocation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {updateLocation.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {updateLocation.error && typeof updateLocation.error === "object" && "message" in updateLocation.error
            ? (updateLocation.error as any).message
            : "Failed to update location. Please try again."}
        </div>
      )}

      {deleteLocation.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {deleteLocation.error && typeof deleteLocation.error === "object" && "message" in deleteLocation.error
            ? (deleteLocation.error as any).message
            : "Failed to delete location. Please try again."}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Location Details</h2>
            
            {isEditing && isAdmin ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="label" className="block text-sm font-medium text-slate-700">
                    Location Name *
                  </label>
                  <input
                    id="label"
                    type="text"
                    {...register("label")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  {errors.label && (
                    <p className="mt-1 text-xs text-rose-600">{errors.label.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-slate-700">
                    Address
                  </label>
                  <input
                    id="address"
                    type="text"
                    {...register("address")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  {errors.address && (
                    <p className="mt-1 text-xs text-rose-600">{errors.address.message}</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-slate-700">
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      {...register("city")}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    {errors.city && (
                      <p className="mt-1 text-xs text-rose-600">{errors.city.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-slate-700">
                      State
                    </label>
                    <input
                      id="state"
                      type="text"
                      {...register("state")}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    {errors.state && (
                      <p className="mt-1 text-xs text-rose-600">{errors.state.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-slate-700">
                    Postal Code
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    {...register("postalCode")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  {errors.postalCode && (
                    <p className="mt-1 text-xs text-rose-600">{errors.postalCode.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    {...register("notes")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  {errors.notes && (
                    <p className="mt-1 text-xs text-rose-600">{errors.notes.message}</p>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Location Name</p>
                  <p className="mt-1 text-slate-900">{location.label}</p>
                </div>

                {location.address && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Address</p>
                    <p className="mt-1 text-slate-900">{location.address}</p>
                  </div>
                )}

                {(location.city || location.state) && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">City, State</p>
                    <p className="mt-1 text-slate-900">
                      {[location.city, location.state].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                )}

                {location.postalCode && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Postal Code</p>
                    <p className="mt-1 text-slate-900">{location.postalCode}</p>
                  </div>
                )}

                {location.notes && (
                  <div>
                    <p className="text-sm font-medium text-slate-500">Notes</p>
                    <p className="mt-1 text-slate-900 whitespace-pre-wrap">{location.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <TargetIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Location ID</p>
                <p className="text-xs text-slate-400 font-mono">{location.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Permanently Delete Location</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to permanently delete "{location.label}"? This action
              will completely remove the location from the system and cannot be undone.
              <br />
              <span className="font-medium text-rose-600 mt-1 block">
                If this location has associated shifts, you must remove or reassign them first.
              </span>
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteLocation.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {deleteLocation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

