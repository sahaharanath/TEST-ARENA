// Pay Fees — search by Student ID, show dues, record payment (transactional)
function payFeesInit(query) {
  const searchEl = $("#pfStudentId");
  const panel = $("#pfStudentPanel");
  const infoEl = $("#pfStudentInfo");
  const itemsEl = $("#pfInstallments");
  const formEl = $("#pfPaymentForm");
  const prevEl = $("#pfPreviousPayments");

  let students = [];
  let admissions = [];
  let courses = [];
  let batches = [];
  let txns = [];
  let selected = null; // {student, admission}

  const me = Auth.user;
  const branchId = Auth.branchId();
  const isSuper = Auth.isSuperAdmin();

  async function load() {
    try {
      const [sSnap, aSnap, cSnap, bSnap, tSnap] = await Promise.all([
        db.collection("students").get(),
        db.collection("admissions").get(),
        db.collection("courses").get(),
        db.collection("batches").get(),
        db.collection("transactions").get()
      ]);
      students = sSnap.docs.map((d) => d.data()).filter((s) => s.program === "youth" && (isSuper || s.branchId === branchId));
      admissions = aSnap.docs.map((d) => d.data());
      courses = cSnap.docs.map((d) => d.data());
      batches = bSnap.docs.map((d) => d.data());
      txns = tSnap.docs.map((d) => d.data()).filter((t) => t.program === "youth" && (isSuper || t.branchId === branchId));
      $("#pfDate").value = new Date().toISOString().slice(0, 10);
      $("#pfCollector").textContent = (me && me.name) || (me && me.email) || "\u2014";
      if (query) searchEl.value = query;
      if (searchEl.value) doSearch(searchEl.value);
    } catch (err) {
      notify("Failed to load data: " + (err.message || String(err)), "danger");
    }
  }

  function fineAsOf(dueDate, payDate) {
    // Fine: payment within the 10th of the due month; after the 10th, ₹1 per day.
    // dueDate is the configured due date; fine applies from the day after the deadline.
    const due = new Date(dueDate);
    const paid = new Date(payDate);
    if (paid <= due) return 0;
    const diff = Math.ceil((paid - due) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff); // ₹1 per day
  }

  async function doSearch(term) {
    term = (term || "").trim();
    if (!term) { pfReset(); return; }
    const s = students.find((x) => (x.studentId || "").toLowerCase() === term.toLowerCase());
    if (!s) {
      panel.style.display = "none";
      notify("No student found with ID " + escapeHtml(term), "warning");
      selected = null;
      return;
    }
    const adm = admissions.filter((a) => a.studentId === s.id && a.status === "active");
    if (!adm.length) {
      panel.style.display = "none";
      notify("Student found but no active admission.", "warning");
      selected = null;
      return;
    }
    selected = { student: s, admissions: adm };
    showStudent(s, adm);
  }

  function showStudent(s, adm) {
    panel.style.display = "block";
    infoEl.innerHTML =
      '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">' +
      '<div style="flex:1;min-width:260px;">' +
      '<div style="font-size:13px;color:var(--muted);">Student ID</div><div style="font-size:16px;font-weight:700;">' + escapeHtml(s.studentId) + "</div>" +
      '<div style="font-size:13px;color:var(--muted);margin-top:6px;">Name</div><div style="font-size:15px;font-weight:600;">' + escapeHtml(s.fullName) + "</div>" +
      '<div style="font-size:13px;color:var(--muted);margin-top:6px;">Branch</div><div style="font-size:13px;">' + escapeHtml(s.branchId || "") + "</div>" +
      '</div>' +
      '<div style="flex:1;min-width:260px;">' +
      '<div style="font-size:13px;color:var(--muted);">Guardian</div><div style="font-size:13px;">' + escapeHtml(s.guardianName || "") + "</div>" +
      '<div style="font-size:13px;color:var(--muted);margin-top:6px;">Guardian phone</div><div style="font-size:13px;">' + escapeHtml(s.guardianPhone || "") + "</div>" +
      '<div style="font-size:13px;color:var(--muted);margin-top:6px;">Admitted</div><div style="font-size:13px;">' + fmtDate(s.admittedAt) + "</div>" +
      '</div></div>';

    // Build payable items: outstanding installments of active admissions
    const payDate = $("#pfDate").value || new Date().toISOString().slice(0, 10);
    let itemsHtml = "<table class='data'><thead><tr><th>Course</th><th>Semester</th><th>Description</th><th>Due date</th><th>Amount</th><th>Fine</th><th>Balance</th><th>Pay</th></tr></thead><tbody>";
    let any = false;
    const itemOptions = [];
    adm.forEach((a) => {
      const crs = courses.find((c) => c.id === a.courseId);
      const b = batches.find((b) => b.id === a.batchId);
      (a.installments || []).forEach((it, i) => {
        if (it.status === "paid") return;
        const fine = fineAsOf(it.dueDate, payDate);
        const balance = Number(it.amount) + fine;
        if (balance <= 0) return;
        any = true;
        const key = "it_" + a.id + "_" + i;
        itemOptions.push({ key, admissionId: a.id, installmentIndex: i, amount: Number(it.amount), fine, dueDate: it.dueDate });
        itemsHtml += "<tr>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(crs ? crs.code : "") + "</td>" +
          "<td style='font-size:12.5px;'>Sem " + (a.semester || "") + "</td>" +
          "<td style='font-size:12.5px;'>Installment \u2014 " + escapeHtml(it.month) + "</td>" +
          "<td style='font-size:12.5px;'>" + fmtDate(it.dueDate) + "</td>" +
          "<td style='font-size:12.5px;'>" + fmtMoney(it.amount) + "</td>" +
          "<td style='font-size:12.5px;'>" + fmtMoney(fine) + "</td>" +
          "<td style='font-size:12.5px;font-weight:600;'>" + fmtMoney(balance) + "</td>" +
          "<td><button class='small secondary' onclick=\"AppViews.payfees.selectItem('" + escapeJs(key) + "')\">Pay</button></td>" +
          "</tr>";
      });
      // exam fee
      if (Number(a.examFee || 0) > 0 && (a.examFee > (a.totalPaid || 0) - (a.admissionFee || 0))) {
        // simplified: show exam fee as payable once
      }
    });
    itemsHtml += "</tbody></table>";
    itemsEl.innerHTML = any ? itemsHtml : "<div class='empty-state' style='padding:16px;'><h3 style='margin:0 0 6px;'>No outstanding installments</h3><p style='margin:0;color:var(--muted);font-size:13px;'>This student has no unpaid installments.</p></div>";

    // previous payments
    const pt = txns.filter((t) => t.studentId === s.id).sort((x, y) => new Date(y.paidAt) - new Date(x.paidAt)).slice(0, 10);
    let ph = "<h4 style='margin:0 0 8px;font-size:13px;'>Previous payments</h4>";
    if (pt.length) {
      ph += "<table class='data'><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Fine</th><th>Waiver</th><th>Method</th><th>Receipt</th></tr></thead><tbody>";
      pt.forEach((t) => {
        ph += "<tr><td style='font-size:12.5px;'>" + fmtDate(t.paidAt) + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(t.description) + "</td>" +
          "<td style='font-size:12.5px;'>" + fmtMoney(t.amount) + "</td>" +
          "<td style='font-size:12.5px;'>" + fmtMoney(t.fine) + "</td>" +
          "<td style='font-size:12.5px;'>" + fmtMoney(t.waiver) + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(t.method) + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(t.receiptNumber || "\u2014") + "</td></tr>";
      });
      ph += "</tbody></table>";
    } else {
      ph += "<p style='margin:0;color:var(--muted);font-size:13px;'>No previous payments.</p>";
    }
    prevEl.innerHTML = ph;

    $("#pfItem").innerHTML = '<option value="">Select an outstanding installment</option>' +
      itemOptions.map((it) =>
        '<option value="' + escapeJs(it.key) + '">' +
        escapeHtml(it.amount.toFixed(2)) + " \u2014 Installment " + (admissions.find((a) => a.id === it.admissionId) ? "" : "") + "</option>").join("");
    window.__pfItems = itemOptions;
    window.__pfSelectedStudent = s;
  }

  window.AppViews = window.AppViews || {};
  window.AppViews.payfees = {
    selectItem: (key) => {
      const it = window.__pfItems.find((x) => x.key === key);
      if (!it) return;
      $("#pfItem").value = key;
      $("#pfDue").value = (it.amount + it.fine).toFixed(2);
      $("#pfFine").value = it.fine.toFixed(2);
      $("#pfWaiver").value = "0";
      formEl.style.display = "block";
      formEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  $("#pfItem").onchange = () => {
    const key = $("#pfItem").value;
    if (!key) { formEl.style.display = "none"; return; }
    window.AppViews.payfees.selectItem(key);
  };

  $("#pfFine").oninput = () => {
    const key = $("#pfItem").value;
    if (!key) return;
    const it = window.__pfItems.find((x) => x.key === key);
    $("#pfDue").value = (Number(it.amount) + Number($("#pfFine").value || 0) - Number($("#pfWaiver").value || 0)).toFixed(2);
  };
  $("#pfWaiver").oninput = $("#pfFine").oninput;
  $("#pfDate").onchange = () => {
    // recompute fines for all items when payment date changes
    if (!selected) return;
    // re-render lightly: recompute fine based on new date
    const payDate = $("#pfDate").value;
    window.__pfItems.forEach((it) => {
      it.fine = fineAsOf(it.dueDate, payDate);
    });
    // update due display if an item is selected
    const key = $("#pfItem").value;
    if (key) {
      const it = window.__pfItems.find((x) => x.key === key);
      $("#pfFine").value = it.fine.toFixed(2);
      $("#pfDue").value = (Number(it.amount) + it.fine - Number($("#pfWaiver").value || 0)).toFixed(2);
    }
  };

  $("#pfSave").onclick = async () => {
    const key = $("#pfItem").value;
    if (!key) { notify("Select an installment to pay.", "warning"); return; }
    const it = window.__pfItems.find((x) => x.key === key);
    const amount = Number($("#pfDue").value || 0);
    const fine = Number($("#pfFine").value || 0);
    const waiver = Number($("#pfWaiver").value || 0);
    if (amount <= 0) { notify("Amount must be greater than zero.", "warning"); return; }
    // Partial payment rule: required installment amount (+fine - waiver) must be collected in full
    const required = Number(it.amount) + it.fine - waiver;
    if (amount < required - 0.01) { notify("Partial installment payments are not allowed. Collect the full amount.", "danger"); return; }
    if (!confirm("Record payment of " + fmtMoney(amount) + " for " + window.__pfSelectedStudent.studentId + "?")) return;
    const btn = $("#pfSave");
    btn.disabled = true;
    btn.textContent = "Recording...";
    try {
      const txn = {
        txnId: "txn_" + uid(),
        studentId: window.__pfSelectedStudent.id,
        studentName: window.__pfSelectedStudent.fullName,
        branchId: window.__pfSelectedStudent.branchId,
        courseId: null,
        batchId: null,
        program: "youth",
        description: it.dueDate ? ("Installment payment \u2014 " + (window.__pfSelectedStudent.admissions.find((a) => a.id === it.admissionId) || {}).courseId || "fee") : "Fee payment",
        amount,
        fine,
        waiver,
        method: $("#pfMethod").value,
        paidAt: $("#pfDate").value,
        receiptNumber: null
      };
      // Determine course/batch from admission for the record
      const adm = window.__pfSelectedStudent.admissions.find((a) => a.id === it.admissionId);
      txn.courseId = adm.courseId;
      txn.batchId = adm.batchId;
      txn.description = "Installment \u2014 " + (adm ? (courses.find((c) => c.id === adm.courseId) || {}).code : "") + " \u2014 " + (adm && adm.installments && adm.installments[it.installmentIndex] ? adm.installments[it.installmentIndex].month : "");

      await recordTransaction(txn);

      // Mark installment paid and update admission balance
      await updateAdmissionAfterPayment(adm.id, it.installmentIndex, amount, fine, waiver);

      await db.audit("payment.recorded", "transactions", txn.txnId, {
        studentId: txn.studentId, amount, fine, waiver, method: txn.method
      });
      notify("Payment recorded.", "success");
      load();
    } catch (err) {
      notify("Failed to record payment: " + (err.message || String(err)), "danger");
      btn.disabled = false;
      btn.textContent = "Record Payment";
    }
  };

  async function updateAdmissionAfterPayment(admissionId, installmentIndex, amount, fine, waiver) {
    if (firebaseReady && firebaseFirestore) {
      // Live: transactional update
      return firebaseFirestore.runTransaction(async (t) => {
        const ref = firebaseFirestore.collection("admissions").doc(admissionId);
        const snap = await t.get(ref);
        const data = snap.data();
        const insts = (data.installments || []).slice();
        insts[installmentIndex] = { ...insts[installmentIndex], status: "paid", paidAt: new Date().toISOString(), paidAmount: amount, fine, waiver };
        let totalPaid = Number(data.totalPaid || 0) + amount;
        t.update(ref, { installments: insts, totalPaid, balance: Math.max(0, Number(data.totalDue || 0) - totalPaid), updatedAt: new Date().toISOString() });
      });
    }
    // Demo mode
    const adm = admissions.find((a) => a.id === admissionId);
    if (!adm) return;
    const insts = (adm.installments || []).slice();
    insts[installmentIndex] = { ...insts[installmentIndex], status: "paid", paidAt: new Date().toISOString(), paidAmount: amount, fine, waiver };
    const totalPaid = Number(adm.totalPaid || 0) + amount;
    adm.installments = insts;
    adm.totalPaid = totalPaid;
    adm.balance = Math.max(0, Number(adm.totalDue || 0) - totalPaid);
    adm.updatedAt = new Date().toISOString();
    DemoStore.set("admissions", admissionId, adm);
  }

  function pfReset() {
    searchEl.value = "";
    panel.style.display = "none";
    selected = null;
  }

  searchEl.addEventListener("keypress", (e) => { if (e.key === "Enter") doSearch(searchEl.value); });

  load();
}

function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
