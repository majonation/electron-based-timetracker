# Screen Recording Permission Error - Fix

## Issue
The application was experiencing continuous errors when trying to track activity:
```
Error in pollActivity: Error: Command failed: .../node_modules/active-win/main
active-win requires the screen recording permission in "System Settings › Privacy & Security › Screen Recording".
```

This error occurred repeatedly (every 2 seconds) because the polling continued even when permission was denied.

## Root Cause
The `active-win` package requires macOS Screen Recording permission to detect the active window. Without this permission:
- Every poll attempt fails with a permission error
- The error handler was logging the error but continuing to poll
- This created continuous error spam in the console
- No activity tracking could occur

## Solution Implemented

### Changes to `src/main.js` (Proactive Permission Check)

1. **Check permission on startup**:
   - Use `systemPreferences.getMediaAccessStatus('screen')` to check permission status
   - Run check before creating window or starting tracking
   - macOS-only check (other platforms skip this)

2. **User-friendly permission dialog**:
   - Show dialog if permission not granted
   - Two buttons: "Open System Settings" or "Quit"
   - Clear step-by-step instructions

3. **Direct navigation to settings**:
   - "Open System Settings" button opens directly to Screen Recording preferences
   - Uses deep link: `x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture`
   - User can immediately grant permission

4. **Graceful app quit**:
   - App quits if permission not granted
   - User restarts after granting permission
   - Prevents running without ability to track

### Changes to `src/tracker.js` (Fallback Error Handling)

1. **Added permission error detection**:
   - Check if error message contains "screen recording permission"
   - Distinguish permission errors from other errors

2. **Stop polling on permission error**:
   - Clear the polling interval when permission is denied
   - Prevent continuous error spam
   - Track interval ID to allow stopping

3. **User-friendly error dialog**:
   - Show a one-time error dialog explaining the issue
   - Provide clear instructions on how to grant permission
   - Guide user to: System Settings › Privacy & Security › Screen Recording

4. **Added stopTracking function**:
   - Export `stopTracking()` to allow manual stop if needed
   - Clean up interval properly

### Key Features
- **Proactive check**: Permission checked on startup before any errors occur
- **Direct navigation**: "Open System Settings" button takes user directly to Screen Recording preferences
- **One-time notification**: Dialog shows only once, not repeatedly
- **Graceful degradation**: Stops polling instead of spamming errors (fallback)
- **Clear instructions**: Tells user exactly where to grant permission
- **Restart required**: User knows they need to restart after granting permission

## User Experience Flow

### First Launch (No Permission)
1. App starts and checks for Screen Recording permission
2. Dialog appears: "Screen Recording Permission Required"
3. User clicks "Open System Settings"
4. System Settings opens directly to Screen Recording preferences
5. User enables Time Tracker
6. User restarts the app

### Subsequent Launches (Permission Granted)
1. App starts and checks permission - finds it granted
2. App continues normally, starts tracking
3. No dialogs or interruptions

### If Permission Revoked
- Fallback error handling in `tracker.js` catches errors
- Stops polling to prevent spam
- Shows error dialog with instructions

## Testing
To test the permission flow:
1. Remove Screen Recording permission if already granted
2. Start the app - should see permission dialog
3. Click "Open System Settings" - should open to Screen Recording
4. Grant permission to Time Tracker
5. Restart app - should start normally without dialogs
