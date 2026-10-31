// Unique Infotech CMS — data layer
// Unified API over Cloud Firestore (live) and DemoStore (local preview).
// Demo mode never writes to Firebase.

const db = {
  ready: firebaseReady,
  mode: firebaseReady ? "firestore" : "demo",

  // ---------- Firestore wrappers ----------
  _ref(path) {
    return firebaseFirestore.collection(path);
  },

  // collection reference
  collection(path) {
    if (this.mode === "firestore") return this._ref(path);
    return new DemoCollection(path);
  },

  doc(path) {
    if (this.mode === "firestore") return firebaseFirestore.doc(path);
    return new DemoDoc(path);
  },

  async runTransaction(updateFunction) {
    if (this.mode === "firestore") {
      return firebaseFirestore.runTransaction(updateFunction);
    }
    // Demo: best-effort sequential execution with a fake transaction object
    const t = { get: (ref) => Promise.resolve(new DemoSnap(DemoStore.get(ref.path.split("/")[0], ref.id))) };
    return updateFunction(t);
  },

  // ---------- helpers ----------
  async audit(action, targetCollection, targetId, details = {}) {
    if (!Auth.user) return;
    const entry = {
      uid: Auth.user.uid,
      email: Auth.user.email,
      role: Auth.user.role,
      action,
      targetCollection,
      targetId: targetId || null,
      details,
      createdAt: new Date().toISOString()
    };
    if (this.mode === "firestore") {
      await firebaseFirestore.collection("auditLog").add(entry);
    } else {
      DemoStore.add("auditLog", entry);
    }
  }
};

// ---------- Demo collection / doc / snapshot (mimics minimal Firestore API) ----------
class DemoCollection {
  constructor(path) {
    this.path = path;
    const parts = path.split("/");
    this.collectionName = parts[0];
    this.docId = parts.length > 1 ? parts[1] : null;
    this.subPath = parts.length > 2 ? parts.slice(2).join("/") : null;
    this._filters = [];
    this._orders = [];
    this._limitN = null;
  }
  where(field, op, value) { this._filters.push({ field, op, value }); return this; }
  orderBy(field, dir = "asc") { this._orders.push({ field, dir }); return this; }
  limit(n) { this._limitN = n; return this; }
  async get() {
    let rows;
    if (this.subPath) {
      const parent = DemoStore.get(this.collectionName, this.docId);
      rows = (parent && parent[this.subPath]) || [];
    } else {
      rows = DemoStore.q(this.collectionName, () => true);
      if (this.docId) rows = rows.filter((r) => r.id === this.docId);
    }
    rows = rows.filter((r) => this._filters.every((f) => {
      const v = r[f.field];
      if (f.op === "==") return v === f.value;
      if (f.op === "in") return f.value.includes(v);
      if (f.op === "array-contains") return Array.isArray(v) && v.includes(f.value);
      return true;
    }));
    this._orders.forEach((o) => {
      rows.sort((a, b) => {
        const x = a[o.field]; const y = b[o.field];
        if (x < y) return o.dir === "asc" ? -1 : 1;
        if (x > y) return o.dir === "asc" ? 1 : -1;
        return 0;
      });
    });
    if (this._limitN) rows = rows.slice(0, this._limitN);
    return new DemoSnapResult(rows.map((r) => new DemoSnap(r)));
  }
  async add(data) {
    if (this.subPath) {
      const parent = DemoStore.get(this.collectionName, this.docId) || {};
      parent[this.subPath] = parent[this.subPath] || [];
      const item = { ...data, id: uid() };
      parent[this.subPath].push(item);
      DemoStore.set(this.collectionName, this.docId, parent);
      return item;
    }
    return DemoStore.add(this.collectionName, { ...data, id: uid() });
  }
  async set(data, opts = {}) {
    if (this.subPath) {
      const parent = DemoStore.get(this.collectionName, this.docId) || {};
      parent[this.subPath] = data;
      return DemoStore.set(this.collectionName, this.docId, parent);
    }
    const id = this.docId || data.id || uid();
    const item = { ...data, id };
    if (opts.merge) {
      const cur = DemoStore.get(this.collectionName, id) || {};
      Object.assign(item, cur, data);
    }
    return DemoStore.set(this.collectionName, id, item);
  }
}

class DemoDoc {
  constructor(path) {
    const parts = path.split("/");
    this.collectionName = parts[0];
    this.id = parts[1];
    this.sub = parts.length > 2 ? parts.slice(2).join("/") : null;
  }
  async get() {
    const sub = this.sub;
    if (sub) {
      const [coll, docId, subColl] = this.sub.split("/");
      const parent = DemoStore.get(coll, docId);
      return new DemoSnap(parent && parent[subColl] ? { id: this.id, [subColl]: parent[subColl] } : undefined);
    }
    return new DemoSnap(DemoStore.get(this.collectionName, this.id));
  }
  async set(data, opts = {}) {
    if (this.sub) {
      const [coll, docId, subColl] = this.sub.split("/");
      const parent = DemoStore.get(coll, docId) || {};
      parent[subColl] = data;
      DemoStore.set(coll, docId, parent);
      return;
    }
    return DemoStore.set(this.collectionName, this.id, { ...data, id: this.id }, opts);
  }
  async delete() {
    if (this.sub) return;
    return DemoStore.remove(this.collectionName, this.id);
  }
  collection(subPath) {
    return new DemoCollection(this.path() + "/" + subPath);
  }
  path() { return this.collectionName + "/" + this.id; }
}

class DemoSnap {
  constructor(data) {
    this.dataObj = data;
    this.exists = data !== undefined;
  }
  data() { return this.dataObj; }
  get(field) { return this.dataObj && this.dataObj[field]; }
  ref = { id: (this.dataObj && this.dataObj.id) || null };
}
class DemoSnapResult {
  constructor(docs) { this.docs = docs; this.empty = docs.length === 0; }
  forEach(fn) { this.docs.forEach(fn); }
}

// expose
window.db = db;
