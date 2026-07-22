// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Authentication (Login/Logout)
// ╚══════════════════════════════════════════════════════════╝

// ---- LOGIN ----
function showLoginError(input) {
  document.getElementById("loginError").style.display = "block";
  if (input) { input.value = ""; input.focus(); }
}

function onLoginSuccess() {
  sessionStorage.setItem("tesla_admin_authenticated", "true");
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("app").classList.add("active");
  document.getElementById("loginError").style.display = "none";
  refreshAll();
}

function doLogin() {
  var input = document.getElementById("loginInput"); var pwd = input ? input.value : "";
  // Authenticate server-side so admin data is never exposed without a valid token.
  if (typeof API_BASE !== "undefined" && API_BASE) {
    api("POST", "/admin/auth", { password: pwd }).then(function(r) {
      if (r && r.token) {
        try { sessionStorage.setItem("tesla_admin_token", r.token); } catch (e) {}
        onLoginSuccess();
      } else { showLoginError(input); }
    }).catch(function() { showLoginError(input); });
    return;
  }
  // No backend configured — fall back to local-only check.
  if (pwd === adminPassword) { onLoginSuccess(); } else { showLoginError(input); }
}

function doLogout() {
  sessionStorage.removeItem("tesla_admin_authenticated");
  try { sessionStorage.removeItem("tesla_admin_token"); } catch (e) {}
  document.getElementById("app").classList.remove("active");
  document.getElementById("loginScreen").classList.remove("hidden");
  var li = document.getElementById("loginInput"); if (li) { li.value = ""; li.focus(); }
}
