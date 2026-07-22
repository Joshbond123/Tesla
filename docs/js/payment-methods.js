/**
 * Payment Methods Data Store — Single Source of Truth
 * =====================================================
 * This file is read by BOTH the Admin Panel (admin.html) and the
 * Customer Payment Page (payment.html).
 * 
 * All payment method configuration lives here. The admin panel
 * writes changes via localStorage, and the customer page reads
 * them dynamically.
 *
 * No hardcoded payment methods on the customer page.
 */

(function(global) {
  'use strict';

  var STORAGE_KEY = 'tesla_payment_methods';

  // ── SVG Logo Library ────────────────────────────────────────────────
  // Each logo is an inline SVG string for maximum reliability.
  // No external image dependencies. All are professionally crafted.

  var LOGOS = {};

  // PayPal — "PP" monogram on dark blue
  LOGOS.paypal = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32">'
    + '<rect width="120" height="32" rx="6" fill="#003087"/>'
    + '<text x="8" y="24" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="18" fill="white" font-style="italic">Pay</text>'
    + '<text x="42" y="24" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="18" fill="#009CDE" font-style="italic">Pal</text>'
    + '</svg>';

  // Cash App — Green "$" icon
  LOGOS.cashapp = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32">'
    + '<rect width="120" height="32" rx="6" fill="#00D632"/>'
    + '<text x="8" y="24" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="18" fill="white">$</text>'
    + '<text x="26" y="24" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="16" fill="white">Cash App</text>'
    + '</svg>';

  // Venmo — Blue "V" icon
  LOGOS.venmo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32">'
    + '<rect width="120" height="32" rx="6" fill="#3D95CE"/>'
    + '<text x="8" y="25" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="22" fill="white">Venmo</text>'
    + '</svg>';

  // Zelle — Purple
  LOGOS.zelle = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32">'
    + '<rect width="120" height="32" rx="6" fill="#6D1ED4"/>'
    + '<text x="8" y="24" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="18" fill="white">Zelle</text>'
    + '</svg>';

  // Bitcoin
  LOGOS.bitcoin = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32">'
    + '<rect width="120" height="32" rx="6" fill="#F7931A"/>'
    + '<text x="8" y="24" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="17" fill="white">₿ Bitcoin</text>'
    + '</svg>';

  // Ethereum
  LOGOS.ethereum = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32">'
    + '<rect width="120" height="32" rx="6" fill="#627EEA"/>'
    + '<text x="8" y="24" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="16" fill="white">Ξ Ethereum</text>'
    + '</svg>';

  // USDT ERC-20
  LOGOS['usdt-erc20'] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32">'
    + '<rect width="120" height="32" rx="6" fill="#26A17B"/>'
    + '<text x="8" y="24" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="16" fill="white">₮ USDT (ERC-20)</text>'
    + '</svg>';

  // USDT TRC-20
  LOGOS['usdt-trc20'] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32">'
    + '<rect width="120" height="32" rx="6" fill="#26A17B"/>'
    + '<text x="8" y="24" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="16" fill="white">₮ USDT (TRC-20)</text>'
    + '</svg>';

  // Credit Card — Dark professional card
  LOGOS.creditcard = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32">'
    + '<rect width="120" height="32" rx="6" fill="#1A1F36"/>'
    + '<rect x="8" y="4" width="30" height="8" rx="2" fill="#E31937"/>'
    + '<text x="44" y="13" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="10" fill="rgba(255,255,255,0.5)">••••</text>'
    + '<text x="62" y="13" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="10" fill="rgba(255,255,255,0.5)">••••</text>'
    + '<text x="80" y="13" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="10" fill="rgba(255,255,255,0.5)">••••</text>'
    + '<text x="98" y="13" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="10" fill="white">4242</text>'
    + '<text x="8" y="26" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="12" fill="white">Credit / Debit Card</text>'
    + '</svg>';

  // Apple Gift Card
  LOGOS.applegift = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32">'
    + '<rect width="120" height="32" rx="6" fill="#000000"/>'
    + '<text x="12" y="24" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="14" fill="white"> Gift Card</text>'
    + '</svg>';

  // ── Default Payment Methods ──────────────────────────────────────────

  var DEFAULTS = [
    {
      id: 'paypal',
      name: 'PayPal',
      description: 'Pay securely using your PayPal account or linked card',
      category: 'digital',
      logo: LOGOS.paypal,
      enabled: true,
      displayOrder: 1,
      config: {
        accountName: 'Tesla Global Awards LLC',
        email: 'payments@teslaglobalawards.com',
        merchantId: 'TM8XK2R9Q4ZPA',
        paypalMeLink: 'https://paypal.me/teslaglobalawards',
        instructions: 'Send payment via PayPal to our verified business account. Please include your Order ID in the payment note for faster processing.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'cashapp',
      name: 'Cash App',
      description: 'Pay instantly using your Cash App balance or linked debit card',
      category: 'digital',
      logo: LOGOS.cashapp,
      enabled: true,
      displayOrder: 2,
      config: {
        cashtag: '$TeslaGlobalAwards',
        accountName: 'Tesla Global Awards',
        qrCode: '',
        instructions: 'Send payment to our Cash App using the $cashtag above. Screenshot the confirmation and upload as payment proof.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'venmo',
      name: 'Venmo',
      description: 'Pay with Venmo — fast, secure, and social payments',
      category: 'digital',
      logo: LOGOS.venmo,
      enabled: true,
      displayOrder: 3,
      config: {
        username: '@TeslaGlobalAwards',
        accountName: 'Tesla Global Awards LLC',
        qrCode: '',
        instructions: 'Send payment to our Venmo handle. Make sure to include your Order ID in the payment description.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'zelle',
      name: 'Zelle',
      description: 'Send money directly from your bank account with Zelle',
      category: 'bank',
      logo: LOGOS.zelle,
      enabled: true,
      displayOrder: 4,
      config: {
        recipientName: 'Tesla Global Awards LLC',
        email: 'zelle@teslaglobalawards.com',
        phone: '+1 (415) 892-3401',
        instructions: 'Use Zelle through your banking app to send payment. Enter our registered email or phone number as the recipient.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'bitcoin',
      name: 'Bitcoin (BTC)',
      description: 'Pay with Bitcoin — the original cryptocurrency',
      category: 'crypto',
      logo: LOGOS.bitcoin,
      enabled: true,
      displayOrder: 5,
      config: {
        walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        network: 'Bitcoin Mainnet',
        qrCode: '',
        instructions: 'Send BTC to the wallet address above. Always verify the address before sending. Use the Bitcoin network only.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'ethereum',
      name: 'Ethereum (ETH)',
      description: 'Pay with Ethereum — the leading smart contract platform',
      category: 'crypto',
      logo: LOGOS.ethereum,
      enabled: true,
      displayOrder: 6,
      config: {
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        network: 'Ethereum Mainnet (ERC-20)',
        qrCode: '',
        instructions: 'Send ETH to the wallet address above. Only use the Ethereum Mainnet. Transactions on other networks will be lost.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'usdt-erc20',
      name: 'USDT (ERC-20)',
      description: 'Pay with Tether USDT on the Ethereum network',
      category: 'crypto',
      logo: LOGOS['usdt-erc20'],
      enabled: true,
      displayOrder: 7,
      config: {
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
        network: 'Ethereum Mainnet (ERC-20)',
        qrCode: '',
        instructions: 'Send USDT (ERC-20) to the wallet address above. Ensure you select the Ethereum/ERC-20 network. Gas fees apply.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'usdt-trc20',
      name: 'USDT (TRC-20)',
      description: 'Pay with Tether USDT on the TRON network — low fees',
      category: 'crypto',
      logo: LOGOS['usdt-trc20'],
      enabled: true,
      displayOrder: 8,
      config: {
        walletAddress: 'TXfKzRsvHQhXGxXgCCqBkGYVEkmoZ6RXgN',
        network: 'TRON Mainnet (TRC-20)',
        qrCode: '',
        instructions: 'Send USDT (TRC-20) to the wallet address above. Use the TRON/TRC-20 network for low fees and fast confirmation.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'creditcard',
      name: 'Credit Card',
      description: 'Pay with Visa, Mastercard, American Express, or Discover',
      category: 'card',
      logo: LOGOS.creditcard,
      enabled: true,
      displayOrder: 9,
      config: {
        instructions: 'We accept all major credit and debit cards. After placing your order, you will receive a secure payment link to complete your transaction. Your card details are processed through enterprise-grade encryption.'
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    },
    {
      id: 'applegift',
      name: 'Apple Gift Card',
      description: 'Pay using Apple Gift Card — upload front and back images',
      category: 'giftcard',
      logo: LOGOS.applegift,
      enabled: true,
      displayOrder: 10,
      config: {
        instructions: 'Upload clear photos of the front and back of your Apple Gift Card. The card must be valid and unscratched (back code visible). We will verify the balance and process your order within 24 hours.',
        requireFrontImage: true,
        requireBackImage: true,
        allowCameraCapture: true
      },
      lastUpdated: '2026-07-20T12:00:00Z'
    }
  ];

  // ── API ──────────────────────────────────────────────────────────────

  /**
   * Load payment methods from localStorage (or return defaults).
   */
  function loadPaymentMethods() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('[PaymentMethods] Failed to parse stored data, using defaults.');
    }
    // Initialize with defaults
    savePaymentMethods(DEFAULTS);
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  /**
   * Save payment methods to localStorage.
   */
  function savePaymentMethods(methods) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(methods));
    } catch (e) {
      console.error('[PaymentMethods] Failed to save:', e.message);
    }
  }

  /**
   * Get all enabled payment methods, sorted by displayOrder.
   */
  function getEnabledPaymentMethods() {
    var methods = loadPaymentMethods();
    return methods
      .filter(function(m) { return m.enabled; })
      .sort(function(a, b) { return (a.displayOrder || 999) - (b.displayOrder || 999); });
  }

  /**
   * Get a specific payment method by ID.
   */
  function getPaymentMethod(id) {
    var methods = loadPaymentMethods();
    for (var i = 0; i < methods.length; i++) {
      if (methods[i].id === id) return methods[i];
    }
    return null;
  }

  /**
   * Add a new payment method.
   */
  function addPaymentMethod(method) {
    var methods = loadPaymentMethods();
    method.id = method.id || ('pm-' + Date.now());
    method.lastUpdated = new Date().toISOString();
    method.displayOrder = method.displayOrder || (methods.length + 1);
    methods.push(method);
    savePaymentMethods(methods);
    return method;
  }

  /**
   * Update an existing payment method by ID.
   */
  function updatePaymentMethod(id, updates) {
    var methods = loadPaymentMethods();
    for (var i = 0; i < methods.length; i++) {
      if (methods[i].id === id) {
        Object.keys(updates).forEach(function(key) {
          methods[i][key] = updates[key];
        });
        methods[i].lastUpdated = new Date().toISOString();
        savePaymentMethods(methods);
        return methods[i];
      }
    }
    return null;
  }

  /**
   * Delete a payment method by ID.
   */
  function deletePaymentMethod(id) {
    var methods = loadPaymentMethods();
    var filtered = methods.filter(function(m) { return m.id !== id; });
    if (filtered.length === methods.length) return false;
    savePaymentMethods(filtered);
    return true;
  }

  /**
   * Reorder payment methods.
   * @param {Array<string>} orderedIds — array of IDs in desired order.
   */
  function reorderPaymentMethods(orderedIds) {
    var methods = loadPaymentMethods();
    for (var i = 0; i < orderedIds.length; i++) {
      var method = methods.find(function(m) { return m.id === orderedIds[i]; });
      if (method) method.displayOrder = i + 1;
    }
    savePaymentMethods(methods);
    return methods;
  }

  /**
   * Toggle enabled/disabled for a payment method.
   */
  function togglePaymentMethod(id) {
    var method = getPaymentMethod(id);
    if (!method) return null;
    return updatePaymentMethod(id, { enabled: !method.enabled });
  }

  /**
   * Reset all payment methods to defaults.
   */
  function resetToDefaults() {
    savePaymentMethods(DEFAULTS);
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  // ── Exports ──────────────────────────────────────────────────────────
  global.TeslaPaymentMethods = {
    load: loadPaymentMethods,
    save: savePaymentMethods,
    getEnabled: getEnabledPaymentMethods,
    get: getPaymentMethod,
    add: addPaymentMethod,
    update: updatePaymentMethod,
    delete: deletePaymentMethod,
    reorder: reorderPaymentMethods,
    toggle: togglePaymentMethod,
    reset: resetToDefaults,
    defaults: DEFAULTS,
    logos: LOGOS,
    STORAGE_KEY: STORAGE_KEY
  };

})(window);
