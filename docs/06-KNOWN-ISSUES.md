# Unique Infotech CMS — Known Issues

- No Firebase credentials are present in the repository/sandbox. The app runs in LOCAL PREVIEW / DEMO mode backed by localStorage; demo data is clearly marked and NEVER written to Firebase. Live Firebase Auth/Firestore/Storage require `firebase-config.js` populated with real `unique-infotech-cms` credentials and deployment of `firestore.rules`/`storage.rules`/`firestore.indexes.json`.
- Google Sign-In for Branch Heads and School Heads cannot be end-to-end tested without a real OAuth client configured in Firebase Authentication. Demo login accepts utpal.goutam@gmail.com (any password) for Super Admin; branch head demo login matches `branches[].branchHeadEmail`.
- Live-mode batch deletion requires a Cloud Function with Firebase Admin SDK (not deployed); the archive UI implements the full gated workflow but flags live deletion as not implemented without backend credentials.
- Student ID final format is pending client confirmation; a configurable sequential format (`YCC-<branch code>-####`) is implemented.
- Name of the third Unique Kids level and official 18-month programme name are pending client confirmation; kept configurable.
- Final price list (course fees, installments, exam fees, school level fees) is pending client confirmation; demo values are placeholder data only, clearly marked.
- Receipt authorised signatory wording and organisation display name/designation are pending client confirmation; fields are configurable via Organisation Details.
- Firestore security rules and indexes are written but not deployed to the project; not tested with Firebase emulators (none available in sandbox).
- PDF/Excel reports use jsPDF and SheetJS from CDN; verify CDN availability in restricted networks.
- Receipt PDF download via jsPDF renders a text-based summary (not a full DOM clone); the print path clones the receipt sheet for exact output.
