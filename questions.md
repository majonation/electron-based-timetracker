# Clarification Questions

1. **Supported Browsers**: Which browsers should the app support for tab and URL tracking? (e.g., Chrome, Firefox, Safari, etc.)
Answer: Chrome Browser
2. **Platform Scope**: Should the application be macOS-only, or should it support Windows and Linux as well? Answer: 
3. **Data Storage**: Where should tracked data be stored (local file, SQLite, cloud service)? Answer: macOS-only
4. **Application List Source**: Do you have a preferred source or format for the extensive list of known applications and websites to categorize as productive/unproductive? Answer: SQLite
5. **User Categorization**: How should users categorize unknown applications or websites? Should there be a UI for manual categorization, or is a configuration file sufficient? Answer: create an initial file in csv format listing websites, applications and if they are considered to support work or are for eduction, entertainment or news. make sure that for website it is able to use main domains and does not just look for the full url path - make it flexible with *
Ask OpenAI with an API call in case the category is not clear.
6. **Weekly View Design**: Are there specific requirements for the appearance of the weekly bar chart (e.g., color scheme, interactivity, libraries to use)? Answer: The weekly calendar view, which is scrollable to previous weeks and it has white background like in Google Calendar and the bar chart is very appealing with vibrant, warm, and friendly colors. Ideally, with a slight gradient in each of the bars. Choose the right library for this task. Do the proper research. It must be appealing and performant. 
7. **Work vs. Distraction Definition**: Are there specific rules or thresholds for determining whether an application is work-related or distracting, or should this be entirely user-configurable? Answer: The rules if something is distracting is when it shows funny videos (e.g. YouTube tutorials are productive, but funny videos are not). In order to categorize the application, it can ask OpenAI and figure out if it's productive or not using an API call. An API key will be provided. 
8. **Background Operation**: Should the app automatically start on system startup and run silently in the background, or is manual launch acceptable? Answer: No, the application needs to be started manually for now, but later on it might be the case. 
9. **Privacy Considerations**: Are there any privacy or data retention requirements the app must adhere to? Answer: It runs locally, so at the moment, there are no requirements for privacy. 
10. **Exporting Reports**: Should the app provide options to export tracked data or weekly reports (e.g., PDF, CSV)? Answer: That comes later. 

