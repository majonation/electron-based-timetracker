# Time Tracker Specification

This project is an Electron-based desktop application that monitors user activity to provide detailed time tracking and productivity insights.

## Core Features
- **Application Tracking**: Monitor every application the user interacts with and record the time spent in each application.
- **Browser Tab Tracking**: Within supported browsers, track time spent on each tab and record the URL for active tabs.
- **Categorization**:
  - Maintain an extensive list of known applications and websites (hundreds of entries) categorized as productive or unproductive.
  - For unknown applications or websites, display them to the user and allow manual categorization.
  - Default categories include Social Media, Email, GitHub for work, Supabase work, and more as needed.
- **Weekly View**: Display a visually appealing, colored bar chart summarizing how much time was spent on each application during the week.
- **Summary**: Provide a breakdown comparing time spent on work-related versus distracting applications or websites.
- **Performance**: The app should be highly performant, capable of running in the background with minimal resource usage, and appear as an icon in the macOS menu bar when minimized.

