(function authFacade() {
  const service = window.stcServices && window.stcServices.auth;
  if (service) {
    window.adminAuth = service;
  }
})();
