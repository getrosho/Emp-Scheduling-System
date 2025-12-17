"use client";

import { useState } from "react";
import { usePendingShifts } from "@/hooks/use-pending-shifts";
import { useConfirmShift, useDeclineShift } from "@/hooks/use-shift-confirmation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { CalendarIcon, ClockIcon, TargetIcon, PersonIcon, CheckIcon, ChevronRightIcon, MapPinIcon, FileTextIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

export default function PendingShiftsPage() {
  const locale = useLocale();
  const t = useTranslations("confirmation");
  const tCommon = useTranslations("common");
  const tShifts = useTranslations("shifts");
  const { user } = useAuth();
  
  const { data, isLoading, isError } = usePendingShifts(user?.role);
  const confirmShift = useConfirmShift();
  const declineShift = useDeclineShift();
  const [declineReason, setDeclineReason] = useState<Record<string, string>>({});
  const [showDeclineModal, setShowDeclineModal] = useState<string | null>(null);
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);

  const dateLocale = locale === "de" ? de : enUS;
  const pendingShifts = data?.shifts || [];

  const handleConfirm = async (shiftId: string) => {
    try {
      await confirmShift.mutateAsync({ shiftId });
      // Shift will turn green after confirmation
    } catch (error) {
      console.error("Failed to confirm shift:", error);
    }
  };

  const handleDecline = async (shiftId: string) => {
    const reason = declineReason[shiftId]?.trim();
    if (!reason) {
      alert(t("reasonRequired") || "Please provide a reason for declining");
      return;
    }

    try {
      await declineShift.mutateAsync({ shiftId, reason });
      setShowDeclineModal(null);
      setDeclineReason((prev) => {
        const next = { ...prev };
        delete next[shiftId];
        return next;
      });
    } catch (error) {
      console.error("Failed to decline shift:", error);
    }
  };

  const toggleShiftDetails = (shiftId: string) => {
    setExpandedShiftId(expandedShiftId === shiftId ? null : shiftId);
  };

  if (isLoading) {
    return (
      <section className="space-y-6 p-4 md:p-6">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-100" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="space-y-6 p-4 md:p-6">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-medium">{tCommon("error")}</p>
          <p className="text-sm">{t("failedToLoad") || "Failed to load pending shifts"}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 p-4 md:space-y-6 md:p-6">
      {/* Header - Mobile Friendly */}
      <div>
        <p className="text-xs md:text-sm uppercase tracking-[0.3em] text-slate-400">{t("title")}</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">{t("pendingShifts") || "Geplante Schichten"}</h1>
      </div>

      {/* Success/Error Messages */}
      {confirmShift.isSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <p className="text-sm">{t("confirmedSuccess")}</p>
        </div>
      )}

      {confirmShift.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="text-sm">{t("failedToConfirm")}</p>
        </div>
      )}

      {declineShift.isSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <p className="text-sm">{t("declinedSuccess")}</p>
        </div>
      )}

      {declineShift.isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="text-sm">{t("failedToDecline")}</p>
        </div>
      )}

      {/* Pending Shifts List - Mobile Optimized */}
      {pendingShifts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">{t("noPendingShifts") || "No pending shifts"}</p>
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {pendingShifts.map((shift) => {
            const isExpanded = expandedShiftId === shift.id;
            const isPending = confirmShift.isPending || declineShift.isPending;
            
            return (
              <div
                key={shift.id}
                className={cn(
                  "rounded-lg border-2 bg-white shadow-sm transition-all",
                  isExpanded
                    ? "border-orange-300 shadow-md"
                    : "border-orange-200 hover:border-orange-300"
                )}
              >
                {/* Shift Card - Clickable to expand */}
                <div
                  className="p-4 md:p-6 cursor-pointer"
                  onClick={() => toggleShiftDetails(shift.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">{shift.title}</h3>
                      
                      <div className="space-y-1.5 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                          <span>{format(new Date(shift.date), "EEEE, MMMM d, yyyy", { locale: dateLocale })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 flex-shrink-0" />
                          <span>
                            {format(new Date(shift.startTime), "HH:mm", { locale: dateLocale })} -{" "}
                            {format(new Date(shift.endTime), "HH:mm", { locale: dateLocale })}
                          </span>
                        </div>
                        {(shift.object || shift.objectLabel) && (
                          <div className="flex items-center gap-2">
                            <TargetIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{shift.object?.label || shift.objectLabel}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow Icon */}
                    <ChevronRightIcon
                      className={cn(
                        "h-5 w-5 text-slate-400 flex-shrink-0 transition-transform",
                        isExpanded && "transform rotate-90"
                      )}
                    />
                  </div>
                </div>

                {/* Shift Details - Expandable */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 md:p-6 space-y-4 bg-slate-50">
                    {/* Object Details */}
                    {shift.object && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <MapPinIcon className="h-4 w-4" />
                          {t("objectDetails") || "Object Details"}
                        </h4>
                        <div className="pl-6 space-y-1 text-sm text-slate-600">
                          <p className="font-medium text-slate-900">{shift.object.label}</p>
                          {shift.object.address && (
                            <p>{shift.object.address}</p>
                          )}
                          {(shift.object.city || shift.object.state || shift.object.postalCode) && (
                            <p>
                              {[shift.object.city, shift.object.state, shift.object.postalCode]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                          {shift.object.notes && (
                            <div className="flex items-start gap-2 mt-2">
                              <FileTextIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-slate-500">{shift.object.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Shift Notes/Description */}
                    {shift.description && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700">{tShifts("notes") || "Notes"}</h4>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap pl-4">{shift.description}</p>
                      </div>
                    )}

                    {/* Co-Workers */}
                    {shift.coWorkers && shift.coWorkers.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <PersonIcon className="h-4 w-4" />
                          {t("coWorkers") || "People working with you in the same shift"}
                        </h4>
                        <div className="pl-6 space-y-2">
                          {shift.coWorkers.map((coWorker) => (
                            <div
                              key={coWorker.id}
                              className="flex items-center gap-2 text-sm text-slate-700"
                            >
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <PersonIcon className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{coWorker.name}</p>
                                {coWorker.email && (
                                  <p className="text-xs text-slate-500">{coWorker.email}</p>
                                )}
                              </div>
                              {coWorker.status === "ACCEPTED" && (
                                <CheckIcon className="h-4 w-4 text-green-600" title={t("confirmed")} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!shift.coWorkers || shift.coWorkers.length === 0) && (
                      <div className="text-sm text-slate-500 italic pl-4">
                        {t("noCoWorkers") || "No other employees assigned to this shift yet"}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-200">
                      {/* Confirm Button - Highlighted Area */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirm(shift.id);
                        }}
                        disabled={isPending}
                        className={cn(
                          "flex-1 rounded-lg px-4 py-3 font-medium text-white transition-all",
                          "bg-green-600 hover:bg-green-700 active:bg-green-800",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "shadow-md hover:shadow-lg",
                          "flex items-center justify-center gap-2"
                        )}
                      >
                        <CheckIcon className="h-5 w-5" />
                        {confirmShift.isPending ? tCommon("loading") : t("confirmShift")}
                      </button>
                      
                      {/* Decline Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeclineModal(shift.id);
                        }}
                        disabled={isPending}
                        className={cn(
                          "flex-1 rounded-lg px-4 py-3 font-medium transition-all",
                          "border-2 border-red-300 text-red-600 hover:bg-red-50 active:bg-red-100",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        {t("declineShift")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Decline Modal */}
                {showDeclineModal === shift.id && (
                  <div className="border-t border-slate-200 p-4 md:p-6 bg-slate-50">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t("declineReason") || "Reason for declining"}
                    </label>
                    <textarea
                      value={declineReason[shift.id] || ""}
                      onChange={(e) =>
                        setDeclineReason((prev) => ({
                          ...prev,
                          [shift.id]: e.target.value,
                        }))
                      }
                      placeholder={t("declineReasonPlaceholder") || "Please provide a reason..."}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      rows={3}
                    />
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDecline(shift.id);
                        }}
                        disabled={!declineReason[shift.id]?.trim() || declineShift.isPending}
                        className="bg-red-600 hover:bg-red-700 flex-1"
                      >
                        {declineShift.isPending ? tCommon("loading") : t("submitDecline") || "Submit"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeclineModal(null);
                          setDeclineReason((prev) => {
                            const next = { ...prev };
                            delete next[shift.id];
                            return next;
                          });
                        }}
                        className="flex-1"
                      >
                        {tCommon("cancel")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
