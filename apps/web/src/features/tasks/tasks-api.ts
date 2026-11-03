import { apiRequest } from "../../lib/api";

export type Task = {
  id: string;
  title: string;
  kind: "daily" | "once";
  difficulty: "easy" | "medium" | "hard";
  isCompleted: boolean;
  createdAt: string;
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
  balance: {
    xp: number;
    gold: number;
  };
};

export function getTasks(
  cursor?: string,
  signal?: AbortSignal,
): Promise<TasksResponse> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";

  return apiRequest<TasksResponse>(`/tasks${query}`, {
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
