// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Social Settings
// ╚══════════════════════════════════════════════════════════╝

// ---- SOCIAL ----
function loadSocialSettings() { var saved = localStorage.getItem("tesla_social_settings"); if (saved) { try { socialSettings = JSON.parse(saved); } catch(e) {} } applySocialSettings(); if (API_BASE) { api("GET", "/admin/social-settings").then(function(r) { if (r.settings) { socialSettings = r.settings; localStorage.setItem("tesla_social_settings", JSON.stringify(socialSettings)); applySocialSettings(); } }).catch(function() {}); } }
function applySocialSettings() {
  var wa = socialSettings.whatsapp || {}, tg = socialSettings.telegram || {};
  var we = document.getElementById("whatsappEnabled"), te = document.getElementById("telegramEnabled");
  if (we) we.checked = wa.enabled !== false; if (te) te.checked = tg.enabled === true;
  var wn = document.getElementById("whatsappNumber"), wl = document.getElementById("whatsappLabel"), tu = document.getElementById("telegramUsername"), tl = document.getElementById("telegramLabel");
  if (wn) wn.value = wa.number || ""; if (wl) wl.value = wa.label || "Chat with us on WhatsApp";
  if (tu) tu.value = tg.username || ""; if (tl) tl.value = tg.label || "Chat with us on Telegram";
}
function saveSocialSettings() {
  socialSettings.whatsapp = { number: document.getElementById("whatsappNumber").value.trim(), enabled: document.getElementById("whatsappEnabled").checked, label: document.getElementById("whatsappLabel").value.trim() || "Chat with us on WhatsApp" };
  socialSettings.telegram = { username: document.getElementById("telegramUsername").value.trim(), enabled: document.getElementById("telegramEnabled").checked, label: document.getElementById("telegramLabel").value.trim() || "Chat with us on Telegram" };
  localStorage.setItem("tesla_social_settings", JSON.stringify(socialSettings)); showToast("Social settings saved");
  if (API_BASE) { api("POST", "/admin/social-settings", { settings: socialSettings }).catch(function() {}); }
}
