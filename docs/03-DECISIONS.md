# Unique Infotech CMS — Decisions Log

| # | Decision | Rationale | Status |
|---|---|---|---|
| D-01 | Firebase project `unique-infotech-cms`, region `asia-south1 (Mumbai)` | Per project setup information in master prompt | Approved |
| D-02 | Frontend: plain HTML/CSS/vanilla JS, Firebase SDK via pinned CDN, no build system | Per master prompt constraints | Approved |
| D-03 | SPA shell (`app.html`) with hash-routed views inside one document | Preserves auth session across module switches; simpler than N HTML pages sharing session state | Approved |
| D-04 | Demo/local preview mode using localStorage when Firebase config is missing | Sandbox has no Firebase credentials; lets the app run without weakening production security or writing fake data to Firestore | Approved |
| D-05 | APP_VERSION starts at 1.0.0 (no prior version existed in repo) | No existing version module found; documented here to avoid arbitrary reset claims | Approved |
| D-06 | `public/assets/images/logo.png` is the intended logo location; app reads logo URL from organisation settings | Logo can be replaced later without code changes | Approved |
| D-07 | Student ID generation: sequential per branch (`YCC-<branch code>-####`), configurable, uniqueness enforced in Firestore rules | Client format still pending confirmation; made configurable to avoid hardcoding | Approved |
| D-08 | Package/Programme builder enforces semester course relationships (Semester 2 must link to Semester 1 course; Semester 3 to Semester 1+2 history) | Prevents unrelated semester course choices | Approved |
| D-09 | Partial installment payments rejected (explicit business rule) | Per master prompt | Approved |
| D-10 | Payment writes use Firestore transactions; duplicate-payment guard via idempotency key | Atomicity + idempotency for retries/double-clicks | Approved |
| D-11 | Archive ZIP generated client-side (JSZip via CDN); live deletion is a separate gated workflow requiring password re-auth + consent checkboxes; no deletion in dev | Data integrity + recovery | Approved |
| D-12 | Reports: Excel via SheetJS CDN, PDF via jsPDF CDN, date-range filtering, role-scoped data | Per master prompt report requirements | Approved |

Pending client decisions: Student ID final format; name of third Unique Kids level; official 18-month programme name; final price list; organisation display name/head designation; receipt authorised signatory wording.
