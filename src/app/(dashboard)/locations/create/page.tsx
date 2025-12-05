"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateLocation } from "@/hooks/use-locations";
import { useAuth } from "@/hooks/use-auth";
import { Role } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";

export default function CreateLocationPage() {
  const router = useRouter();
  const createLocation = useCreateLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;

  useEffect(() => {
    if (user && !isAdmin) {
      router.push("/locations");
    }
  }, [user, isAdmin, router]);
  const [formData, setFormData] = useState({
    label: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    try {
      await createLocation.mutateAsync({
        label: formData.label,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        notes: formData.notes || undefined,
      });
      router.push("/locations");
    } catch (error) {
      console.error("Failed to create location:", error);
    }
  };

  if (!isAdmin) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          You do not have permission to create locations. Only administrators can perform this action.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Work Sites</p>
        <h1 className="text-3xl font-semibold text-slate-900">Add Location</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="label" className="block text-sm font-medium text-slate-700">
            Location Name *
          </label>
          <input
            type="text"
            id="label"
            required
            minLength={2}
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-slate-700">
            Street Address
          </label>
          <input
            type="text"
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-slate-700">
              City
            </label>
            <input
              type="text"
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-slate-700">
              State
            </label>
            <input
              type="text"
              id="state"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-slate-700">
            Postal Code
          </label>
          <input
            type="text"
            id="postalCode"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            id="notes"
            rows={4}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={createLocation.isPending}>
            {createLocation.isPending ? "Creating..." : "Create Location"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}

