// Unique Kids — payment history
function schoolPaymentsInit(query) {
  const tableEl = $("#spTable");
  const searchEl = $("#spSearch");
  const monthEl = $("#spMonth");
  let rows = [];

  async function load() {
    try {
      const [tSnap, sSnap] = await Promise.all([db.collection("schoolTransactions").get(), db.collection("students").get()]);
      rows = tSnap.docs.map((d) => d.data());
      const studentMap = {};
      sSnap.docs.forEach((d) => { studentMap[d.data().id] = d.data(); });
      window.__spStudents = studentMap;
      render();
    } catch (err) {
      notify("Failed to load payments: " + (err.message || String(err)), "danger");
    }
  }

  function render() {
    const term = searchEl.value.toLowerCase();
    const month = monthEl.value;
    const filtered = rows.filter((t) => {
      if (term) {
        const sid = t.studentId;
        const s = window.__spStudents[sid];
        if (!(sid && sid.toLowerCase().includes(term)) &&
            !(s && s.fullName && s.fullName.toLowerCase().includes(term)) &&
            !(t.studentName && t.studentName.toLowerCase().includes(term))) return false;
      }
      if (month && t.month !== month) return false;
      return true;
    });
    filtered.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
    renderTable(tableEl, {
      columns: [
        { label: "Date" },
        { label: "Student ID" },
        { label: "Student" },
        { label: "Month" },
        { label: "Level" },
        { label: "Amount" },
        { label: "Fine" },
        { label: "Waiver" },
        { label: "Study material" },
        { label: "Method" },
        { label: "Receipt" }
      ],
      rows: filtered,
      pageSize: 25,
      rowRenderer: (tbody, row) => {
        const tr = document.createElement("tr");
        const mat = row.studyMaterial ? (" + " + row.studyMaterial.type + " (" + row.studyMaterial.title + ") " + fmtMoney(row.studyMaterial.price)) : "\u2014";
        tr.innerHTML =
          "<td>" + fmtDate(row.paidAt) + "</td>" +
          "<td><span class='id-cell'>" + escapeHtml(row.studentId || "") + "</span></td>" +
          "<td>" + escapeHtml(row.studentName || "") + "</td>" +
          "<td>" + escapeHtml(row.month || "") + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.levelId || "") + "</td>" +
          "<td>" + fmtMoney(row.amount) + "</td>" +
          "<td>" + fmtMoney(row.fine) + "</td>" +
          "<td>" + fmtMoney(row.waiver) + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(mat) + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.method) + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(row.receiptNumber || "\u2014") + "</td>";
        tbody.appendChild(tr);
      }
    });
  }

  [searchEl, monthEl].forEach((el) => el.addEventListener("input", render));

  $("#spExport").onclick = () => {
    const term = searchEl.value.toLowerCase();
    const month = monthEl.value;
    const filtered = rows.filter((t) => {
      if (term) {
        const s = window.__spStudents[t.studentId];
        if (!(t.studentId && t.studentId.toLowerCase().includes(term)) &&
            !(s && s.fullName && s.fullName.toLowerCase().includes(term))) return false;
      }
      if (month && t.month !== month) return false;
      return true;
    });
    if (!filtered.length) { notify("No data to export.", "warning"); return; }
    if (typeof XLSX === "undefined") {
      loadSheetJSSchool().then(() => doExport(filtered)).catch(() => notify("Excel library failed to load.", "danger"));
    } else {
      doExport(filtered);
    }
  };

  function doExport(data) {
    const ws = XLSX.utils.json_to_sheet(data.map((d) => ({
      Date: fmtDate(d.paidAt), "Student ID": d.studentId, Student: d.studentName,
      Month: d.month, Level: d.levelId, Amount: d.amount, Fine: d.fine, Waiver: d.waiver,
      "Study material": d.studyMaterial ? d.studyMaterial.type + " " + d.studyMaterial.title : "",
      Method: d.method, Receipt: d.receiptNumber
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "School Payments");
    XLSX.writeFile(wb, "school-payments-" + new Date().toISOString().slice(0, 10) + ".xlsx");
    notify("Excel report downloaded.", "success");
  }

  function loadSheetJSSchool() {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.19.3/package/dist/xlsx.full.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  load();
}

function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
