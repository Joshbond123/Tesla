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
  if (pwd === currentAdminPassword()) {
    sessionStorage.setItem("tesla_admin_authenticated", "true");
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("app").classList.add("active");
    document.getElementById("loginError").style.display = "none";
    refreshAll();
  } else {
    document.getElementById("loginError").style.display = "block";
    if (input) { input.value = ""; input.focus(); }
  }
}

function doLogout() {
  sessionStorage.removeItem("tesla_admin_authenticated");
  document.getElementById("app").classList.remove("active");
  document.getElementById("loginScreen").classList.remove("hidden");
  var li = document.getElementById("loginInput"); if (li) { li.value = ""; li.focus(); }
}
