// Receipt generation — Student / Office / Merged copies, print and jsPDF download
function receiptInit(query) {
  const params = new URLSearchParams(query);
  const txnId = params.get("txnId");
  const area = $("#receiptArea");
  const notFound = $("#receiptNotFound");

  if (!txnId) { notFound.style.display = "block"; return; }

  async function load() {
    try {
      const snap = await db.collection("transactions").get();
      const txn = snap.docs.map((d) => d.data()).find((t) => t.txnId === txnId);
      if (!txn) { notFound.style.display = "block"; return; }
      const me = Auth.user;
      if (!Auth.isSuperAdmin() && txn.branchId !== Auth.branchId()) {
        notify("Not authorised to view this receipt.", "danger"); return;
      }
      let student = null;
      try {
        const sSnap = await db.doc("students/" + txn.studentId).get();
        student = sSnap.data();
      } catch (e) { /* student doc may not exist in demo sub-path handling */ }
      if (!student) {
        const all = (await db.collection("students").get()).docs.map((d) => d.data());
        student = all.find((s) => s.id === txn.studentId || s.studentId === txn.studentId);
      }
      const org = (await db.collection("organisation").get()).docs[0];
      const orgData = org ? org.data() : { name: "Unique Infotech", address: "", phones: [], email: "", receiptInfo: "" };
      renderReceipt(txn, student, orgData);
      area.style.display = "block";
    } catch (err) {
      notify("Failed to load receipt: " + (err.message || String(err)), "danger");
    }
  }

  function renderReceipt(txn, student, org) {
    const logo = org.logoUrl || "assets/images/logo.png";
    const date = fmtDate(txn.paidAt);
    const rowHtml = (copy) => `
      <div class="receipt-sheet no-print" id="rcptSheet-${copy}">
        <div class="receipt-head">
          <img src="${escapeHtml(logo)}" alt="Organisation logo" class="logo" onerror="this.style.display='none'">
          <div class="org">
            <h2>${escapeHtml(org.name || "Unique Infotech")}</h2>
            <p>${escapeHtml(org.address || "")}</p>
            <p>${escapeHtml((org.phones || []).join(", "))} &middot; ${escapeHtml(org.email || "")}</p>
            <p style="font-size:10px;color:#666;">${escapeHtml(org.receiptInfo || "")}</p>
          </div>
        </div>
        <div class="receipt-meta">
          <span><b>Receipt No:</b> ${escapeHtml(txn.receiptNumber || "RCP-" + txn.txnId.slice(-6).toUpperCase())}</span>
          <span><b>Date:</b> ${date}</span>
          <span><b>Mode:</b> ${escapeHtml(txn.method)}</span>
          <span><b>Collected by:</b> ${escapeHtml(txn.recordedBy || "")}</span>
        </div>
        <table class="items">
          <thead><tr><th>Student ID</th><th>Student</th><th>Branch</th><th>Course</th><th>Batch</th></tr></thead>
          <tr><td>${escapeHtml(student ? student.studentId : txn.studentId)}</td><td>${escapeHtml(student ? student.fullName : txn.studentName)}</td><td>${escapeHtml(txn.branchId || "")}</td><td>${escapeHtml(txn.courseId || "")}</td><td>${escapeHtml(txn.batchId || "")}</td></tr>
        </table>
        <table class="items">
          <thead><tr><th>Description</th><th style="text-align:right;">Amount</th><th style="text-align:right;">Fine</th><th style="text-align:right;">Waiver</th><th style="text-align:right;">Total</th></tr></thead>
          <tr><td>${escapeHtml(txn.description || "Fee payment")}</td><td style="text-align:right;">${fmtMoney(txn.amount)}</td><td style="text-align:right;">${fmtMoney(txn.fine)}</td><td style="text-align:right;">${fmtMoney(txn.waiver)}</td><td style="text-align:right;"><b>${fmtMoney(Number(txn.amount) + Number(txn.fine) - Number(txn.waiver))}</b></td></tr>
        </table>
        <div class="receipt-foot">
          ${escapeHtml(org.name || "Unique Infotech")} &middot; ${escapeHtml(org.address || "")} &middot; ${escapeHtml((org.phones || []).join(", "))}<br>
          This is a computer-generated receipt. ${copy === "merged" ? "Merged copy (student + office)." : copy === "office" ? "Office copy \u2014 retain for accounts." : "Student copy \u2014 retain for your records."}
        </div>
        <div class="sign-row">
          <div class="sign-col"><div class="sign-line">Authorised Signatory</div></div>
          <div class="sign-col"><div class="sign-line">Received by (Student / Parent)</div></div>
        </div>
        <div style="margin-top:18px;font-size:9px;color:#888;text-align:center;">
          Unique Infotech CMS &mdash; Receipt ${copy === "student" ? "Student Copy" : copy === "office" ? "Office Copy" : "Merged Copy"}
        </div>
      </div>`;

    const copies = ["student", "office", "merged"];
    $("#receiptCopies").innerHTML = copies.map((c) => rowHtml(c)).join("");

    const bind = (copy, printBtn, pdfBtn) => {
      printBtn.onclick = () => printCopy(copy);
      pdfBtn.onclick = () => downloadPdf(copy);
    };
    bind("student", $("#rcptPrintStudent"), $("#rcptPdfStudent"));
    bind("office", $("#rcptPrintOffice"), $("#rcptPdfOffice"));
    bind("merged", $("#rcptPrintMerged"), $("#rcptPdfMerged"));
  }

  function printCopy(copy) {
    const sheet = $("#rcptSheet-" + copy);
    const clone = sheet.cloneNode(true);
    clone.classList.remove("no-print");
    const win = window.open("", "", "width=800,height=1100");
    win.document.write("<html><head><style>body{font-family:"+ (getComputedStyle(document.documentElement).fontFamily) +";font-size:12px;} table.items{border-collapse:collapse;width:100%;} table.items th,table.items td{border-bottom:1px solid #999;padding:5px 8px;text-align:left;} .sign-line{border-top:1px solid #444;padding-top:6px;font-size:10.5px;color:#444;width:150px;margin:0 auto;text-align:center;} .sign-row{display:flex;gap:40px;margin-top:40px;} .sign-col{text-align:center;} @page{size:A4;margin:10mm;} </style></head><body>");
    win.document.write(clone.outerHTML);
    win.document.write("</body></html>");
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  async function downloadPdf(copy) {
    if (typeof jspdf === "undefined") await loadJsPDF();
    const sheet = $("#rcptSheet-" + copy);
    const pdf = new jspdf.jsPDF({ unit: "mm", format: "a4" });
    const img = new Image();
    img.crossOrigin = "anonymous";
    try {
      const logoSrc = ($("#rcptSheet-" + copy).querySelector("img.logo") || {}).src || "";
      if (logoSrc) await new Promise((res) => { img.src = logoSrc; img.onload = res; img.onerror = res; });
    } catch (e) { /* ignore logo */ }
    const org = ($("#rcptSheet-" + copy).querySelector(".org h2") || {}).textContent || "Organisation";
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(org, 20, 30);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const orgLines = ($("#rcptSheet-" + copy).querySelectorAll(".org p"));
    let y = 38;
    orgLines.forEach((p) => { pdf.text(p.textContent, 20, y); y += 6; });
    pdf.setFont("helvetica", "bold");
    pdf.text("Receipt: " + ($("#rcptSheet-" + copy).querySelector(".receipt-meta").textContent.split("Receipt No:")[1]?.split("|")[0].trim() || txnId), 20, y + 6);
    pdf.setFont("helvetica", "normal");
    pdf.text("Student: " + ($("#rcptSheet-" + copy).querySelector("table.items tbody tr").textContent.split("\u2014")[0]?.trim() || ""), 20, y + 14);
    const table = $("#rcptSheet-" + copy).querySelector("table.items:last-of-type");
    const rows = table.querySelectorAll("tbody tr");
    let ty = y + 30;
    pdf.autoTable ? pdf.autoTable({
      startY: ty,
      head: [["Description", "Amount", "Fine", "Waiver", "Total"]],
      body: Array.from(rows).map((r) => Array.from(r.querySelectorAll("td")).map((c) => c.textContent.trim()))
    }) : null;
    const total = table.querySelector("tbody tr td:last-child")?.textContent || "";
    pdf.text("Amount paid: " + total, 20, ty + 10 + rows.length * 10);
    pdf.text("Received by: ____________________    Authorised Signatory: ____________________", 20, ty + 30 + rows.length * 10);
    pdf.save((txn.receiptNumber || "receipt") + "-" + copy + ".pdf");
    notify(copy.charAt(0).toUpperCase() + copy.slice(1) + " copy PDF downloaded.", "success");
  }

  load();
}

function loadJsPDF() {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
