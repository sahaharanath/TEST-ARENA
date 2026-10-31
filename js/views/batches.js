// Batch management (Super Admin). Batches are global and shared across branches.
function batchesInit(query) {
  const tableEl = $("#batchesTable");
  const searchEl = $("#batchSearch");
  const addBtn = $("#btnAddBatch");
  let packages = [];
  let rows = [];

  async function load() {
    try {
      const [pSnap, bSnap] = await Promise.all([db.collection("packages").get(), db.collection("batches").get()]);
      packages = pSnap.docs.map((d) => d.data());
      rows = bSnap.docs.map((d) => d.data());
      render();
    } catch (err) {
      notify("Failed to load batches: " + (err.message || String(err)), "danger");
    }
  }

  function render() {
    const term = searchEl.value.toLowerCase();
    const filtered = rows.filter((b) =>
      (b.name || "").toLowerCase().includes(term) ||
      (b.session || "").toLowerCase().includes(term)
    );
    renderTable(tableEl, {
      columns: [
        { label: "Batch" },
        { label: "Session" },
        { label: "Programme / Course" },
        { label: "Start" },
        { label: "End" },
        { label: "Timing" },
        { label: "Status" },
        { label: "Actions", width: "200px" }
      ],
      rows: filtered,
      pageSize: 15,
      rowRenderer: (tbody, row) => {
        const prog = packages.find((p) => p.id === row.packageId);
        const crs = (window.AppViews && window.AppViews._courses) || [];
        const label = prog ? escapeHtml(prog.name) : (row.courseId || "\u2014");
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><b>" + escapeHtml(row.name) + "</b></td>" +
          "<td>" + escapeHtml(row.session || "\u2014") + "</td>" +
          "<td style='font-size:12.5px;'>" + label + "</td>" +
          "<td>" + fmtDate(row.startDate) + "</td>" +
          "<td>" + fmtDate(row.endDate) + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.timing || "\u2014") + "</td>" +
          "<td><span class='tag " + (row.status === "active" ? "active" : row.status === "completed" ? "inactive" : "pending") + "'>" + escapeHtml(row.status || "") + "</span></td>" +
          "<td>" +
          "<button class='small secondary' onclick=\"AppViews.batches.edit('" + escapeJs(row.id) + "')\">Edit</button> " +
          "<button class='small danger' onclick=\"AppViews.batches.remove('" + escapeJs(row.id) + "')\">Delete</button>" +
          "</td>";
        tbody.appendChild(tr);
      }
    });
  }

  searchEl.addEventListener("input", render);
  addBtn.onclick = () => batchesForm();

  window.AppViews = window.AppViews || {};
  window.AppViews.batches = {
    edit: (id) => batchesForm(id),
    remove: async (id) => {
      if (!confirm("Delete this batch? Admissions may reference it.")) return;
      try {
        await db.doc("batches/" + id).delete();
        await db.audit("batch.deleted", "batches", id);
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    }
  };

  function batchesForm(id) {
    const batch = rows.find((b) => b.id === id) || {
      name: "", session: "", packageId: "", courseId: "", startDate: "", endDate: "", timing: "", status: "active"
    };
    const pkgOptions = packages.map((p) =>
      '<option value="' + escapeHtml(p.id) + '" ' + (p.id === batch.packageId ? "selected" : "") + ">" + escapeHtml(p.name) + "</option>").join("");
    const body = `
      <div class="form-grid">
        <div class="form-group"><label>Batch name / number</label><input type="text" id="btName" value="${escapeHtml(batch.name)}" required></div>
        <div class="form-group"><label>Session</label><input type="text" id="btSession" value="${escapeHtml(batch.session || "")}" placeholder="e.g. 2025-26"></div>
        <div class="form-group"><label>Programme</label><select id="btPackage">${pkgOptions}</select></div>
        <div class="form-group"><label>Start date</label><input type="date" id="btStart" value="${escapeHtml(batch.startDate || "")}" required></div>
        <div class="form-group"><label>End date</label><input type="date" id="btEnd" value="${escapeHtml(batch.endDate || "")}" required></div>
        <div class="form-group"><label>Timing (optional)</label><input type="text" id="btTiming" value="${escapeHtml(batch.timing || "")}"></div>
        <div class="form-group"><label>Status</label><select id="btStatus"><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select></div>
      </div>
    `;
    const foot = `
      <button class="secondary" onclick="this.closest('.backdrop').remove()">Cancel</button>
      <button id="btSave">Save batch</button>
    `;
    openModal({ title: id ? "Edit Batch" : "Add Batch", bodyHtml: body, footHtml: foot });
    $("#btStatus").value = batch.status || "active";
    $("#btSave").onclick = async () => {
      const data = {
        name: $("#btName").value.trim(),
        session: $("#btSession").value.trim(),
        packageId: $("#btPackage").value,
        startDate: $("#btStart").value,
        endDate: $("#btEnd").value,
        timing: $("#btTiming").value.trim(),
        status: $("#btStatus").value,
        updatedAt: new Date().toISOString(),
        updatedBy: Auth.user.uid
      };
      if (!data.name || !data.startDate || !data.endDate) { notify("Name, start and end dates are required.", "warning"); return; }
      try {
        if (id) {
          await db.collection("batches").set({ id, ...data }, { merge: true });
          await db.audit("batch.updated", "batches", id, data);
        } else {
          await db.collection("batches").add({ ...data, createdAt: new Date().toISOString(), createdBy: Auth.user.uid });
        }
        closeLastModal();
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    };
  }

  function closeLastModal() {
    const b = document.querySelector(".backdrop.open");
    if (b) b.remove();
  }

  function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }

  load();
}
