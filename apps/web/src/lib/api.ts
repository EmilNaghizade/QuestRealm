const API_BASE_URL = "/api/v1";

type ApiErrorFields = Record<string, string[]>;

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  json?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: ApiErrorFields;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: ApiErrorFields,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFields(value: unknown): ApiErrorFields | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const fields: ApiErrorFields = {};

  for (const [key, messages] of Object.entries(value)) {
    if (
      Array.isArray(messages) &&
      messages.every((message) => typeof message === "string")
    ) {
      fields[key] = messages;
    }
  }

  return Object.keys(fields).length > 0 ? fields : undefined;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("API paths must start with a single slash.");
  }

  const { json, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);

  headers.set("Accept", "application/json");

  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers,
      credentials: "include",
      cache: "no-store",
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Unable to connect. Please check your connection and try again.",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      "INVALID_RESPONSE",
      "The server returned an unexpected response. Please try again.",
    );
  }

  if (!response.ok) {
    const error =
      isRecord(payload) && isRecord(payload.error) ? payload.error : undefined;

    throw new ApiError(
      response.status,
      typeof error?.code === "string" ? error.code : "REQUEST_FAILED",
      typeof error?.message === "string"
        ? error.message
        : "The request could not be completed. Please try again.",
      parseFields(error?.fields),
    );
  }

  if (!isRecord(payload) || !("data" in payload)) {
    throw new ApiError(
      response.status,
      "INVALID_RESPONSE",
      "The server returned an unexpected response. Please try again.",
    );
  }

  return payload as T;
}
