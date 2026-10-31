# Unique Infotech CMS — Handoff Prompt

Context: continuation of the Unique Infotech CMS build on branch `arena/9854934b-test-arena`. Repository: `sahaharanath/TEST-ARENA`.

State: foundation + core modules implemented (auth, roles, section switcher, dashboards, branches, organisation, courses, packages, batches, students, admission, continuation, pay fees, payment history, receipts, reports, school program, archives). App runs in local preview/demo mode when Firebase credentials are absent.

Next recommended tasks:
1. Populate `firebase-config.js` with real `unique-infotech-cms` credentials and deploy `firestore.rules`, `storage.rules`, `firestore.indexes.json`.
2. End-to-end test with real Firebase Auth (Super Admin email/password, Google Sign-In for branch/school heads).
3. Confirm client decisions: Student ID format, third level name, 18-month programme name, price list, org display name, receipt signatory wording.
4. Run security rule tests with Firebase emulators if available.
5. Performance test pagination/targeted queries with representative datasets.
6. Prepare and open the GitHub PR from `arena/9854934b-test-arena`; do not merge.

Key files: `app.js` (APP_VERSION), `auth.js`, `db.js`, `style.css`, `app.html`, `views/`, `js/views/`, `firestore.rules`, `storage.rules`.

Do not deploy to production Firebase or merge the PR without owner approval.
