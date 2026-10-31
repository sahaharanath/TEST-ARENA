// Unique Infotech CMS — application core
// Version tracking: APP_VERSION is the single source of truth for the app
// version. Keep the `v=` cache-buster on script tags in app.html / index.html
// synchronised with this value.
const APP_VERSION = "1.0.1";
const APP_NAME = "Unique Infotech CMS";
const ORG_FIREBASE_PROJECT = "unique-infotech-cms";

// Demo / preview mode flag. True when no real Firebase config is provided.
// Data is kept in localStorage and is clearly marked as demonstration data.
const DEMO_MODE = !((typeof FIREBASE_CONFIG !== "undefined") && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

// Session inactivity timeout: 35 minutes (within the 30–45 minute requirement)
const SESSION_IDLE_MS = 35 * 60 * 1000;

// Roles
const ROLE_SUPERADMIN = "superadmin";
const ROLE_BRANCHHEAD = "branchhead";
const ROLE_SCHOOLHEAD = "schoolhead";

// Sections
const SECTION_YOUTH = "youth";
const SECTION_SCHOOL = "school";

// Local storage keys (demo mode only)
const LS_USER = "uic_demo_user";
const LS_SESSION = "uic_demo_session";
const LS_SEED = "uic_demo_seeded";

// ---------------------------------------------------------------------------
// Utilities — attached to window so they are globally available across all
// script tags (including inline handlers in index.html) regardless of scope
// or load-order edge cases.
// ---------------------------------------------------------------------------
window.$ = (sel, root = document) => root.querySelector(sel);
window.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
window.on = (el, type, handler, opts = {}) => el.addEventListener(type, handler, opts);
window.off = (el, type, handler) => el.removeEventListener(type, handler);

window.fmtDate = function (input) {
  if (!input) return "";
  const d = input.toDate ? input.toDate() : new Date(input);
  if (isNaN(d)) return String(input);
  return d.toISOString().slice(0, 10);
};

window.fmtDateTime = function (input) {
  if (!input) return "";
  const d = input.toDate ? input.toDate() : new Date(input);
  if (isNaN(d)) return String(input);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
};

window.fmtMoney = function (v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "₹0.00";
  return "₹" + n.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
};

window.escapeHtml = function (text) {
  if (text == null) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
};

window.uid = function () {
  return "uic_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
};

// ---------------------------------------------------------------------------
// Demo store (localStorage) — preview only, never touches Firebase
// ---------------------------------------------------------------------------
const DemoStore = {
  _collections: {},
  _ready: false,

  init() {
    if (this._ready) return;
    this._ready = true;
    const names = [
      "users", "organisation", "branches", "courses", "packages", "batches",
      "students", "admissions", "studentHistory", "transactions",
      "schoolLevels", "schoolAdmissions", "schoolTransactions", "auditLog", "archives"
    ];
    names.forEach((n) => {
      const raw = localStorage.getItem("uic_demo_" + n);
      this._collections[n] = raw ? JSON.parse(raw) : [];
    });
    this.seedIfEmpty();
    this.persistAll();
  },

  persistAll() {
    Object.keys(this._collections).forEach((n) => {
      localStorage.setItem("uic_demo_" + n, JSON.stringify(this._collections[n]));
    });
  },

  persist(name) {
    localStorage.setItem("uic_demo_" + n, JSON.stringify(this._collections[name]));
  },

  seedIfEmpty() {
    if (this._collections.users.length > 0) return;
    const now = new Date().toISOString();
    const branches = [
      { id: "b_main", name: "Bankura Main Branch", address: "Kenduadihi, Bankura, West Bengal", phones: ["9876543210"], email: "main@uniqueinfotech.example", headName: "", headPhone: "", status: "active", branchHeadUid: null, branchHeadEmail: "", code: "BM", createdAt: now, updatedAt: now, createdBy: "superadmin" },
      { id: "b_north", name: "North Branch", address: "North Road, Bankura, West Bengal", phones: ["9876543211"], email: "north@uniqueinfotech.example", headName: "", headPhone: "", status: "active", branchHeadUid: null, branchHeadEmail: "", code: "BN", createdAt: now, updatedAt: now, createdBy: "superadmin" },
      { id: "b_south", name: "South Branch", address: "South Road, Bankura, West Bengal", phones: ["9876543212"], email: "south@uniqueinfotech.example", headName: "", headPhone: "", status: "active", branchHeadUid: null, branchHeadEmail: "", code: "BS", createdAt: now, updatedAt: now, createdBy: "superadmin" }
    ];
    this._collections.branches = branches;
    this._collections.organisation = [{
      id: "settings",
      name: "Unique Infotech",
      fullName: "Unique Infotech CMS",
      address: "Kenduadihi, Bankura, West Bengal, India",
      phones: ["9876543210"],
      email: "info@uniqueinfotech.example",
      logoUrl: "public/assets/images/logo.png",
      receiptInfo: "Bankura Zilla Youth Computer Training Centre, in collaboration with Unique Infotech",
      headOffice: "Unique Infotech Head Office, Kenduadihi, Bankura, West Bengal",
      currency: "INR",
      updatedAt: now, updatedBy: "superadmin"
    }];
    this._collections.users = [
      { uid: "u_super", email: "utpal.goutam@gmail.com", role: "superadmin", branchId: null, name: "Super Admin", phone: "", createdAt: now, updatedAt: now, lastSignIn: now }
    ];
    const courses = [
      { id: "c_cita", code: "CITA", name: "Certificate in Information Technology Application", description: "6-month certificate course", eligibility: "Madhyamik pass", semester: 1, durationMonths: 6, admissionFee: 1200, installments: [{month: "March", amount: 1000, dueDay: 10}, {month: "April", amount: 1000, dueDay: 10}, {month: "May", amount: 1000, dueDay: 10}, {month: "June", amount: 1000, dueDay: 10}], examFee: 500, studyMaterialFee: 300, packageId: null, status: "active", createdAt: now, updatedAt: now },
      { id: "c_dita", code: "DITA", name: "Diploma in Information Technology Application", description: "6-month diploma course (Semester 2)", eligibility: "CITA or equivalent", semester: 2, durationMonths: 6, admissionFee: 1200, installments: [{month: "March", amount: 1100, dueDay: 10}, {month: "April", amount: 1100, dueDay: 10}, {month: "May", amount: 1100, dueDay: 10}, {month: "June", amount: 1100, dueDay: 10}], examFee: 600, studyMaterialFee: 300, packageId: null, status: "active", createdAt: now, updatedAt: now },
      { id: "c_adita", code: "ADITA", name: "Advanced Diploma in Information Technology Application", description: "6-month advanced course (Semester 3)", eligibility: "DITA or equivalent", semester: 3, durationMonths: 6, admissionFee: 1500, installments: [{month: "March", amount: 1200, dueDay: 10}, {month: "April", amount: 1200, dueDay: 10}, {month: "May", amount: 1200, dueDay: 10}, {month: "June", amount: 1200, dueDay: 10}], examFee: 700, studyMaterialFee: 300, packageId: null, status: "active", createdAt: now, updatedAt: now }
    ];
    this._collections.courses = courses;
    this._collections.packages = [
      { id: "pkg_cita", name: "CITA Certificate Programme", type: "certificate", semesters: [{order: 1, courseId: "c_cita", courseName: "CITA", examFee: 500}], totalFee: 5000, status: "active", createdAt: now, updatedAt: now },
      { id: "pkg_dita", name: "DITA Diploma Programme", type: "diploma", semesters: [{order: 1, courseId: "c_cita", courseName: "CITA", examFee: 500}, {order: 2, courseId: "c_dita", courseName: "DITA", examFee: 600}], totalFee: 9500, status: "active", createdAt: now, updatedAt: now },
      { id: "pkg_adita", name: "18-Month Advanced Programme (name to be confirmed)", type: "programme18", semesters: [{order: 1, courseId: "c_cita", courseName: "CITA", examFee: 500}, {order: 2, courseId: "c_dita", courseName: "DITA", examFee: 600}, {order: 3, courseId: "c_adita", courseName: "ADITA", examFee: 700}], totalFee: 16000, status: "active", createdAt: now, updatedAt: now }
    ];
    this._collections.batches = [
      { id: "batch_jan26", name: "January 2026 Batch", session: "2025-26", packageId: "pkg_dita", courseId: null, startDate: "2026-01-05", endDate: "2026-06-30", timing: "10:00 AM", status: "active", createdAt: now, updatedAt: now, createdBy: "superadmin" },
      { id: "batch_cita26", name: "CITA January 2026 Batch", session: "2025-26", packageId: "pkg_cita", courseId: "c_cita", startDate: "2026-01-05", endDate: "2026-06-30", timing: "11:00 AM", status: "active", createdAt: now, updatedAt: now, createdBy: "superadmin" }
    ];
    // Demo students (clearly demonstration data)
    const sNow = now;
    const students = [
      { id: "s_1001", studentId: "YCC-BM-1001", fullName: "Rajib Kumar Das", photoUrl: "assets/images/placeholder.png", dob: "2006-04-12", gender: "Male", guardianName: "Sukhen Das", guardianPhone: "9123456701", studentPhone: "", address: "Kenduadihi, Bankura", branchId: "b_main", program: "youth", levelId: null, status: "active", admittedAt: "2026-01-05", updatedAt: sNow, createdBy: "branchhead" },
      { id: "s_1002", studentId: "YCC-BM-1002", fullName: "Priya Mondal", photoUrl: "assets/images/placeholder.png", dob: "2005-08-20", gender: "Female", guardianName: "Amal Mondal", guardianPhone: "9123456702", studentPhone: "", address: "Bankura Town", branchId: "b_main", program: "youth", levelId: null, status: "active", admittedAt: "2026-01-05", updatedAt: sNow, createdBy: "branchhead" },
      { id: "s_1003", studentId: "YCC-BN-1001", fullName: "Amit Shaw", photoUrl: "assets/images/placeholder.png", dob: "2007-01-10", gender: "Male", guardianName: "Rabin Shaw", guardianPhone: "9123456703", studentPhone: "", address: "North Road, Bankura", branchId: "b_north", program: "youth", levelId: null, status: "active", admittedAt: "2026-01-05", updatedAt: sNow, createdBy: "branchhead" },
      { id: "s_2001", studentId: "SK-2001", fullName: "Ananya Roy", photoUrl: "assets/images/placeholder.png", dob: "2010-03-05", gender: "Female", guardianName: "Subrata Roy", guardianPhone: "9123456704", studentPhone: "", address: "Kenduadihi, Bankura", branchId: null, program: "school", levelId: "lvl_basic", status: "active", admittedAt: "2026-01-10", updatedAt: sNow, createdBy: "schoolhead" }
    ];
    this._collections.students = students;
    this._collections.admissions = [
      { id: "a_1", studentId: "s_1001", courseId: "c_cita", packageId: "pkg_cita", batchId: "batch_cita26", branchId: "b_main", semester: 1, admissionDate: "2026-01-05", admissionFee: 1200, installments: [
        {month: "March", amount: 1000, dueDate: "2026-03-10", status: "paid", paidAt: "2026-03-09", paidAmount: 1000, fine: 0, waiver: 0},
        {month: "April", amount: 1000, dueDate: "2026-04-10", status: "unpaid", dueDateShown: true}
      ], examFee: 500, totalDue: 2700, totalPaid: 2200, balance: 500, previousAdmissionId: null, continuationNote: null, status: "active", createdAt: sNow, updatedAt: sNow, recordedBy: "branchhead" },
      { id: "a_2", studentId: "s_1002", courseId: "c_dita", packageId: "pkg_dita", batchId: "batch_jan26", branchId: "b_main", semester: 2, admissionDate: "2026-01-05", admissionFee: 1200, installments: [
        {month: "March", amount: 1100, dueDate: "2026-03-10", status: "paid", paidAt: "2026-03-12", paidAmount: 1100, fine: 2, waiver: 0},
        {month: "April", amount: 1100, dueDate: "2026-04-10", status: "unpaid"}
      ], examFee: 600, totalDue: 4100, totalPaid: 2502, balance: 1598, previousAdmissionId: "a_1", continuationNote: "Continued from CITA Semester 1 — verified from live records", status: "active", createdAt: sNow, updatedAt: sNow, recordedBy: "branchhead" },
      { id: "a_3", studentId: "s_2001", courseId: null, packageId: null, batchId: null, branchId: null, semester: null, admissionDate: "2026-01-10", admissionFee: 1000, installments: [], examFee: 0, totalDue: 1000, totalPaid: 1000, balance: 0, previousAdmissionId: null, continuationNote: null, status: "active", createdAt: sNow, updatedAt: sNow, recordedBy: "schoolhead" }
    ];
    this._collections.transactions = [
      { id: "txn_1", txnId: "txn_1", studentId: "s_1001", studentName: "Rajib Kumar Das", branchId: "b_main", courseId: "c_cita", batchId: "batch_cita26", program: "youth", description: "Admission Fee — CITA", amount: 1200, fine: 0, waiver: 0, method: "cash", paidAt: "2026-01-05", recordedBy: "branchhead", receiptNumber: "RCP-0001", refunded: false },
      { id: "txn_2", txnId: "txn_2", studentId: "s_1001", studentName: "Rajib Kumar Das", branchId: "b_main", courseId: "c_cita", batchId: "batch_cita26", program: "youth", description: "Installment 1 — March", amount: 1000, fine: 0, waiver: 0, method: "cash", paidAt: "2026-03-09", recordedBy: "branchhead", receiptNumber: "RCP-0002", refunded: false },
      { id: "txn_3", txnId: "txn_3", studentId: "s_1002", studentName: "Priya Mondal", branchId: "b_main", courseId: "c_dita", batchId: "batch_jan26", program: "youth", description: "Admission Fee — DITA", amount: 1200, fine: 0, waiver: 0, method: "upi", paidAt: "2026-01-05", recordedBy: "branchhead", receiptNumber: "RCP-0003", refunded: false },
      { id: "txn_4", txnId: "txn_4", studentId: "s_1002", studentName: "Priya Mondal", branchId: "b_main", courseId: "c_dita", batchId: "batch_jan26", program: "youth", description: "Installment 1 — March (late by 2 days)", amount: 1100, fine: 2, waiver: 0, method: "cash", paidAt: "2026-03-12", recordedBy: "branchhead", receiptNumber: "RCP-0004", refunded: false },
      { id: "txn_5", txnId: "txn_5", studentId: "s_2001", studentName: "Ananya Roy", branchId: null, courseId: null, batchId: null, program: "school", description: "Admission Fee — Basic Level", amount: 1000, fine: 0, waiver: 0, method: "cash", paidAt: "2026-01-10", recordedBy: "schoolhead", receiptNumber: "RCP-0005", refunded: false }
    ];
    this._collections.schoolLevels = [
      { id: "lvl_basic", name: "Basic", monthlyFee: 400, admissionFee: 1000, studyMaterialFee: 200, status: "active", createdAt: now, updatedAt: now },
      { id: "lvl_advance", name: "Advance", monthlyFee: 600, admissionFee: 1000, studyMaterialFee: 200, status: "active", createdAt: now, updatedAt: now },
      { id: "lvl_third", name: "Third Level (name to be confirmed)", monthlyFee: 800, admissionFee: 1000, studyMaterialFee: 200, status: "active", createdAt: now, updatedAt: now }
    ];
    this._collections.schoolAdmissions = [
      { id: "sa_1", studentId: "s_2001", levelId: "lvl_basic", class: "VIII", section: "A", admissionDate: "2026-01-10", monthlyFee: 400, status: "active", createdAt: sNow, updatedAt: sNow }
    ];
    this._collections.auditLog = [];
    this._collections.archives = [];
  },

  q(collection, filterFn) {
    return (this._collections[collection] || []).filter(filterFn);
  },

  get(collection, id) {
    return (this._collections[collection] || []).find((d) => d.id === id);
  },

  add(collection, doc) {
    const item = { id: doc.id || uid(), ...doc, createdAt: doc.createdAt || new Date().toISOString() };
    this._collections[collection].push(item);
    this.persist(collection);
    return item;
  },

  set(collection, id, updates) {
    const idx = this._collections[collection].findIndex((d) => d.id === id);
    if (idx === -1) return null;
    this._collections[collection][idx] = { ...this._collections[collection][idx], ...updates, updatedAt: new Date().toISOString() };
    this.persist(collection);
    return this._collections[collection][idx];
  },

  remove(collection, id) {
    this._collections[collection] = (this._collections[collection] || []).filter((d) => d.id !== id);
    this.persist(collection);
  },

  count(collection, filterFn) {
    return this.q(collection, filterFn).length;
  }
};

// ---------------------------------------------------------------------------
// Frontend notification
// ---------------------------------------------------------------------------
function notify(message, type = "info") {
  const el = $("#uic-notify");
  if (!el) return;
  el.textContent = message;
  el.className = "uic-notify uic-notify--" + type;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 5000);
}

// ---------- Shared: record a payment transaction (idempotent) ----------
async function recordTransaction(txn) {
  const data = {
    txnId: txn.txnId || uid(),
    studentId: txn.studentId,
    studentName: txn.studentName,
    branchId: txn.branchId || null,
    courseId: txn.courseId || null,
    batchId: txn.batchId || null,
    program: txn.program,
    description: txn.description,
    amount: Number(txn.amount || 0),
    fine: Number(txn.fine || 0),
    waiver: Number(txn.waiver || 0),
    method: txn.method,
    paidAt: txn.paidAt || new Date().toISOString(),
    recordedBy: txn.recordedBy || (Auth.user && Auth.user.uid),
    receiptNumber: txn.receiptNumber || null,
    refunded: false,
    createdAt: new Date().toISOString()
  };
  const existing = (await db.collection("transactions").get()).docs.find((d) => d.data().txnId === data.txnId);
  if (existing) throw new Error("Duplicate transaction: this payment was already recorded.");
  await db.collection("transactions").add(data);
  await db.audit("transaction.recorded", "transactions", data.txnId, data);
  return data;
}
window.recordTransaction = recordTransaction;
