# Claude 4 – AugmentCode Kick-Off Prompt

# Project: Grant & Vacation Tracker (React front-end MVP)

# Context

We have finalised the back-end data model on DynamoDB:

TABLE Workdays (PK = UserID, SK = “WORKDAYS#YYYY”)  
 Workdays : Map<ISO-Date, true>

TABLE TimeSlots (PK = UserID, SK = “YYYY-MM-DD#GrantID”)  
 AllocationPercent : Number (0-100)

Rule → a TimeSlot row **must exist only** if that date is also flagged true in Workdays.  
Editing a Workday → any TimeSlots for that day are added/removed in one TransactWrite (≤ 25 ops).

# Front-end requirements

1. **Create-React-App + TypeScript** baseline.
2. **Calendar / Timeline views**
   - Day, Week, Month, Year via **@fullcalendar/react** (scheduler / resource-timeline).
   - When a date cell gains focus → show inline preview of all grant splits.
3. **Spreadsheet view** for rapid edits (per-person) using **ReactGrid** with virtualised rows & cols:
   - Range selection, copy/paste, fill-handle.
   - Each cell edits `AllocationPercent` for one (date, grant).
4. **Material-UI** (`@mui/material`, v5) for all non-grid components: top bar, side drawer, dialogs, snackbars.
5. **State / data-fetching**
   - Use **React Query** (`@tanstack/react-query`) for caching; Axios for API calls.
   - Endpoints:
     - `GET /workdays/:user/:year` → returns Workdays map
     - `GET /timeslots/:user?start&end` → returns rows in date range
     - `POST /timeslots/batch` | `DELETE /timeslots/batch`
   - Local optimistic updates; on 409 (over-100 %) show MUI snackbar.
6. **Editing workflow**
   - If a blank cell is edited → auto-create Workday flag + TimeSlot.
   - If AllocationPercent set to 0 → auto-delete that TimeSlot; if no more slots on that day, auto-unset Workday.
   - Bulk Workday toggle (checkbox column in calendar) triggers batch slot deletes in one API call.
7. **Validation** – UI must block > 100 % per day (live total shown next to date header).
8. **Testing** – Jest + React-Testing-Library basics for CalendarView & GridView.
9. **Folder skeleton**  
   /src
   /api native fetch clients & hooks
   /components
   CalendarView/
   TimesheetGrid/
   Dialogs/
   /models → TS types for Workday, TimeSlot
   /pages Dashboard, UserTimesheet
   /theme MUI palette override

# Deliverables for this prompt

- `npx create-react-app tracker --template typescript`
- Install & configure dependencies listed above.
- Implement **CalendarView** that reads Workdays, colour-codes working days, and links to TimesheetGrid.
- Implement **TimesheetGrid** with ReactGrid, optimistic editing, 100 % guard, and toast feedback.
- Provide mock API layer (in-memory) to allow immediate local development.
- Add a simple MUI AppBar + Drawer to switch between users (static list) and views.
- Include one Jest test per component to prove render & edit path.

# Output format

1. **`commands.sh`** – bash steps to create the project & install packages.
2. **`src/`** code files (inline or zipped) implementing MVP.
3. **`README.md`** – local dev instructions and next-step TODOs.

# Constraints

- Be concise with code, keep it DRY!
- TypeScript strict mode (`"strict": true`).
- Use functional components with hooks; no class components.
- No styling library beyond MUI & FullCalendar default themes.
- Styling can come after, the idea is that it looks good out of the box, minimal custom CSS.

# Actual Tasks

1. Build the calendar view using the FullCalendar
2. Build the timesheet grid using ReactGrid
3. Implement a mock API layer
4. Add the MUI AppBar and Drawer
5. Write Jest tests for the calendar view and timesheet grid
