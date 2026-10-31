// Branch Head management (Super Admin)
// Each branch has one authorised email (Google Sign-In). Changing the email
// immediately revokes the previous email's access.
function branchHeadsInit(query) {
  const tableEl = $("#bhTable");
  const searchEl = $("#bhSearch");
  let branches = [];
  let users = [];

  async function load() {
    try {
      const [bSnap, uSnap] = await Promise.all([db.collection("branches").get(), db.collection("users").get()]);
      branches = bSnap.docs.map((d) => d.data());
      users = uSnap.docs.map((d) => d.data());
      render();
    } catch (err) {
      notify("Failed to load branch heads: " + (err.message || String(err)), "danger");
    }
  }

  function render() {
    const term = searchEl.value.toLowerCase();
    const filtered = branches.filter((b) =>
      (b.name || "").toLowerCase().includes(term) ||
      (b.branchHeadEmail || "").toLowerCase().includes(term)
    );
    renderTable(tableEl, {
      columns: [
        { label: "Branch" },
        { label: "Authorised email (Branch Head)" },
        { label: "Status" },
        { label: "Actions", width: "260px" }
      ],
      rows: filtered,
      pageSize: 15,
      rowRenderer: (tbody, row) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><b>" + escapeHtml(row.name) + "</b></td>" +
          "<td><span class='id-cell'>" + escapeHtml(row.branchHeadEmail || "\u2014 not assigned") + "</span></td>" +
          "<td><span class='tag " + (row.status === "active" ? "active" : "inactive") + "'>" + escapeHtml(row.status || "") + "</span></td>" +
          "<td>" +
          "<button class='small secondary' onclick=\"AppViews.branchHeads.assign('" + escapeJs(row.id) + "')\">Assign / Change Head</button> " +
          "<button class='small' onclick=\"AppViews.branchHeads.clear('" + escapeJs(row.id) + "')\" " + (!row.branchHeadEmail ? "disabled" : "") + ">Remove access</button>" +
          "</td>";
        tbody.appendChild(tr);
      }
    });
  }

  searchEl.addEventListener("input", render);

  window.AppViews = window.AppViews || {};
  window.AppViews.branchHeads = {
    assign: async (id) => {
      const branch = branches.find((b) => b.id === id);
      if (!branch) return;
      const body = `
        <div class="form-group">
          <label>Authorised email for <b>${escapeHtml(branch.name)}</b> (Google Sign-In)</label>
          <input type="email" id="bhEmail" value="${escapeHtml(branch.branchHeadEmail || "")}" required>
          <div class="field-note">Each branch must have a different authorised email. Changing it revokes the previous email\u2019s access.</div>
        </div>
        <div class="form-group">
          <label>Branch Head name (display)</label>
          <input type="text" id="bhName" value="${escapeHtml(branch.headName || "")}">
        </div>
        <div class="form-group">
          <label>Branch Head phone</label>
          <input type="text" id="bhPhone" value="${escapeHtml(branch.headPhone || "")}">
        </div>
      `;
      const foot = `
        <button class="secondary" onclick="this.closest('.backdrop').remove()">Cancel</button>
        <button id="bhSave">Save authorisation</button>
      `;
      openModal({ title: "Assign Branch Head", bodyHtml: body, footHtml: foot });
      $("#bhSave").onclick = async () => {
        const email = $("#bhEmail").value.trim().toLowerCase();
        const name = $("#bhName").value.trim();
        const phone = $("#bhPhone").value.trim();
        if (!email) { notify("Email is required.", "warning"); return; }
        // uniqueness across branches
        const conflict = branches.find((b) => b.id !== id && b.branchHeadEmail === email);
        if (conflict) { notify("Email " + email + " is already authorised for branch " + escapeHtml(conflict.name) + ".", "danger"); return; }
        try {
          const updates = { branchHeadEmail: email, headName: name, headPhone: phone, updatedAt: new Date().toISOString(), updatedBy: Auth.user.uid };
          await db.collection("branches").set({ id, ...updates }, { merge: true });
          // Create/update the user profile so the email can sign in (Google Sign-In profile created on first sign-in;
          // here we pre-create the role mapping so access is immediate and the old email is revoked).
          const existingUser = users.find((u) => u.email === branch.branchHeadEmail);
          if (existingUser) {
            await db.collection("users").set({ id: existingUser.id, email, role: "branchhead", branchId: id, name, phone, updatedAt: new Date().toISOString() }, { merge: true });
          } else {
            const added = await db.collection("users").add({ email, role: "branchhead", branchId: id, name, phone, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            updates.uid = added.id;
            await db.collection("users").set({ id: added.id, ...updates }, { merge: true });
          }
          await db.audit("branch.head.assigned", "branches", id, { email, previous: branch.branchHeadEmail });
          notify("Branch Head authorised: " + email, "success");
          closeLastModal();
          load();
        } catch (err) { notify("Failed: " + err.message, "danger"); }
      };
    },
    clear: async (id) => {
      if (!confirm("Remove Branch Head access from this branch? The authorised email will no longer be able to sign in.")) return;
      try {
        const branch = branches.find((b) => b.id === id);
        const prev = branch.branchHeadEmail;
        await db.collection("branches").set({ id, branchHeadEmail: "", headName: "", headPhone: "", updatedAt: new Date().toISOString(), updatedBy: Auth.user.uid }, { merge: true });
        const user = users.find((u) => u.email === prev);
        if (user) {
          await db.collection("users").set({ id: user.id, branchId: null, role: "branchhead", updatedAt: new Date().toISOString() }, { merge: true });
        }
        await db.audit("branch.head.removed", "branches", id, { previous: prev });
        notify("Access removed.", "success");
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    }
  };

  function closeLastModal() {
    const b = document.querySelector(".backdrop.open");
    if (b) b.remove();
  }

  function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }

  load();
}
