"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateObject } from "@/hooks/use-objects";
import { useAuth } from "@/hooks/use-auth";
import { Role } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";

export default function CreateObjectPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("objects");
  const tCommon = useTranslations("common");
  const createObject = useCreateObject();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;

  useEffect(() => {
    if (user && !isAdmin) {
      router.push(`/${locale}/objects`);
    }
  }, [user, isAdmin, router, locale]);
  
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
      await createObject.mutateAsync({
        label: formData.label,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        notes: formData.notes || undefined,
      });
      router.push(`/${locale}/objects`);
    } catch (error) {
      console.error("Failed to create object:", error);
    }
  };

  if (!isAdmin) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {t("permissionDenied")}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
        <h1 className="text-3xl font-semibold text-slate-900">{t("add")}</h1>
      </div>

      {createObject.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">{tCommon("error")}</p>
          <p className="text-sm">
            {createObject.error && typeof createObject.error === "object" && "message" in createObject.error
              ? (createObject.error as any).message
              : t("failedToCreate")}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="label" className="block text-sm font-medium text-slate-700">
            {t("objectName")} *
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
            {t("streetAddress")}
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
              {t("city")}
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
              {t("state")}
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
            {t("postalCode")}
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
            {t("notes")}
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
          <Button type="submit" disabled={createObject.isPending}>
            {createObject.isPending ? tCommon("creating") : t("createObject")}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {tCommon("cancel")}
          </Button>
        </div>
      </form>
    </section>
  );
}

