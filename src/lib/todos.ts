import type { Prisma } from "@prisma/client";

export const TODO_STATUSES = ["open", "in_progress", "on_hold", "done"] as const;
export const TODO_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type TodoStatus = (typeof TODO_STATUSES)[number];
export type TodoPriority = (typeof TODO_PRIORITIES)[number];

export function getTodoVisibilityWhere(userId: number, role: string): Prisma.TodoTaskWhereInput {
  if (role === "admin") return {};

  return {
    OR: [
      { createdById: userId },
      { assignedToId: userId },
      { AND: [{ createdById: null }, { assignedToId: null }] },
    ],
  };
}

export function parseTodoDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function isTodoStatus(value: unknown): value is TodoStatus {
  return typeof value === "string" && TODO_STATUSES.includes(value as TodoStatus);
}

export function isTodoPriority(value: unknown): value is TodoPriority {
  return typeof value === "string" && TODO_PRIORITIES.includes(value as TodoPriority);
}
