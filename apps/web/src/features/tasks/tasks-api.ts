import { apiRequest } from "../../lib/api";
import type { PlayerBalance } from "../auth/auth-api";

export type Task = {
  id: string;
  title: string;
  kind: "daily" | "once";
  difficulty: "easy" | "medium" | "hard";
  isCompleted: boolean;
  canChangeKind: boolean;
  createdAt: string;
};

export type TaskFilters = {
  kind?: Task["kind"];
  difficulty?: Task["difficulty"];
  status?: "active" | "completed";
};

export type CreateTaskInput = Pick<Task, "title" | "kind" | "difficulty">;

export type TasksResponse = {
  data: {
    tasks: Task[];
  };
  meta: {
    nextCursor: string | null;
  };
};

export type TaskCompletion = {
  taskId: string;
  occurrenceKey: string;
  completedAt: string;
  reward: {
    xp: number;
    gold: number;
  };
  balance: PlayerBalance;
};

export function getTasks(
  cursor?: string,
  signal?: AbortSignal,
  filters: TaskFilters = {},
): Promise<TasksResponse> {
  const params = new URLSearchParams();

  if (cursor) {
    params.set("cursor", cursor);
  }

  if (filters.kind) {
    params.set("kind", filters.kind);
  }

  if (filters.difficulty) {
    params.set("difficulty", filters.difficulty);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  const query = params.toString();

  return apiRequest<TasksResponse>(`/tasks${query ? `?${query}` : ""}`, {
    signal,
  });
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const response = await apiRequest<{
    data: {
      task: Task;
    };
  }>("/tasks", {
    method: "POST",
    json: input,
  });

  return response.data.task;
}

export async function completeTask(id: string): Promise<TaskCompletion> {
  const response = await apiRequest<{
    data: TaskCompletion;
  }>(`/tasks/${encodeURIComponent(id)}/complete`, {
    method: "POST",
  });

  return response.data;
}

export async function deleteTask(id: string): Promise<void> {
  await apiRequest<void>(`/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function updateTask(id: string, input: CreateTaskInput): Promise<Task> {
  const response = await apiRequest<{ data: { task: Task } }>(
    `/tasks/${encodeURIComponent(id)}`,
    { method: "PATCH", json: input },
  );
  return response.data.task;
}

export async function deleteAllTasks(): Promise<number> {
  const response = await apiRequest<{ data: { deletedCount: number } }>("/tasks", { method: "DELETE" });
  return response.data.deletedCount;
}
