import { ApiResponseError } from "./errors";

export type RequestOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  /** Forward cookie header (useful for SSR) */
  cookie?: string;
  /** Authorization header value, e.g. `Bearer <token>` */
  authToken?: string;
  customHeaders?: Record<string, string>;
  overrideResponseHandler?: <T>(response: Response) => Promise<T>;
};

export type BaseUrlInput =
  | string
  | {
      /** Browser-side base URL (will be used when `window` exists) */
      publicBaseUrl: string;
      /** Server-side base URL (will be used during SSR / Node.js) */
      internalBaseUrl: string;
    }
  | ((ctx: { isServer: boolean }) => string);

const isServerRuntime = (): boolean => typeof window === "undefined";

const normalizeBaseUrl = (raw: string): string => {
  const trimmed = (raw || "").trim();
  if (!trimmed) return trimmed;

  // If user forgets scheme for docker-internal host like `backend-api:2999/api`,
  // add `http://` to make fetch happy.
  if (!trimmed.includes("://") && /^[a-zA-Z0-9.-]+:\d+(\/|$)/.test(trimmed)) {
    return `http://${trimmed}`;
  }

  return trimmed;
};

const resolveBaseUrl = (baseUrl: BaseUrlInput): string => {
  const isServer = isServerRuntime();

  if (typeof baseUrl === "function") {
    return normalizeBaseUrl(baseUrl({ isServer }));
  }

  if (typeof baseUrl === "string") {
    return normalizeBaseUrl(baseUrl);
  }

  // object form
  return normalizeBaseUrl(
    isServer ? baseUrl.internalBaseUrl : baseUrl.publicBaseUrl
  );
};

export const createRequest =
  ({
    baseUrl,
    customHeaders,
  }: {
    baseUrl: BaseUrlInput;
    customHeaders?: Record<string, string>;
  }) =>
  async <ResponseBody>({
    method,
    path,
    query = {},
    body,
    cookie,
    authToken,
    customHeaders: _customHeaders = {},
    overrideResponseHandler,
  }: RequestOptions): Promise<ResponseBody> => {
    const queryString = stringifyQuery(query);

    const headers = new Headers();

    for (const [key, value] of Object.entries({
      ...customHeaders,
      ..._customHeaders,
    })) {
      if (value !== undefined && value !== null) headers.append(key, value);
    }

    // Prefer explicit cookie header when SSR needs to forward cookies.
    if (cookie) {
      headers.set("cookie", cookie);
    }

    // Use Authorization for tokens (typical API usage).
    // If you pass a raw token, it will be used as-is; you can also pass `Bearer xxx`.
    if (authToken) {
      headers.set("authorization", authToken);
    }

    const resolvedBaseUrl = resolveBaseUrl(baseUrl);
    if (!resolvedBaseUrl) {
      throw new Error(
        "createRequest: baseUrl is empty. Provide a valid baseUrl / publicBaseUrl+internalBaseUrl."
      );
    }

    const url = `${resolvedBaseUrl}${path}${queryString ? `?${queryString}` : ""}`;

    const canHaveBody = method !== "GET" && method !== "DELETE";
    let _body: BodyInit | undefined;

    if (canHaveBody && body !== undefined) {
      if (body instanceof FormData) {
        _body = body;
      } else {
        headers.set("Content-Type", "application/json");
        _body = JSON.stringify(body);
      }
    }

    const request = new Request(url, {
      method,
      // In browser this enables cookies; in SSR it won't auto-forward cookies,
      // so use `cookie` option above when you need it.
      credentials: "include",
      headers,
      ...(canHaveBody && _body ? { body: _body } : {}),
    });

    try {
      const response = await fetch(request);

      if (overrideResponseHandler) {
        return overrideResponseHandler<ResponseBody>(response);
      }

      const responseText = await response.text();

      if (!response.ok) {
        // Try to parse error body, but don't crash if it's not JSON
        let message: any = responseText;
        let status: any = response.status;
        try {
          const parsed = responseText ? JSON.parse(responseText) : {};
          message = parsed.message ?? message;
          status = parsed.statusCode ?? status;
        } catch {
          // ignore
        }

        throw new ApiResponseError({
          url,
          message,
          status,
        });
      }

      if (responseText.length) {
        return JSON.parse(responseText);
      }

      return {} as ResponseBody;
    } catch (error) {
      // TODO: log errors to sentry etc
      console.error(error);
      throw error;
    }
  };

export const stringifyQuery = (query: Record<string, unknown>): string => {
  const encodeKeyValue = (
    key: string,
    value: unknown,
    prefix?: string
  ): string => {
    const encodedKey = prefix ? `${prefix}[${key}]` : key;

    if (value === undefined || value === null || value === "") {
      return "";
    }

    if (Array.isArray(value)) {
      return value
        .map((val, index) => encodeKeyValue(index.toString(), val, encodedKey))
        .filter(Boolean) // Remove empty strings
        .join("&");
    }

    if (typeof value === "object" && value !== null) {
      return Object.entries(value)
        .map(([nestedKey, nestedValue]) =>
          encodeKeyValue(nestedKey, nestedValue, encodedKey)
        )
        .filter(Boolean) // Remove empty strings
        .join("&");
    }

    return `${encodeURIComponent(encodedKey)}=${encodeURIComponent(String(value))}`;
  };

  return Object.entries(query)
    .map(([key, value]) => encodeKeyValue(key, value))
    .filter(Boolean) // Remove empty strings
    .join("&");
};
