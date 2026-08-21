(function initializeOfflineFormAdapter(global) {
  "use strict";

  const app = global.HealthApp = global.HealthApp || {};

  function offlineResult(operation) {
    return Promise.resolve({
      ok: false,
      code: "OFFLINE_MODE",
      operation,
      message: "目前為離線表單模式，未執行資料傳輸。"
    });
  }

  app.adapters = app.adapters || {};
  app.adapters.offlineForm = Object.freeze({
    load: request => offlineResult("load", request),
    saveDraft: request => offlineResult("saveDraft", request),
    submit: request => offlineResult("submit", request)
  });
})(window);
