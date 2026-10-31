// Payment history ledger (Youth) with pagination and filters
function paymentsInit(query) {
  const tableEl = $("#paymentsTable");
  const searchEl = $("#paySearch");
  const fromEl = $("#payFrom");
  const toEl = $("#payTo");
  const methodEl = $("#payMethod");

  let rows = [];

  async function load() {
    try {
      const snap = await db.collection("transactions").get();
      rows = snap.docs.map((d) => d.data()).filter((t) => t.program === "youth");
      const me = Auth.user;
      if (!Auth.isSuperAdmin()) rows = rows.filter((t) => t.branchId === Auth.branchId());
      render();
    } catch (err) {
      notify("Failed to load payments: " + (err.message || String(err)), "danger");
    }
  }

  function render() {
    const term = searchEl.value.toLowerCase();
    const from = fromEl.value;
    const to = toEl.value;
    const method = methodEl.value;
    const filtered = rows.filter((t) => {
      if (term && !(t.studentId && t.studentId.toLowerCase().includes(term)) &&
          !(t.studentName && t.studentName.toLowerCase().includes(term)) &&
          !(t.receiptNumber && t.receiptNumber.toLowerCase().includes(term))) return false;
      if (from && new Date(t.paidAt) < new Date(from)) return false;
      if (to && new Date(t.paidAt) > new Date(to)) return false;
      if (method && t.method !== method) return false;
      return true;
    });
    filtered.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
    renderTable(tableEl, {
      columns: [
        { label: "Date" },
        { label: "Student ID" },
        { label: "Student" },
        { label: "Branch" },
        { label: "Course" },
        { label: "Description" },
        { label: "Amount" },
        { label: "Fine" },
        { label: "Waiver" },
        { label: "Method" },
        { label: "Receipt" },
        { label: "Recorded by" }
      ],
      rows: filtered,
      pageSize: 25,
      rowRenderer: (tbody, row) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + fmtDate(row.paidAt) + "</td>" +
          "<td><span class='id-cell'>" + escapeHtml(row.studentId || "") + "</span></td>" +
          "<td>" + escapeHtml(row.studentName || "") + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.branchId || "") + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.courseId || "") + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.description || "") + "</td>" +
          "<td>" + fmtMoney(row.amount) + "</td>" +
          "<td>" + fmtMoney(row.fine) + "</td>" +
          "<td>" + fmtMoney(row.waiver) + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.method) + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.receiptNumber || "\u2014") + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.recordedBy || "") + "</td>";
        tbody.appendChild(tr);
      }
    });
  }

  [searchEl, fromEl, toEl, methodEl].forEach((el) => el.addEventListener("change", render));
  searchEl.addEventListener("input", render);

  $("#payExport").onclick = () => {
    const term = searchEl.value.toLowerCase();
    const from = fromEl.value;
    const to = toEl.value;
    const method = methodEl.value;
    const filtered = rows.filter((t) => {
      if (term && !(t.studentId && t.studentId.toLowerCase().includes(term)) &&
          !(t.studentName && t.studentName.toLowerCase().includes(term))) return false;
      if (from && new Date(t.paidAt) < new Date(from)) return false;
      if (to && new Date(t.paidAt) > new Date(to)) return false;
      if (method && t.method !== method) return false;
      return true;
    });
    exportExcel(filtered, "youth-payments");
  };

  load();
}

function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }

// ---------- Excel export (SheetJS CDN) ----------
async function exportExcel(data, fileName) {
  if (!data.length) { notify("No data to export.", "warning"); return; }
  const btn = document.activeElement;
  if (btn) btn.disabled = true;
  try {
    if (typeof XLSX === "undefined") {
      await loadSheetJS();
    }
    const ws = XLSX.utils.json_to_sheet(data.map((d) => ({
      Date: fmtDate(d.paidAt),
      "Student ID": d.studentId,
      Student: d.studentName,
      Branch: d.branchId,
      Course: d.courseId,
      Description: d.description,
      Amount: d.amount,
      Fine: d.fine,
      Waiver: d.waiver,
      Method: d.method,
      Receipt: d.receiptNumber,
      "Recorded by": d.recordedBy
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payments");
    XLSX.writeFile(wb, (fileName || "export") + "-" + new Date().toISOString().slice(0, 10) + ".xlsx");
    notify("Excel report downloaded.", "success");
  } catch (err) {
    notify("Export failed: " + (err.message || String(err)), "danger");
  } finally {
    if (btn) btn.disabled = false;
  }
}

function loadSheetJS() {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.19.3/package/dist/xlsx.full.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

window.exportExcel = exportExcel;
