# COE user manual

For each college's Controller of Examinations (COE), Deputy COEs and the Chief COE.
Sign in at the COE panel: https://kvell-coe-admin.vercel.app/admin/login

## 1. First sign-in

1. Enter your username and the **starting password** the Chief COE gave you. You must choose your own password
   (10+ characters, letters and digits).
2. **Set up two-step sign-in.** Install Google Authenticator or Microsoft Authenticator on your phone, scan the QR
   code, type the 6-digit code. Save the **8 recovery codes** somewhere safe (not on the office computer) — each one
   signs you in once if you lose your phone.
3. From then on every sign-in asks for the password **and** the current 6-digit code from the app.
4. After 30 minutes without activity you are signed out automatically. Sign out yourself on shared computers.

## 2. A semester, step by step

| Step | Page | What to do |
|---|---|---|
| 1 | **Departments** | Check the departments of your college (add one if missing). |
| 2 | **Subjects** | Add the semester's subjects (code, title, credits) and mark them COE FINALIZED. |
| 3 | **Student Data** | Choose department, study year, semester **and** academic year. Upload the Excel sheet (or Sample Excel Template). Check the **preview**, then press **Save**. Errors are listed by sheet row and nothing is saved until all rows are correct. |
| 4 | **Faculty Master** | Keep faculty details up to date (experience is calculated from the joining date). |
| 5 | **Mark Entry** / faculty portal | Faculty enter answer-script marks and forward each subject. The COE may enter or correct marks too. |
| 6 | **Internal Marks** | IAT internals per cycle (HODs correct, COE views). |
| 7 | **Publish Results** | When every subject is forwarded and complete, **Publish all results**. Students and HODs see them at once. |
| 8 | **Published Results** | Download the published results (Excel) for the records. |

## 3. Correcting a published result

Publish Results > **Withdraw results** (type the reason) → correct the marks → forward → publish again.
Full steps: [WITHDRAW-RESULT.md](WITHDRAW-RESULT.md).

## 4. Deleting data

- **Clear Sheet** on Student Data deletes the saved students of the chosen class, **with their marks**, after a
  confirmation. Use it only to redo a wrong upload.
- **Delete Target Year/Semester Data** removes a whole class or semester. These actions are recorded in the audit log.

## 5. Audit Logs

Every action by every COE, HOD and faculty member, with time, address and before/after values. It cannot be edited or
deleted. Export it each semester with the records.

## 6. Chief COE only

- **Super Admin Control:** college gateways (close the student portal, withhold results, lock mark entry), announcement
  banner, revaluation window.
- **Officer & COE Provisioning:** create officer accounts (starting password), suspend, reset password, and the phone
  button **Reset two-step sign-in** when an officer loses their phone.
- The Chief COE views every college but makes changes only in the college's own pages when needed.

## 7. Help

| Problem | What to do |
|---|---|
| "Starting the result server…" | Wait up to a minute (free hosting wakes up). |
| Picture with characters at sign-in | Several wrong attempts were made; type the characters shown. |
| Locked out after wrong passwords | Wait 15 minutes, or ask the Chief COE for a new starting password. |
| Lost phone | Use a recovery code, or ask the Chief COE to reset two-step sign-in. |
| Anything else | [System status](https://kvell-result-portal.vercel.app/status.html), then the technical contact on the support sheet. |
