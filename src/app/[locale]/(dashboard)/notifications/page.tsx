"use client";

import { useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications";
import { BellIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const { data, isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
        <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {t("failedToLoad")}
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {data.notifications?.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border p-4 shadow-sm ${
                notification.read ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      notification.read ? "bg-slate-100" : "bg-blue-100"
                    }`}
                  >
                    <BellIcon className={`h-5 w-5 ${notification.read ? "text-slate-600" : "text-blue-600"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{notification.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {format(new Date(notification.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {notification.type && (
                      <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {notification.type}
                      </span>
                    )}
                  </div>
                </div>
                {!notification.read && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkRead(notification.id)}
                    disabled={markRead.isPending}
                  >
                    {t("markRead")}
                  </Button>
                )}
              </div>
            </div>
          ))}
          {data.notifications?.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <BellIcon className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-4 text-slate-600">{t("noNotifications")}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

