"use client";

import { useState } from "react";
import { useEmployees } from "@/hooks/use-employees";
import { useDeleteEmployee } from "@/hooks/use-employees";
import { useObjects } from "@/hooks/use-objects";
import { Button } from "@/components/ui/button";
import { PersonIcon, Pencil1Icon, TrashIcon, CalendarIcon, ClockIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { EmployeeRole, EmployeeStatus } from "@/generated/prisma/enums";
import { useRouter } from "next/navigation";
import type { Employee } from "@/types/employees";

export default function EmployeesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | "">("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "">("");
  const [objectFilter, setObjectFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useEmployees({
    q: searchQuery || undefined,
    role: roleFilter === "" ? undefined : (roleFilter || undefined),
    status: statusFilter === "" ? undefined : (statusFilter || undefined),
    objectId: objectFilter || undefined,
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
      : "Failed to load employees";

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Team Management</p>
          <h1 className="text-3xl font-semibold text-slate-900">Employees</h1>
        </div>
        <Link href="/employees/create">
          <Button>
            <span className="mr-2">+</span>
            Add Employee
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-slate-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Name or email..."
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
              Role
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
              <option value="">All Roles</option>
              <option value={EmployeeRole.EMPLOYEE}>Employee</option>
              <option value={EmployeeRole.MANAGER}>Manager</option>
              <option value={EmployeeRole.ADMIN}>Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">
              Status
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
              <option value="">All Status</option>
              <option value={EmployeeStatus.ACTIVE}>Active</option>
              <option value={EmployeeStatus.INACTIVE}>Inactive</option>
            </select>
          </div>

          {/* Object Filter */}
          <div>
            <label htmlFor="object" className="block text-sm font-medium text-slate-700 mb-1">
              Object
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
              <option value="">All Objects</option>
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
          <p className="font-medium">Error</p>
          <p className="text-sm">{errorMessage}</p>
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
                          Name
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '180px' }}>
                          Email
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
                          Role
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '90px' }}>
                          Status
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '120px' }}>
                          Subcontractor
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '100px' }}>
                          Location(s)
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '110px' }}>
                          Weekly Limit
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-700 whitespace-nowrap" style={{ minWidth: '240px' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {employees.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center">
                            <PersonIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <p className="mt-4 text-slate-600">No employees found</p>
                            <Link href="/employees/create">
                              <Button className="mt-4" variant="outline">
                                Add Your First Employee
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
                          {employee.subcontractor ? "Yes" : "No"}
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
                          <Link href={`/employees/${employee.id}`}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            >
                              View
                            </Button>
                          </Link>
                          <Link href={`/employees/${employee.id}/edit`}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                              title="Edit Employee"
                            >
                              <Pencil1Icon className="h-6 w-6" />
                            </Button>
                          </Link>
                          <Link href={`/employees/${employee.id}/availability`}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-700 transition-colors" 
                              title="Manage Availability"
                            >
                              <CalendarIcon className="h-6 w-6" />
                            </Button>
                          </Link>
                          <Link href={`/employees/${employee.id}/weekly-limit`}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-700 transition-colors" 
                              title="Manage Weekly Limit"
                            >
                              <ClockIcon className="h-6 w-6" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(employee.id)}
                            className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            title="Delete Employee"
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
                        {pagination.total} employees
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                          disabled={page === pagination.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Permanently Delete Employee</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to permanently delete this employee? This action
              will completely remove the employee from the system and cannot be undone.
              <br />
              <span className="font-medium text-rose-600 mt-1 block">
                To temporarily disable this employee, use the status toggle instead.
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
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                disabled={deleteEmployee.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {deleteEmployee.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
