import { describe, expect, it, vi } from "vitest";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import http, { refreshClient } from "./http";

type InterceptorHandler<T> = {
  fulfilled?: (value: T) => T | Promise<T>;
  rejected?: (error: unknown) => unknown;
};

type InterceptorManagerWithHandlers<T> = {
  handlers: Array<InterceptorHandler<T>>;
};

describe("http client interceptor", () => {
  it("attaches requestSentAt timestamp on outgoing requests", async () => {
    const requestManager = http.interceptors
      .request as unknown as InterceptorManagerWithHandlers<
      Record<string, unknown>
    >;
    const requestHandler = requestManager.handlers[0]?.fulfilled;
    expect(requestHandler).toBeDefined();

    const config = await requestHandler!({ headers: {} });
    expect((config as { requestSentAt?: number }).requestSentAt).toBeTypeOf(
      "number",
    );
  });

  it("dispatches auth:session-expired when refresh fails with 401", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const error401 = new AxiosError(
      "Unauthorized",
      "401",
      undefined,
      undefined,
      {
        status: 401,
        data: {},
        headers: {},
        statusText: "Unauthorized",
        config: {} as unknown as InternalAxiosRequestConfig,
      },
    );
    vi.spyOn(refreshClient, "post").mockRejectedValueOnce(error401);

    const responseManager = http.interceptors
      .response as unknown as InterceptorManagerWithHandlers<unknown>;
    const errorHandler = responseManager.handlers[0]?.rejected;
    expect(errorHandler).toBeDefined();

    const mockError = {
      config: {
        url: "/summary/today",
        requestSentAt: Date.now(),
      },
      response: {
        status: 401,
      },
    };

    await expect(errorHandler!(mockError)).rejects.toBeDefined();
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth:session-expired" }),
    );
    dispatchSpy.mockRestore();
  });

  it("does not dispatch auth:session-expired on transient network or timeout error", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const networkError = new AxiosError("Network Error", "ERR_NETWORK");
    vi.spyOn(refreshClient, "post").mockRejectedValueOnce(networkError);

    const responseManager = http.interceptors
      .response as unknown as InterceptorManagerWithHandlers<unknown>;
    const errorHandler = responseManager.handlers[0]?.rejected;
    expect(errorHandler).toBeDefined();

    const mockError = {
      config: {
        url: "/summary/today",
        requestSentAt: Date.now(),
      },
      response: {
        status: 401,
      },
    };

    await expect(errorHandler!(mockError)).rejects.toThrow("Network Error");
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth:session-expired" }),
    );
    dispatchSpy.mockRestore();
  });
});
