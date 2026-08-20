// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Vehicles Showcase
// ╚══════════════════════════════════════════════════════════╝

// ---- VEHICLES ----
function renderVehicles() {
  var grid = document.getElementById("vehiclesGrid"); if (!grid) return;
  grid.innerHTML = vehicleData.map(function(car) {
    return "<div class=\"dash-card\" style=\"margin:0;box-shadow:var(--admin-shadow);\"><div style=\"height:130px;background:linear-gradient(135deg,#f7f8fa,#eef0f3);display:flex;align-items:center;justify-content:center;padding:16px;\"><img src=\"" + car.img + "\" alt=\"Tesla " + car.name + "\" style=\"height:100%;object-fit:contain;\" loading=\"lazy\"></div><div style=\"padding:16px;\"><div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;\"><h4 style=\"font-size:14px;font-weight:700;color:var(--dark);margin:0;\">Tesla " + car.name + "</h4><span style=\"font-size:10px;font-weight:700;color:var(--red);background:rgba(227,25,55,0.08);padding:2px 8px;border-radius:999px;\">" + car.badge + "</span></div><p style=\"font-size:12px;color:var(--admin-text-secondary);margin:0 0 8px;\">" + car.color + " \u00b7 <strong>" + car.price + "</strong></p><div style=\"display:flex;gap:4px;flex-wrap:wrap;\">" + car.specs.map(function(s) { return "<span style=\"font-size:10px;background:var(--admin-bg);color:var(--admin-text-secondary);padding:3px 8px;border-radius:999px;font-weight:500;\">" + s + "</span>"; }).join("") + "</div></div></div>";
  }).join("");
}
