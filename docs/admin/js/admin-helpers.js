// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Helper Utilities
// ╚══════════════════════════════════════════════════════════╝

function esc(str) {
  if (str == null || str === "") return "\u2014";
  var d = document.createElement("div");
  d.textContent = String(str);
  return d.innerHTML;
}

function showToast(msg, type) {
  type = type || "success";
  var container = document.getElementById("toastContainer");
  if (!container) {
    try { console.log("[toast]", type, msg); } catch (e) {}
    return;
  }
  var t = document.createElement("div");
  t.className = "toast" + (type === "error" ? " error" : type === "warning" ? " warning" : "");
  var icons = { success: "check", error: "x", warning: "alert", info: "infoCircle" };
  var svgMap = {
    check: "M20 6L9 17l-5-5",
    x: "M18 6L6 18M6 6l12 12",
    alert: "M12 9v4m0 4h.01",
    infoCircle: "M12 16v-4m0-4h.01"
  };
  var path = svgMap[icons[type]] || svgMap.check;
  t.innerHTML =
    '<span class="toast-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' +
    path +
    '"/></svg></span>' +
    esc(msg);
  container.appendChild(t);
  setTimeout(function () {
    t.classList.add("toast-out");
    setTimeout(function () {
      if (t.parentNode) t.remove();
    }, 300);
  }, 4000);
}

function setApiStatus(ok) {
  var dot = document.getElementById("apiDot");
  var label = document.getElementById("apiStatusLabel");
  if (dot) dot.className = "status-dot " + (ok ? "online" : "offline");
  if (label) label.textContent = ok ? "Connected" : "Offline";
}

/**
 * Authenticated admin API helper.
 * - Always attaches Bearer token when present
 * - Hard timeout so UI never spins forever
 * - Consistent error objects with .status / .message
 */
function api(method, path, body) {
  if (!API_BASE) return Promise.reject(new Error("API not configured"));

  var url = API_BASE + path;
  var headers = { Accept: "application/json" };
  if (body !== undefined && body !== null && method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }

  try {
    var token = localStorage.getItem("tesla_admin_token");
    if (token) {
      headers["Authorization"] = "Bearer " + token;
      headers["X-Admin-Token"] = token;
    }
  } catch (e) {}

  var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  var timedOut = false;
  var timer = setTimeout(function () {
    timedOut = true;
    if (ctrl) {
      try { ctrl.abort(); } catch (e2) {}
    }
  }, 15000);

  var opts = { method: method, headers: headers };
  if (ctrl) opts.signal = ctrl.signal;
  if (body !== undefined && body !== null && method !== "GET" && method !== "HEAD") {
    opts.body = JSON.stringify(body);
  }

  return fetch(url, opts)
    .then(function (r) {
      return r.text().then(function (text) {
        var d = {};
        try {
          d = text ? JSON.parse(text) : {};
        } catch (e) {
          d = { error: text || "Invalid JSON response" };
        }
        if (!r.ok) {
          if (r.status === 401 && path.indexOf("/admin/auth") === -1) {
            try {
              sessionStorage.removeItem("tesla_admin_authenticated");
              localStorage.removeItem("tesla_admin_token");
            } catch (e2) {}
            var app = document.getElementById("app");
            var login = document.getElementById("loginScreen");
            if (app) app.classList.remove("active");
            if (login) login.classList.remove("hidden");
            setApiStatus(false);
          }
          var err = new Error((d && (d.error || d.message)) || ("Request failed (" + r.status + ")"));
          err.status = r.status;
          err.payload = d;
          throw err;
        }
        return d;
      });
    })
    .catch(function (err) {
      if (timedOut || (err && err.name === "AbortError")) {
        var te = new Error("Request timed out. Check your connection and try again.");
        te.status = 408;
        throw te;
      }
      throw err;
    })
    .then(
      function (v) {
        clearTimeout(timer);
        return v;
      },
      function (err) {
        clearTimeout(timer);
        throw err;
      }
    );
}

function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}
