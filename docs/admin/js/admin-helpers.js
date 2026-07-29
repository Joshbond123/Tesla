// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Helper Utilities
// ╚══════════════════════════════════════════════════════════╝

// ---- HELPERS ----
function esc(str) { if (str == null || str === "") return "\u2014"; var d = document.createElement("div"); d.textContent = String(str); return d.innerHTML; }

function showToast(msg, type) {
  type = type || "success"; var container = document.getElementById("toastContainer"); var t = document.createElement("div");
  t.className = "toast" + (type === "error" ? " error" : type === "warning" ? " warning" : "");
  var icons = { success: "check", error: "x", warning: "alert", info: "infoCircle" };
  var svgMap = { check: "M20 6L9 17l-5-5", x: "M18 6L6 18M6 6l12 12", alert: "M12 9v4m0 4h.01", infoCircle: "M12 16v-4m0-4h.01" };
  var path = svgMap[icons[type]] || svgMap.check;
  t.innerHTML = "<span class=\"toast-icon\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"" + path + "\"/></svg></span>" + esc(msg);
  container.appendChild(t);
  setTimeout(function() { t.classList.add("toast-out"); setTimeout(function() { if (t.parentNode) t.remove(); }, 300); }, 4000);
}

function setApiStatus(ok) {
  var dot = document.getElementById("apiDot"); var label = document.getElementById("apiStatusLabel");
  if (dot) dot.className = "status-dot " + (ok ? "online" : "offline");
  if (label) label.textContent = ok ? "Connected" : "Offline";
}

function api(method, path, body) {
  if (!API_BASE) return Promise.reject(new Error("API not configured"));
  var url = API_BASE + path; var opts = { method: method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(url, opts).then(function(r) { return r.json().then(function(d) { if (!r.ok) throw new Error(d.error || "Request failed (" + r.status + ")"); return d; }); });
}

function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
