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
  var input = document.getElementById("loginInput");
  var pwd = input ? input.value : "";
  var err = document.getElementById("loginError");
  if (!pwd) { if (err) { err.style.display = "block"; err.textContent = "Enter the admin password."; } return; }

  function loginSuccess(token) {
    if (!token) {
      if (err) {
        err.style.display = "block";
        err.textContent = "Login succeeded but no session token was returned. Check API configuration.";
      }
      return;
    }
    try { localStorage.setItem("tesla_admin_token", token); } catch (e) {}
    sessionStorage.setItem("tesla_admin_authenticated", "true");
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("app").classList.add("active");
    if (err) err.style.display = "none";
    if (input) input.value = "";
    setApiStatus(true);
    try { refreshAll(); } catch (e) { console.error(e); }
  }

  // Database-backed auth only — local password alone cannot load admin data
  if (!API_BASE) {
    if (err) {
      err.style.display = "block";
      err.textContent = "API is not configured. Cannot connect to the database.";
    }
    setApiStatus(false);
    return;
  }

  var loginBtn = document.querySelector("#loginScreen button, #loginScreen .btn-primary, button[onclick*=\"doLogin\"]");
  if (loginBtn) { loginBtn.disabled = true; }

  api("POST", "/admin/auth", { password: pwd })
    .then(function (r) {
      if (r && r.token) {
        loginSuccess(r.token);
      } else {
        if (err) {
          err.style.display = "block";
          err.textContent = "Invalid response from server. Please try again.";
        }
      }
    })
    .catch(function (e) {
      var msg = (e && e.message) ? e.message : "Login failed";
      if (err) {
        err.style.display = "block";
        err.textContent = msg.indexOf("Invalid password") !== -1
          ? "Invalid password. Use the current admin password (changed passwords are stored in the database)."
          : msg;
      }
      if (input) { input.value = ""; if (input.focus) input.focus(); }
      setApiStatus(false);
    })
    .then(function () {
      if (loginBtn) loginBtn.disabled = false;
    });
}

function doLogout() {
  sessionStorage.removeItem("tesla_admin_authenticated");
  try { localStorage.removeItem("tesla_admin_token"); } catch (e) {}
  document.getElementById("app").classList.remove("active");
  document.getElementById("loginScreen").classList.remove("hidden");
  var li = document.getElementById("loginInput"); if (li) { li.value = ""; li.focus(); }
}
