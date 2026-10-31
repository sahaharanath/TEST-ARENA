// Unique Kids — level configuration (Super Admin)
function schoolLevelsInit(query) {
  const tableEl = $("#slTable");
  const addBtn = $("#slAdd");
  let rows = [];

  async function load() {
    try {
      const snap = await db.collection("schoolLevels").get();
      rows = snap.docs.map((d) => d.data());
      render();
    } catch (err) {
      notify("Failed to load levels: " + (err.message || String(err)), "danger");
    }
  }

  function render() {
    renderTable(tableEl, {
      columns: [
        { label: "Level" },
        { label: "Admission fee" },
        { label: "Monthly fee" },
        { label: "Study material (default)" },
        { label: "Status" },
        { label: "Actions", width: "200px" }
      ],
      rows: rows,
      pageSize: 15,
      rowRenderer: (tbody, row) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><b>" + escapeHtml(row.name || "") + "</b></td>" +
          "<td>" + fmtMoney(row.admissionFee) + "</td>" +
          "<td>" + fmtMoney(row.monthlyFee) + "</td>" +
          "<td>" + fmtMoney(row.studyMaterialFee) + "</td>" +
          "<td><span class='tag " + (row.status === "active" ? "active" : "inactive") + "'>" + escapeHtml(row.status || "") + "</span></td>" +
          "<td>" +
          "<button class='small secondary' onclick=\"AppViews.schoolLevels.edit('" + escapeJs(row.id) + "')\">Edit</button> " +
          "<button class='small' onclick=\"AppViews.schoolLevels.toggle('" + escapeJs(row.id) + "', " + (row.status === "active") + ")\">" + (row.status === "active" ? "Deactivate" : "Activate") + "</button> " +
          "<button class='small danger' onclick=\"AppViews.schoolLevels.remove('" + escapeJs(row.id) + "')\">Delete</button>" +
          "</td>";
        tbody.appendChild(tr);
      }
    });
  }

  addBtn.onclick = () => schoolLevelForm();

  window.AppViews = window.AppViews || {};
  window.AppViews.schoolLevels = {
    edit: (id) => schoolLevelForm(id),
    toggle: async (id, active) => {
      try {
        await db.collection("schoolLevels").set({ id, status: active ? "inactive" : "active" }, { merge: true });
        await db.audit("school.level.status_changed", "schoolLevels", id, { to: active ? "inactive" : "active" });
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    },
    remove: async (id) => {
      if (!confirm("Delete this level?")) return;
      try {
        await db.doc("schoolLevels/" + id).delete();
        await db.audit("school.level.deleted", "schoolLevels", id);
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    }
  };

  function schoolLevelForm(id) {
    const level = rows.find((l) => l.id === id) || { name: "", monthlyFee: 0, admissionFee: 0, studyMaterialFee: 0, status: "active" };
    const body = `
      <div class="form-grid">
        <div class="form-group"><label>Level name</label><input type="text" id="lName" value="${escapeHtml(level.name)}" required></div>
        <div class="form-group"><label>Monthly fee</label><input type="number" id="lMonthly" value="${Number(level.monthlyFee || 0)}" min="0" required></div>
        <div class="form-group"><label>Admission fee</label><input type="number" id="lAdmission" value="${Number(level.admissionFee || 0)}" min="0" required></div>
        <div class="form-group"><label>Default study material charge</label><input type="number" id="lMaterial" value="${Number(level.studyMaterialFee || 0)}" min="0"></div>
        <div class="form-group"><label>Status</label><select id="lStatus"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      </div>
    `;
    const foot = `
      <button class="secondary" onclick="this.closest('.backdrop').remove()">Cancel</button>
      <button id="lSave">Save level</button>
    `;
    openModal({ title: id ? "Edit Level" : "Add Level", bodyHtml: body, footHtml: foot });
    $("#lStatus").value = level.status || "active";
    $("#lSave").onclick = async () => {
      const data = {
        name: $("#lName").value.trim(),
        monthlyFee: Number($("#lMonthly").value || 0),
        admissionFee: Number($("#lAdmission").value || 0),
        studyMaterialFee: Number($("#lMaterial").value || 0),
        status: $("#lStatus").value,
        updatedAt: new Date().toISOString(),
        updatedBy: Auth.user.uid
      };
      if (!data.name) { notify("Level name is required.", "warning"); return; }
      try {
        if (id) {
          await db.collection("schoolLevels").set({ id, ...data }, { merge: true });
          await db.audit("school.level.updated", "schoolLevels", id, data);
        } else {
          await db.collection("schoolLevels").add({ ...data, createdAt: new Date().toISOString(), createdBy: Auth.user.uid });
          await db.audit("school.level.created", "schoolLevels", "", data);
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
