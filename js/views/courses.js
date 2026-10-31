// Course management (Super Admin)
function coursesInit(query) {
  const tableEl = $("#coursesTable");
  const searchEl = $("#courseSearch");
  const addBtn = $("#btnAddCourse");

  let rows = [];

  async function load() {
    try {
      const snap = await db.collection("courses").get();
      rows = snap.docs.map((d) => d.data());
      render();
    } catch (err) {
      notify("Failed to load courses: " + (err.message || String(err)), "danger");
    }
  }

  function render() {
    const term = searchEl.value.toLowerCase();
    const filtered = rows.filter((c) =>
      (c.name || "").toLowerCase().includes(term) ||
      (c.code || "").toLowerCase().includes(term)
    );
    renderTable(tableEl, {
      columns: [
        { label: "Course" },
        { label: "Code" },
        { label: "Semester" },
        { label: "Duration" },
        { label: "Admission fee" },
        { label: "Installments" },
        { label: "Exam fee" },
        { label: "Status" },
        { label: "Actions", width: "210px" }
      ],
      rows: filtered,
      pageSize: 15,
      rowRenderer: (tbody, row) => {
        const tr = document.createElement("tr");
        const inst = (row.installments || []).map((i) => i.amount + "\u20ac/mo").join(", ");
        tr.innerHTML =
          "<td><b>" + escapeHtml(row.name) + "</b><br><span style='font-size:12px;color:var(--muted);'>" + escapeHtml(row.description || "") + "</span></td>" +
          "<td><span class='id-cell'>" + escapeHtml(row.code) + "</span></td>" +
          "<td>" + (row.semester ? "Semester " + row.semester : "\u2014") + "</td>" +
          "<td>" + (row.durationMonths ? row.durationMonths + " months" : "\u2014") + "</td>" +
          "<td>" + fmtMoney(row.admissionFee) + "</td>" +
          "<td style='font-size:12px;'>" + escapeHtml(inst || "\u2014") + "</td>" +
          "<td>" + fmtMoney(row.examFee) + "</td>" +
          "<td><span class='tag " + (row.status === "active" ? "active" : "inactive") + "'>" + escapeHtml(row.status || "") + "</span></td>" +
          "<td>" +
          "<button class='small secondary' onclick=\"AppViews.courses.edit('" + escapeJs(row.id) + "')\">Edit</button> " +
          "<button class='small' onclick=\"AppViews.courses.toggle('" + escapeJs(row.id) + "', " + (row.status === "active") + ")\">" + (row.status === "active" ? "Deactivate" : "Activate") + "</button> " +
          "<button class='small danger' onclick=\"AppViews.courses.remove('" + escapeJs(row.id) + "')\">Delete</button>" +
          "</td>";
        tbody.appendChild(tr);
      }
    });
  }

  searchEl.addEventListener("input", render);
  addBtn.onclick = () => coursesForm();

  window.AppViews = window.AppViews || {};
  window.AppViews.courses = {
    edit: (id) => coursesForm(id),
    toggle: async (id, active) => {
      try {
        await db.collection("courses").set({ id, status: active ? "inactive" : "active" }, { merge: true });
        await db.audit("course.status_changed", "courses", id, { to: active ? "inactive" : "active" });
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    },
    remove: async (id) => {
      if (!confirm("Delete this course? Related admissions may reference it.")) return;
      try {
        await db.doc("courses/" + id).delete();
        await db.audit("course.deleted", "courses", id);
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    }
  };

  function coursesForm(id) {
    const course = rows.find((c) => c.id === id) || {
      name: "", code: "", description: "", eligibility: "", semester: 1, durationMonths: 6,
      admissionFee: 0, installments: [{ month: "March", amount: 0, dueDay: 10 }],
      examFee: 0, studyMaterialFee: 0, packageId: "", status: "active"
    };
    const instHtml = (course.installments || []).map((it, i) =>
      `<div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:8px;">
        <div class="form-group" style="flex:1;margin-bottom:0;"><label>Due month ${i + 1}</label><input type="text" class="instMonth" value="${escapeHtml(it.month || "")}"></div>
        <div class="form-group" style="flex:1;margin-bottom:0;"><label>Amount</label><input type="number" class="instAmount" value="${Number(it.amount || 0)}" min="0"></div>
        <div class="form-group" style="width:90px;margin-bottom:0;"><label>Due day</label><input type="number" class="instDueDay" value="${it.dueDay || 10}" min="1" max="31"></div>
        <button type="button" class="small danger remInst" style="margin-bottom:0;" title="Remove">\u00d7</button>
      </div>`).join("");
    const body = `
      <div class="form-grid">
        <div class="form-group"><label>Course name</label><input type="text" id="cName" value="${escapeHtml(course.name)}" required></div>
        <div class="form-group"><label>Course code</label><input type="text" id="cCode" value="${escapeHtml(course.code)}" maxlength="10" required placeholder="e.g. CITA"></div>
        <div class="form-group"><label>Description</label><input type="text" id="cDesc" value="${escapeHtml(course.description || "")}"></div>
        <div class="form-group"><label>Eligibility</label><input type="text" id="cElig" value="${escapeHtml(course.eligibility || "")}"></div>
        <div class="form-group"><label>Semester</label><select id="cSem"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></div>
        <div class="form-group"><label>Duration (months)</label><input type="number" id="cDur" value="${course.durationMonths || 6}" min="1"></div>
        <div class="form-group"><label>Admission fee</label><input type="number" id="cAdmFee" value="${Number(course.admissionFee || 0)}" min="0"></div>
        <div class="form-group full"><label>Installments (month, amount, due day)</label><div id="instList">${instHtml}</div><button type="button" id="addInst" class="small secondary" style="margin-top:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add installment</button></div>
        <div class="form-group"><label>Examination fee</label><input type="number" id="cExamFee" value="${Number(course.examFee || 0)}" min="0"></div>
        <div class="form-group"><label>Study material fee (optional)</label><input type="number" id="cMatFee" value="${Number(course.studyMaterialFee || 0)}" min="0"></div>
        <div class="form-group"><label>Status</label><select id="cStatus"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      </div>
    `;
    const foot = `
      <button class="secondary" onclick="this.closest('.backdrop').remove()">Cancel</button>
      <button id="cSave">Save course</button>
    `;
    openModal({ title: id ? "Edit Course" : "Add Course", bodyHtml: body, footHtml: foot });
    $("#cSem").value = course.semester;
    $("#cStatus").value = course.status || "active";
    $("#addInst").onclick = () => {
      const div = document.createElement("div");
      div.className = "inst-row";
      div.innerHTML = `<div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:8px;">
        <div class="form-group" style="flex:1;margin-bottom:0;"><label>Due month</label><input type="text" class="instMonth" value=""></div>
        <div class="form-group" style="flex:1;margin-bottom:0;"><label>Amount</label><input type="number" class="instAmount" value="0" min="0"></div>
        <div class="form-group" style="width:90px;margin-bottom:0;"><label>Due day</label><input type="number" class="instDueDay" value="10" min="1" max="31"></div>
        <button type="button" class="small danger remInst" style="margin-bottom:0;" title="Remove">\u00d7</button>
      </div>`;
      $("#instList").appendChild(div);
      div.querySelector(".remInst").onclick = () => div.remove();
    };
    $("#instList").addEventListener("click", (e) => { if (e.target.classList.contains("remInst")) e.target.closest(".inst-row").remove(); });
    $("#cSave").onclick = async () => {
      const insts = [];
      $$(".inst-row", $("#cSave").closest(".modal-body")).forEach((r) => {
        insts.push({
          month: r.querySelector(".instMonth").value.trim(),
          amount: Number(r.querySelector(".instAmount").value || 0),
          dueDay: Number(r.querySelector(".instDueDay").value || 10)
        });
      });
      const data = {
        name: $("#cName").value.trim(),
        code: $("#cCode").value.trim().toUpperCase(),
        description: $("#cDesc").value.trim(),
        eligibility: $("#cElig").value.trim(),
        semester: Number($("#cSem").value),
        durationMonths: Number($("#cDur").value || 6),
        admissionFee: Number($("#cAdmFee").value || 0),
        installments: insts,
        examFee: Number($("#cExamFee").value || 0),
        studyMaterialFee: Number($("#cMatFee").value || 0),
        status: $("#cStatus").value,
        updatedAt: new Date().toISOString(),
        updatedBy: Auth.user.uid
      };
      if (!data.name || !data.code || !data.installments.length) { notify("Name, code and at least one installment are required.", "warning"); return; }
      try {
        if (id) {
          await db.collection("courses").set({ id, ...data }, { merge: true });
          await db.audit("course.updated", "courses", id, data);
        } else {
          await db.collection("courses").add({ ...data, createdAt: new Date().toISOString(), createdBy: Auth.user.uid });
          await db.audit("course.created", "courses", "", data);
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

  load();
}

function escapeJs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
