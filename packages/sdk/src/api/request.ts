import { ApiResponseError } from './errors.js';

export type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  cookie?: string;
  authToken?: string;
  customHeaders?: Record<string, string>;
  overrideResponseHandler?: <T>(response: Response) => Promise<T>;
};

export const createRequest =
  ({
    baseUrl,
    apiKey,
    customHeaders,
  }: {
    baseUrl: string;
    apiKey: string;
    customHeaders?: Record<string, string>;
  }) =>
  async <ResponseBody>({
    method,
    path,
    query = {},
    body,
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
      headers.append(key, value);
    }

    if (apiKey) {
      headers.append('x-api-key', apiKey);
    }

    if (authToken) {
      headers.append('cookie', authToken);
    }

    const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;

    let _body = body;

    if (!(body instanceof FormData)) {
      headers.append('Content-Type', 'application/json');
      _body = JSON.stringify(body);
    }

    const request = new Request(url, {
      method,
      credentials: 'include',
      headers,
      ...((_body && { body: _body }) || {}),
    });

    try {
      const response = await fetch(request);

      if (overrideResponseHandler) {
        return overrideResponseHandler<ResponseBody>(response);
      }

      const responseText = await response.text();

      if (!response.ok) {
        const responseContent = JSON.parse(responseText);
        throw new ApiResponseError({
          url,
          message: responseContent.message,
          status: responseContent.statusCode,
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
    prefix?: string,
  ): string => {
    const encodedKey = prefix ? `${prefix}[${key}]` : key;

    if (value === undefined || value === null || value === '') {
      return '';
    }

    if (Array.isArray(value)) {
      return value
        .map((val, index) => encodeKeyValue(index.toString(), val, encodedKey))
        .filter(Boolean) // Remove empty strings
        .join('&');
    }

    if (typeof value === 'object' && value !== null) {
      return Object.entries(value)
        .map(([nestedKey, nestedValue]) =>
          encodeKeyValue(nestedKey, nestedValue, encodedKey),
        )
        .filter(Boolean) // Remove empty strings
        .join('&');
    }

    return `${encodeURIComponent(encodedKey)}=${encodeURIComponent(String(value))}`;
  };

  return Object.entries(query)
    .map(([key, value]) => encodeKeyValue(key, value))
    .filter(Boolean) // Remove empty strings
    .join('&');
};
