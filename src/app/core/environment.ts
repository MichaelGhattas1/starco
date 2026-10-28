export const environment = {
  // Development uses the API directly; production uses the same-origin Netlify proxy.
  apiUrl: 'http://plazainn.runasp.net',
  mediaBaseUrl: 'http://plazainn.runasp.net',
  apiHost: 'plazainn.runasp.net',
  // Display-only rates. Plaza has no exchange-rate endpoint. 1 EGP → USD/EUR.
  exchangeRateUrl: 'https://open.er-api.com/v6/latest/EGP',
};
