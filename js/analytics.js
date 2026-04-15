(function analyticsFacade() {
  const service = window.stcServices && window.stcServices.analytics;
  if (service) {
    window.analyticsModule = service;
  }
})();