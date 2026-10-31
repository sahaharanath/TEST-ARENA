// Package / Programme builder (Super Admin)
// Enforces semester course relationships: Semester 2 must follow Semester 1 course of the same package;
// Semester 3 requires Semester 1 and 2 history.
function packagesInit(query) {
  const tableEl = $("#packagesTable");
  const addBtn = $("#btnAddPackage");
  let courses = [];
  let rows = [];

  async function load() {
    try {
      const [cSnap, pSnap] = await Promise.all([db.collection("courses").get(), db.collection("packages").get()]);
      courses = cSnap.docs.map((d) => d.data());
      rows = pSnap.docs.map((d) => d.data());
      render();
    } catch (err) {
      notify("Failed to load programmes: " + (err.message || String(err)), "danger");
    }
  }

  function courseOptions(selectedId) {
    return courses.filter((c) => c.status === "active").map((c) =>
      '<option value="' + escapeHtml(c.id) + '" ' + (c.id === selectedId ? "selected" : "") + ">" +
      escapeHtml(c.code + " \u2014 " + c.name + " (Semester " + c.semester + ")") + "</option>").join("");
  }

  function render() {
    renderTable(tableEl, {
      columns: [
        { label: "Programme" },
        { label: "Type" },
        { label: "Semesters", width: "260px" },
        { label: "Total fee" },
        { label: "Status" },
        { label: "Actions", width: "220px" }
      ],
      rows: rows,
      pageSize: 15,
      rowRenderer: (tbody, row) => {
        const semText = (row.semesters || []).map((s) =>
          (courses.find((c) => c.id === s.courseId) || { code: s.courseId, name: "" }).code + " \u2192 Sem " + s.order + " (exam " + fmtMoney(s.examFee) + ")").join("; ");
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><b>" + escapeHtml(row.name) + "</b></td>" +
          "<td>" + escapeHtml(row.type || "") + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(semText || "\u2014") + "</td>" +
          "<td>" + fmtMoney(row.totalFee) + "</td>" +
          "<td><span class='tag " + (row.status === "active" ? "active" : "inactive") + "'>" + escapeHtml(row.status || "") + "</span></td>" +
          "<td>" +
          "<button class='small secondary' onclick=\"AppViews.packages.edit('" + escapeJs(row.id) + "')\">Edit</button> " +
          "<button class='small danger' onclick=\"AppViews.packages.remove('" + escapeJs(row.id) + "')\">Delete</button>" +
          "</td>";
        tbody.appendChild(tr);
      }
    });
  }

  addBtn.onclick = () => packagesForm();

  window.AppViews = window.AppViews || {};
  window.AppViews.packages = {
    edit: (id) => packagesForm(id),
    remove: async (id) => {
      if (!confirm("Delete this programme? Admissions may reference it.")) return;
      try {
        await db.doc("packages/" + id).delete();
        await db.audit("package.deleted", "packages", id);
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    }
  };

  function packagesForm(id) {
    const pkg = rows.find((p) => p.id === id) || {
      name: "", type: "certificate", totalFee: 0, status: "active",
      semesters: [{ order: 1, courseId: "", courseName: "", examFee: 0 }]
    };
    while (pkg.semesters.length < 1) pkg.semesters.push({ order: pkg.semesters.length + 1, courseId: "", courseName: "", examFee: 0 });
    const semHtml = pkg.semesters.map((s, i) => {
      const c = courses.find((c) => c.id === s.courseId);
      return `
        <div class="sem-row" style="border:1px solid var(--line);border-radius:var(--radius);padding:12px;margin-bottom:10px;background:#faf7fd;">
          <div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;">Semester ${s.order}</div>
          <div class="form-grid">
            <div class="form-group"><label>Course</label><select class="semCourse">${courseOptions(s.courseId)}</select></div>
            <div class="form-group"><label>Examination fee</label><input type="number" class="semExam" value="${Number(s.examFee || 0)}" min="0"></div>
          </div>
          ${i > 0 ? '<button type="button" class="small danger remSem" style="align-self:flex-end;">Remove semester</button>' : ''}
        </div>`;
    }).join("");
    const body = `
      <div class="form-grid">
        <div class="form-group"><label>Programme name</label><input type="text" id="pName" value="${escapeHtml(pkg.name)}" required></div>
        <div class="form-group"><label>Programme type</label><select id="pType"><option value="certificate">Certificate</option><option value="diploma">Diploma</option><option value="programme18">18-Month Programme</option></select></div>
        <div class="form-group"><label>Total fee</label><input type="number" id="pTotal" value="${Number(pkg.totalFee || 0)}" min="0"></div>
        <div class="form-group full"><label>Semesters (linked courses)</label><div id="semList">${semHtml}</div>
          <button type="button" id="addSem" class="small secondary" style="margin-top:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add semester</button>
          <div class="field-note">Semester 3 must belong to the same programme and follow Semester 1 and Semester 2. ADITA is confirmed as Semester 3 in the 18-month programme.</div>
        </div>
        <div class="form-group"><label>Status</label><select id="pStatus"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      </div>
    `;
    const foot = `
      <button class="secondary" onclick="this.closest('.backdrop').remove()">Cancel</button>
      <button id="pSave">Save programme</button>
    `;
    openModal({ title: id ? "Edit Programme" : "Add Programme", bodyHtml: body, footHtml: foot });
    $("#pType").value = pkg.type || "certificate";
    $("#pStatus").value = pkg.status || "active";

    $("#addSem").onclick = () => {
      const order = pkg.semesters.length + 1;
      const div = document.createElement("div");
      div.className = "sem-row";
      div.innerHTML = `<div style="border:1px solid var(--line);border-radius:var(--radius);padding:12px;margin-bottom:10px;background:#faf7fd;">
        <div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;">Semester ${order}</div>
        <div class="form-grid">
          <div class="form-group"><label>Course</label><select class="semCourse">${courseOptions("")}</select></div>
          <div class="form-group"><label>Examination fee</label><input type="number" class="semExam" value="0" min="0"></div>
        </div>
        <button type="button" class="small danger remSem" style="align-self:flex-end;margin-top:8px;">Remove semester</button>
      </div>`;
      $("#semList").appendChild(div);
      div.querySelector(".remSem").onclick = () => div.remove();
    };
    $("#semList").addEventListener("click", (e) => { if (e.target.classList.contains("remSem")) e.target.closest(".sem-row").remove(); });

    $("#pSave").onclick = async () => {
      const semesters = [];
      let valid = true;
      $$(".sem-row").forEach((rowEl, i) => {
        const courseId = rowEl.querySelector(".semCourse").value;
        const examFee = Number(rowEl.querySelector(".semExam").value || 0);
        const c = courses.find((c) => c.id === courseId);
        if (!courseId) { valid = false; notify("Select a course for Semester " + (i + 1), "warning"); return; }
        // Enforce: semester's course semester number matches its order position
        if (c && c.semester && c.semester !== i + 1) {
          valid = false;
          notify(c.code + " is a Semester " + c.semester + " course \u2014 it cannot be placed at Semester " + (i + 1), "warning");
          return;
        }
        semesters.push({ order: i + 1, courseId, courseName: c ? c.name : "", examFee });
      });
      if (!valid) return;
      const data = {
        name: $("#pName").value.trim(),
        type: $("#pType").value,
        semesters,
        totalFee: Number($("#pTotal").value || 0),
        status: $("#pStatus").value,
        updatedAt: new Date().toISOString(),
        updatedBy: Auth.user.uid
      };
      if (!data.name || !data.semesters.length) { notify("Programme name and at least one semester are required.", "warning"); return; }
      try {
        if (id) {
          await db.collection("packages").set({ id, ...data }, { merge: true });
          await db.audit("package.updated", "packages", id, data);
        } else {
          await db.collection("packages").add({ ...data, createdAt: new Date().toISOString(), createdBy: Auth.user.uid });
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
