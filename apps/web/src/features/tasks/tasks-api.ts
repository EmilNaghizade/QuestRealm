import { apiRequest } from "../../lib/api";

export type Task = {
  id: string;
  title: string;
  kind: "daily" | "once";
  difficulty: "easy" | "medium" | "hard";
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

export async function deleteTask(id: string): Promise<void> {
  await apiRequest<void>(`/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
