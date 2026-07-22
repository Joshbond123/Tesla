// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Authentication (Login/Logout)
// ╚══════════════════════════════════════════════════════════╝

// ---- LOGIN ----
function doLogin() {
  var input = document.getElementById("loginInput"); var pwd = input ? input.value : "";
  if (pwd === adminPassword) {
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
