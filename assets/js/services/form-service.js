(function initializeFormService(global) {
  "use strict";

  const app = global.HealthApp = global.HealthApp || {};
  const requiredMethods = ["load", "saveDraft", "submit"];
  let adapter = app.adapters?.offlineForm;

  function assertAdapter(candidate) {
    if (!candidate || requiredMethods.some(method => typeof candidate[method] !== "function")) {
      throw new TypeError("表單 Adapter 必須實作 load、saveDraft 與 submit。");
    }
  }

  function setAdapter(candidate) {
    assertAdapter(candidate);
    adapter = candidate;
  }

  function createRequest({ formType, formVersion, data, requestId }) {
    if (!formType || !formVersion || !data || typeof data !== "object") {
      throw new TypeError("表單請求缺少 formType、formVersion 或 data。");
    }
    return Object.freeze({
      formType,
      formVersion,
      institution: app.config.institution,
      clientCreatedAt: new Date().toISOString(),
      requestId: requestId || global.crypto?.randomUUID?.() || "",
      data
    });
  }

  async function execute(method, request) {
    assertAdapter(adapter);
    return adapter[method](request);
  }

  app.formService = Object.freeze({
    setAdapter,
    createRequest,
    load: request => execute("load", request),
    saveDraft: request => execute("saveDraft", request),
    submit: request => execute("submit", request)
  });
})(window);
