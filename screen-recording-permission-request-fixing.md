# Screen Recording Permission Request Issue - Fix

## Issue
The app shows a dialog asking for Screen Recording permission, but when the user goes to System Settings › Privacy & Security › Screen Recording, there is no entry for the Time Tracker app to enable.

## Root Cause
The current implementation only **checks** the permission status using `systemPreferences.getMediaAccessStatus('screen')`, but it never actually **requests** the permission using `systemPreferences.askForMediaAccess('screen')`.

macOS will not add an app to the Screen Recording permission list in System Settings until the app explicitly requests the permission. Simply checking the status is not enough to trigger the system to register the app.

## Solution
We need to call `systemPreferences.askForMediaAccess('screen')` to:
1. Trigger macOS to add the app to the Screen Recording permission list
2. Show the native macOS permission prompt
3. Allow the user to grant permission immediately

### Implementation Plan
1. Replace `getMediaAccessStatus()` check with `askForMediaAccess()` call
2. The `askForMediaAccess()` method will:
   - Show the native macOS permission dialog
   - Return `true` if permission is granted
   - Return `false` if permission is denied
   - Add the app to System Settings for future permission management
3. If permission is denied, show our custom dialog with instructions
4. User can then go to System Settings and see the app listed

## Changes Required
- **File**: `src/main.js`
- **Function**: `checkScreenRecordingPermission()`
- **Change**: Use `askForMediaAccess('screen')` instead of `getMediaAccessStatus('screen')`

## Expected Behavior After Fix
1. On first launch, macOS shows native permission dialog
2. If user denies, app shows custom dialog with instructions
3. User can go to System Settings and see Time Tracker in the list
4. User can toggle permission on/off
5. App can be restarted after granting permission

## Status
✅ **FIXED** - Changed `getMediaAccessStatus()` to `askForMediaAccess()` in `src/main.js`

The app will now properly request Screen Recording permission and appear in System Settings.
