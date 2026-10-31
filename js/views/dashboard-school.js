// School dashboard controller
function dashboardSchoolInit(query) {
  const statsEl = $("#schoolDashStats");
  const admEl = $("#schoolDashAdmissions");
  const lvlEl = $("#schoolDashLevels");
  const payEl = $("#schoolDashPayments");

  const isSuper = Auth.isSuperAdmin();

  const statCards = [
    { label: "Active students", value: "-", id: "sStatStudents" },
    { label: "Monthly collection", value: "-", id: "sStatCollection" },
    { label: "Outstanding monthly fees", value: "-", id: "sStatDues" },
    { label: "Admissions this month", value: "-", id: "sStatAdmissions" }
  ];
  statCards.forEach((c) => {
    const el = document.createElement("div");
    el.className = "stat";
    el.innerHTML = '<div class="label">' + escapeHtml(c.label) + '</div><div class="value" id="' + c.id + '">' + c.value + '</div>';
    statsEl.appendChild(el);
  });

  async function load() {
    try {
      const students = (await db.collection("students").get()).docs.map((d) => d.data()).filter((s) => s.program === "school");
      const levels = (await db.collection("schoolLevels").get()).docs.map((d) => d.data());
      const admissions = (await db.collection("schoolAdmissions").get()).docs.map((d) => d.data());
      const txns = (await db.collection("schoolTransactions").get()).docs.map((d) => d.data());

      const activeStudents = students.filter((s) => s.status === "active").length;
      $("#sStatStudents").textContent = activeStudents;

      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const thisMonthTxns = txns.filter((t) => new Date(t.paidAt) >= monthStart);
      const collection = thisMonthTxns.reduce((s, t) => s + Number(t.amount), 0);
      $("#sStatCollection").textContent = fmtMoney(collection);

      const monthKey = monthStart.toISOString().slice(0, 7);
      let dues = 0;
      students.forEach((s) => {
        const sa = admissions.find((a) => a.studentId === s.id);
        const monthly = sa ? Number(sa.monthlyFee) : 0;
        const paid = txns.filter((t) => t.studentId === s.id && t.month === monthKey).reduce((x, t) => x + Number(t.amount), 0);
        dues += Math.max(0, monthly - paid);
      });
      $("#sStatDues").textContent = fmtMoney(dues);

      const monthStartAdm = new Date(); monthStartAdm.setDate(1);
      const admThisMonth = admissions.filter((a) => new Date(a.admissionDate) >= monthStartAdm).length;
      $("#sStatAdmissions").textContent = admThisMonth;

      // Students by level
      const byLevel = levels.map((l) => ({ level: l.name, count: students.filter((s) => s.levelId === l.id && s.status === "active").length }));
      renderTable(lvlEl, {
        columns: [{ label: "Level" }, { label: "Active students" }],
        rows: byLevel,
        pageSize: 10,
        rowRenderer: (tbody, row) => {
          const tr = document.createElement("tr");
          tr.innerHTML = "<td>" + escapeHtml(row.level) + "</td><td>" + row.count + "</td>";
          tbody.appendChild(tr);
        }
      });

      const recentAdm = admissions.sort((a, b) => new Date(b.admissionDate) - new Date(a.admissionDate)).slice(0, 6);
      renderTable(admEl, {
        columns: [{ label: "Date" }, { label: "Student ID" }, { label: "Level" }],
        rows: recentAdm,
        pageSize: 6,
        rowRenderer: (tbody, row) => {
          const tr = document.createElement("tr");
          const s = students.find((x) => x.id === row.studentId);
          tr.innerHTML = "<td>" + fmtDate(row.admissionDate) + "</td><td><span class='id-cell'>" + escapeHtml(s ? s.studentId : row.studentId) + "</span></td><td>" + escapeHtml((levels.find((l) => l.id === row.levelId) || {}).name || "") + "</td>";
          tbody.appendChild(tr);
        }
      });

      const recentPay = txns.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)).slice(0, 8);
      renderTable(payEl, {
        columns: [{ label: "Date" }, { label: "Student" }, { label: "Month" }, { label: "Amount" }],
        rows: recentPay,
        pageSize: 8,
        rowRenderer: (tbody, row) => {
          const tr = document.createElement("tr");
          const s = students.find((x) => x.id === row.studentId);
          tr.innerHTML = "<td>" + fmtDate(row.paidAt) + "</td><td><span class='id-cell'>" + escapeHtml(s ? s.studentId : row.studentId) + "</span></td><td>" + escapeHtml(row.month || "") + "</td><td>" + fmtMoney(row.amount) + "</td>";
          tbody.appendChild(tr);
        }
      });
    } catch (err) {
      console.error(err);
      notify("Failed to load school dashboard: " + (err.message || String(err)), "danger");
    }
  }

  load();
}
