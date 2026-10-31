// Unique Kids reports
function schoolReportsInit(query) {
  const typeEl = $("#srpType");
  const monthEl = $("#srpMonth");
  const infoEl = $("#srpInfo");
  const tableEl = $("#srpTable");

  let students = [], levels = [], admissions = [], txns = [];

  async function load() {
    try {
      const [sSnap, lSnap, saSnap, tSnap] = await Promise.all([
        db.collection("students").get(),
        db.collection("schoolLevels").get(),
        db.collection("schoolAdmissions").get(),
        db.collection("schoolTransactions").get()
      ]);
      students = sSnap.docs.map((d) => d.data());
      levels = lSnap.docs.map((d) => d.data());
      admissions = saSnap.docs.map((d) => d.data());
      txns = tSnap.docs.map((d) => d.data());
      monthEl.value = new Date().toISOString().slice(0, 7);
      build();
    } catch (err) {
      notify("Failed to load data: " + (err.message || String(err)), "danger");
    }
  }

  function build() {
    const type = typeEl.value;
    const month = monthEl.value;
    const lvlName = (id) => { const l = levels.find((x) => x.id === id); return l ? l.name : id; };
    let rows = [], title = "";
    if (type === "bystudent") {
      title = "Students by Level";
      rows = students.map((s) => {
        const sa = admissions.find((a) => a.studentId === s.id);
        return { "Student ID": s.studentId, Name: s.fullName, Level: lvlName(sa ? sa.levelId : ""), "Class / Section": (sa ? (sa.class || "") + (sa.section ? " / " + sa.section : "") : ""), Status: s.status };
      });
    } else if (type === "monthwise") {
      title = "Month-wise Collection Summary";
      const map = {};
      txns.forEach((t) => {
        if (month && t.month !== month) return;
        if (!map[t.month]) map[t.month] = { amount: 0, fine: 0, waiver: 0, count: 0 };
        map[t.month].amount += Number(t.amount || 0);
        map[t.month].fine += Number(t.fine || 0);
        map[t.month].waiver += Number(t.waiver || 0);
        map[t.month].count += 1;
      });
      rows = Object.keys(map).sort().map((m) => ({ Month: m, ...map[m] }));
    } else if (type === "dues") {
      title = "Outstanding Monthly Fees";
      const cur = month || new Date().toISOString().slice(0, 7);
      students.forEach((s) => {
        if (s.status !== "active") return;
        const sa = admissions.find((a) => a.studentId === s.id);
        const monthly = sa ? Number(sa.monthlyFee) : 0;
        const paid = txns.filter((t) => t.studentId === s.id && t.month === cur).reduce((x, t) => x + Number(t.amount), 0);
        if (monthly - paid > 0) {
          rows.push({ "Student ID": s.studentId, Name: s.fullName, Level: lvlName(sa ? sa.levelId : ""), Month: cur, "Monthly fee": monthly, "Paid": paid, Outstanding: monthly - paid });
        }
      });
    }
    infoEl.textContent = title + (month ? "  \u2014  " + month : "") + "  \u2022  " + rows.length + " record(s)";
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
    window.__srpRows = rows;
    window.__srpTitle = title;
  }

  $("#srpPreview").onclick = build;
  [typeEl, monthEl].forEach((el) => el.addEventListener("change", build));

  $("#srpExcel").onclick = () => {
    const rows = window.__srpRows || [];
    if (!rows.length) { notify("No data to export.", "warning"); return; }
    const ws = XLSX_get().then(() => {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, "school-report-" + new Date().toISOString().slice(0, 10) + ".xlsx");
      notify("Excel report downloaded.", "success");
    }).catch(() => notify("Excel library failed to load.", "danger"));
  };

  $("#srpPdf").onclick = () => {
    const rows = window.__srpRows || [];
    if (!rows.length) { notify("No data to export.", "warning"); return; }
    exportPdfSimple(window.__srpTitle, rows);
  };

  load();
}

function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }

// load XLSX on demand
function XLSX_get() {
  return new Promise((resolve, reject) => {
    if (typeof XLSX !== "undefined") return resolve();
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.19.3/package/dist/xlsx.full.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function exportPdfSimple(title, rows) {
  if (typeof jspdf === "undefined") {
    loadJsPDFSchool().then(() => doPdf(title, rows)).catch(() => notify("PDF library failed to load.", "danger"));
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
  if (pdf.autoTable) pdf.autoTable({ head: [head], body, startY: 38 });
  pdf.save("school-report-" + new Date().toISOString().slice(0, 10) + ".pdf");
  notify("PDF report downloaded.", "success");
}

function loadJsPDFSchool() {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
