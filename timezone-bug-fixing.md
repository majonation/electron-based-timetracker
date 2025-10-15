# Timezone Bug Fix - "No tracking data available for Today"

## Issue
The app was showing "No tracking data available for Today" even though data was being tracked and stored in the database.

## Root Cause
The problem was in the `getDayBoundaries()` and `getDateString()` functions in `src/db.js`. These functions were using timezone-aware date parsing that caused mismatches between:

1. **Database timestamps**: Stored as UTC milliseconds (e.g., `1760509573535`)
2. **Query boundaries**: Calculated using `new Date('2025-10-14T00:00:00.000')` which interprets the string in local timezone (PDT/PST = UTC-7)

### Example of the Problem
- User's local time: 2025-10-14 23:26:13 PDT
- Database timestamp: `1760509573535` (correct)
- Query looking for: timestamps between `1760425200000` and `1760511599999`
- But `getDateString()` was using `toISOString()` which returns UTC date
- At 11:26 PM PDT on Oct 14, it's already Oct 15 in UTC
- So `toISOString().split('T')[0]` returned `'2025-10-15'` instead of `'2025-10-14'`

## Solution

### Fixed `getDateString()` function
**Before:**
```javascript
function getDateString(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
}
```

**After:**
```javascript
function getDateString(timestamp) {
  const date = new Date(timestamp);
  // Use local date components instead of ISO string to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // Returns YYYY-MM-DD format in local time
}
```

### Fixed `getDayBoundaries()` function
**Before:**
```javascript
function getDayBoundaries(dateString) {
  // dateString should be in YYYY-MM-DD format
  const startOfDay = new Date(dateString + 'T00:00:00.000').getTime();
  const endOfDay = new Date(dateString + 'T23:59:59.999').getTime();
  return { startOfDay, endOfDay };
}
```

**After:**
```javascript
function getDayBoundaries(dateString) {
  // dateString should be in YYYY-MM-DD format
  // Parse the date in local timezone to get correct boundaries
  const [year, month, day] = dateString.split('-').map(Number);
  const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  
  return { 
    startOfDay: startDate.getTime(), 
    endOfDay: endDate.getTime() 
  };
}
```

## Verification
After the fix:
- Query for 2025-10-14 now correctly finds 104 records
- Date boundaries are calculated in local time
- `getDateString()` returns the correct local date

## Files Modified
- `src/db.js` - Fixed `getDateString()` and `getDayBoundaries()` functions
- `src/renderer.js` - Fixed all date string generation to use local time instead of UTC

## Additional Fix - Renderer Timezone Issue
After the initial fix, discovered that the renderer was also using `toISOString().split('T')[0]` in multiple places, causing the "Today" display to show tomorrow's date when it's late at night (e.g., 11:40 PM PT = 6:40 AM UTC next day).

### Changes in renderer.js:
1. Added `getLocalDateString()` helper function to consistently get local date strings
2. Replaced all 12 occurrences of `toISOString().split('T')[0]` with `getLocalDateString()`
3. Fixed date comparisons in:
   - `formatDateDisplay()` - Today/Yesterday detection
   - `addDays()` - Date arithmetic
   - `updateNavigationButtons()` - Button state management
   - `goToNextDay()`, `goToToday()` - Navigation functions
   - Auto-refresh day change detection (2 places)
   - Fallback date initialization (2 places)

## Status
✅ **FIXED** - The app now correctly displays tracking data for today and all other dates, with proper timezone handling in both backend and frontend.
