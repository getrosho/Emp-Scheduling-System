"use client";

import { useRecurringTemplates } from "@/hooks/use-recurring";
import { Button } from "@/components/ui/button";
import { MixIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";

export default function RecurringPage() {
  const locale = useLocale();
  const t = useTranslations("recurring");
  const tCommon = useTranslations("common");
  const { data, isLoading, isError } = useRecurringTemplates();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
          <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
        </div>
        <Link href={`/${locale}/recurring/create`}>
          <Button>
            <span className="mr-2">+</span>
            {t("createTemplate")}
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-slate-100" />
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
          {data.templates?.map((template) => (
            <div
              key={template.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <MixIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{template.name}</h3>
                    <p className="text-sm text-slate-500">
                      {template.rule} • {template.baseStartTime} - {template.baseEndTime}
                    </p>
                    <p className="text-xs text-slate-400">
                      Starts: {format(new Date(template.startDate), "MMM d, yyyy")}
                      {template.endDate && ` • Ends: ${format(new Date(template.endDate), "MMM d, yyyy")}`}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  {t("generateShifts")}
                </Button>
              </div>
            </div>
          ))}
          {data.templates?.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <MixIcon className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-4 text-slate-600">{t("noTemplates")}</p>
              <Link href={`/${locale}/recurring/create`}>
                <Button className="mt-4" variant="outline">
                  {t("createFirstTemplate")}
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

