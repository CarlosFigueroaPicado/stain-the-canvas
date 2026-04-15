(function dashboardFacade() {
  const service = window.stcServices && window.stcServices.dashboard;
  if (service) {
    window.dashboardModule = service;
  }
})();