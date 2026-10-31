# Unique Infotech CMS — Master Plan

**Project:** Unique Infotech CMS  
**Firebase project:** `unique-infotech-cms`  
**Firebase region:** `asia-south1 (Mumbai)`  
**Main organisation:** Unique Infotech  
**Primary client:** Bankura Zilla Youth Computer Training Centre (in collaboration with Unique Infotech)  
**Location:** Kenduadihi, Bankura, West Bengal, India  
**Super Admin email:** `utpal.goutam@gmail.com`  
**Current version:** 1.0.0 (see `app.js` `APP_VERSION`)

## Scope (Version 1)

One application, one Super Admin, two logically separate operational sections:

- **Section A — Youth Computer Centre:** multi-branch (dynamic branches), course/programme packages with semester relationships, batches shared across branches, admissions, installment fees, fines, payments, receipts, reports, archives.
- **Section B — School Computer Program (Unique Kids):** single school programme, three levels (Basic, Advance, third level name to be confirmed), admission fee + recurring monthly fees + optional study material.

## Architecture

- Frontend: plain HTML5/CSS3/vanilla ES6 JavaScript, no frameworks, no build step.
- Backend: Firebase Authentication, Cloud Firestore, Firebase Storage, Firebase Hosting; Cloud Functions only where privileged server-side operations are genuinely required.
- SDK: Firebase via version-pinned CDN imports.
- Icons: Lucide SVG only. No emojis in UI. English only. Mobile-first responsive.
- Brand colour: royal purple.

## Roles

| Role | Login | Data access |
|---|---|---|
| Super Admin | Email/password | Entire organisation |
| Youth Branch Head | Google Sign-In | Assigned Youth branch only |
| School Head | Google Sign-In | Unique Kids only |

No public registration. Session timeout after ~30–45 minutes of inactivity.

## Phases

1. Foundation — layout, login, auth, roles, session protection, section switcher, dashboard shell, navigation, common components.
2. Super Admin management — branches, branch heads, organisation details, courses, packages, batches, fee configuration.
3. Student management — admissions, profiles, photo/document uploads, lists, search, pagination, semester continuation.
4. Financial management — pay fees, installments/fines, waivers, payment recording, payment history, receipts.
5. School Computer Program — students, levels, monthly fees, study material, school receipts.
6. Reporting and archives — Excel/PDF reports, offline batch archive, secure deletion workflow.

## Rules of note

- No notification bell system in v1.
- No public portal, attendance, SMS/email, franchise, multi-school, HR/payroll, inventory.
- Fees and Payments are separate screens.
- No hardcoded production financial values or fake statistics.
- Firestore and Storage security rules are mandatory and role-isolated.
- Archive download and live deletion are separate, gated operations; no real deletion during development.
