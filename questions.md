# Clarification Questions

1. **Supported Browsers**: Which browsers should the app support for tab and URL tracking? (e.g., Chrome, Firefox, Safari, etc.)
Answer: Chrome Browser
2. **Platform Scope**: Should the application be macOS-only, or should it support Windows and Linux as well? Answer: macOS-only
3. **Data Storage**: Where should tracked data be stored (local file, SQLite, cloud service)? Answer: locally in SQLite
4. **Application List Source**: Do you have a preferred source or format for the extensive list of known applications and websites to categorize as productive/unproductive? Answer: SQLite
5. **User Categorization**: How should users categorize unknown applications or websites? Should there be a UI for manual categorization, or is a configuration file sufficient? Answer: create an initial file in csv format listing websites, applications and if they are considered to support work or are for eduction, entertainment or news. make sure that for website it is able to use main domains and does not just look for the full url path - make it flexible with *
Ask OpenAI with an API call in case the category is not clear.
6. **Weekly View Design**: Are there specific requirements for the appearance of the weekly bar chart (e.g., color scheme, interactivity, libraries to use)? Answer: The weekly calendar view, which is scrollable to previous weeks and it has white background like in Google Calendar and the bar chart is very appealing with vibrant, warm, and friendly colors. Ideally, with a slight gradient in each of the bars. Choose the right library for this task. Do the proper research. It must be appealing and performant. 
7. **Work vs. Distraction Definition**: Are there specific rules or thresholds for determining whether an application is work-related or distracting, or should this be entirely user-configurable? Answer: The rules if something is distracting is when it shows funny videos (e.g. YouTube tutorials are productive, but funny videos are not). In order to categorize the application, it can ask OpenAI and figure out if it's productive or not using an API call. An API key will be provided. 
8. **Background Operation**: Should the app automatically start on system startup and run silently in the background, or is manual launch acceptable? Answer: No, the application needs to be started manually for now, but later on it might be the case. 
9. **Privacy Considerations**: Are there any privacy or data retention requirements the app must adhere to? Answer: It runs locally, so at the moment, there are no requirements for privacy. 
10. **Exporting Reports**: Should the app provide options to export tracked data or weekly reports (e.g., PDF, CSV)? Answer: That comes later. not now
11. **Platform and Storage Confirmation**: The answers for Questions 2 and 3 seem misaligned. Can you confirm that the application is macOS-only and that SQLite will be used for data storage? Answer: OK I corrected it
12. **Idle Time Handling**: How should the app handle periods of user inactivity? Should tracking pause after a certain duration of no input? Answer: no it should always run until it is stopped. On the Mac OS top bar should be a small icon, where it can be started and stopped easily
13. **Menu Bar Icon Interaction**: What interactions should the macOS menu bar icon support (e.g., show summary, quick actions, context menu)? Answer: it allows to open the full application, it should have a quick action for starting and stopping the recording, it should have however a quick time check how productive the user was in a small window, but with big stylish numbers as counter
14. **Data Retention**: Should the application automatically delete or archive older activity data after some time? Answer: for no now, it should be possible to compare to previous weeks and later on it should be able to say how much productive the week was until that point compared to the previous weeks, it should have a list of best weeks and overall historic data
15. **Time Granularity**: What is the minimum time granularity for tracking (seconds, minutes, etc.)? Answer: it should round up to 10 seconds, but overall showing the hours and minutes and then seconds rounded as well
     

16. **Active Application Tracking**: Should tracking capture only the foreground active application, and should it pause when the system is locked or asleep?
Answer: Track only the foreground application. Pause tracking and mark time as idle when the system is locked or asleep.
17. **Chrome Tab Details**: Should tab tracking cover all Chrome windows including incognito, and is there any need to handle pinned tabs separately?
Answer: Track all Chrome windows, including incognito, with no special handling for pinned tabs.
18. **Initial CSV Format**: What columns and structure should the initial CSV file include, and where should it be stored within the application directory?
Answer: Columns should include type (app or website), identifier (bundle ID or domain pattern), category, and productivity flag. Store it at `data/categorization.csv`.
19. **Category Structure**: Should each app or website have both a specific category label (e.g., Social Media, Email) and a productivity flag, and can users define new categories beyond the defaults?
Answer: Yes, each entry has a category label and productivity flag, and users can add new categories.
20. **OpenAI Categorization**: Which OpenAI model should be used for categorization, and how will the API key be provided (e.g., environment variable)?
Answer: Use the `gpt-4o-mini` model, with the API key supplied via the `OPENAI_API_KEY` environment variable.
21. **Persisting User Categories**: When a user categorizes an unknown item, should that information be saved to SQLite for future sessions?
Answer: Yes, save user-provided categories to SQLite for reuse.
22. **Menu Bar Summary Metric**: What specific metric should the quick summary in the menu bar display (e.g., productive percentage for the current day or week)?
Answer: Show the current day's productive percentage versus total tracked time.
23. **Idle or Screen Lock Handling**: If the user locks the screen or the system sleeps, should tracking continue, pause, or record time under a special "idle" category?
Answer: Pause tracking and record the interval under an "idle" category.
