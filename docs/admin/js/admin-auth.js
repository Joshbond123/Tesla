// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Authentication (Login/Logout)
// ╚══════════════════════════════════════════════════════════╝

// ---- LOGIN ----
// The valid password is the admin-set one (>= 3 chars) if present, else the
// default "admin123". Computing it fresh here guarantees the default always
// works until the admin explicitly changes it in Settings.
function currentAdminPassword() {
  var stored = "";
  try { stored = localStorage.getItem("tesla_admin_pwd") || ""; } catch (e) {}
  if (stored && stored.length >= 3) { adminPassword = stored; return stored; }
  try { localStorage.removeItem("tesla_admin_pwd"); } catch (e) {}
  adminPassword = "admin123";
  return "admin123";
}

function doLogin() {
  var input = document.getElementById("loginInput"); var pwd = input ? input.value : "";
  var err = document.getElementById("loginError");
  if (!pwd) { if (err) err.style.display = "block"; return; }

  // Helper: complete the login flow once password is verified
  function loginSuccess(token) {
    try { if (token) localStorage.setItem("tesla_admin_token", token); } catch (e) {}
    sessionStorage.setItem("tesla_admin_authenticated", "true");
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("app").classList.add("active");
    if (err) err.style.display = "none";
    if (input) input.value = "";
    try { refreshAll(); } catch(e) {}
  }

  // Helper: fall back to local password check (works offline / no backend)
  function tryLocalAuth() {
    var localPwd = currentAdminPassword();
    if (pwd === localPwd) {
      loginSuccess(null);
    } else {
      if (err) err.style.display = "block";
      if (input) { input.value = ""; if (input.focus) input.focus(); }
    }
  }

  // Try the server first; fall back to local check on any failure
  api("POST", "/admin/auth", { password: pwd })
    .then(function(r) {
      if (r && r.token) {
        loginSuccess(r.token);
      } else {
        // Server responded but rejected the password — try local as fallback
        tryLocalAuth();
      }
    })
    .catch(function() {
      // Network error / no backend — fall back to local password
      tryLocalAuth();
    });
}

function doLogout() {
  sessionStorage.removeItem("tesla_admin_authenticated");
  try { localStorage.removeItem("tesla_admin_token"); } catch (e) {}
  document.getElementById("app").classList.remove("active");
  document.getElementById("loginScreen").classList.remove("hidden");
  var li = document.getElementById("loginInput"); if (li) { li.value = ""; li.focus(); }
}
