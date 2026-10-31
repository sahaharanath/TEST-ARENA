// Unique Kids — monthly fee collection with optional study material
function schoolFeesInit(query) {
  const searchEl = $("#sfStudentId");
  const panel = $("#sfPanel");
  const infoEl = $("#sfStudentInfo");
  const prevEl = $("#sfPrevPayments");

  let students = [];
  let levels = [];
  let admissions = [];
  let txns = [];
  let selected = null;

  const me = Auth.user;

  async function load() {
    try {
      const [sSnap, lSnap, saSnap, tSnap] = await Promise.all([
        db.collection("students").get(),
        db.collection("schoolLevels").get(),
        db.collection("schoolAdmissions").get(),
        db.collection("schoolTransactions").get()
      ]);
      students = sSnap.docs.map((d) => d.data()).filter((s) => s.program === "school");
      levels = lSnap.docs.map((d) => d.data());
      admissions = saSnap.docs.map((d) => d.data());
      txns = tSnap.docs.map((d) => d.data());
      const d = new Date();
      $("#sfMonth").value = d.toISOString().slice(0, 7);
      $("#sfDate").value = d.toISOString().slice(0, 10);
      $("#sfCollector").textContent = (me && me.name) || (me && me.email) || "\u2014";
      if (query) searchEl.value = query;
      if (searchEl.value) doSearch(searchEl.value);
    } catch (err) {
      notify("Failed to load data: " + (err.message || String(err)), "danger");
    }
  }

  function fineForMonth(monthKey, payDate) {
    // Due by the 10th of the applicable month; ₹1 per day after.
    const pay = new Date(payDate);
    const due = new Date(monthKey + "-10");
    if (pay <= due) return 0;
    return Math.ceil((pay - due) / (1000 * 60 * 60 * 24));
  }

  async function doSearch(term) {
    term = (term || "").trim();
    if (!term) { sfReset(); return; }
    const s = students.find((x) => (x.studentId || "").toLowerCase() === term.toLowerCase());
    if (!s) {
      panel.style.display = "none";
      notify("No student found with ID " + escapeHtml(term), "warning");
      selected = null;
      return;
    }
    const sa = admissions.find((a) => a.studentId === s.id);
    if (!sa) {
      panel.style.display = "none";
      notify("Student found but no level admission record.", "warning");
      selected = null;
      return;
    }
    const lvl = levels.find((l) => l.id === sa.levelId);
    selected = { student: s, admission: sa, level: lvl };
    showStudent(s, sa, lvl);
  }

  function showStudent(s, sa, lvl) {
    panel.style.display = "block";
    infoEl.innerHTML =
      '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">' +
      '<div style="flex:1;min-width:260px;">' +
      '<div style="font-size:13px;color:var(--muted);">Student ID</div><div style="font-size:16px;font-weight:700;">' + escapeHtml(s.studentId) + "</div>" +
      '<div style="font-size:13px;color:var(--muted);margin-top:6px;">Name</div><div style="font-size:15px;font-weight:600;">' + escapeHtml(s.fullName) + "</div>" +
      '<div style="font-size:13px;color:var(--muted);margin-top:6px;">Class / Section</div><div style="font-size:13px;">' + escapeHtml((sa.class || "") + (sa.section ? " / " + sa.section : "")) + "</div>" +
      '</div>' +
      '<div style="flex:1;min-width:260px;">' +
      '<div style="font-size:13px;color:var(--muted);">Level</div><div style="font-size:13px;">' + escapeHtml(lvl ? lvl.name : "\u2014") + "</div>" +
      '<div style="font-size:13px;color:var(--muted);margin-top:6px;">Monthly fee</div><div style="font-size:13px;">' + fmtMoney(lvl ? lvl.monthlyFee : 0) + "</div>" +
      '<div style="font-size:13px;color:var(--muted);margin-top:6px;">Admission date</div><div style="font-size:13px;">' + fmtDate(sa.admissionDate) + "</div>" +
      '</div></div>';
    $("#sfMonthly").value = Number(lvl ? lvl.monthlyFee : 0).toFixed(2);
    $("#sfMonth").disabled = false;
    prevEl.innerHTML = "";
    const pts = txns.filter((t) => t.studentId === s.id).sort((x, y) => new Date(y.paidAt) - new Date(x.paidAt)).slice(0, 6);
    if (pts.length) {
      let h = "<h4 style='margin:0 0 8px;font-size:13px;'>Recent payments</h4><table class='data'><thead><tr><th>Month</th><th>Amount</th><th>Fine</th><th>Waiver</th><th>Method</th><th>Receipt</th></tr></thead><tbody>";
      pts.forEach((t) => {
        h += "<tr><td style='font-size:12.5px;'>" + escapeHtml(t.month) + "</td>" +
          "<td style='font-size:12.5px;'>" + fmtMoney(t.amount) + "</td>" +
          "<td style='font-size:12.5px;'>" + fmtMoney(t.fine) + "</td>" +
          "<td style='font-size:12.5px;'>" + fmtMoney(t.waiver) + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(t.method) + "</td>" +
          "<td style='font-size:12.5px;'>" + escapeHtml(t.receiptNumber || "\u2014") + "</td></tr>";
      });
      h += "</tbody></table>";
      prevEl.innerHTML = h;
    }
  }

  $("#sfSave").onclick = async () => {
    if (!selected) { notify("Select a student first.", "warning"); return; }
    const month = $("#sfMonth").value;
    if (!month) { notify("Select a month.", "warning"); return; }
    // prevent duplicate month payment
    const dup = txns.find((t) => t.studentId === selected.student.id && t.month === month);
    if (dup) { notify("Payment already recorded for " + month + ".", "danger"); return; }
    const monthly = Number($("#sfMonthly").value || 0);
    const fine = Number($("#sfFine").value || 0);
    const waiver = Number($("#sfWaiver").value || 0);
    const matType = $("#sfMatType").value;
    const matTitle = $("#sfMatTitle").value.trim();
    const matPrice = Number($("#sfMatPrice").value || 0);
    const total = monthly + fine - waiver + matPrice;
    if (!confirm("Record payment of " + fmtMoney(total) + " for " + selected.student.studentId + " (" + month + ")?")) return;
    const btn = $("#sfSave");
    btn.disabled = true;
    btn.textContent = "Recording...";
    try {
      const txn = {
        txnId: "txn_" + uid(),
        studentId: selected.student.id,
        studentName: selected.student.fullName,
        levelId: selected.admission.levelId,
        month,
        amount: monthly,
        fine,
        waiver,
        method: $("#sfMethod").value,
        paidAt: $("#sfDate").value,
        recordedBy: me.uid,
        receiptNumber: null,
        studyMaterial: matType ? { type: matType, title: matTitle, price: matPrice } : null,
        createdAt: new Date().toISOString()
      };
      if (firebaseReady && firebaseFirestore) {
        await firebaseFirestore.runTransaction(async (t) => {
          const ref = firebaseFirestore.collection("schoolTransactions").doc(txn.txnId);
          t.create(ref, txn);
        });
      } else {
        // idempotency check in demo
        const existing = (await db.collection("schoolTransactions").get()).docs.find((d) => d.data().txnId === txn.txnId);
        if (existing) throw new Error("Duplicate transaction.");
        await db.collection("schoolTransactions").add(txn);
      }
      await db.audit("school.payment.recorded", "schoolTransactions", txn.txnId, txn);
      notify("Monthly payment recorded.", "success");
      load();
    } catch (err) {
      notify("Failed: " + (err.message || String(err)), "danger");
      btn.disabled = false;
      btn.textContent = "Record Monthly Payment";
    }
  };

  function sfReset() {
    searchEl.value = "";
    panel.style.display = "none";
    selected = null;
  }

  searchEl.addEventListener("keypress", (e) => { if (e.key === "Enter") doSearch(searchEl.value); });

  load();
}

function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
