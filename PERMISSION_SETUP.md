# Screen Recording Permission Setup

## The Problem
When running Electron apps in development mode (`npm start`), macOS sees them as the generic "Electron" app, which makes it difficult to grant Screen Recording permissions. The app won't appear properly in System Settings.

## The Solution
Use the **packaged version** of your app, which has a proper .app bundle and will appear correctly in System Settings.

## Steps to Grant Permission

### 1. Package the App (First Time Only)
```bash
npm run package
```

This creates a proper .app bundle at:
`out/Time Tracker-darwin-x64/Time Tracker.app`

### 2. Launch the Packaged App
```bash
npm run start:packaged
```

Or manually:
```bash
open "out/Time Tracker-darwin-x64/Time Tracker.app"
```

### 3. Grant Screen Recording Permission

When you first launch the packaged app, it will:
1. Detect that Screen Recording permission is needed
2. Show a dialog with instructions
3. Offer to open System Settings for you

**In System Settings:**
1. Go to **Privacy & Security** → **Screen Recording**
2. Look for **"Time Tracker"** in the list (it should appear now!)
3. Toggle the checkbox **ON** for "Time Tracker"
4. **Restart the app** for the permission to take effect

### 4. Verify Permission
After restarting, the app should:
- Not show the permission dialog anymore
- Start tracking your activity automatically
- Display tracking data in the main window

## Development Workflow

### For Daily Use (After Permission is Granted)
```bash
npm run start:packaged
```

### For Development (Making Code Changes)
1. Make your code changes
2. Re-package the app:
   ```bash
   npm run package
   ```
3. Launch the packaged version:
   ```bash
   npm run start:packaged
   ```

**Note:** The permission is tied to the .app bundle. If you use `npm start` (development mode), you'll need to grant permission to the generic "Electron" app separately, which is not recommended.

## Troubleshooting

### "Time Tracker" doesn't appear in System Settings
- Make sure you've launched the **packaged** app at least once
- Try closing System Settings and reopening it
- The app must attempt to access screen recording for macOS to list it

### Permission granted but app still shows error
- **Restart the app** - permissions don't take effect until restart
- Try unchecking and re-checking the permission
- If still not working, try restarting your Mac

### Need to rebuild after code changes
```bash
npm run package && npm run start:packaged
```

## Alternative: Install to Applications Folder

For a more permanent setup, you can copy the app to your Applications folder:

```bash
cp -r "out/Time Tracker-darwin-x64/Time Tracker.app" /Applications/
```

Then launch it from Spotlight or Applications folder like any other Mac app.

## Why This Works

- **Development mode** (`npm start`): Uses the generic Electron.app from node_modules, which changes with every Electron update
- **Packaged mode** (`npm run start:packaged`): Creates a proper "Time Tracker.app" with your app's name, which macOS recognizes as a distinct application
- macOS grants permissions to specific app bundles based on their code signature and bundle identifier
- The packaged app has a stable identity that macOS can track for permissions
