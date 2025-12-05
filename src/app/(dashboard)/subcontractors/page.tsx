"use client";

import { useEmployees } from "@/hooks/use-employees";
import { RocketIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Employee } from "@/types/employees";

export default function SubcontractorsPage() {
  const { data, isLoading, isError } = useEmployees({ subcontractor: true });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">External Workforce</p>
          <h1 className="text-3xl font-semibold text-slate-900">Subcontractors</h1>
        </div>
        <Link href="/employees/create?role=SUBCONTRACTOR">
          <Button>
            <span className="mr-2">+</span>
            Add Subcontractor
          </Button>
        </Link>
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
          Failed to load subcontractors. Please try again.
        </div>
      )}

      {data && (
        <>
          {data.employees && data.employees.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <RocketIcon className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-4 text-slate-600">No subcontractors found</p>
              <Link href="/employees/create?role=SUBCONTRACTOR">
                <Button className="mt-4" variant="outline">
                  Add Your First Subcontractor
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.employees?.map((subcontractor: Employee) => (
                <div
                  key={subcontractor.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                      <RocketIcon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{subcontractor.fullName}</h3>
                      <p className="text-sm text-slate-500">{subcontractor.email}</p>
                      {subcontractor.phone && <p className="text-xs text-slate-400">{subcontractor.phone}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
