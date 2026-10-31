// My profile — read-only details of the signed-in user
function profileInit(query) {
  const content = $("#profileContent");
  async function load() {
    try {
      let u;
      if (firebaseReady && firebaseFirestore) {
        const snap = await firebaseFirestore.collection("users").doc(Auth.user.uid).get();
        u = snap.data();
      } else {
        u = Auth.user;
      }
      if (!u) { content.innerHTML = "<div class='empty-state'><h3>Profile unavailable</h3></div>"; return; }
      content.innerHTML =
        '<div class="form-grid">' +
        '<div class="form-group"><label>Email</label><span class="field-value">' + escapeHtml(u.email || "") + '</span></div>' +
        '<div class="form-group"><label>Role</label><span class="field-value">' + escapeHtml((u.role || "").replace("superadmin", "Super Admin").replace("branchhead", "Branch Head").replace("schoolhead", "School Head")) + '</span></div>' +
        '<div class="form-group"><label>Name</label><span class="field-value">' + escapeHtml(u.name || "\u2014") + '</span></div>' +
        '<div class="form-group"><label>Branch</label><span class="field-value">' + escapeHtml(u.branchId ? (u.branchId) : "(organisation-wide / Head Office)") + '</span></div>' +
        '<div class="form-group"><label>Phone</label><span class="field-value">' + escapeHtml(u.phone || "\u2014") + '</span></div>' +
        '<div class="form-group"><label>Signed in via</label><span class="field-value">' + escapeHtml(u._provider || "demo") + '</span></div>' +
        '</div>';
    } catch (err) {
      notify("Failed to load profile: " + (err.message || String(err)), "danger");
    }
  }
  load();
}
function escapeHtml(s) { if (s == null) return ""; const d = document.createElement("div"); d.textContent = String(s); return d.innerHTML; }
