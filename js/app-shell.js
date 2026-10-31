// Unique Infotech CMS — SPA shell: sidebar, navigation, auth state, view router

const AppShell = {
  currentSection: null,
  currentRole: null,
  routeScriptsLoaded: new Set(),

  routes: {
    "/": { html: "views/dashboard-youth.html", controller: "js/views/dashboard-youth.js", title: "Dashboard", section: "youth", roles: [ROLE_SUPERADMIN, ROLE_BRANCHHEAD] },
    "/dashboard-youth": { html: "views/dashboard-youth.html", controller: "js/views/dashboard-youth.js", title: "Dashboard", section: "youth", roles: [ROLE_SUPERADMIN, ROLE_BRANCHHEAD] },
    "/dashboard-school": { html: "views/dashboard-school.html", controller: "js/views/dashboard-school.js", title: "Dashboard", section: "school", roles: [ROLE_SUPERADMIN, ROLE_SCHOOLHEAD] },
    "/branches": { html: "views/branches.html", controller: "js/views/branches.js", title: "Branches", section: "youth", roles: [ROLE_SUPERADMIN] },
    "/branch-heads": { html: "views/branch-heads.html", controller: "js/views/branch-heads.js", title: "Branch Heads", section: "youth", roles: [ROLE_SUPERADMIN] },
    "/organisation": { html: "views/organisation.html", controller: "js/views/organisation.js", title: "Organisation Details", section: "youth", roles: [ROLE_SUPERADMIN] },
    "/courses": { html: "views/courses.html", controller: "js/views/courses.js", title: "Courses", section: "youth", roles: [ROLE_SUPERADMIN] },
    "/packages": { html: "views/packages.html", controller: "js/views/packages.js", title: "Programme Builder", section: "youth", roles: [ROLE_SUPERADMIN] },
    "/batches": { html: "views/batches.html", controller: "js/views/batches.js", title: "Batches", section: "youth", roles: [ROLE_SUPERADMIN] },
    "/students": { html: "views/students.html", controller: "js/views/students.js", title: "Students", section: "youth", roles: [ROLE_SUPERADMIN, ROLE_BRANCHHEAD] },
    "/admission": { html: "views/admission.html", controller: "js/views/admission.js", title: "New Admission", section: "youth", roles: [ROLE_SUPERADMIN, ROLE_BRANCHHEAD] },
    "/continuation": { html: "views/continuation.html", controller: "js/views/continuation.js", title: "Semester Continuation", section: "youth", roles: [ROLE_SUPERADMIN, ROLE_BRANCHHEAD] },
    "/pay-fees": { html: "views/pay-fees.html", controller: "js/views/pay-fees.js", title: "Pay Fees", section: "youth", roles: [ROLE_SUPERADMIN, ROLE_BRANCHHEAD] },
    "/payments": { html: "views/payments.html", controller: "js/views/payments.js", title: "Payment History", section: "youth", roles: [ROLE_SUPERADMIN, ROLE_BRANCHHEAD] },
    "/receipt": { html: "views/receipt.html", controller: "js/views/receipt.js", title: "Receipt", section: "youth", roles: [ROLE_SUPERADMIN, ROLE_BRANCHHEAD] },
    "/reports": { html: "views/reports.html", controller: "js/views/reports.js", title: "Reports", section: "youth", roles: [ROLE_SUPERADMIN] },
    "/archives": { html: "views/archives.html", controller: "js/views/archives.js", title: "Archives", section: "youth", roles: [ROLE_SUPERADMIN] },
    "/school-students": { html: "views/school-students.html", controller: "js/views/school-students.js", title: "Students", section: "school", roles: [ROLE_SUPERADMIN, ROLE_SCHOOLHEAD] },
    "/school-levels": { html: "views/school-levels.html", controller: "js/views/school-levels.js", title: "Levels", section: "school", roles: [ROLE_SUPERADMIN] },
    "/school-fees": { html: "views/school-fees.html", controller: "js/views/school-fees.js", title: "Monthly Fees", section: "school", roles: [ROLE_SUPERADMIN, ROLE_SCHOOLHEAD] },
    "/school-payments": { html: "views/school-payments.html", controller: "js/views/school-payments.js", title: "School Payments", section: "school", roles: [ROLE_SUPERADMIN, ROLE_SCHOOLHEAD] },
    "/school-reports": { html: "views/school-reports.html", controller: "js/views/school-reports.js", title: "School Reports", section: "school", roles: [ROLE_SUPERADMIN, ROLE_SCHOOLHEAD] },
    "/profile": { html: "views/profile.html", controller: "js/views/profile.js", title: "Profile", section: "both", roles: [ROLE_SUPERADMIN, ROLE_BRANCHHEAD, ROLE_SCHOOLHEAD] }
  },

  init() {
    this._bindShell();
    Auth.init();
  },

  onAuthStateChange(user) {
    if (!user) {
      // Not authenticated: go to login (unless already there)
      if (!window.location.pathname.endsWith("index.html") && window.location.pathname !== "/") {
        window.location.replace("index.html");
      }
      return;
    }
    this.currentRole = user.role;
    this.currentSection = Auth.sectionForRole();

    // If we are on the login page, redirect to the app shell after successful login
    if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
      window.location.replace("app.html");
      return;
    }

    this._renderSidebar();
    this._updateTopbar(user);
    this._route();
  },

  _bindShell() {
    const menuToggle = $("#menuToggle");
    const sidebar = $("#sidebar");
    const overlay = $("#sidebarOverlay");
    const topLogout = $("#topLogout");
    const sideLogout = $("#sidebarLogout");

    if (menuToggle) {
      menuToggle.onclick = () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("open");
      };
    }
    if (overlay) {
      overlay.onclick = () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("open");
      };
    }
    const doLogout = () => Auth.logout();
    if (topLogout) topLogout.onclick = doLogout;
    if (sideLogout) sideLogout.onclick = doLogout;

    // Section switcher
    const sectionSwitch = $("#sectionSwitch");
    const sectionValue = $("#sectionValue");
    if (sectionSwitch) {
      sectionSwitch.onclick = () => this._toggleSection();
    }

    window.addEventListener("hashchange", () => this._route());
  },

  _updateTopbar(user) {
    $("#userName").textContent = user.name || user.email;
    $("#userRole").textContent = (user.role || "").replace("superadmin", "Super Admin").replace("branchhead", "Branch Head").replace("schoolhead", "School Head");
    $("#userChip").style.display = "flex";
    $("#topLogout").style.display = "inline-block";
  },

  _toggleSection() {
    if (this.currentRole === ROLE_SUPERADMIN) {
      this.currentSection = this.currentSection === "youth" ? "school" : "youth";
    }
    this._renderSidebar();
    // Return to dashboard of current section
    Router.navigate(this.currentSection === "school" ? "#/dashboard-school" : "#/");
  },

  _renderSidebar() {
    const nav = $("#sidebarNav");
    const tag = $("#sidebarSectionTag");
    const sectionSwitch = $("#sectionSwitch");
    const sectionLabel = $("#sectionLabel");
    const sectionValue = $("#sectionValue");

    const isSuper = this.currentRole === ROLE_SUPERADMIN;
    const isSchool = this.currentRole === ROLE_SCHOOLHEAD;
    this.currentSection = isSchool ? "school" : (this.currentSection || "youth");

    tag.textContent = this.currentSection === "school" ? "School Computer Program (Unique Kids)" : "Youth Computer Centre";
    sectionLabel.textContent = "Section:";
    sectionValue.textContent = this.currentSection === "school" ? "Unique Kids" : "Youth Centre";
    sectionSwitch.style.display = isSuper ? "inline-flex" : "none";

    let items = [];
    if (this.currentSection === "school") {
      items = [
        { path: "/dashboard-school", label: "Dashboard", icon: "home" },
        { path: "/school-students", label: "Students", icon: "users" },
        { path: "/school-fees", label: "Monthly Fees", icon: "creditCard" },
        { path: "/school-payments", label: "School Payments", icon: "fileText" },
        { path: "/school-reports", label: "Reports", icon: "newspaper" },
        { path: "/profile", label: "Profile", icon: "user" }
      ];
      if (isSuper) items.splice(4, 0, { path: "/school-levels", label: "Levels", icon: "layout" });
    } else {
      items = [
        { path: "/", label: "Dashboard", icon: "home" },
        { path: "/students", label: "Students", icon: "users" },
        { path: "/admission", label: "Admissions", icon: "userPlus" },
        { path: "/continuation", label: "Semester Continuation", icon: "arrowRight" },
        { path: "/pay-fees", label: "Pay Fees", icon: "creditCard" },
        { path: "/payments", label: "Payments", icon: "fileText" },
        { path: "/receipt", label: "Receipts", icon: "receipt" },
        { path: "/reports", label: "Reports", icon: "newspaper" },
        { path: "/archives", label: "Archives", icon: "archive" }
      ];
      if (isSuper) {
        items.splice(1, 0,
          { path: "/branches", label: "Branches", icon: "building" },
          { path: "/branch-heads", label: "Branch Heads", icon: "userCheck" },
          { path: "/organisation", label: "Organisation Details", icon: "settings" },
          { path: "/courses", label: "Courses", icon: "bookOpen" },
          { path: "/packages", label: "Programme Builder", icon: "layers" },
          { path: "/batches", label: "Batches", icon: "layoutGrid" }
        );
      }
      items.push({ path: "/profile", label: "Profile", icon: "user" });
    }

    nav.innerHTML = items.map((it) => {
      const active = location.hash === "#" + it.path || location.hash.startsWith("#" + it.path + "?") ? "active" : "";
      return '<li><a href="#' + it.path + '" class="' + active + '"><span class="icon-lucide" style="width:16px;height:16px;stroke-width:1.6;">' + icon(it.icon) + '</span>' + escapeHtml(it.label) + '</a></li>';
    }).join("");
  },

  _route() {
    const hash = location.hash.replace(/^#/, "") || "/";
    const path = hash.split("?")[0];
    const route = this.routes[path];
    if (!route) {
      Router.navigate("#/");
      return;
    }
    // Section guard: cannot view youth pages while in school section and vice versa
    if (route.section !== "both" && this.currentSection && route.section !== this.currentSection) {
      Router.navigate(this.currentSection === "school" ? "#/dashboard-school" : "#/");
      return;
    }
    // Role guard
    if (route.roles && !route.roles.includes(this.currentRole)) {
      notify("You are not authorised to open this module.", "warning");
      Router.navigate(this.currentSection === "school" ? "#/dashboard-school" : "#/");
      return;
    }
    $("#sidebarNav").querySelectorAll("a").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === "#" + path);
    });
    this._loadView(route, hash.split("?")[1] || "");
  },

  async _loadView(route, query) {
    const outlet = $("#router-outlet");
    outlet.innerHTML = '<div style="padding:16px;color:var(--muted);"><span class="spinner"></span> Loading...</div>';

    try {
      const resp = await fetch(route.html + "?v=" + APP_VERSION);
      if (!resp.ok) throw new Error("View not found: " + route.html);
      const html = await resp.text();
      outlet.innerHTML = html;
    } catch (err) {
      outlet.innerHTML = "<div class='empty-state'><h3>View load failed</h3><p>" + escapeHtml(err.message || String(err)) + "</p></div>";
      return;
    }

    if (route.controller && !this.routeScriptsLoaded.has(route.controller)) {
      await this._loadScript(route.controller);
      this.routeScriptsLoaded.add(route.controller);
    }

    const initName = route.controller.split("/").pop().replace(".js", "") + "Init";
    const initFn = window[initName];
    if (typeof initFn === "function") {
      try { initFn(query); } catch (err) {
        console.error("View init error", route.controller, err);
        notify("Error initialising view: " + (err.message || String(err)), "danger");
      }
    }
  },

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src + "?v=" + APP_VERSION;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
};

window.AppShell = AppShell;
window.App = AppShell; // backward-compatible alias used by auth.js
