// Unique Kids — student list
function schoolStudentsInit(query) {
  const tableEl = $("#ssTable");
  const searchEl = $("#ssSearch");
  const addBtn = $("#ssAdd");
  let rows = [];

  async function load() {
    try {
      const snap = await db.collection("students").get();
      rows = snap.docs.map((d) => d.data()).filter((s) => s.program === "school");
      render();
    } catch (err) {
      notify("Failed to load students: " + (err.message || String(err)), "danger");
    }
  }

  function render() {
    const term = searchEl.value.toLowerCase();
    const filtered = rows.filter((s) =>
      (s.studentId || "").toLowerCase().includes(term) ||
      (s.fullName || "").toLowerCase().includes(term)
    );
    renderTable(tableEl, {
      columns: [
        { label: "Student ID" },
        { label: "Name" },
        { label: "Class / Section" },
        { label: "Level" },
        { label: "Guardian" },
        { label: "Status" },
        { label: "Actions", width: "200px" }
      ],
      rows: filtered,
      pageSize: 15,
      rowRenderer: (tbody, row) => {
        const tr = document.createElement("tr");
        const sa = window.__ssAdmissions && window.__ssAdmissions.find((a) => a.studentId === row.id);
        const cls = sa ? (sa.class || "") + (sa.section ? " / " + sa.section : "") : "\u2014";
        tr.innerHTML =
          "<td><span class='id-cell'>" + escapeHtml(row.studentId || "") + "</span></td>" +
          "<td><b>" + escapeHtml(row.fullName || "") + "</b></td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(cls) + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml((window.__ssLevels && window.__ssLevels.find((l) => l.id === row.levelId) || {}).name || "\u2014") + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.guardianName || "") + "</td>" +
          "<td><span class='tag " + (row.status || "active") + "'>" + escapeHtml(row.status || "active") + "</span></td>" +
          "<td>" +
          "<button class='small secondary' onclick=\"AppViews.schoolStudents.payFees('" + escapeJs(row.studentId || "") + "')\">Monthly Fees</button> " +
          "<button class='small danger' onclick=\"AppViews.schoolStudents.remove('" + escapeJs(row.id) + "')\">Deactivate</button>" +
          "</td>";
        tbody.appendChild(tr);
      }
    });
  }

  searchEl.addEventListener("input", render);
  addBtn.onclick = () => schoolStudentForm();

  window.AppViews = window.AppViews || {};
  window.AppViews.schoolStudents = {
    payFees: (studentId) => { Router.navigate("#/school-fees?q=" + encodeURIComponent(studentId || "")); },
    remove: async (id) => {
      if (!confirm("Deactivate this school student?")) return;
      try {
        await db.collection("students").set({ id, status: "dropped" }, { merge: true });
        await db.audit("school.student.dropped", "students", id);
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    }
  };

  async function schoolStudentForm(id) {
    const levels = (await db.collection("schoolLevels").get()).docs.map((d) => d.data()).filter((l) => l.status === "active");
    const student = rows.find((s) => s.id === id) || {
      studentId: "", fullName: "", dob: "", gender: "Male", guardianName: "", guardianPhone: "",
      studentPhone: "", address: "", levelId: "", status: "active", admittedAt: new Date().toISOString().slice(0, 10)
    };
    let saEdit = null;
    if (id) {
      try {
        const saSnap = await db.collection("schoolAdmissions").get();
        saEdit = saSnap.docs.map((d) => d.data()).find((a) => a.studentId === id);
      } catch (e) { /* ignore */ }
    }
    const body = `
      <div class="form-grid">
        <div class="form-group"><label>Student ID</label><input type="text" id="sName" value="${escapeHtml(student.studentId)}" required></div>
        <div class="form-group"><label>Full name</label><input type="text" id="sFullName" value="${escapeHtml(student.fullName)}" required></div>
        <div class="form-group"><label>Date of birth</label><input type="date" id="sDob" value="${escapeHtml(student.dob)}" required></div>
        <div class="form-group"><label>Gender</label><select id="sGender"><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
        <div class="form-group"><label>Guardian name</label><input type="text" id="sGuardian" value="${escapeHtml(student.guardianName)}" required></div>
        <div class="form-group"><label>Guardian phone</label><input type="tel" id="sGuardianPhone" value="${escapeHtml(student.guardianPhone)}" required></div>
        <div class="form-group"><label>Student phone (optional)</label><input type="tel" id="sStudentPhone" value="${escapeHtml(student.studentPhone)}"></div>
        <div class="form-group full"><label>Address</label><textarea id="sAddress">${escapeHtml(student.address)}</textarea></div>
        <div class="form-group"><label>School class</label><input type="text" id="sClass" value="${escapeHtml((saEdit && saEdit.class) || "")}" placeholder="e.g. VIII"></div>
        <div class="form-group"><label>Section</label><input type="text" id="sSection" value="${escapeHtml((saEdit && saEdit.section) || "")}" placeholder="e.g. A"></div>
        <div class="form-group"><label>Level</label><select id="sLevel">${levels.map((l) => '<option value="' + escapeJs(l.id) + '" ' + (l.id === student.levelId ? "selected" : "") + ">" + escapeHtml(l.name) + "</option>").join("")}</select></div>
        <div class="form-group"><label>Admission date</label><input type="date" id="sDate" value="${escapeHtml(student.admittedAt)}" required></div>
        <div class="form-group"><label>Status</label><select id="sStatus"><option value="active">Active</option><option value="dropped">Dropped</option></select></div>
      </div>
    `;
    const foot = `
      <button class="secondary" onclick="this.closest('.backdrop').remove()">Cancel</button>
      <button id="sSave">Save student</button>
    `;
    openModal({ title: id ? "Edit Student" : "Admit Student (Unique Kids)", bodyHtml: body, footHtml: foot });
    $("#sGender").value = student.gender || "Male";
    $("#sStatus").value = student.status || "active";
    $("#sSave").onclick = async () => {
      const data = {
        studentId: $("#sName").value.trim(),
        fullName: $("#sFullName").value.trim(),
        dob: $("#sDob").value,
        gender: $("#sGender").value,
        guardianName: $("#sGuardian").value.trim(),
        guardianPhone: $("#sGuardianPhone").value.trim(),
        studentPhone: $("#sStudentPhone").value.trim(),
        address: $("#sAddress").value.trim(),
        levelId: $("#sLevel").value,
        branchId: null,
        program: "school",
        status: $("#sStatus").value,
        admittedAt: $("#sDate").value,
        updatedAt: new Date().toISOString(),
        updatedBy: Auth.user.uid
      };
      if (!data.studentId || !data.fullName || !data.levelId) { notify("Student ID, name and level are required.", "warning"); return; }
      try {
        let docRef;
        if (id) {
          await db.collection("students").set({ id, ...data }, { merge: true });
          docRef = id;
        } else {
          const existing = (await db.collection("students").get()).docs.find((d) => d.data().studentId === data.studentId);
          if (existing) { notify("Student ID already exists.", "danger"); return; }
          const added = await db.collection("students").add({ ...data, createdAt: new Date().toISOString(), createdBy: Auth.user.uid });
          docRef = added.id;
        }
        // school admission record
        const saData = {
          studentId: docRef,
          levelId: data.levelId,
          class: $("#sClass").value.trim(),
          section: $("#sSection").value.trim(),
          admissionDate: data.admittedAt,
          monthlyFee: (levels.find((l) => l.id === data.levelId) || {}).monthlyFee || 0,
          status: data.status,
          updatedAt: new Date().toISOString()
        };
        const saExisting = (await db.collection("schoolAdmissions").get()).docs.find((d) => d.data().studentId === docRef);
        if (saExisting) {
          await db.collection("schoolAdmissions").set({ id: saExisting.id, ...saData }, { merge: true });
        } else {
          await db.collection("schoolAdmissions").add({ ...saData, createdAt: new Date().toISOString(), createdBy: Auth.user.uid });
        }
        await db.audit("school.student.saved", "students", docRef, data);
        notify("Student saved.", "success");
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

  // preload levels + admissions for class display
  (async () => {
    try {
      window.__ssLevels = (await db.collection("schoolLevels").get()).docs.map((d) => d.data());
      window.__ssAdmissions = (await db.collection("schoolAdmissions").get()).docs.map((d) => d.data());
      load();
    } catch (e) { load(); }
  })();
}
