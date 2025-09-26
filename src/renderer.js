let refreshInterval;
let isAutoRefreshEnabled = true;
let previousApps = [];
let currentDate = null;
let todayString = null;

// Date utility functions
function formatDateDisplay(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (dateString === todayStr) {
    return `Today (${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`;
  } else if (dateString === yesterdayStr) {
    return `Yesterday (${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`;
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}

function addDays(dateString, days) {
  const date = new Date(dateString + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

async function loadDailyStats(dateString) {
  try {
    const result = await window.electronAPI.getDailyStats(dateString);
    
    if (result.success) {
      const stats = result.data;
      document.getElementById('totalSessions').textContent = stats.total_sessions;
      document.getElementById('uniqueApps').textContent = stats.unique_apps;
      document.getElementById('firstActivity').textContent = stats.first_activity || '-';
    } else {
      // Clear stats on error
      document.getElementById('totalSessions').textContent = '-';
      document.getElementById('uniqueApps').textContent = '-';
      document.getElementById('firstActivity').textContent = '-';
    }
  } catch (error) {
    console.error('Error loading daily stats:', error);
    // Clear stats on error
    document.getElementById('totalSessions').textContent = '-';
    document.getElementById('uniqueApps').textContent = '-';
    document.getElementById('firstActivity').textContent = '-';
  }
}

async function loadDailyApps(dateString, highlightNew = false) {
  const appListDiv = document.getElementById('appList');
  const lastUpdatedSpan = document.getElementById('lastUpdated');
  const totalTimeSpan = document.getElementById('totalTime');
  
  try {
    const result = await window.electronAPI.getDailyApps(dateString);
    
    if (!result.success) {
      appListDiv.innerHTML = `<div class="loading">Error loading data: ${result.error}</div>`;
      return;
    }
    
    const apps = result.data;
    
    if (apps.length === 0) {
      appListDiv.innerHTML = `<div class="loading">No tracking data available for ${formatDateDisplay(dateString)}.</div>`;
      lastUpdatedSpan.textContent = 'No data';
      totalTimeSpan.textContent = '0s';
      // Clear other stats
      document.getElementById('totalSessions').textContent = '0';
      document.getElementById('uniqueApps').textContent = '0';
      document.getElementById('firstActivity').textContent = '-';
      return;
    }
    
    // Calculate total time
    const totalSeconds = apps.reduce((sum, app) => sum + app.total_duration_seconds, 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    let totalTimeFormatted;
    if (totalHours > 0) {
      totalTimeFormatted = `${totalHours}h ${totalMinutes}m`;
    } else if (totalMinutes > 0) {
      totalTimeFormatted = `${totalMinutes}m ${totalSeconds % 60}s`;
    } else {
      totalTimeFormatted = `${totalSeconds}s`;
    }
    totalTimeSpan.textContent = totalTimeFormatted;
    
    // Load daily statistics
    await loadDailyStats(dateString);
    
    // Check for updated apps
    const updatedApps = [];
    if (highlightNew && previousApps.length > 0) {
      apps.forEach(app => {
        const prevApp = previousApps.find(prev => 
          prev.identifier === app.identifier && prev.type === app.type
        );
        if (!prevApp || prevApp.total_duration_seconds !== app.total_duration_seconds) {
          updatedApps.push(`${app.type}-${app.identifier}`);
        }
      });
    }
    
    // Generate HTML for each app
    const appHTML = apps.map(app => {
      const typeClass = app.type === 'app' ? 'app' : 'website';
      const isUpdated = updatedApps.includes(`${app.type}-${app.identifier}`);
      const updatedClass = isUpdated ? ' updated' : '';
      
      // Format website display
      let nameDisplay = app.display_name;
      let domainDisplay = '';
      let fullUrlDisplay = '';
      let descriptionDisplay = '';
      
      if (app.type === 'website') {
        if (app.domain) {
          domainDisplay = ` - ${app.domain}`;
        }
        if (app.full_url) {
          fullUrlDisplay = `<div class="website-url">${app.full_url}</div>`;
        }
        if (app.site_description) {
          descriptionDisplay = `<div class="website-description">${app.site_description}</div>`;
        }
      }
      
      return `
        <div class="app-entry${updatedClass}">
          <div class="app-header-content">
            <span class="app-type ${typeClass}">${app.type.toUpperCase()}</span>
            <span class="app-name">${nameDisplay}${domainDisplay}</span>
            <span class="app-duration">${app.duration_formatted}</span>
          </div>
          ${descriptionDisplay}
          ${fullUrlDisplay}
          <div class="app-details">
            <span class="app-sessions">${app.session_count} sessions</span>
            <span class="app-last-used">Last used: ${app.last_used_formatted}</span>
          </div>
          ${app.category ? `<div class="app-category">Category: ${app.category}</div>` : ''}
        </div>
      `;
    }).join('');
    
    appListDiv.innerHTML = appHTML;
    
    // Update last updated time
    const now = new Date();
    lastUpdatedSpan.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    
    // Store current apps for next comparison
    previousApps = [...apps];
    
    // Remove highlight animation after 2 seconds
    if (highlightNew && updatedApps.length > 0) {
      setTimeout(() => {
        document.querySelectorAll('.app-entry.updated').forEach(entry => {
          entry.classList.remove('updated');
        });
      }, 2000);
    }
    
  } catch (error) {
    console.error('Error loading aggregated apps:', error);
    appListDiv.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
    lastUpdatedSpan.textContent = 'Error';
    totalTimeSpan.textContent = 'Error';
  }
}

// Date navigation functions
async function navigateToDate(dateString) {
  currentDate = dateString;
  
  // Update date display
  document.getElementById('currentDateDisplay').textContent = formatDateDisplay(dateString);
  document.getElementById('datePicker').value = dateString;
  
  // Update navigation button states
  updateNavigationButtons();
  
  // Load data for the selected date
  await loadDailyApps(dateString, true);
}

function updateNavigationButtons() {
  const nextBtn = document.getElementById('nextDayBtn');
  const todayBtn = document.getElementById('todayBtn');
  
  // Disable next button if current date is today or in the future
  const today = new Date().toISOString().split('T')[0];
  nextBtn.disabled = currentDate >= today;
  
  // Update today button state
  todayBtn.disabled = currentDate === today;
}

async function goToPreviousDay() {
  const prevDate = addDays(currentDate, -1);
  await navigateToDate(prevDate);
}

async function goToNextDay() {
  const nextDate = addDays(currentDate, 1);
  const today = new Date().toISOString().split('T')[0];
  
  // Don't go beyond today
  if (nextDate <= today) {
    await navigateToDate(nextDate);
  }
}

async function goToToday() {
  const today = new Date().toISOString().split('T')[0];
  await navigateToDate(today);
}

function startAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  // Refresh every 5 seconds for live updates, but only for today
  refreshInterval = setInterval(() => {
    if (isAutoRefreshEnabled && currentDate === todayString) {
      loadDailyApps(currentDate, true); // Enable highlighting for auto-refresh
    }
  }, 5000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

function updateStatusIndicator() {
  const statusIndicator = document.getElementById('statusIndicator');
  const toggleBtn = document.getElementById('toggleAutoRefresh');
  
  if (isAutoRefreshEnabled) {
    statusIndicator.textContent = '● LIVE';
    statusIndicator.className = 'status live';
    toggleBtn.textContent = 'Pause Live Updates';
  } else {
    statusIndicator.textContent = '⏸ PAUSED';
    statusIndicator.className = 'status paused';
    toggleBtn.textContent = 'Resume Live Updates';
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const refreshBtn = document.getElementById('refreshBtn');
  const toggleAutoRefreshBtn = document.getElementById('toggleAutoRefresh');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsDropdown = document.getElementById('settingsDropdown');
  const resetDataBtn = document.getElementById('resetDataBtn');
  const resetModal = document.getElementById('resetModal');
  const confirmResetBtn = document.getElementById('confirmResetBtn');
  const cancelResetBtn = document.getElementById('cancelResetBtn');
  
  // Date navigation elements
  const prevDayBtn = document.getElementById('prevDayBtn');
  const nextDayBtn = document.getElementById('nextDayBtn');
  const todayBtn = document.getElementById('todayBtn');
  const datePicker = document.getElementById('datePicker');
  const currentDateDisplay = document.getElementById('currentDateDisplay');
  
  // Initialize with today's date
  try {
    const todayResult = await window.electronAPI.getTodayString();
    if (todayResult.success) {
      todayString = todayResult.data;
      currentDate = todayString;
      await navigateToDate(currentDate);
    } else {
      console.error('Error getting today string:', todayResult.error);
      // Fallback to client-side date
      todayString = new Date().toISOString().split('T')[0];
      currentDate = todayString;
      await navigateToDate(currentDate);
    }
  } catch (error) {
    console.error('Error initializing date:', error);
    // Fallback to client-side date
    todayString = new Date().toISOString().split('T')[0];
    currentDate = todayString;
    await navigateToDate(currentDate);
  }
  
  // Start auto-refresh with faster interval for live updates
  startAutoRefresh();
  
  // Update status indicator
  updateStatusIndicator();
  
  // Manual refresh button
  refreshBtn.addEventListener('click', () => {
    loadDailyApps(currentDate, true); // Enable highlighting for manual refresh
  });
  
  // Date navigation event listeners
  prevDayBtn.addEventListener('click', goToPreviousDay);
  nextDayBtn.addEventListener('click', goToNextDay);
  todayBtn.addEventListener('click', goToToday);
  
  // Date picker event listener
  datePicker.addEventListener('change', async (e) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
      await navigateToDate(selectedDate);
    }
  });
  
  // Click on date display to show date picker
  currentDateDisplay.addEventListener('click', () => {
    datePicker.classList.toggle('show');
    if (datePicker.classList.contains('show')) {
      datePicker.focus();
    }
  });
  
  // Hide date picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.current-date')) {
      datePicker.classList.remove('show');
    }
  });
  
  // Toggle auto-refresh button
  toggleAutoRefreshBtn.addEventListener('click', () => {
    isAutoRefreshEnabled = !isAutoRefreshEnabled;
    updateStatusIndicator();
    
    if (isAutoRefreshEnabled) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });
  
  // Settings dropdown toggle
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsDropdown.classList.toggle('show');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    settingsDropdown.classList.remove('show');
  });
  
  // Reset data button
  resetDataBtn.addEventListener('click', () => {
    settingsDropdown.classList.remove('show');
    resetModal.style.display = 'block';
  });
  
  // Confirm reset
  confirmResetBtn.addEventListener('click', async () => {
    try {
      const result = await window.electronAPI.resetAllData();
      if (result.success) {
        resetModal.style.display = 'none';
        // Refresh the display to show empty state
        await loadDailyApps(currentDate);
        alert('All data has been reset successfully!');
      } else {
        alert('Error resetting data: ' + result.error);
      }
    } catch (error) {
      alert('Error resetting data: ' + error.message);
    }
  });
  
  // Cancel reset
  cancelResetBtn.addEventListener('click', () => {
    resetModal.style.display = 'none';
  });
  
  // Close modal when clicking outside
  resetModal.addEventListener('click', (e) => {
    if (e.target === resetModal) {
      resetModal.style.display = 'none';
    }
  });
  
  // Pause auto-refresh when window is hidden/minimized, resume when visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoRefresh();
    } else if (isAutoRefreshEnabled) {
      startAutoRefresh();
    }
  });
  
  // Handle window focus/blur for better performance
  window.addEventListener('focus', () => {
    if (isAutoRefreshEnabled) {
      loadDailyApps(currentDate, true);
      startAutoRefresh();
    }
  });
  
  window.addEventListener('blur', () => {
    // Keep running but don't highlight when not focused
  });
});
