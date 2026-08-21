(function initializeAppConfig(global) {
  "use strict";

  const app = global.HealthApp = global.HealthApp || {};
  const injectedConfig = global.HealthAppConfig || {};
  const injectedInstitution = injectedConfig.institution || {};

  app.config = Object.freeze({
    mode: injectedConfig.mode || "offline",
    apiBaseUrl: injectedConfig.apiBaseUrl || "",
    requestTimeoutMs: Number.isFinite(injectedConfig.requestTimeoutMs)
      ? injectedConfig.requestTimeoutMs
      : 15000,
    institution: Object.freeze({
      name: injectedInstitution.name || "烏日澄清醫院",
      code: injectedInstitution.code || "1536151042"
    })
  });
})(window);
