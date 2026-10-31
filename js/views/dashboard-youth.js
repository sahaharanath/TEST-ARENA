// Youth dashboard controller
function dashboardYouthInit(query) {
  const statsEl = $("#dashStats");
  const paymentsEl = $("#dashRecentPayments");
  const branchEl = $("#dashBranchSummary");
  const admEl = $("#dashRecentAdmissions");
  const branchNameEl = $("#dashBranchName");

  const me = Auth.user;
  const isSuper = Auth.isSuperAdmin();
  const branchId = Auth.branchId();

  statsEl.innerHTML = "";
  const statCards = [
    { label: "Active branches", value: "-", id: "statBranches" },
    { label: "Active students", value: "-", id: "statStudents" },
    { label: "Admissions this month", value: "-", id: "statAdmissions" },
    { label: "Fee collection this month", value: "-", id: "statCollection" },
    { label: "Outstanding dues", value: "-", id: "statDues" }
  ];
  statCards.forEach((c) => {
    const el = document.createElement("div");
    el.className = "stat";
    el.innerHTML = '<div class="label">' + escapeHtml(c.label) + '</div><div class="value" id="' + c.id + '">' + c.value + '</div>';
    statsEl.appendChild(el);
  });

  async function load() {
    try {
      const branches = await queryCollection("branches", (q) =>
        isSuper ? q : q.where("branchId", "==", branchId));
      const myBranches = branches.docs.map((d) => d.data());
      const activeBranches = myBranches.filter((b) => b.status === "active").length;
      $("#statBranches").textContent = activeBranches;
      branchNameEl.textContent = isSuper ? "All branches (" + myBranches.length + ")" : (myBranches[0] ? myBranches[0].name : "Your branch");

      const allStudents = await queryCollection("students", (q) => q);
      const youthStudents = allStudents.docs.map((d) => d.data()).filter((s) => s.program === "youth" && s.status === "active" && (isSuper || s.branchId === branchId));
      $("#statStudents").textContent = youthStudents.length;

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const txns = await queryCollection("transactions", (q) => q);
      const allTxns = txns.docs.map((d) => d.data()).filter((t) => t.program === "youth" && (isSuper || t.branchId === branchId));
      const thisMonth = allTxns.filter((t) => new Date(t.paidAt) >= monthStart);
      const collection = thisMonth.reduce((s, t) => s + Number(t.amount), 0);
      $("#statCollection").textContent = fmtMoney(collection);

      const admissions = await queryCollection("admissions", (q) => q);
      const allAdm = admissions.docs.map((d) => d.data()).filter((a) => (isSuper || a.branchId === branchId));
      const admThisMonth = allAdm.filter((a) => new Date(a.admissionDate) >= monthStart);
      $("#statAdmissions").textContent = admThisMonth.length;

      const dues = allAdm.reduce((s, a) => s + Number(a.balance || 0), 0);
      $("#statDues").textContent = fmtMoney(dues);

      // Recent payments table
      const recent = allTxns.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)).slice(0, 8);
      renderTable(paymentsEl, {
        columns: [{ label: "Date" }, { label: "Student" }, { label: "Description" }, { label: "Amount" }, { label: "Method" }],
        rows: recent,
        pageSize: 8,
        rowRenderer: (tbody, row) => {
          const tr = document.createElement("tr");
          tr.innerHTML =
            "<td>" + fmtDate(row.paidAt) + "</td>" +
            "<td><span class='id-cell'>" + escapeHtml(row.studentId) + "</span><br><span style='font-size:12px;color:var(--muted);'>" + escapeHtml(row.studentName) + "</span></td>" +
            "<td style='font-size:12.5px;'>" + escapeHtml(row.description) + "</td>" +
            "<td>" + fmtMoney(row.amount) + (row.fine ? " <span style='font-size:12px;color:var(--warning);'>+ " + fmtMoney(row.fine) + " fine</span>" : "") + "</td>" +
            "<td>" + escapeHtml(row.method) + "</td>";
          tbody.appendChild(tr);
        }
      });

      // Branch-wise summary
      const summary = myBranches.map((b) => {
        const st = youthStudents.filter((s) => s.branchId === b.id);
        const at = allTxns.filter((t) => t.branchId === b.id);
        const coll = at.reduce((s2, t) => s2 + Number(t.amount), 0);
        return { branch: b.name, students: st.length, collection: coll };
      });
      renderTable(branchEl, {
        columns: [{ label: "Branch" }, { label: "Active students" }, { label: "Total collected" }],
        rows: summary,
        pageSize: 10,
        rowRenderer: (tbody, row) => {
          const tr = document.createElement("tr");
          tr.innerHTML =
            "<td>" + escapeHtml(row.branch) + "</td>" +
            "<td>" + row.students + "</td>" +
            "<td>" + fmtMoney(row.collection) + "</td>";
          tbody.appendChild(tr);
        }
      });

      // Recent admissions
      const recentAdm = allAdm.sort((a, b) => new Date(b.admissionDate) - new Date(a.admissionDate)).slice(0, 8);
      renderTable(admEl, {
        columns: [{ label: "Date" }, { label: "Student" }, { label: "Course/Batch" }, { label: "Branch" }, { label: "Status" }],
        rows: recentAdm,
        pageSize: 8,
        rowRenderer: (tbody, row) => {
          const tr = document.createElement("tr");
          tr.innerHTML =
            "<td>" + fmtDate(row.admissionDate) + "</td>" +
            "<td><span class='id-cell'>" + escapeHtml(row.studentId) + "</span><br><span style='font-size:12px;color:var(--muted);'>" + escapeHtml(row.studentName || "") + "</span></td>" +
            "<td style='font-size:12.5px;'>" + escapeHtml(row.courseId || "") + (row.semester ? " (Sem " + row.semester + ")" : "") + "</td>" +
            "<td>" + escapeHtml(row.branchId || "") + "</td>" +
            "<td><span class='tag " + (row.status || "active") + "'>" + escapeHtml(row.status || "active") + "</span></td>";
          tbody.appendChild(tr);
        }
      });
    } catch (err) {
      console.error(err);
      notify("Failed to load dashboard data: " + (err.message || String(err)), "danger");
    }
  }

  // Compatible query helper: demo mode filters in-memory; live mode applies where clauses
  async function queryCollection(name, whereBuilder) {
    if (DEMO_MODE) {
      const ref = db.collection(name);
      return ref.get();
    }
    const ref = db.collection(name);
    const q = whereBuilder(ref);
    return q.get();
  }

  load();
}
