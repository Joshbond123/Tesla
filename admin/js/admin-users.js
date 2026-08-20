// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: User Management
// ╚══════════════════════════════════════════════════════════╝

// ---- USERS ----
function renderUsers() {
  try {
    var query = (document.getElementById("userSearch").value || "").toLowerCase();
    var sf = document.getElementById("statusFilter").value;
    var f = allUsers.filter(function(u) { if (sf === "verified" && u.verification_status !== "verified") return false; if (sf === "pending" && u.verification_status === "verified") return false; if (query) { var h = [u.first_name, u.last_name, u.email, u.phone].join(" ").toLowerCase(); return h.indexOf(query) !== -1; } return true; });
    var tbody = document.getElementById("usersTable"); var empty = document.getElementById("usersEmpty"); var countEl = document.getElementById("usersCount");
    if (countEl) countEl.textContent = "Showing " + f.length + " of " + allUsers.length + " users";
    if (f.length === 0) { if (tbody) tbody.innerHTML = ""; if (empty) empty.style.display = "block"; }
    else { if (empty) empty.style.display = "none"; if (tbody) { tbody.innerHTML = f.map(function(u, i) { var name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "\u2014"; var iv = u.verification_status === "verified"; var va = u.verified_at ? new Date(u.verified_at).toLocaleDateString() : "\u2014"; return "<tr><td style=\"color:var(--admin-text-muted)\">" + (i + 1) + "</td><td><div class=\"user-cell\"><div class=\"user-avatar\">" + esc((name.charAt(0) || "?").toUpperCase()) + "</div><span class=\"user-name\">" + esc(name) + "</span></div></td><td>" + esc(u.email) + "</td><td>" + esc(u.phone) + "</td><td><span class=\"badge " + (iv ? "badge-success" : "badge-warning") + "\">" + (iv ? "Verified" : "Pending") + "</span></td><td>" + esc(va) + "</td><td>" + esc(u.created_at ? new Date(u.created_at).toLocaleDateString() : "\u2014") + "</td><td><button class=\"btn btn-sm\" onclick=\"window.deleteUser(\'" + u.id + "\',\'" + esc(u.email || "").replace(/'/g, "\\'") + "\')\" style=\"background:rgba(239,68,68,0.08);color:#EF4444;\">Delete</button></td></tr>"; }).join(""); } }
  } catch(e) { console.error(e); }
}
function deleteUser(id, email) {
  if (!confirm("Permanently delete user \"" + (email || id) + "\" and all data?")) return;
  if (!API_BASE) { allUsers = allUsers.filter(function(u) { return u.id !== id; }); showToast("User removed locally"); renderUsers(); loadDashboard(); return; }
  api("POST", "/admin/users/delete", { id: id, email: email }).then(function() { allUsers = allUsers.filter(function(u) { return u.id !== id; }); showToast("User deleted"); renderUsers(); loadDashboard(); }).catch(function(e) { showToast("Delete failed: " + e.message, "error"); });
}
