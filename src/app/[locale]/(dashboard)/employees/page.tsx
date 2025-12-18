"use client";

import { useState } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { useDeleteEmployee } from "@/hooks/use-employees";
import { useObjects } from "@/hooks/use-objects";
import { Button } from "@/components/ui/button";
import { PersonIcon, Pencil1Icon, TrashIcon, CalendarIcon, ClockIcon, TableIcon, ListBulletIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { EmployeeRole, EmployeeStatus } from "@/generated/prisma/enums";
import { useRouter } from "next/navigation";
import type { Employee } from "@/types/employees";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { AvailabilityVisualizationView } from "@/components/employees/availability-visualization-view";

type ViewMode = "list" | "visualization";

export default function EmployeesPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const [viewMode, setViewMode] = useState<ViewMode>("visualization"); // Default: Availability Visualization Mode
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | "">("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "">("");
  const [objectFilter, setObjectFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter to exclude subcontractors (they have their own tab)
  const { data, isLoading, isError, error } = useEmployees({
    q: searchQuery || undefined,
    role: roleFilter === "" ? undefined : (roleFilter || undefined),
    status: statusFilter === "" ? undefined : (statusFilter || undefined),
    objectId: objectFilter || undefined,
    subcontractor: false, // Employees tab shows ONLY employees, not subcontractors
    page,
    limit: 20,
  });

  const { data: objectsData } = useObjects();
  const deleteEmployee = useDeleteEmployee();

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete employee:", error);
    }
  };

  const errorMessage =
    error && typeof error === "object" && "message" in error
      ? (error as any).message
      : t("failedToLoad");

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("subtitle")}</p>
          <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <ListBulletIcon className="h-4 w-4" />
              {t("listView") || "List View"}
            </button>
            <button
              onClick={() => setViewMode("visualization")}
              className={cn(
                "flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "visualization"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <TableIcon className="h-4 w-4" />
              {t("availabilityVisualizationLabel") || "Availability Visualization"}
            </button>
          </div>
          <Link href="/employees/create">
            <Button>
              <span className="mr-2">+</span>
              {t("addNewStaff") || "Add New Staff"}
            </Button>
          </Link>
        </div>
      </div>

      {/* View Mode Content */}
      {viewMode === "visualization" ? (
        <AvailabilityVisualizationView />
      ) : (
        <>
          {/* Filters */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-4">
              {/* Search */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-slate-700 mb-1">
                  {tCommon("search")}
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {/* Role Filter */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">
                  {tCommon("role")}
                </label>
                <select
                  id="role"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as EmployeeRole | "");
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">{t("allRoles")}</option>
                  <option value={EmployeeRole.EMPLOYEE}>{t("employee")}</option>
                  <option value={EmployeeRole.MANAGER}>{t("manager")}</option>
                  <option value={EmployeeRole.ADMIN}>{t("admin")}</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">
                  {tCommon("status")}
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as EmployeeStatus | "");
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">{t("allStatus")}</option>
                  <option value={EmployeeStatus.ACTIVE}>{t("active")}</option>
                  <option value={EmployeeStatus.INACTIVE}>{t("inactive")}</option>
                </select>
              </div>

              {/* Object Filter */}
              <div>
                <label htmlFor="object" className="block text-sm font-medium text-slate-700 mb-1">
                  {t("object")}
                </label>
                <select
                  id="object"
                  value={objectFilter}
                  onChange={(e) => {
                    setObjectFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">{t("allObjects")}</option>
                  {objectsData?.objects?.map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Error State */}
          {isError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
              <p className="font-medium">{tCommon("error")}</p>
              <p className="text-sm">{errorMessage}</p>
              {process.env.NODE_ENV === "development" && (
                <p className="text-xs mt-2 opacity-75">
                  Check browser console and server logs for more details. 
                  Make sure you have ADMIN or MANAGER role to access this page.
                </p>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          )}

          {/* Table */}
          {data && !isLoading && (
              <>
                {(() => {
                  const employees = data?.employees ?? [];
                  const pagination = data?.pagination;
                  return (
                    <>
                      <div className="rounded-lg border border-slate-200 bg-white shadow-sm min-w-0">
                        <div className="w-full overflow-x-auto">
                          <table className="min-w-max border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '160px' }}>
                              {tCommon("name")}
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '180px' }}>
                              {tCommon("email")}
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
                              {tCommon("role")}
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '90px' }}>
                              {tCommon("status")}
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '120px' }}>
                              {t("subcontractor")}
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
                              {t("preferredObjects")}
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '110px' }}>
                              {t("weeklyLimit")}
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '240px' }}>
                              {tCommon("actions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {employees.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-6 py-12 text-center">
                                <PersonIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-4 text-slate-600">{t("noEmployees")}</p>
                                <Link href="/employees/create">
                                  <Button className="mt-4" variant="outline">
                                    {t("createFirstEmployee")}
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          ) : (
                            employees.map((employee: Employee) => (
                              <tr key={employee.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-4" style={{ minWidth: '160px' }}>
                          <div className="flex items-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 flex-shrink-0">
                              <PersonIcon className="h-6 w-6 text-slate-600" />
                            </div>
                            <div className="ml-3 min-w-0 flex-1">
                              <div className="text-sm font-medium text-slate-900 truncate">
                                {employee.fullName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600" style={{ minWidth: '180px' }}>
                          <div className="truncate max-w-[180px]">{employee.email}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4" style={{ minWidth: '100px' }}>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              employee.role === EmployeeRole.ADMIN
                                ? "bg-purple-100 text-purple-800"
                                : employee.role === EmployeeRole.MANAGER
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {employee.role}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4" style={{ minWidth: '90px' }}>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              employee.status === EmployeeStatus.ACTIVE
                                ? "bg-green-100 text-green-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {employee.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4" style={{ minWidth: '120px' }}>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              employee.subcontractor
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {employee.subcontractor ? tCommon("yes") : tCommon("no")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600" style={{ minWidth: '100px' }}>
                          {employee.preferredObjects && employee.preferredObjects.length > 0 ? (
                            <span className="text-slate-900">{employee.preferredObjects.length}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600" style={{ minWidth: '110px' }}>
                          {employee.weeklyLimitHours ? (
                            <span>{employee.weeklyLimitHours} hrs</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium" style={{ minWidth: '240px' }}>
                          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                            <Link href={`/${locale}/employees/${employee.id}`}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-2 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                              >
                                {tCommon("view")}
                              </Button>
                            </Link>
                            <Link href={`/${locale}/employees/${employee.id}/edit`}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                title={t("editEmployee")}
                              >
                                <Pencil1Icon className="h-6 w-6" />
                              </Button>
                            </Link>
                            <Link href={`/${locale}/employees/${employee.id}/availability`}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-700 transition-colors" 
                                title={t("availability")}
                              >
                                <CalendarIcon className="h-6 w-6" />
                              </Button>
                            </Link>
                            <Link href={`/${locale}/employees/${employee.id}/weekly-limit`}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-700 transition-colors" 
                                title={t("weeklyLimit")}
                              >
                                <ClockIcon className="h-6 w-6" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(employee.id)}
                              className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                              title={t("deleteEmployee")}
                            >
                              <TrashIcon className="h-6 w-6" />
                            </Button>
                          </div>
                            </td>
                          </tr>
                        ))
                        )}
                        </tbody>
                      </table>
                      </div>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                          Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                          {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                          {pagination.total} {t("title").toLowerCase()}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            {tCommon("prev")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages}
                          >
                            {tCommon("next")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t("deleteConfirm.title")}</h3>
            <p className="text-sm text-slate-600 mb-4">
              {t("deleteConfirm.message")}
              <br />
              <span className="font-medium text-rose-600 mt-1 block">
                {t("deleteConfirm.warning")}
              </span>
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                disabled={deleteEmployee.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {deleteEmployee.isPending ? tCommon("deleting") : tCommon("delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
