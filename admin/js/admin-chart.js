// ╔══════════════════════════════════════════════════════════╗
// ║  Tesla Award — Admin Panel: Activity Chart
// ╚══════════════════════════════════════════════════════════╝

// ---- ACTIVITY CHART ----
function loadActivityChart() {
  var chart = document.getElementById("activityChart"); var labels = document.getElementById("chartLabels");
  if (!chart || !labels) return;
  var days = []; var now = new Date();
  for (var i = 6; i >= 0; i--) { var d = new Date(now); d.setDate(d.getDate() - i); days.push({ date: d, label: d.toLocaleDateString("en-US", { weekday: "short" }), count: 0 }); }
  allUsers.forEach(function(u) { var d = new Date(u.created_at); days.forEach(function(day) { if (d.toDateString() === day.date.toDateString()) day.count++; }); });
  var max = Math.max.apply(null, days.map(function(d) { return d.count; }));
  chart.innerHTML = days.map(function(d) { var h = max > 0 ? Math.max((d.count / max) * 140, 4) : 4; return "<div class=\"activity-bar\" style=\"height:" + h + "px\"><div class=\"bar-tooltip\">" + d.count + " user" + (d.count !== 1 ? "s" : "") + "</div></div>"; }).join("");
  labels.innerHTML = days.map(function(d) { return "<span>" + d.label + "</span>"; }).join("");
}
