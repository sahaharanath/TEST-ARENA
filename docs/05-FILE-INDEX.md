# Unique Infotech CMS — File Index

## Configuration
- `firebase.json` — Firebase Hosting/Firestore/Storage deployment config
- `.firebaserc` — project alias `unique-infotech-cms`
- `firestore.rules` — Firestore security rules (role-based isolation)
- `storage.rules` — Firebase Storage security rules (2 MB upload cap)
- `firestore.indexes.json` — required composite indexes

## Core app (root)
- `firebase-config.js` — Firebase SDK init + demo-mode detection
- `app.js` — APP_VERSION (1.0.0), constants, utils, local demo store, shared recordTransaction()
- `auth.js` — authentication, roles, 35-minute inactivity timeout, logout
- `db.js` — Firestore + demo backends, audit helper
- `router.js` — hash-based view router
- `js/ui.js` — Lucide SVG icon library, table pagination, modals
- `js/app-shell.js` — SPA shell, sidebar, section switcher, auth guards, view loader
- `style.css` — royal purple institutional theme, mobile-first responsive
- `index.html` — login page (Super Admin: utpal.goutam@gmail.com)
- `app.html` — SPA shell

## Views (`views/`)
dashboard-youth.html, dashboard-school.html, branches.html, branch-heads.html,
organisation.html, courses.html, packages.html, batches.html, students.html,
admission.html, continuation.html, pay-fees.html, payments.html, receipt.html,
reports.html, archives.html, school-students.html, school-levels.html,
school-fees.html, school-payments.html, school-reports.html, profile.html

## View controllers (`js/views/`)
One module per view (same base name as the view file, `*Init` entry point).

## Assets
- `public/assets/images/logo.png` — organisation logo (replaceable; intended location per requirements)
- `assets/images/logo.png`, `assets/images/placeholder.png` — logo + default student photo

## Documentation (`docs/`)
01-MASTER-PLAN.md, 02-PROGRESS-LOG.md, 03-DECISIONS.md, 04-DATABASE-MAP.md,
05-FILE-INDEX.md, 06-KNOWN-ISSUES.md, 07-HANDOFF-PROMPT.md
