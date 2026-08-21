(function initializeHttpClient(global) {
  "use strict";

  const app = global.HealthApp = global.HealthApp || {};

  class HttpError extends Error {
    constructor(message, details) {
      super(message);
      this.name = "HttpError";
      this.code = details.code;
      this.status = details.status || 0;
      this.response = details.response;
      this.cause = details.cause;
    }
  }

  function resolveUrl(path) {
    if (/^https?:\/\//i.test(path)) {
      throw new HttpError("前端不得直接呼叫外部 API，請改由後端代理。", {
        code: "ABSOLUTE_URL_NOT_ALLOWED"
      });
    }
    const baseUrl = app.config?.apiBaseUrl || "";
    if (!baseUrl) return path;
    return `${baseUrl.replace(/\/$/, "")}/${String(path).replace(/^\//, "")}`;
  }

  async function parseResponse(response) {
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new HttpError("伺服器回應不是有效的 JSON。", {
        code: "INVALID_JSON",
        status: response.status,
        cause: error
      });
    }
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const externalSignal = options.signal;
    const timeoutMs = options.timeoutMs ?? app.config?.requestTimeoutMs ?? 15000;
    const timeoutId = global.setTimeout(() => controller.abort("timeout"), timeoutMs);
    const abortFromExternalSignal = () => controller.abort(externalSignal.reason);

    if (externalSignal) {
      if (externalSignal.aborted) abortFromExternalSignal();
      else externalSignal.addEventListener("abort", abortFromExternalSignal, { once: true });
    }

    const headers = new Headers(options.headers || {});
    const hasBody = options.body !== undefined && options.body !== null;
    if (hasBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (!headers.has("Accept")) headers.set("Accept", "application/json");

    try {
      const response = await fetch(resolveUrl(path), {
        method: options.method || (hasBody ? "POST" : "GET"),
        headers,
        body: hasBody && typeof options.body !== "string"
          ? JSON.stringify(options.body)
          : options.body,
        credentials: options.credentials || "same-origin",
        signal: controller.signal
      });
      const responseBody = await parseResponse(response);

      if (!response.ok) {
        throw new HttpError("API 請求失敗。", {
          code: responseBody?.code || "HTTP_ERROR",
          status: response.status,
          response: responseBody
        });
      }

      return {
        ok: true,
        status: response.status,
        data: responseBody,
        headers: response.headers
      };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (controller.signal.aborted) {
        throw new HttpError("API 請求已逾時或取消。", {
          code: externalSignal?.aborted ? "REQUEST_ABORTED" : "REQUEST_TIMEOUT",
          cause: error
        });
      }
      throw new HttpError("無法連線至 API 服務。", {
        code: "NETWORK_ERROR",
        cause: error
      });
    } finally {
      global.clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abortFromExternalSignal);
    }
  }

  app.http = Object.freeze({ request, HttpError });
})(window);
