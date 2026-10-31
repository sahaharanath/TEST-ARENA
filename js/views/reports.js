// Reports — preview table, Excel and PDF export, date filtering, role-scoped
function reportsInit(query) {
  const typeEl = $("#rpType");
  const fromEl = $("#rpFrom");
  const toEl = $("#rpTo");
  const infoEl = $("#rpInfo");
  const tableEl = $("#reportsTable");

  let students = [];
  let admissions = [];
  let txns = [];
  let branches = [];
  let courses = [];
  let packages = [];

  const isSuper = Auth.isSuperAdmin();
  const branchId = Auth.branchId();

  async function load() {
    try {
      const [sSnap, aSnap, tSnap, brSnap, cSnap, pSnap] = await Promise.all([
        db.collection("students").get(),
        db.collection("admissions").get(),
        db.collection("transactions").get(),
        db.collection("branches").get(),
        db.collection("courses").get(),
        db.collection("packages").get()
      ]);
      students = sSnap.docs.map((d) => d.data());
      admissions = aSnap.docs.map((d) => d.data());
      txns = tSnap.docs.map((d) => d.data());
      branches = brSnap.docs.map((d) => d.data());
      courses = cSnap.docs.map((d) => d.data());
      packages = pSnap.docs.map((d) => d.data());
      if (!isSuper) {
        students = students.filter((s) => s.branchId === branchId);
        admissions = admissions.filter((a) => a.branchId === branchId);
        txns = txns.filter((t) => t.branchId === branchId);
      }
      const today = new Date().toISOString().slice(0, 10);
      const first = new Date(); first.setDate(1);
      fromEl.value = first.toISOString().slice(0, 10);
      toEl.value = today;
    } catch (err) {
      notify("Failed to load report data: " + (err.message || String(err)), "danger");
    }
  }

  function inRange(dateStr, from, to) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to)) return false;
    return true;
  }

  function build() {
    const type = typeEl.value;
    const from = fromEl.value;
    const to = toEl.value;
    const branchName = (b) => { const x = branches.find((bb) => bb.id === b); return x ? x.name : b; };
    const courseName = (c) => { const x = courses.find((cc) => cc.id === c); return x ? (x.code + " \u2014 " + x.name) : c; };
    const packageName = (p) => { const x = packages.find((pp) => pp.id === p); return x ? x.name : p; };

    let rows = [];
    let title = "";

    if (type === "admissions") {
      title = "Admission List";
      rows = admissions.filter((a) => inRange(a.admissionDate, from, to)).map((a) => {
        const s = students.find((x) => x.id === a.studentId);
        return {
          Date: a.admissionDate,
          "Student ID": s ? s.studentId : a.studentId,
          Student: s ? s.fullName : "",
          Branch: branchName(a.branchId),
          Course: courseName(a.courseId),
          Batch: a.batchId,
          Semester: a.semester,
          "Admission fee": a.admissionFee,
          Status: a.status
        };
      });
    } else if (type === "payments") {
      title = "Payment Collection Report";
      rows = txns.filter((t) => inRange(t.paidAt, from, to)).map((t) => ({
        Date: t.paidAt,
        "Student ID": t.studentId,
        Student: t.studentName,
        Branch: branchName(t.branchId),
        Course: t.courseId,
        Description: t.description,
        Amount: t.amount,
        Fine: t.fine,
        Waiver: t.waiver,
        Method: t.method,
        Receipt: t.receiptNumber
      }));
    } else if (type === "dues") {
      title = "Due / Outstanding List";
      rows = admissions.filter((a) => inRange(a.admissionDate, from, to) && Number(a.balance || 0) > 0).map((a) => {
        const s = students.find((x) => x.id === a.studentId);
        return {
          "Student ID": s ? s.studentId : a.studentId,
          Student: s ? s.fullName : "",
          Branch: branchName(a.branchId),
          Course: courseName(a.courseId),
          "Total due": a.totalDue,
          "Total paid": a.totalPaid,
          Balance: a.balance
        };
      });
    } else if (type === "students") {
      title = "Student List";
      rows = students.filter((s) => inRange(s.admittedAt, from, to)).map((s) => ({
        "Student ID": s.studentId,
        Name: s.fullName,
        Branch: branchName(s.branchId),
        Course: s.courseId,
        Batch: s.batchId,
        "Admission date": s.admittedAt,
        Status: s.status
      }));
    } else if (type === "bycourse") {
      title = "Student List by Course";
      rows = admissions.filter((a) => inRange(a.admissionDate, from, to)).map((a) => {
        const s = students.find((x) => x.id === a.studentId);
        return {
          Course: courseName(a.courseId),
          Semester: a.semester,
          "Student ID": s ? s.studentId : a.studentId,
          Student: s ? s.fullName : "",
          Branch: branchName(a.branchId),
          Batch: a.batchId
        };
      });
    } else if (type === "bybatch") {
      title = "Student List by Batch";
      rows = admissions.filter((a) => inRange(a.admissionDate, from, to)).map((a) => {
        const s = students.find((x) => x.id === a.studentId);
        return {
          Batch: a.batchId,
          "Student ID": s ? s.studentId : a.studentId,
          Student: s ? s.fullName : "",
          Course: courseName(a.courseId),
          Branch: branchName(a.branchId),
          Status: a.status
        };
      });
    } else if (type === "fines") {
      title = "Fine and Waived Fine Report";
      rows = txns.filter((t) => inRange(t.paidAt, from, to) && (Number(t.fine) > 0 || Number(t.waiver) > 0)).map((t) => ({
        Date: t.paidAt,
        "Student ID": t.studentId,
        Student: t.studentName,
        Branch: branchName(t.branchId),
        Fine: t.fine,
        Waiver: t.waiver,
        Method: t.method
      }));
    } else if (type === "monthwise") {
      title = "Month-wise Collection Summary";
      const map = {};
      txns.filter((t) => inRange(t.paidAt, from, to)).forEach((t) => {
        const m = t.paidAt.slice(0, 7);
        if (!map[m]) map[m] = { amount: 0, fine: 0, waiver: 0, count: 0 };
        map[m].amount += Number(t.amount);
        map[m].fine += Number(t.fine);
        map[m].waiver += Number(t.waiver);
        map[m].count += 1;
      });
      rows = Object.keys(map).sort().map((m) => ({ Month: m, ...map[m] }));
    } else if (type === "branchwise") {
      title = "Branch-wise Collection Report";
      const map = {};
      txns.filter((t) => inRange(t.paidAt, from, to)).forEach((t) => {
        const b = branchName(t.branchId);
        if (!map[b]) map[b] = { amount: 0, count: 0 };
        map[b].amount += Number(t.amount);
        map[b].count += 1;
      });
      rows = Object.keys(map).map((b) => ({ Branch: b, ...map[b] }));
    }

    infoEl.textContent = title + (from || to ? "  \u2014  " + (from || "") + " to " + (to || "") : "") + "  \u2022  " + rows.length + " record(s)";
    renderTable(tableEl, {
      columns: rows.length ? Object.keys(rows[0]).map((k) => ({ label: k })) : [],
      rows,
      pageSize: 30,
      rowRenderer: (tbody, row) => {
        const tr = document.createElement("tr");
        Object.values(row).forEach((v) => {
          const td = document.createElement("td");
          td.style.fontSize = "12.5px";
          td.textContent = v === undefined || v === null ? "" : (typeof v === "number" ? v.toFixed(2) : v);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      }
    });
    window.__reportRows = rows;
    window.__reportTitle = title;
  }

  $("#rpPreview").onclick = build;
  [fromEl, toEl, typeEl].forEach((el) => el.addEventListener("change", build));

  $("#rpExcel").onclick = () => {
    const rows = window.__reportRows || [];
    if (!rows.length) { notify("No data to export.", "warning"); return; }
    if (typeof XLSX === "undefined") {
      loadSheetJSReports().then(() => doExportExcel(rows)).catch(() => notify("Excel library failed to load.", "danger"));
    } else {
      doExportExcel(rows);
    }
  };

  function doExportExcel(data) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "uic-report-" + typeEl.value + "-" + new Date().toISOString().slice(0, 10) + ".xlsx");
    notify("Excel report downloaded.", "success");
  }

  $("#rpPdf").onclick = () => {
    const rows = window.__reportRows || [];
    if (!rows.length) { notify("No data to export.", "warning"); return; }
    exportPdf(window.__reportTitle, rows);
  };

  load();
}

function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }

function exportPdf(title, rows) {
  if (typeof jspdf === "undefined") {
    loadJsPDF().then(() => doPdf(title, rows)).catch(() => notify("PDF library failed to load.", "danger"));
  } else {
    doPdf(title, rows);
  }
}

function doPdf(title, rows) {
  const pdf = new jspdf.jsPDF({ unit: "mm", format: "a4" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(title, 20, 20);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Generated: " + new Date().toLocaleString(), 20, 28);
  const head = Object.keys(rows[0]);
  const body = rows.map((r) => head.map((h) => String(r[h] || "")));
  if (pdf.autoTable) {
    pdf.autoTable({ head: [head], body, startY: 38 });
  } else {
    let y = 38;
    head.forEach((h, i) => pdf.text(h, 20 + i * 30, y));
    rows.forEach((r) => { y += 7; head.forEach((h, i) => pdf.text(String(r[h] || ""), 20 + i * 30, y)); });
  }
  pdf.save("report-" + new Date().toISOString().slice(0, 10) + ".pdf");
  notify("PDF report downloaded.", "success");
}

function loadJsPDF() {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function loadSheetJSReports() {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.19.3/package/dist/xlsx.full.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
