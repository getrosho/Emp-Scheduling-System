import { EmployeeRole, EmployeeStatus } from "@/generated/prisma/enums";

export type Employee = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  subcontractor: boolean;
  preferredLocations?: Array<{
    id: string;
    label: string;
    name?: string;
  }>;
  availability?: Array<{
    id: string;
    day: string;
    dayOfWeek: number;
    startTime: string | null;
    endTime: string | null;
    timezone: string;
  }>;
  weeklyLimitHours?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type EmployeeListResponse = {
  success: boolean;
  data: {
    employees: Employee[];
    pagination: Pagination;
  };
  error?: { message: string };
};

export type EmployeeResponse = {
  success: boolean;
  data: {
    employee: Employee;
  };
  error?: { message: string };
};

