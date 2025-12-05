/**
 * Type-safe form utilities for handling enum values in form fields
 */

import { RecurringRule, ShiftStatus, EmployeeRole, EmployeeStatus, DayOfWeek } from "@/generated/prisma/enums";

/**
 * Safely converts a string to RecurringRule enum value
 * Returns the default value if the string is not a valid RecurringRule
 */
export function toRecurringRule(value: string, defaultValue: RecurringRule = RecurringRule.WEEKLY): RecurringRule {
  if (Object.values(RecurringRule).includes(value as RecurringRule)) {
    return value as RecurringRule;
  }
  return defaultValue;
}

/**
 * Safely converts a string to ShiftStatus enum value
 * Returns the default value if the string is not a valid ShiftStatus
 */
export function toShiftStatus(value: string | ShiftStatus, defaultValue: ShiftStatus = ShiftStatus.DRAFT): ShiftStatus {
  if (typeof value === "string" && Object.values(ShiftStatus).includes(value as ShiftStatus)) {
    return value as ShiftStatus;
  }
  if (typeof value === "string") {
    return defaultValue;
  }
  return value;
}

/**
 * Safely converts a string to EmployeeRole enum value
 * Returns the default value if the string is not a valid EmployeeRole
 */
export function toEmployeeRole(value: string, defaultValue: EmployeeRole = EmployeeRole.EMPLOYEE): EmployeeRole {
  if (Object.values(EmployeeRole).includes(value as EmployeeRole)) {
    return value as EmployeeRole;
  }
  return defaultValue;
}

/**
 * Safely converts a string to EmployeeStatus enum value
 * Returns the default value if the string is not a valid EmployeeStatus
 */
export function toEmployeeStatus(value: string, defaultValue: EmployeeStatus = EmployeeStatus.ACTIVE): EmployeeStatus {
  if (Object.values(EmployeeStatus).includes(value as EmployeeStatus)) {
    return value as EmployeeStatus;
  }
  return defaultValue;
}

/**
 * Safely converts a string to DayOfWeek enum value
 * Returns null if the string is not a valid DayOfWeek
 */
export function toDayOfWeek(value: string): DayOfWeek | null {
  if (Object.values(DayOfWeek).includes(value as DayOfWeek)) {
    return value as DayOfWeek;
  }
  return null;
}

/**
 * Converts an enum value to a string for use in HTML form fields
 */
export function enumToString<T extends string>(value: T): string {
  return String(value);
}

