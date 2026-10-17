// Live status of the result server, checked from the visitor's browser (a separate file so the page's
// Content-Security-Policy can forbid inline scripts).
(function () {
  var local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  var api = new URLSearchParams(location.search).get("api") ||
    (local ? "http://" + location.hostname + ":8080/api" : "https://kvell-result-api.onrender.com/api");
  var box = document.getElementById("checks");

  function row(name, cls, text) {
    var d = document.createElement("div");
    d.className = "card";
    var a = document.createElement("span");
    a.textContent = name;
    var b = document.createElement("span");
    b.className = cls;
    b.textContent = text;
    d.appendChild(a);
    d.appendChild(b);
    return d;
  }

  function check() {
    box.textContent = "";
    var pending = row("Result server", "wait", "Checking… (a sleeping server can take up to a minute)");
    box.appendChild(pending);
    var started = Date.now();
    fetch(api + "/v1/public/health", { cache: "no-store" })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        box.textContent = "";
        var ms = Date.now() - started;
        box.appendChild(row("Result server", res.ok ? "ok" : "bad", res.ok ? "Working (" + ms + " ms)" : "Having problems"));
        box.appendChild(row("Database", res.body.database === "ok" ? "ok" : "bad",
          res.body.database === "ok" ? "Working" : "Not reachable"));
        box.appendChild(row("Student and staff sign-in", res.ok ? "ok" : "bad", res.ok ? "Available" : "May fail"));
      })
      .catch(function () {
        box.textContent = "";
        box.appendChild(row("Result server", "bad", "Not reachable right now. Please try again in a few minutes."));
      })
      .finally(function () {
        document.getElementById("when").textContent = "Last checked " + new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST.";
      });
  }

  check();
  setInterval(check, 60000);
})();
