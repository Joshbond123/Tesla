// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Shared State & Variables
// ╚══════════════════════════════════════════════════════════╝

"use strict";

var allUsers = [];
var allOrders = [];
var allProofs = [];
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

// Payment methods are owned by the unified TeslaPaymentMethods store
// (js/payment-methods.js). Admin CRUD lives in admin-payments.js.
