// Branches management (Super Admin only)
function branchesInit(query) {
  const tableEl = $("#branchesTable");
  const searchEl = $("#branchSearch");
  const addBtn = $("#btnAddBranch");

  let rows = [];

  async function load() {
    try {
      const snap = await db.collection("branches").get();
      rows = snap.docs.map((d) => d.data());
      render();
    } catch (err) {
      notify("Failed to load branches: " + (err.message || String(err)), "danger");
    }
  }

  function render() {
    const term = searchEl.value.toLowerCase();
    const filtered = rows.filter((b) =>
      b.name.toLowerCase().includes(term) ||
      (b.code || "").toLowerCase().includes(term) ||
      (b.address || "").toLowerCase().includes(term)
    );
    renderTable(tableEl, {
      columns: [
        { label: "Branch" },
        { label: "Code" },
        { label: "Address" },
        { label: "Phone" },
        { label: "Branch Head Email" },
        { label: "Status" },
        { label: "Actions", width: "170px" }
      ],
      rows: filtered,
      pageSize: 15,
      rowRenderer: (tbody, row) => {
        const tr = document.createElement("tr");
        const headName = row.headName || "\u2014";
        tr.innerHTML =
          "<td><b>" + escapeHtml(row.name) + "</b><br><span style='font-size:12px;color:var(--muted);'>" + escapeHtml(row.address || "") + "</span></td>" +
          "<td><span class='id-cell'>" + escapeHtml(row.code || "\u2014") + "</span></td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.address || "\u2014") + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml((row.phones || []).join(", ") || "\u2014") + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.branchHeadEmail || "\u2014") + "</td>" +
          "<td><span class='tag " + (row.status === "active" ? "active" : "inactive") + "'>" + escapeHtml(row.status || "") + "</span></td>" +
          "<td>" +
          "<button class='small secondary' onclick=\"AppViews.branches.edit('" + escapeJs(row.id) + "')\">Edit</button> " +
          "<button class='small' onclick=\"AppViews.branches.toggle('" + escapeJs(row.id) + "', " + (row.status === "active") + ")\">" + (row.status === "active" ? "Deactivate" : "Activate") + "</button> " +
          "<button class='small danger' onclick=\"AppViews.branches.remove('" + escapeJs(row.id) + "')\">Delete</button>" +
          "</td>";
        tbody.appendChild(tr);
      }
    });
  }

  searchEl.addEventListener("input", render);
  addBtn.onclick = () => branchesForm();

  window.AppViews = window.AppViews || {};
  window.AppViews.branches = {
    edit: (id) => branchesForm(id),
    toggle: async (id, active) => {
      if (!confirm("Change branch status to " + (active ? "inactive" : "active") + "?")) return;
      try {
        await db.collection("branches").set({ id, status: active ? "inactive" : "active" }, { merge: true });
        await db.audit("branch.status_changed", "branches", id, { to: active ? "inactive" : "active" });
        notify("Branch status updated.", "success");
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    },
    remove: async (id) => {
      if (!confirm("Delete this branch? This cannot be undone.")) return;
      try {
        await db.doc("branches/" + id).delete();
        await db.audit("branch.deleted", "branches", id);
        notify("Branch deleted.", "success");
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    }
  };

  function branchesForm(id) {
    const branch = rows.find((b) => b.id === id) || {
      name: "", address: "", phones: [], email: "", headName: "", headPhone: "", branchHeadEmail: "", code: "", status: "active"
    };
    const body = `
      <div class="form-grid">
        <div class="form-group"><label>Branch name</label><input type="text" id="fName" value="${escapeHtml(branch.name)}" required></div>
        <div class="form-group"><label>Branch code (short code for student IDs)</label><input type="text" id="fCode" value="${escapeHtml(branch.code)}" maxlength="6" required placeholder="e.g. BM"></div>
        <div class="form-group full"><label>Address</label><textarea id="fAddress" required>${escapeHtml(branch.address)}</textarea></div>
        <div class="form-group"><label>Phone numbers (comma separated)</label><input type="text" id="fPhones" value="${escapeHtml((branch.phones || []).join(", "))}" placeholder="9876543210, 9876543211"></div>
        <div class="form-group"><label>Email</label><input type="email" id="fEmail" value="${escapeHtml(branch.email || "")}"></div>
        <div class="form-group"><label>Branch Head name</label><input type="text" id="fHeadName" value="${escapeHtml(branch.headName || "")}"></div>
        <div class="form-group"><label>Branch Head phone</label><input type="text" id="fHeadPhone" value="${escapeHtml(branch.headPhone || "")}"></div>
        <div class="form-group full"><label>Authorised Branch Head email (Google Sign-In)</label><input type="email" id="fHeadEmail" value="${escapeHtml(branch.branchHeadEmail || "")}" placeholder="branch.head@example.com"><div class="field-note">Each branch must have a different authorised email. Changing it revokes the previous email's access.</div></div>
        <div class="form-group"><label>Status</label><select id="fStatus"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      </div>
    `;
    const foot = `
      <button class="secondary" onclick="this.closest('.backdrop').remove()">Cancel</button>
      <button id="fSave" class="icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Save branch</button>
    `;
    const backdrop = openModal({ title: id ? "Edit Branch" : "Add Branch", bodyHtml: body, footHtml: foot });
    $("#fStatus").value = branch.status || "active";
    $("#fSave").onclick = async () => {
      const phones = $("#fPhones").value.split(",").map((s) => s.trim()).filter(Boolean);
      const data = {
        name: $("#fName").value.trim(),
        code: $("#fCode").value.trim().toUpperCase(),
        address: $("#fAddress").value.trim(),
        phones,
        email: $("#fEmail").value.trim(),
        headName: $("#fHeadName").value.trim(),
        headPhone: $("#fHeadPhone").value.trim(),
        branchHeadEmail: $("#fHeadEmail").value.trim().toLowerCase(),
        status: $("#fStatus").value,
        updatedAt: new Date().toISOString(),
        updatedBy: Auth.user.uid
      };
      if (!data.name || !data.code || !data.address) { notify("Name, code and address are required.", "warning"); return; }
      try {
        if (id) {
          await db.collection("branches").set({ id, ...data }, { merge: true });
          await db.audit("branch.updated", "branches", id, data);
          notify("Branch updated.", "success");
        } else {
          data.createdAt = new Date().toISOString();
          data.createdBy = Auth.user.uid;
          await db.collection("branches").add(data);
          await db.audit("branch.created", "branches", data.id || "", data);
          notify("Branch created.", "success");
        }
        backdrop.remove();
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    };
  }

  load();
}

function escapeJs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
