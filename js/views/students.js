// Student list (Youth) with search and pagination
function studentsInit(query) {
  const tableEl = $("#studentsTable");
  const searchEl = $("#studentSearch");
  const addBtn = $("#btnAddStudent");
  const me = Auth.user;
  const branchId = Auth.branchId();
  const isSuper = Auth.isSuperAdmin();

  let rows = [];

  async function load() {
    try {
      const snap = await db.collection("students").get();
      rows = snap.docs.map((d) => d.data()).filter((s) => s.program === "youth" && (isSuper || s.branchId === branchId));
      render();
    } catch (err) {
      notify("Failed to load students: " + (err.message || String(err)), "danger");
    }
  }

  function render() {
    const term = searchEl.value.toLowerCase();
    const filtered = rows.filter((s) =>
      (s.studentId || "").toLowerCase().includes(term) ||
      (s.fullName || "").toLowerCase().includes(term) ||
      (s.guardianName || "").toLowerCase().includes(term)
    );
    renderTable(tableEl, {
      columns: [
        { label: "Student ID" },
        { label: "Name" },
        { label: "Guardian" },
        { label: "Branch" },
        { label: "Course / Batch" },
        { label: "Status" },
        { label: "Actions", width: "200px" }
      ],
      rows: filtered,
      pageSize: 15,
      rowRenderer: (tbody, row) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><span class='id-cell'>" + escapeHtml(row.studentId || "") + "</span></td>" +
          "<td><b>" + escapeHtml(row.fullName || "") + "</b><br><span style='font-size:12px;color:var(--muted);'>" + escapeHtml(row.dob || "") + "</span></td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.guardianName || "") + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.branchId || "") + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml((row.courseId || "") + " / " + (row.batchId || "")) + "</td>" +
          "<td><span class='tag " + (row.status || "active") + "'>" + escapeHtml(row.status || "active") + "</span></td>" +
          "<td>" +
          "<button class='small secondary' onclick=\"AppViews.students.openProfile('" + escapeJs(row.id) + "')\">Profile</button> " +
          "<button class='small secondary' onclick=\"AppViews.students.payFees('" + escapeJs(row.studentId || "") + "')\">Pay Fees</button> " +
          "<button class='small danger' onclick=\"AppViews.students.remove('" + escapeJs(row.id) + "')\">Delete</button>" +
          "</td>";
        tbody.appendChild(tr);
      }
    });
  }

  searchEl.addEventListener("input", render);
  addBtn.onclick = () => { Router.navigate("#/admission"); };

  window.AppViews = window.AppViews || {};
  window.AppViews.students = {
    openProfile: (id) => { Router.navigate("#/students"); notify("Profile detail view: open student card (see Admissions / Pay Fees for this student).", "info"); },
    payFees: (studentId) => { Router.navigate("#/pay-fees?q=" + encodeURIComponent(studentId || "")); },
    remove: async (id) => {
      if (!confirm("Deactivate this student?")) return;
      try {
        await db.collection("students").set({ id, status: "dropped" }, { merge: true });
        await db.audit("student.dropped", "students", id);
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    }
  };

  load();
}

function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
