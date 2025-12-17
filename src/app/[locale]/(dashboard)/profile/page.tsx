"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PersonIcon } from "@radix-ui/react-icons";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const { user } = useAuth();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
        <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <PersonIcon className="h-8 w-8 text-slate-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{user?.name || "User"}</h2>
            <p className="text-sm text-slate-500">{user?.role || "Guest"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {tCommon("name")}
            </label>
            <p className="text-sm text-slate-600">{user?.name || "N/A"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {tCommon("role")}
            </label>
            <p className="text-sm text-slate-600">{user?.role || "N/A"}</p>
          </div>
        </div>

        <div className="mt-6">
          <Button variant="outline">
            {t("editProfile")}
          </Button>
        </div>
      </div>
    </section>
  );
}

