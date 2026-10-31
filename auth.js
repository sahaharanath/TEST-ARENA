// Unique Infotech CMS — authentication & session
// Handles both Firebase Auth (live) and local preview (demo) mode.

const Auth = {
  user: null,
  firebaseListener: null,
  idleTimer: null,
  lastActivity: Date.now(),

  // ---------- Init ----------
  init() {
    this._setupIdleTimer();
    this._trackActivity();
    if (firebaseReady && firebaseAuth) {
      this._initFirebaseAuth();
    } else {
      this._initDemoAuth();
    }
  },

  _trackActivity() {
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    events.forEach((ev) => document.addEventListener(ev, () => {
      this.lastActivity = Date.now();
    }, { passive: true }));
  },

  _setupIdleTimer() {
    this.idleTimer = setInterval(() => {
      if (!this.user) return;
      if (Date.now() - this.lastActivity > SESSION_IDLE_MS) {
        console.info("[Auth] Session idle timeout — logging out");
        this.logout(true);
      }
    }, 60 * 1000);
  },

  // ---------- Firebase auth ----------
  _initFirebaseAuth() {
    firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const doc = await firebaseFirestore.collection("users").doc(firebaseUser.uid).get();
          if (!doc.exists) {
            console.warn("[Auth] No user profile for UID", firebaseUser.uid);
            await firebaseAuth.signOut();
            return;
          }
          this.user = { uid: firebaseUser.uid, ...doc.data(), _provider: "firebase" };
          AppShell.onAuthStateChange(this.user);
        } catch (err) {
          console.error("[Auth] profile load failed", err);
        }
      } else {
        this.user = null;
        AppShell.onAuthStateChange(null);
      }
    });
  },

  // ---------- Demo auth (preview only) ----------
  _initDemoAuth() {
    const raw = localStorage.getItem(LS_USER);
    if (raw) {
      this.user = JSON.parse(raw);
      AppShell.onAuthStateChange(this.user);
    } else {
      AppShell.onAuthStateChange(null);
    }
  },

  // ---------- Public API ----------
  async login(email, password) {
    if (firebaseReady && firebaseAuth) {
      const cred = await firebaseAuth.signInWithEmailAndPassword(email, password);
      return cred.user;
    }
    // Demo mode: accept the configured Super Admin email; any non-empty password
    if (email.toLowerCase() === "utpal.goutam@gmail.com") {
      const user = {
        uid: "u_super",
        email: email,
        role: ROLE_SUPERADMIN,
        branchId: null,
        name: "Super Admin",
        phone: "",
        _provider: "demo"
      };
      localStorage.setItem(LS_USER, JSON.stringify(user));
      this.user = user;
      this.lastActivity = Date.now();
      AppShell.onAuthStateChange(user);
      return user;
    }
    // Demo branch head / school head logins via email
    const DemoStore = window.DemoStore;
    const branch = DemoStore.q("branches", (b) => b.branchHeadEmail === email.toLowerCase())[0];
    if (branch && branch.branchHeadUid) {
      const prof = DemoStore.get("users", branch.branchHeadUid);
      if (prof) {
        localStorage.setItem(LS_USER, JSON.stringify(prof));
        this.user = prof;
        this.lastActivity = Date.now();
        AppShell.onAuthStateChange(prof);
        return prof;
      }
    }
    throw new Error("Invalid email or password (demo mode)");
  },

  async googleSignIn() {
    if (firebaseReady && firebaseAuth) {
      const provider = new firebase.auth.GoogleAuthProvider();
      const cred = await firebaseAuth.signInWithPopup(provider);
      const uid = cred.user.uid;
      const doc = await firebaseFirestore.collection("users").doc(uid).get();
      if (!doc.exists) throw new Error("No authorised profile found for this Google account. Contact the Super Admin.");
      this.user = { uid, ...doc.data(), _provider: "google" };
      AppShell.onAuthStateChange(this.user);
      return this.user;
    }
    throw new Error("Google Sign-In requires live Firebase configuration.");
  },

  async logout(silent = false) {
    try {
      if (firebaseReady && firebaseAuth) await firebaseAuth.signOut();
    } catch (e) { /* ignore */ }
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_SESSION);
    const was = this.user;
    this.user = null;
    clearInterval(this.idleTimer);
    if (!silent) notify("Logged out.", "info");
    AppShell.onAuthStateChange(null);
    if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
      // already on login
    } else {
      window.location.replace("index.html");
    }
  },

  isSuperAdmin() { return this.user && this.user.role === ROLE_SUPERADMIN; },
  isBranchHead() { return this.user && this.user.role === ROLE_BRANCHHEAD; },
  isSchoolHead() { return this.user && this.user.role === ROLE_SCHOOLHEAD; },
  canSection(section) {
    if (!this.user) return false;
    if (this.user.role === ROLE_SUPERADMIN) return true;
    if (section === SECTION_SCHOOL) return this.user.role === ROLE_SCHOOLHEAD;
    if (section === SECTION_YOUTH) return this.user.role === ROLE_BRANCHHEAD || this.user.role === ROLE_SUPERADMIN;
    return false;
  },
  sectionForRole() {
    if (!this.user) return null;
    if (this.user.role === ROLE_SUPERADMIN) return SECTION_YOUTH;
    if (this.user.role === ROLE_BRANCHHEAD) return SECTION_YOUTH;
    if (this.user.role === ROLE_SCHOOLHEAD) return SECTION_SCHOOL;
    return null;
  },
  branchId() { return this.user ? this.user.branchId : null; }
};

// expose for demo store and inline handlers
window.Auth = Auth;
window.DemoStore = DemoStore;
