# Implementation Plan

## Phase 1: Clarification

- [x] Review `spec.md`
- [x] Add initial clarification questions to `questions.md`
- [x] Add second round of clarification questions
- [x] Receive answers from project owner
- [x] Draft detailed implementation plan with phases and milestones
- [x] Add third round of clarification questions
- [x] Receive answers to third round of questions
- [x] Add fourth round of clarification questions
- [x] Receive answers to fourth round of questions

## Phase 2: Project Setup

- [x] Initialize Electron project structure
- [x] Configure SQLite database and ORM
- [x] Create initial `data/categorization.csv` seed file
- [x] Set up linting, formatting, and basic test harness
- [x] Add `electron-rebuild` to ensure native modules match Electron

## Phase 3: Activity Tracking

- [x] Implement macOS foreground application tracking
- [x] Implement Chrome tab tracking (including incognito)
- [ ] Pause and label tracking as idle on screen lock or sleep
- [x] Persist activity logs to SQLite rounding to 10-second granularity
 - [x] Fix rounding to avoid undercounting by flooring start and ceiling end to 10s
 - [x] Handle day rollover by splitting intervals that cross midnight
 - [x] Fix timezone issue in date boundary calculations (getDayBoundaries and getDateString)
- [x] Handle Screen Recording permission errors gracefully
 - [x] Detect permission errors from active-win
 - [x] Stop polling when permission is denied
 - [x] Show user-friendly dialog with instructions to grant permission
 - [x] Proactively check and request Screen Recording permission on app startup
 - [x] Open System Settings directly to Screen Recording preferences
 - [x] Fix permission request to use askForMediaAccess() instead of getMediaAccessStatus()
 - [x] Ensure app appears in System Settings Screen Recording list

## Phase 4: Categorization

- [ ] Load default categories from CSV into SQLite
- [ ] Implement UI for manual categorization of unknown items
- [ ] Integrate OpenAI (`gpt-4o-mini`) for categorization suggestions
- [ ] Persist user-defined categories for future sessions

## Phase 5: User Interface

- [ ] Display all tracking results in application window as text log
- [ ] Build main window with weekly bar chart (vibrant gradient colors)
- [ ] Add macOS menu bar icon with start/stop controls
- [ ] Display current day's productive percentage in menu bar
- [ ] Ensure UI remains responsive and performant

## Phase 6: Review & Future Work

- [ ] Compare productivity across weeks and list best weeks
- [ ] Plan for future export and automation features
