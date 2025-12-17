"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useShifts, useDeleteShift } from "@/hooks/use-shifts";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Role } from "@/generated/prisma/enums";
import { Pencil1Icon, TrashIcon, CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";

export default function ShiftsPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("shifts");
  const tCommon = useTranslations("common");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data, isLoading, isError } = useShifts({ status: statusFilter || undefined });
  const { user } = useAuth();
  const deleteShift = useDeleteShift();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isAdmin = user?.role === Role.ADMIN;

  const handleDelete = async (id: string) => {
    try {
      await deleteShift.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete shift:", error);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
          <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
        </div>
        <Link href={`/${locale}/shifts/create`}>
          <Button>
            <span className="mr-2">+</span>
            {t("addShift")}
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Button
          variant={statusFilter === "" ? "default" : "outline"}
          onClick={() => setStatusFilter("")}
          size="sm"
        >
          {tCommon("all")}
        </Button>
        <Button
          variant={statusFilter === "PUBLISHED" ? "default" : "outline"}
          onClick={() => setStatusFilter("PUBLISHED")}
          size="sm"
        >
          {t("statusLabels.PUBLISHED")}
        </Button>
        <Button
          variant={statusFilter === "CONFIRMED" ? "default" : "outline"}
          onClick={() => setStatusFilter("CONFIRMED")}
          size="sm"
        >
          {t("statusLabels.CONFIRMED")}
        </Button>
        <Button
          variant={statusFilter === "DRAFT" ? "default" : "outline"}
          onClick={() => setStatusFilter("DRAFT")}
          size="sm"
        >
          {t("statusLabels.DRAFT")}
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {t("failedToLoad")}
        </div>
      )}

      {deleteShift.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {deleteShift.error && typeof deleteShift.error === "object" && "message" in deleteShift.error
            ? (deleteShift.error as any).message
            : t("failedToDelete")}
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {data.shifts?.map((shift) => (
            <div
              key={shift.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <Link href={`/${locale}/shifts/${shift.id}`} className="flex items-center gap-4 flex-1">
                  <div
                    className="h-12 w-1 rounded-full"
                    style={{ backgroundColor: shift.colorTag || "#2563eb" }}
                  />
                  <div>
                    <h3 className="font-semibold text-slate-900">{shift.title}</h3>
                    <p className="text-sm text-slate-500">
                      {format(new Date(shift.startTime), "MMM d, yyyy")} •{" "}
                      {format(new Date(shift.startTime), "h:mm a")} - {format(new Date(shift.endTime), "h:mm a")}
                    </p>
                    {shift.objectLabel && <p className="text-xs text-slate-400">{shift.objectLabel}</p>}
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      shift.status === "CONFIRMED"
                        ? "bg-green-100 text-green-800"
                        : shift.status === "PUBLISHED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {t(`statusLabels.${shift.status}`)}
                  </span>
                  {isAdmin && (
                    <>
                      <Link href={`/${locale}/shifts/${shift.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          title={t("editShift")}
                        >
                          <Pencil1Icon className="h-6 w-6" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        title={t("deleteShift")}
                        onClick={() => setDeleteConfirmId(shift.id)}
                      >
                        <TrashIcon className="h-6 w-6" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {data.shifts?.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-4 text-slate-600">{t("noShifts")}</p>
              <Link href={`/${locale}/shifts/create`}>
                <Button className="mt-4" variant="outline">
                  {t("createFirstShift")}
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t("deleteShift")}</h3>
            <p className="text-sm text-slate-600 mb-4">
              {(() => {
                const shiftToDelete = shifts?.find((s: any) => s.id === deleteConfirmId);
                return shiftToDelete 
                  ? t("deleteConfirmMessage", { title: shiftToDelete.title })
                  : t("deleteConfirmMessage", { title: "this shift" });
              })()}
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleteShift.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {deleteShift.isPending ? tCommon("deleting") : tCommon("delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

