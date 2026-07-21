// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Dashboard & Stats
// ╚══════════════════════════════════════════════════════════╝

// ---- DASHBOARD ----
function loadDashboard() { loadActivityChart(); updateStats(); renderRecentUsers(); }
function updateStats() {
  var verified = allUsers.filter(function(u) { return u.verification_status === "verified"; }).length;
  var pending = allUsers.length - verified;
  setText("statTotal", allUsers.length); setText("statVerified", verified); setText("statPending", pending); setText("statOrders", allOrders.length);
  var badge = document.getElementById("usersNavBadge"); if (badge) badge.textContent = allUsers.length;
}
function renderRecentUsers() {
  var tbody = document.getElementById("recentTable"); if (!tbody) return;
  var recent = allUsers.slice(0, 8);
  if (recent.length === 0) { tbody.innerHTML = "<tr><td colspan=\"4\" style=\"text-align:center;padding:24px;color:var(--admin-text-muted);\">No users registered yet.</td></tr>"; }
  else { tbody.innerHTML = recent.map(function(u) { var name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "\u2014"; var iv = u.verification_status === "verified"; return "<tr><td><div class=\"user-cell\"><div class=\"user-avatar\">" + esc((name.charAt(0) || "?").toUpperCase()) + "</div><span class=\"user-name\">" + esc(name) + "</span></div></td><td>" + esc(u.email) + "</td><td><span class=\"badge " + (iv ? "badge-success" : "badge-warning") + "\">" + (iv ? "Verified" : "Pending") + "</span></td><td>" + esc(u.created_at ? new Date(u.created_at).toLocaleDateString() : "\u2014") + "</td></tr>"; }).join(""); }
}
