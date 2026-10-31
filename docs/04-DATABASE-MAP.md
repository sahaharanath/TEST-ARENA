# Unique Infotech CMS — Database Map (Firestore)

Collections (all under the `unique-infotech-cms` Firestore database, region asia-south1):

## `organisation` (singleton doc `settings`)
- `name`, `address`, `phones[]`, `email`, `logoUrl`, `receiptInfo`, `headOffice`, `currency` (default INR), `updatedAt`, `updatedBy`

## `users` (doc id = Firebase Auth UID)
- `uid`, `email`, `role` (superadmin | branchhead | schoolhead), `branchId` (null for superadmin/schoolhead), `name`, `phone`, `createdAt`, `updatedAt`, `lastSignIn`

## `branches`
- `name`, `address`, `phones[]`, `email`, `headName`, `headPhone`, `status` (active/inactive), `branchHeadUid`, `branchHeadEmail`, `createdAt`, `updatedAt`, `createdBy`, `code` (short code for student IDs)

## `courses`
- `name`, `code`, `description`, `eligibility`, `semester` (1|2|3), `durationMonths`, `admissionFee`, `installments` (array of {month, amount, dueDay}), `examFee`, `studyMaterialFee`, `packageId` (nullable), `status` (active/inactive), `createdAt`, `updatedAt`

## `packages` (course programmes)
- `name`, `type` (certificate|diploma|programme18 | etc.), `semesters` (array of {courseId, courseName, examFee, order}), `totalFee`, `status`, `createdAt`, `updatedAt`

## `batches`
- `name`, `session`, `courseId`/`packageId`, `startDate`, `endDate`, `timing`, `status` (active/completed/archived), `createdAt`, `updatedAt`, `createdBy`

## `students`
- `studentId`, `fullName`, `photoUrl`, `dob`, `gender`, `guardianName`, `guardianPhone`, `studentPhone`, `address`, `branchId`, `program` (youth|school), `levelId` (school only), `status` (active/completed/dropped), `admittedAt`, `updatedAt`, `createdBy`

## `admissions`
- `studentId`, `courseId`, `packageId` (nullable), `batchId`, `branchId`, `semester` (1|2|3|null), `admissionDate`, `admissionFee`, `installments[]` ({amount, dueDate, status, paidAt, paidAmount, fine, waiver}), `examFee`, `totalDue`, `totalPaid`, `balance`, `previousAdmissionId` (for continuations), `continuationNote`, `status` (active/completed/dropped), `createdAt`, `updatedAt`, `recordedBy`

## `studentHistory` (course history carried across semesters)
- `studentId`, `admissionId`, `courseId`, `semester`, `batchId`, `completedAt`, `result`, `notes`

## `transactions` (payment ledger)
- `txnId` (idempotency key), `studentId`, `studentName`, `branchId`, `courseId`, `batchId`, `program`, `description` (Admission Fee / Installment N / Exam Fee / Monthly Fee / Study Material), `amount`, `fine`, `waiver`, `method` (cash|upi|bank), `paidAt`, `recordedBy`, `receiptNumber`, `refunded` (bool)

## `schoolLevels`
- `name`, `monthlyFee`, `admissionFee`, `studyMaterialFee` (default), `status`, `createdAt`, `updatedAt`

## `schoolAdmissions` (links student to level/monthly billing)
- `studentId`, `levelId`, `class`, `section`, `admissionDate`, `monthlyFee`, `status`, `createdAt`, `updatedAt`

## `schoolTransactions` (monthly fee ledger)
- `txnId`, `studentId`, `studentName`, `levelId`, `month` (YYYY-MM), `amount`, `fine`, `waiver`, `studyMaterial` ({type,title,price}), `method`, `paidAt`, `recordedBy`, `receiptNumber`

## `auditLog`
- `uid`, `email`, `role`, `action`, `targetCollection`, `targetId`, `details`, `createdAt`

## `archives`
- `batchId`, `archiveUrl`, `generatedAt`, `generatedBy`, `deletedAt`, `deletedBy`, `consent`

## Security model

- Super Admin: organisation-wide read/write on admin collections; scoped writes to financial/student collections with audit.
- Branch Head: read/write only students/admissions/transactions of assigned `branchId`; read own branch.
- School Head: Unique Kids collections only (`students` where program=school, `schoolAdmissions`, `schoolTransactions`, `schoolLevels` read).
- No broad `allow read/write: if request.auth != null` rules.

Indexes required: see `firestore.indexes.json`.

Storage: `students/{studentId}/documents/{category}/{fileId}`, metadata in `studentDocuments` (subcollection or doc fields). Access rules match user's branch/program scope.
