// New admission — Semester 1 / Certificate entry (Youth Branch Head or Super Admin)
function admissionInit(query) {
  const form = $("#admissionForm");
  const programmeSel = $("#admProgramme");
  const courseSel = $("#admCourse");
  const batchSel = $("#admBatch");
  const branchSel = $("#admBranch");
  const studentIdInput = $("#admStudentId");

  let programmes = [];
  let courses = [];
  let batches = [];
  let branches = [];
  const me = Auth.user;
  const branchId = Auth.branchId();
  const isSuper = Auth.isSuperAdmin();

  // Document upload state
  const docFiles = {}; // category -> {file, compressedDataUrl, name}

  async function load() {
    try {
      const [pSnap, cSnap, bSnap, brSnap, sSnap] = await Promise.all([
        db.collection("packages").get(),
        db.collection("courses").get(),
        db.collection("batches").get(),
        db.collection("branches").get(),
        db.collection("students").get()
      ]);
      programmes = pSnap.docs.map((d) => d.data()).filter((p) => p.status === "active");
      students = sSnap.docs.map((d) => d.data()).filter((s) => s.program === "youth");
      courses = cSnap.docs.map((d) => d.data()).filter((c) => c.status === "active");
      batches = bSnap.docs.map((d) => d.data()).filter((b) => b.status === "active");
      branches = brSnap.docs.map((d) => d.data()).filter((b) => b.status === "active");

      if (!isSuper) {
        branches = branches.filter((b) => b.id === branchId);
        branchSel.style.display = "none";
        $("#admBranch").parentElement.style.display = "none";
        // show a read-only branch label instead
        const label = document.createElement("div");
        label.className = "field-note";
        label.textContent = "Branch: " + (branches[0] ? branches[0].name : "\u2014") + " (assigned)";
        branchSel.parentElement.insertAdjacentElement("afterend", label);
      }

      programmeSel.innerHTML = '<option value="">Select programme</option>' + programmes.map((p) =>
        '<option value="' + escapeJs(p.id) + '">' + escapeHtml(p.name) + "</option>").join("");
      batchSel.innerHTML = '<option value="">Select batch</option>' + batches.map((b) =>
        '<option value="' + escapeJs(b.id) + '">' + escapeHtml(b.name + " (" + b.session + ")") + "</option>").join("");
      branchSel.innerHTML = '<option value="">Select branch</option>' + branches.map((b) =>
        '<option value="' + escapeJs(b.id) + '">' + escapeHtml(b.name) + "</option>").join("");

      if (!isSuper && branches.length) branchSel.value = branches[0].id;

      // default admission date = today
      $("#admDate").value = new Date().toISOString().slice(0, 10);
      setupDocumentPreviews();
    } catch (err) {
      notify("Failed to load admission data: " + (err.message || String(err)), "danger");
    }
  }

  programmeSel.onchange = () => {
    const pid = programmeSel.value;
    const pkg = programmes.find((p) => p.id === pid);
    courseSel.innerHTML = '<option value="">Select course</option>';
    batchSel.innerHTML = '<option value="">Select batch</option>';
    if (!pkg) return;
    // Semester 1 courses of this package
    const sem1 = (pkg.semesters || []).find((s) => s.order === 1);
    const opts = courses.filter((c) =>
      (!sem1 || c.id === sem1.courseId) && c.semester === 1
    ).map((c) => '<option value="' + escapeJs(c.id) + '">' + escapeHtml(c.code + " \u2014 " + c.name) + "</option>").join("");
    courseSel.innerHTML = '<option value="">Select course</option>' + opts;
    // eligible batches: active batches linked to this package
    const bOpts = batches.filter((b) => b.packageId === pid || (!pid && b.courseId)).map((b) =>
      '<option value="' + escapeJs(b.id) + '">' + escapeHtml(b.name + " (" + b.session + ")") + "</option>").join("");
    batchSel.innerHTML = '<option value="">Select batch</option>' + bOpts;
  };

  courseSel.onchange = () => {
    const cid = courseSel.value;
    const c = courses.find((c) => c.id === cid);
    $("#admAdmFee").value = c ? c.admissionFee : "";
    $("#admExamFee").value = c ? c.examFee : "";
    // generate student ID
    const branch = branchSel.value || branchId;
    const br = branches.find((b) => b.id === branch);
    const code = br ? br.code : "YCC";
    studentIdInput.value = "YCC-" + code + "-";
  };

  function generateStudentId() {
    const branch = branchSel.value || branchId;
    const br = branches.find((b) => b.id === branch);
    const code = br ? br.code : "YCC";
    const existing = students.map((s) => s.studentId || "").filter((id) => id.startsWith("YCC-" + code + "-"));
    const nums = existing.map((id) => {
      const m = id.match(/-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    studentIdInput.value = "YCC-" + code + "-" + String(next).padStart(4, "0");
  }

  branchSel.onchange = generateStudentId;
  courseSel.onchange = () => {
    const cid = courseSel.value;
    const c = courses.find((c) => c.id === cid);
    $("#admAdmFee").value = c ? c.admissionFee : "";
    $("#admExamFee").value = c ? c.examFee : "";
    generateStudentId();
  };

  batchSel.onchange = () => {
    // keep selected batch; fee info already set by course
  };

  async function saveStudentAndAdmission() {
    const studentId = studentIdInput.value.trim();
    if (!studentId) { notify("Student ID is required.", "warning"); return; }
    // prevent duplicate student id
    const existing = (await db.collection("students").get()).docs.find((d) => d.data().studentId === studentId);
    if (existing) { notify("Student ID " + studentId + " already exists.", "danger"); return; }

    const studentData = {
      studentId,
      fullName: $("#admName").value.trim(),
      photoUrl: "assets/images/placeholder.png",
      dob: $("#admDob").value,
      gender: $("#admGender").value,
      guardianName: $("#admGuardian").value.trim(),
      guardianPhone: $("#admGuardianPhone").value.trim(),
      studentPhone: $("#admStudentPhone").value.trim(),
      address: $("#admAddress").value.trim(),
      branchId: branchSel.value || branchId,
      program: "youth",
      levelId: null,
      status: "active",
      admittedAt: $("#admDate").value,
      updatedAt: new Date().toISOString(),
      createdBy: me.uid
    };
    const studentRef = await db.collection("students").add(studentData);

    const course = courses.find((c) => c.id === courseSel.value);
    const batch = batches.find((b) => b.id === batchSel.value);
    const programme = programmes.find((p) => p.id === programmeSel.value);

    const installments = (course.installments || []).map((it) => ({
      month: it.month,
      amount: it.amount,
      dueDate: computeDueDate(it, $("#admDate").value),
      status: "unpaid",
      paidAt: null,
      paidAmount: 0,
      fine: 0,
      waiver: 0
    }));
    const totalDue = Number(course.admissionFee || 0) + Number(course.examFee || 0) +
      installments.reduce((s, it) => s + Number(it.amount), 0);

    const admissionData = {
      studentId: studentRef.id,
      courseId: courseSel.value,
      packageId: programmeSel.value,
      batchId: batchSel.value || null,
      branchId: studentData.branchId,
      semester: 1,
      admissionDate: $("#admDate").value,
      admissionFee: Number($("#admAdmFee").value || course.admissionFee || 0),
      installments,
      examFee: Number($("#admExamFee").value || course.examFee || 0),
      totalDue,
      totalPaid: 0,
      balance: totalDue,
      previousAdmissionId: null,
      continuationNote: null,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recordedBy: me.uid
    };
    await db.collection("admissions").add(admissionData);

    // Record admission fee as a transaction if > 0
    if (admissionData.admissionFee > 0) {
      await recordTransaction({
        studentId: studentRef.id,
        studentName: studentData.fullName,
        branchId: studentData.branchId,
        courseId: courseSel.value,
        batchId: batchSel.value || null,
        program: "youth",
        description: "Admission Fee \u2014 " + (course ? course.code : ""),
        amount: admissionData.admissionFee,
        fine: 0,
        waiver: 0,
        method: "cash",
        paidAt: $("#admDate").value,
        receiptNumber: null
      });
    }

    await db.audit("admission.created", "admissions", "", { studentId, course: course ? course.code : "" });

    // Upload documents (demo mode: store references only; live mode: Firebase Storage)
    for (const cat of [1, 2, 3, 4]) {
      const entry = docFiles["doc" + cat];
      if (!entry) continue;
      const meta = {
        studentId: studentRef.id,
        category: "doc" + cat,
        categoryName: ["", "Identity / age proof", "Qualification marksheet", "Photograph", "Signature"][cat],
        fileName: entry.file.name,
        size: entry.file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: me.uid
      };
      if (firebaseReady && firebaseStorage) {
        const path = "students/" + studentRef.id + "/documents/doc" + cat + "/" + uid();
        await firebaseStorage.ref(path).put(entry.file);
        meta.storagePath = path;
      } else {
        meta.demoDataUrl = entry.compressed; // preview only
      }
      await db.collection("students").doc(studentRef.id).collection("documents").add(meta);
    }

    notify("Admission saved for " + studentId + ".", "success");
    Router.navigate("#/students");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#admSave");
    btn.disabled = true;
    btn.textContent = "Saving...";
    try {
      await saveStudentAndAdmission();
    } catch (err) {
      notify("Failed to save admission: " + (err.message || String(err)), "danger");
      btn.disabled = false;
      btn.textContent = "Save admission";
    }
  });

  function computeDueDate(installment, admissionDate) {
    // Installment due month mapped to a calendar date relative to admission batch start.
    // Simple rule: due day of the configured month in the admission year; if passed, roll to next year.
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const mIdx = monthNames.indexOf(installment.month);
    if (mIdx < 0) return "";
    const d = new Date(admissionDate || new Date().toISOString().slice(0, 10));
    const due = new Date(d.getFullYear(), mIdx, installment.dueDay || 10);
    if (due < d) due.setFullYear(d.getFullYear() + 1);
    return due.toISOString().slice(0, 10);
  }

  // ---------- Document handling with browser-side compression ----------
  function setupDocumentPreviews() {
    for (let cat = 1; cat <= 4; cat++) {
      (function(c) {
        const input = $("#admDoc" + c);
        const preview = $("#preview" + c);
        input.onchange = async (ev) => {
          const file = ev.target.files[0];
          if (!file) { preview.innerHTML = ""; delete docFiles["doc" + c]; return; }
          if (file.size > 2 * 1024 * 1024) { notify("File too large. Maximum 2 MB.", "warning"); input.value = ""; return; }
          try {
            const dataUrl = await compressImage(file);
            docFiles["doc" + c] = { file, compressed: dataUrl, name: file.name };
            preview.innerHTML = '<img src="' + escapeHtml(dataUrl) + '" style="max-width:160px;max-height:160px;border:1px solid var(--line);border-radius:var(--radius);object-fit:contain;">' +
              '<div style="font-size:12px;color:var(--muted);margin-top:4px;">' + escapeHtml(file.name) + " (" + Math.round(file.size / 1024) + " KB)</div>";
          } catch (err) {
            notify("Could not process file: " + err.message, "danger");
          }
        };
      })(cat);
    }
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) { resolve(URL.createObjectURL(file)); return; }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        const maxW = 1600;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          resolve(blob ? URL.createObjectURL(blob) : URL.createObjectURL(file));
        }, "image/jpeg", 0.75);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  load();
}

function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
