// Semester continuation: existing student admitted to next semester of the same programme
function continuationInit(query) {
  const form = $("#contForm");
  const pkgSel = $("#contPackage");
  const searchEl = $("#contSearch");
  const resultsEl = $("#contResults");
  const cardEl = $("#contStudentCard");
  const nameEl = $("#contStudentName");
  const idEl = $("#contStudentId");
  const branchEl = $("#contStudentBranch");
  const courseEl = $("#contStudentCourse");
  const historyEl = $("#contHistory");
  const batchSel = $("#contBatch");

  let packages = [];
  let courses = [];
  let batches = [];
  let students = [];
  let admissions = [];
  let selectedStudent = null;

  async function load() {
    try {
      const [pSnap, cSnap, bSnap, sSnap, aSnap] = await Promise.all([
        db.collection("packages").get(),
        db.collection("courses").get(),
        db.collection("batches").get(),
        db.collection("students").get(),
        db.collection("admissions").get()
      ]);
      packages = pSnap.docs.map((d) => d.data()).filter((p) => p.status === "active");
      courses = cSnap.docs.map((d) => d.data());
      batches = bSnap.docs.map((d) => d.data()).filter((b) => b.status === "active");
      students = sSnap.docs.map((d) => d.data()).filter((s) => s.program === "youth");
      admissions = aSnap.docs.map((d) => d.data());

      pkgSel.innerHTML = '<option value="">Select programme</option>' + packages.map((p) =>
        '<option value="' + escapeJs(p.id) + '">' + escapeHtml(p.name) + "</option>").join("");
      const me = Auth.user;
      const branchId = Auth.branchId();
      const isSuper = Auth.isSuperAdmin();
      const bList = batches.filter((b) => isSuper || b.branchId === branchId); // batches are global; show all active
      batchSel.innerHTML = '<option value="">Select batch</option>' + bList.map((b) =>
        '<option value="' + escapeJs(b.id) + '">' + escapeHtml(b.name + " (" + b.session + ")") + "</option>").join("");
      $("#contDate").value = new Date().toISOString().slice(0, 10);
    } catch (err) {
      notify("Failed to load continuation data: " + (err.message || String(err)), "danger");
    }
  }

  pkgSel.onchange = () => {
    historyEl.innerHTML = "";
    selectedStudent = null;
    cardEl.style.display = "none";
    resultsEl.innerHTML = "";
    searchEl.value = "";
  };

  searchEl.oninput = (e) => {
    const term = e.target.value.toLowerCase();
    resultsEl.innerHTML = "";
    if (!term) return;
    const match = students.filter((s) =>
      (s.studentId || "").toLowerCase().includes(term) ||
      (s.fullName || "").toLowerCase().includes(term)
    ).slice(0, 10);
    match.forEach((s) => {
      const div = document.createElement("div");
      div.style.padding = "8px 12px";
      div.style.borderBottom = "1px solid #eee";
      div.style.cursor = "pointer";
      div.style.fontSize = "13px";
      div.innerHTML = "<div><b>" + escapeHtml(s.fullName) + "</b> <span class='id-cell'>" + escapeHtml(s.studentId) + "</span></div>" +
        "<div style='font-size:12px;color:var(--muted);'>" + escapeHtml(s.address || "") + "</div>";
      div.onclick = () => selectStudent(s);
      resultsEl.appendChild(div);
    });
  };

  function selectStudent(s) {
    selectedStudent = s;
    cardEl.style.display = "block";
    nameEl.textContent = s.fullName;
    idEl.textContent = s.studentId;
    branchEl.textContent = s.branchId;
    // last admission
    const lastAdm = admissions.filter((a) => a.studentId === s.id).sort((x, y) => new Date(y.admissionDate) - new Date(x.admissionDate))[0];
    const lastCourse = courses.find((c) => c.id === (lastAdm ? lastAdm.courseId : null));
    courseEl.textContent = lastCourse ? (lastCourse.code + " (Semester " + lastCourse.semester + ")") : "\u2014";
    buildHistory(s, lastAdm);
    searchEl.value = s.fullName;
    resultsEl.innerHTML = "";
  }

  function buildHistory(s, lastAdm) {
    const pkg = packages.find((p) => (p.semesters || []).some((sem) => sem.courseId === lastAdm && lastAdm && false) ? "" : "");
    // determine next semester expected
    const prevAdmissions = admissions.filter((a) => a.studentId === s.id).sort((x, y) => new Date(x.admissionDate) - new Date(y.admissionDate));
    const last = prevAdmissions[prevAdmissions.length - 1];
    const lastCourse = courses.find((c) => c.id === last.courseId);
    let nextSem = (lastCourse ? lastCourse.semester : 0) + 1;
    let note = "";
    if (nextSem > 3) { note = "This student appears to have completed Semester 3 already."; }
    historyEl.innerHTML =
      '<div style="font-size:13px;"><b>Admission history:</b> ' + prevAdmissions.length + ' record(s). Last: ' +
      escapeHtml(lastCourse ? lastCourse.code : "\u2014") + " (Semester " + (lastCourse ? lastCourse.semester : "?") + "), admitted " + fmtDate(last.admissionDate) + ".</div>" +
      '<div style="font-size:12.5px;color:var(--muted);margin-top:4px;">Expected continuation: Semester ' + nextSem + (note ? " \u2014 " + note : "") + ".</div>";
    window.__contNextSem = nextSem;
    window.__contLastAdmission = last;
  }

  pkgSel.onchange = () => {
    // validate selected package against student's expected next semester when saving
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedStudent) { notify("Select an existing student first.", "warning"); return; }
    const pid = pkgSel.value;
    const pkg = packages.find((p) => p.id === pid);
    if (!pkg) { notify("Select a programme.", "warning"); return; }
    const nextSem = window.__contNextSem || 2;
    const semCfg = (pkg.semesters || []).find((s) => s.order === nextSem);
    if (!semCfg) { notify("This programme has no Semester " + nextSem + " configured.", "warning"); return; }

    // Validation: Semester 2 needs a Semester 1 admission of the same package; Semester 3 needs 1+2 history
    const prevAdmissions = admissions.filter((a) => a.studentId === selectedStudent.id).sort((x, y) => new Date(x.admissionDate) - new Date(y.admissionDate));
    const verifiedCourses = prevAdmissions.map((a) => {
      const c = courses.find((x) => x.id === a.courseId);
      return c ? { order: c.semester, courseId: c.id, admissionId: a.id } : null;
    }).filter(Boolean);
    const sem1OK = verifiedCourses.some((v) => v.order === 1 && v.courseId === (pkg.semesters || []).find((s) => s.order === 1).courseId);
    let manual = false;
    if (nextSem === 2 && !sem1OK) {
      if (!confirm("No verified Semester 1 admission of this package was found for this student. Continue with manual history entry?")) return;
      manual = true;
    }
    if (nextSem === 3) {
      const sem2OK = verifiedCourses.some((v) => v.order === 2 && (pkg.semesters || []).find((s) => s.order === 2).courseId === v.courseId);
      if (!sem1OK || !sem2OK) {
        if (!confirm("Semester 1 / Semester 2 history not verified in live records. Continue with manual history entry?")) return;
        manual = true;
      }
    }

    const course = courses.find((c) => c.id === semCfg.courseId);
    if (!course) { notify("Semester course not configured.", "danger"); return; }
    const batch = batches.find((b) => b.id === batchSel.value);
    if (!batch) { notify("Select a batch.", "warning"); return; }

    const me = Auth.user;
    const studentData = {
      fullName: selectedStudent.fullName,
      dob: selectedStudent.dob,
      gender: selectedStudent.gender,
      guardianName: selectedStudent.guardianName,
      guardianPhone: selectedStudent.guardianPhone,
      studentPhone: selectedStudent.studentPhone,
      address: selectedStudent.address,
      branchId: selectedStudent.branchId,
      program: "youth",
      status: "active",
      updatedAt: new Date().toISOString()
    };
    await db.collection("students").set({ id: selectedStudent.id, ...studentData }, { merge: true });

    const installments = (course.installments || []).map((it) => ({
      month: it.month, amount: it.amount,
      dueDate: computeDueDate(it, $("#contDate").value),
      status: "unpaid", paidAt: null, paidAmount: 0, fine: 0, waiver: 0
    }));
    const totalDue = Number($("#contAdmFee").value || course.admissionFee || 0) +
      Number($("#contExamFee").value || course.examFee || 0) +
      installments.reduce((s2, it) => s2 + Number(it.amount), 0);

    const admissionData = {
      studentId: selectedStudent.id,
      courseId: course.id,
      packageId: pid,
      batchId: batch.id,
      branchId: selectedStudent.branchId,
      semester: nextSem,
      admissionDate: $("#contDate").value,
      admissionFee: Number($("#contAdmFee").value || course.admissionFee || 0),
      installments,
      examFee: Number($("#contExamFee").value || course.examFee || 0),
      totalDue, totalPaid: 0, balance: totalDue,
      previousAdmissionId: window.__contLastAdmission ? window.__contLastAdmission.id : null,
      continuationNote: manual
        ? "Completed previous semester(s) \u2014 previous record manually recorded (not verified from live historical records)."
        : "Continued from verified live admission history.",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recordedBy: me.uid
    };
    const admRef = await db.collection("admissions").add(admissionData);

    if (manual) {
      await db.collection("studentHistory").add({
        studentId: selectedStudent.id,
        admissionId: admRef.id,
        courseId: course.id,
        semester: nextSem - 1,
        batchId: prevAdmissions.length ? (batches.find((b) => b.id === prevAdmissions[prevAdmissions.length - 1].batchId) || {}).id : null,
        completedAt: $("#contDate").value,
        result: "Manually recorded",
        notes: "Previous semester record entered manually by Branch Head during continuation."
      });
    }

    await db.audit("admission.continuation", "admissions", admRef.id, {
      studentId: selectedStudent.id, semester: nextSem, manual
    });

    notify("Continuation admission created for " + selectedStudent.studentId + " (Semester " + nextSem + ").", "success");
    Router.navigate("#/students");
  });

  function computeDueDate(installment, admissionDate) {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const mIdx = monthNames.indexOf(installment.month);
    if (mIdx < 0) return "";
    const d = new Date(admissionDate || new Date().toISOString().slice(0, 10));
    const due = new Date(d.getFullYear(), mIdx, installment.dueDay || 10);
    if (due < d) due.setFullYear(d.getFullYear() + 1);
    return due.toISOString().slice(0, 10);
  }

  load();
}

function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
