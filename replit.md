# UniApp — Smart Indian University Mobile App

A smart university mobile app for Indian B.Tech students built with Expo/React Native and AsyncStorage (no Firebase).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Demo Credentials

- **Student**: student@university.edu / student123 (Aarav Kumar, 3rd Year CSE Section A, Roll: 22BCS0001)
- **Admin**: admin@university.edu / admin123 (Dr. Ramesh Kumar)

## Stack

- Expo Router v6, React Native, AsyncStorage (no Firebase)
- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Inter fonts, @expo/vector-icons Feather

## Indian Academic System

- **Years**: 1st–4th Year B.Tech
- **Branches**: CSE, CSM, CSIT, ECE, EEE, Mechanical, Civil, AI & DS
- **Sections**: A, B, C, D
- **Exams**: Mid-1 / Mid-2 (25 marks each), External (75 marks), Total 100
- **Grading**: 10-point scale (O/A+/A/B+/B/C/P/F) → SGPA/CGPA
- **Dates**: DD/MM/YYYY format, 24-hour time
- **Fields**: Hall Ticket Number, Academic Year (e.g. 2024-25)

## Notification Categories

`exam` | `supply` | `timetable` | `holiday` | `result` | `general`

## Storage Keys (v3)

`timetable_v3`, `midmarks_v3`, `semester_results_v3`, `syllabus_v3`, `notifications_v3`, `users_v2`, `current_user`

## Where things live

- `artifacts/mobile/` — Expo app
- `artifacts/mobile/constants/academia.ts` — branches, years, sections, academic years, notification categories
- `artifacts/mobile/context/AuthContext.tsx` — user auth + hallTicketNumber, academicYear
- `artifacts/mobile/context/AppDataContext.tsx` — all app data (timetable, marks, results, notifications)
- `artifacts/mobile/utils/dateFormat.ts` — DD/MM/YYYY and 24-hour time utilities
- `artifacts/mobile/app/(tabs)/` — student tab screens (dashboard, timetable, academics, notifications, profile)
- `artifacts/mobile/app/admin/` — admin screens (results, students, timetable, notification, bulk-upload)
- `artifacts/api-server/` — Express API server (bulk PDF/CSV parsing)

## Architecture decisions

- AsyncStorage-only (no network auth): seed users baked in, bump storage key version to re-seed
- `getStudentXxx()` filter functions in context match `year/branch/section/All` wildcards
- Notifications use `category` (exam/supply/timetable/holiday/result/general) for color-coded notice board
- `SemesterResult` stores both `sgpa` (per-semester) and `cgpa` (cumulative); GPA Calculator computes SGPA, Results tab shows CGPA
- `MidMark` stores Mid-1 and Mid-2 separately (25 each); best-of-two counts as internal marks
- Bulk upload (PDF/CSV) via Express `POST /api/bulk-upload/parse` using pdf-parse v2 class API

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Storage keys are versioned (v2/v3) — bump the version to force fresh seed data on next app load
- pdf-parse v2.4.5 uses class-based API: `new PDFParse({ data: buffer }).getText()` — NOT old function-call API
- Metro blockList in `metro.config.js` excludes pdfjs-dist temp dirs to prevent watcher crash
- `expo-document-picker` pinned to `~14.0.8`
- Two pre-existing TS errors (SF Symbols type, useColors cast) — don't fix, they're harmless

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
