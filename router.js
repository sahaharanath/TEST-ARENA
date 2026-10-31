// Unique Infotech CMS — hash router (vanilla JS)
const Router = {
  routes: {},
  current: null,

  add(path, handler) {
    this.routes[path] = handler;
  },

  async navigate(path) {
    window.location.hash = path;
  },

  async start() {
    window.addEventListener("hashchange", () => this._dispatch());
    if (!location.hash) location.hash = "#/";
    this._dispatch();
  },

  async _dispatch() {
    const hash = location.hash.replace(/^#/, "");
    const [path, ...q] = hash.split("?");
    const route = this.routes[path] || this.routes["/"];
    if (!route) {
      document.querySelector("#router-outlet").innerHTML = "<div class='empty-state'><h3>View not found</h3><p>No handler registered for path: " + escapeHtml(path) + "</p></div>";
      return;
    }
    this.current = { path, query: q.join("?") };
    const outlet = $("#router-outlet");
    outlet.innerHTML = "";
    try {
      if (typeof route.before === "function") {
        const ok = await route.before(this.current);
        if (ok === false) return;
      }
      await route.render(outlet, this.current.query);
    } catch (err) {
      console.error("Router error for " + path, err);
      outlet.innerHTML = "<div class='empty-state'><h3>Error loading view</h3><p>" + escapeHtml(err.message || String(err)) + "</p></div>";
    }
  }
};

// expose
window.Router = Router;
window.escapeHtml = escapeHtml;
