"use client";

import { useState } from "react";
import { useObjects, useDeleteObject } from "@/hooks/use-objects";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { TargetIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { Role } from "@/generated/prisma/enums";
import Link from "next/link";

export default function ObjectsPage() {
  const { data, isLoading, isError } = useObjects();
  const { user } = useAuth();
  const deleteObject = useDeleteObject();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isAdmin = user?.role === Role.ADMIN;

  const handleDelete = async (id: string) => {
    try {
      await deleteObject.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete object:", error);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">OBJEKTE</p>
          <h1 className="text-3xl font-semibold text-slate-900">Objects</h1>
        </div>
        {isAdmin && (
          <Link href="/objects/create">
            <Button>
              <span className="mr-2">+</span>
              Add Object
            </Button>
          </Link>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          Failed to load objects. Please try again.
        </div>
      )}

      {deleteObject.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {deleteObject.error && typeof deleteObject.error === "object" && "message" in deleteObject.error
            ? (deleteObject.error as any).message
            : "Failed to delete object. Please try again."}
        </div>
      )}

      {data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.objects?.map((object) => (
            <div
              key={object.id}
              className="group relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <Link href={`/objects/${object.id}`} className="block">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <TargetIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{object.label}</h3>
                    {object.address && <p className="mt-1 text-sm text-slate-500 truncate">{object.address}</p>}
                    {object.city && object.state && (
                      <p className="text-xs text-slate-400">
                        {object.city}, {object.state}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
              {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/objects/${object.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      title="Edit Object"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Pencil1Icon className="h-6 w-6" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                    title="Delete Object"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(object.id);
                    }}
                  >
                    <TrashIcon className="h-6 w-6" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          {data.objects?.length === 0 && (
            <div className="col-span-full rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <TargetIcon className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-4 text-slate-600">No objects found</p>
              {isAdmin && (
                <Link href="/objects/create">
                  <Button className="mt-4" variant="outline">
                    Add Your First Object
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Permanently Delete Object</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to permanently delete this object? This action
              will completely remove the object from the system and cannot be undone.
              <br />
              <span className="font-medium text-rose-600 mt-1 block">
                If this object has associated shifts, you must remove or reassign them first.
              </span>
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleteObject.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {deleteObject.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

