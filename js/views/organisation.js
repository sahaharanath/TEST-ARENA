// Organisation details (Super Admin)
function organisationInit(query) {
  const panel = $("#orgPanel");
  let org = {};

  async function load() {
    try {
      const snap = await db.collection("organisation").get();
      org = snap.docs[0] ? snap.docs[0].data() : {};
      render();
    } catch (err) {
      notify("Failed to load organisation details: " + (err.message || String(err)), "danger");
    }
  }

  function render() {
    const logo = org.logoUrl || "assets/images/logo.png";
    panel.innerHTML =
      '<div style="display:flex; gap:20px; align-items:flex-start;">' +
      '<div><img src="' + escapeHtml(logo) + '" alt="Organisation logo" style="width:120px;height:120px;object-fit:contain;border:1px solid var(--line);border-radius:var(--radius);" onerror="this.src=\'assets/images/placeholder.png\'"></div>' +
      '<div style="flex:1;">' +
      '<div class="form-grid" style="margin-bottom:16px;">' +
      '<div class="form-group"><label>Official organisation name</label><span class="field-value" id="vName">' + escapeHtml(org.name || "Unique Infotech") + '</span></div>' +
      '<div class="form-group"><label>Legal / full name</label><span class="field-value" id="vFullName">' + escapeHtml(org.fullName || "") + '</span></div>' +
      '<div class="form-group full"><label>Address</label><span class="field-value" id="vAddress">' + escapeHtml(org.address || "") + '</span></div>' +
      '<div class="form-group"><label>Contact phones</label><span class="field-value" id="vPhones">' + escapeHtml((org.phones || []).join(", ")) + '</span></div>' +
      '<div class="form-group"><label>Email</label><span class="field-value" id="vEmail">' + escapeHtml(org.email || "") + '</span></div>' +
      '<div class="form-group full"><label>Receipt information</label><span class="field-value" id="vReceipt">' + escapeHtml(org.receiptInfo || "") + '</span></div>' +
      '<div class="form-group full"><label>Head Office</label><span class="field-value" id="vHeadOffice">' + escapeHtml(org.headOffice || "") + '</span></div>' +
      '<div class="form-group"><label>Currency</label><span class="field-value" id="vCurrency">' + escapeHtml(org.currency || "INR") + '</span></div>' +
      '</div>' +
      '</div></div>';
  }

  $("#btnEditOrg").onclick = () => {
    const body = `
      <div class="form-grid">
        <div class="form-group"><label>Official organisation name</label><input type="text" id="oName" value="${escapeHtml(org.name || "")}" required></div>
        <div class="form-group"><label>Legal / full name</label><input type="text" id="oFullName" value="${escapeHtml(org.fullName || "")}"></div>
        <div class="form-group full"><label>Address</label><textarea id="oAddress" required>${escapeHtml(org.address || "")}</textarea></div>
        <div class="form-group"><label>Contact phones (comma separated)</label><input type="text" id="oPhones" value="${escapeHtml((org.phones || []).join(", "))}"></div>
        <div class="form-group"><label>Email</label><input type="email" id="oEmail" value="${escapeHtml(org.email || "")}"></div>
        <div class="form-group full"><label>Receipt information (printed on receipts)</label><textarea id="oReceipt">${escapeHtml(org.receiptInfo || "")}</textarea></div>
        <div class="form-group full"><label>Head Office details</label><textarea id="oHeadOffice">${escapeHtml(org.headOffice || "")}</textarea></div>
        <div class="form-group"><label>Currency</label><select id="oCurrency"><option>INR</option><option>USD</option></select></div>
        <div class="form-group"><label>Logo image URL</label><input type="text" id="oLogo" value="${escapeHtml(org.logoUrl || "")}" placeholder="assets/images/logo.png"><div class="field-note">Stored at public/assets/images/logo.png by default. Replace the file to change the logo without editing code.</div></div>
      </div>
    `;
    const foot = `
      <button class="secondary" onclick="this.closest('.backdrop').remove()">Cancel</button>
      <button id="oSave">Save organisation details</button>
    `;
    openModal({ title: "Organisation Details", bodyHtml: body, footHtml: foot });
    $("#oCurrency").value = org.currency || "INR";
    $("#oSave").onclick = async () => {
      const data = {
        name: $("#oName").value.trim(),
        fullName: $("#oFullName").value.trim(),
        address: $("#oAddress").value.trim(),
        phones: $("#oPhones").value.split(",").map((s) => s.trim()).filter(Boolean),
        email: $("#oEmail").value.trim(),
        receiptInfo: $("#oReceipt").value.trim(),
        headOffice: $("#oHeadOffice").value.trim(),
        currency: $("#oCurrency").value,
        logoUrl: $("#oLogo").value.trim() || "assets/images/logo.png",
        updatedAt: new Date().toISOString(),
        updatedBy: Auth.user.uid
      };
      if (!data.name || !data.address) { notify("Name and address are required.", "warning"); return; }
      try {
        const id = org.id || "settings";
        await db.collection("organisation").set({ id, ...data }, { merge: true });
        org = { id, ...data };
        await db.audit("organisation.updated", "organisation", id, data);
        notify("Organisation details updated.", "success");
        render();
      } catch (err) { notify("Failed: " + err.message, "danger"); }
    };
  };

  load();
}
