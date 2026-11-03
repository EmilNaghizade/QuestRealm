import { apiRequest } from "./api";

type ReadinessResponse = {
  data: {
    status: "ready";
    database: "connected";
  };
};

export function checkApiReadiness(signal?: AbortSignal) {
  return apiRequest<ReadinessResponse>("/ready", {
    signal,
  });
}
