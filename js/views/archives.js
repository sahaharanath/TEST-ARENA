// Archives — offline batch archive (ZIP) and optional secure deletion workflow
function archivesInit(query) {
  if (typeof JSZip === "undefined") {
    loadJSZip().then(() => run()).catch(() => notify("Archive library failed to load.", "danger"));
    return;
  }
  run();

  function run() {
    const batchSel = $("#arBatch");
  const genBtn = $("#arGen");
  const dlBtn = $("#arDownload");
  const verify = $("#arVerify");
  const verifyList = $("#arVerifyList");
  const delPanel = $("#arDelete");
  const pwdEl = $("#arPwd");
  const c1 = $("#arC1"), c2 = $("#arC2"), c3 = $("#arC3");
  const delBtn = $("#arDeleteBtn");
  const batchNameEl = $("#arBatchName");

  let batches = [];
  let students = [];
  let admissions = [];
  let txns = [];
  let docsMeta = [];
  let selectedBatch = null;
  let zipBlob = null;

  async function load() {
    try {
      const [bSnap, sSnap, aSnap, tSnap] = await Promise.all([
        db.collection("batches").get(),
        db.collection("students").get(),
        db.collection("admissions").get(),
        db.collection("transactions").get()
      ]);
      batches = bSnap.docs.map((d) => d.data());
      students = sSnap.docs.map((d) => d.data());
      admissions = aSnap.docs.map((d) => d.data());
      txns = tSnap.docs.map((d) => d.data());
      batchSel.innerHTML = '<option value="">Select a completed batch</option>' +
        batches.filter((b) => b.status === "completed" || b.status === "archived").map((b) =>
          '<option value="' + escapeJs(b.id) + '">' + escapeHtml(b.name + " (" + b.session + ")") + "</option>").join("");
      if (batches.length === 0) batchSel.disabled = true;
    } catch (err) {
      notify("Failed to load batches: " + (err.message || String(err)), "danger");
    }
  }

  batchSel.onchange = () => {
    selectedBatch = batches.find((b) => b.id === batchSel.value);
    verify.style.display = "none";
    delPanel.style.display = "none";
    dlBtn.style.display = "none";
    zipBlob = null;
    if (selectedBatch) batchNameEl.textContent = selectedBatch.name;
  };

  genBtn.onclick = async () => {
    if (!selectedBatch) { notify("Select a batch.", "warning"); return; }
    genBtn.disabled = true;
    genBtn.textContent = "Generating ZIP...";
    try {
      const batchStudents = students.filter((s) => s.batchId === selectedBatch.id);
      const batchAdmissions = admissions.filter((a) => a.batchId === selectedBatch.id);
      const batchTxns = txns.filter((t) => t.batchId === selectedBatch.id);

      // Collect document references for these students
      let allDocs = {};
      for (const s of batchStudents) {
        try {
          const sub = await db.collection("students").doc("students/" + s.id).collection("documents").get();
          allDocs[s.id] = sub.docs.map((d) => d.data());
        } catch (e) { allDocs[s.id] = []; }
      }

      const zip = new JSZip();
      zip.file("data/batch.json", JSON.stringify(selectedBatch, null, 2));
      zip.file("data/students.json", JSON.stringify(batchStudents, null, 2));
      zip.file("data/admissions.json", JSON.stringify(batchAdmissions, null, 2));
      zip.file("data/payments.json", JSON.stringify(batchTxns, null, 2));
      zip.file("data/documents.json", JSON.stringify(allDocs, null, 2));

      // Offline viewer
      zip.file("index.html", archiveViewerHtml(selectedBatch.name));
      zip.file("css/style.css", archiveViewerCss());
      zip.file("js/viewer.js", archiveViewerJs());

      zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      dlBtn.href = url;
      dlBtn.download = "Batch-" + (selectedBatch.name || "archive") + "-" + new Date().toISOString().slice(0, 10) + ".zip";
      dlBtn.style.display = "inline-block";

      verify.style.display = "block";
      verifyList.innerHTML =
        "<ul>" +
        "<li>Batch: <b>" + escapeHtml(selectedBatch.name) + "</b></li>" +
        "<li>Students: " + batchStudents.length + "</li>" +
        "<li>Admissions: " + batchAdmissions.length + "</li>" +
        "<li>Payments: " + batchTxns.length + "</li>" +
        "<li>Document metadata sets: " + Object.keys(allDocs).length + "</li>" +
        "</ul>" +
        "<p style='font-size:12.5px;color:var(--muted);margin-top:8px;'>Contents: <code>index.html</code>, <code>css/</code>, <code>js/</code>, <code>data/*.json</code>. Open <code>index.html</code> after extracting.</p>";

      delPanel.style.display = "block";
      notify("Archive generated. Download the ZIP and verify before considering deletion.", "success");
    } catch (err) {
      notify("Archive generation failed: " + (err.message || String(err)), "danger");
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = "Generate Archive ZIP";
    }
  };

  [c1, c2, c3, pwdEl].forEach((el) => el.addEventListener("change", updateDeleteState));
  pwdEl.addEventListener("input", updateDeleteState);

  function updateDeleteState() {
    const ready = c1.checked && c2.checked && c3.checked && pwdEl.value.length >= 6;
    delBtn.disabled = !ready;
  }

  $("#arDeleteBtn").onclick = async () => {
    if (!confirm("FINAL CONFIRM: Permanently delete batch \"" + escapeHtml(selectedBatch.name) + "\" and all associated live records? This cannot be undone.")) return;
    // In preview/demo mode: simulate deletion — do not actually remove data, mark batch archived
    if (DEMO_MODE) {
      try {
        await db.collection("batches").set({ id: selectedBatch.id, status: "archived", updatedAt: new Date().toISOString() }, { merge: true });
        await db.audit("archive.deletion_simulated", "batches", selectedBatch.id, { note: "Demo mode: no live data removed" });
        notify("Demo mode: deletion simulated. Batch marked archived. No live data was removed.", "success");
        delPanel.style.display = "none";
        load();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
      return;
    }
    // Live mode: requires Firebase Admin-backed function; not implemented without backend credentials.
    notify("Live deletion requires Cloud Function deployment with Admin SDK. Contact the developer.", "warning");
  };

  window.arCancelDelete = () => {
    delPanel.style.display = "none";
    [c1, c2, c3].forEach((x) => x.checked = false);
    pwdEl.value = "";
    updateDeleteState();
  };

  load();
  }
}

function loadJSZip() {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function escapeJs(s) { return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }

function archiveViewerHtml(batchName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Archive - ${escapeHtmlJs(batchName)}</title>
<style>${archiveViewerCss()}</style>
</head>
<body>
<div class="av-panel">
  <div class="av-head"><h2>Batch Archive</h2><p style="font-size:12px;color:#666;">${escapeHtmlJs(batchName)} &mdash; Unique Infotech CMS (offline viewer)</p></div>
  <div class="av-toolbar">
    <button onclick="avFilter('all')">All</button>
    <button onclick="avFilter('students')">Students</button>
    <button onclick="avFilter('admissions')">Admissions</button>
    <button onclick="avFilter('payments')">Payments</button>
    <button onclick="avFilter('documents')">Documents</button>
  </div>
  <div id="avContent"></div>
</div>
<script src="js/viewer.js"></script>
<script>
window.addEventListener('DOMContentLoaded', () => {
  Promise.all([
    fetch('data/batch.json').then(r=>r.json()),
    fetch('data/students.json').then(r=>r.json()),
    fetch('data/admissions.json').then(r=>r.json()),
    fetch('data/payments.json').then(r=>r.json()),
    fetch('data/documents.json').then(r=>r.json())
  ]).then(([batch, students, admissions, payments, documents]) => {
    window.__av = { batch, students, admissions, payments, documents };
    avRender('all');
  });
});
</script>
</body>
</html>`;
}

function archiveViewerCss() {
  return `body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;color:#222;background:#f5f3f8;margin:0;padding:20px;}
.av-panel{max-width:980px;margin:0 auto;background:#fff;border:1px solid #ccc;border-radius:8px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);}
.av-head{border-bottom:1px solid #ccc;padding-bottom:10px;margin-bottom:14px;}
.av-head h2{margin:0 0 4px;font-size:18px;color:#6b21a8;}
.av-toolbar{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.av-toolbar button{border:1px solid #ccc;background:#fff;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;}
.av-toolbar button.active{background:#6b21a8;color:#fff;border-color:#6b21a8;}
table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px;}
th{background:#f2eff7;text-align:left;padding:7px 10px;font-size:11px;text-transform:uppercase;border-bottom:2px solid #ccc;}
td{border-bottom:1px solid #ddd;padding:7px 10px;}
tr:hover td{background:#faf7fd;}
.tag{font-size:11px;padding:2px 6px;border-radius:10px;background:#e8e4ee;color:#3d3d45;}
.tag.active{background:#e8f3ec;color:#1e7a34;}
.empty{color:#666;font-style:italic;padding:16px;}
h3{font-size:14px;color:#6b21a8;margin:16px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px;}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;word-break:break-all;}
@media print{body{background:#fff;padding:0;}.av-panel{box-shadow:none;border:none;}}`;
}

function archiveViewerJs() {
  return `
function avFilter(kind){
  document.querySelectorAll('.av-toolbar button').forEach(b=>b.classList.toggle('active', b.textContent.toLowerCase().includes(kind) || (kind==='all'&&b.textContent==='All')));
  const d=window.__av; const out=document.getElementById('avContent'); out.innerHTML='';
  if(kind==='all'||kind==='students'){out.innerHTML+='<h3>Students ('+d.students.length+')</h3><table><thead><tr><th>Student ID</th><th>Name</th><th>Guardian</th><th>Branch</th><th>Status</th></tr></thead><tbody>'+d.students.map(s=>'<tr><td>'+s.studentId+'</td><td><b>'+s.fullName+'</b></td><td>'+s.guardianName+'</td><td>'+s.branchId+'</td><td><span class="tag '+(s.status||'active')+'">'+(s.status||'active')+'</span></td></tr>').join('')+'</tbody></table>';
  }
  if(kind==='all'||kind==='admissions'){out.innerHTML+='<h3>Admissions ('+d.admissions.length+')</h3><table><thead><tr><th>Student ID</th><th>Course</th><th>Semester</th><th>Admission date</th><th>Total due</th><th>Balance</th></tr></thead><tbody>'+d.admissions.map(a=>'<tr><td>'+a.studentId+'</td><td>'+a.courseId+'</td><td>'+a.semester+'</td><td>'+a.admissionDate+'</td><td>'+a.totalDue+'</td><td>'+a.balance+'</td></tr>').join('')+'</tbody></table>';
  }
  if(kind==='all'||kind==='payments'){out.innerHTML+='<h3>Payments ('+d.payments.length+')</h3><table><thead><tr><th>Date</th><th>Student ID</th><th>Description</th><th>Amount</th><th>Fine</th><th>Waiver</th></tr></thead><tbody>'+d.payments.map(p=>'<tr><td>'+p.paidAt+'</td><td>'+p.studentId+'</td><td>'+p.description+'</td><td>'+p.amount+'</td><td>'+p.fine+'</td><td>'+p.waiver+'</td></tr>').join('')+'</tbody></table>';
  }
  if(kind==='all'||kind==='documents'){out.innerHTML+='<h3>Document records ('+Object.keys(d.documents||{}).length+' students)</h3>';
  Object.entries(d.documents||{}).forEach(([sid, docs])=>{out.innerHTML+='<div><b>'+sid+'</b><ul>'+docs.map(doc=>'<li>'+doc.categoryName+': '+doc.fileName+' ('+doc.size+' bytes)</li>').join('')+'</ul></div>';});
  }
}
function escapeHtmlJs(t){if(t==null)return'';const d=document.createElement('div');d.textContent=String(t);return d.innerHTML;}
`;
}
