/*
 * Noeni Thai Kitchen — site settings.
 * Most of these can also be changed later in the Google Sheet (tab "Settings"
 * and "Routes"); values in the Sheet win over the ones below.
 */
window.NTK_CONFIG = {
  // Paste the Apps Script web-app URL here after setup (see SETUP.md).
  // Empty = demo mode: orders are only stored in this browser.
  apiUrl: 'https://script.google.com/macros/s/AKfycbwSLhusjBkuFCaZ_QQKI20G_ECG3q9jtze0pUmP6Yrgj3-cr85Wc1r21LrBGTCfmMwM/exec',

  business: {
    name: 'Noeni Thai Kitchen',
    email: 'noenithaikitchen@gmail.com',
    phone: '+32488425759',
    phoneDisplay: '0488 42 57 59',
    pickupAddress: 'Sint-Denijs-Westrem (Gent)',
  },

  // Payment. Leave iban empty to hide bank transfer.
  payment: {
    methods: ['cash', 'payconiq', 'transfer'],
    // Demo IBAN (standard example number). Replace with the real one.
    iban: 'BE68 5390 0754 7034',
    bic: '',
    accountName: 'Noeni Thai Kitchen',
  },

  rules: {
    minimumOrder: 35,
    // Delivery fee by subtotal: first matching "from" (highest first) wins.
    deliveryFees: [
      { from: 90, fee: 0 },
      { from: 70, fee: 2 },
      { from: 0, fee: 3 },
    ],
    pickupFee: 0,
    // Order deadline: the day before delivery at this hour.
    deadlineDaysBefore: 1,
    deadlineHour: 10,
    deliveryWindow: '13:00–19:00',
    maxPerItem: 20,
  },

  // Delivery routes and dates (YYYY-MM-DD).
  routes: [
    { id: 'ovl', name: { nl: 'Oost-Vlaanderen', fr: 'Flandre-Orientale', en: 'East Flanders' }, dates: ['2026-11-07', '2026-12-05'] },
    { id: 'akl', name: { nl: 'Antwerpen – Kempen – Limburg', fr: 'Anvers – Campine – Limbourg', en: 'Antwerp – Kempen – Limburg' }, dates: ['2026-11-14', '2026-12-12'] },
    { id: 'wvl', name: { nl: 'West-Vlaanderen', fr: 'Flandre-Occidentale', en: 'West Flanders' }, dates: ['2026-11-21', '2026-12-19'] },
    { id: 'azb', name: { nl: 'Antwerpen – Zuid-Vlaanderen – Brabant', fr: 'Anvers – Sud de la Flandre – Brabant', en: 'Antwerp – South Flanders – Brabant' }, dates: ['2026-11-28'] },
  ],

  // Which route(s) serve which postcodes. Several matches = customer picks.
  postcodeRoutes: [
    { from: 9000, to: 9999, routes: ['ovl'] },
    { from: 8000, to: 8999, routes: ['wvl'] },
    { from: 3500, to: 3999, routes: ['akl'] },
    { from: 2200, to: 2499, routes: ['akl'] },
    { from: 2000, to: 2999, routes: ['akl', 'azb'] },
    { from: 1000, to: 1999, routes: ['azb'] },
    { from: 3000, to: 3499, routes: ['azb'] },
  ],

  // Pickup is possible every week (Saturday).
  pickup: { enabled: true, weekday: 6, weeksAhead: 6 },

  // Optional banner text shown at the top (e.g. holidays). Empty = hidden.
  banner: { nl: '', fr: '', en: '' },
};
