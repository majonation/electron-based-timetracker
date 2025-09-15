let refreshInterval;
let isAutoRefreshEnabled = true;
let lastActivityCount = 0;
let previousActivities = [];

async function loadTrackingLog(highlightNew = false) {
  const logEntriesDiv = document.getElementById('logEntries');
  const lastUpdatedSpan = document.getElementById('lastUpdated');
  
  try {
    const result = await window.electronAPI.getTrackingLog();
    
    if (!result.success) {
      logEntriesDiv.innerHTML = `<div class="loading">Error loading data: ${result.error}</div>`;
      return;
    }
    
    const activities = result.data;
    
    if (activities.length === 0) {
      logEntriesDiv.innerHTML = '<div class="loading">No tracking data available yet. Start using your computer to see activity logs here.</div>';
      lastUpdatedSpan.textContent = 'No data';
      return;
    }
    
    // Check for new activities
    const newActivities = [];
    if (highlightNew && previousActivities.length > 0) {
      activities.forEach(activity => {
        const isNew = !previousActivities.some(prev => 
          prev.start_time === activity.start_time && 
          prev.identifier === activity.identifier
        );
        if (isNew) {
          newActivities.push(activity.start_time);
        }
      });
    }
    
    // Generate HTML for each activity
    const logHTML = activities.map(activity => {
      const typeClass = activity.type === 'app' ? 'app' : 'website';
      const identifier = activity.identifier.length > 80 
        ? activity.identifier.substring(0, 80) + '...' 
        : activity.identifier;
      
      const isNewEntry = newActivities.includes(activity.start_time);
      const newClass = isNewEntry ? ' new' : '';
      
      return `
        <div class="log-entry${newClass}">
          <span class="log-type ${typeClass}">${activity.type.toUpperCase()}</span>
          <strong>${identifier}</strong>
          <br>
          <span class="log-time">
            ${activity.start_time_formatted} → ${activity.end_time_formatted}
          </span>
          <span class="log-duration" style="float: right;">
            ${activity.duration_formatted}
          </span>
          ${activity.category ? `<br><small>Category: ${activity.category}</small>` : ''}
        </div>
      `;
    }).join('');
    
    logEntriesDiv.innerHTML = logHTML;
    
    // Update last updated time
    const now = new Date();
    lastUpdatedSpan.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    
    // Store current activities for next comparison
    previousActivities = [...activities];
    lastActivityCount = activities.length;
    
    // Remove highlight animation after 2 seconds
    if (highlightNew && newActivities.length > 0) {
      setTimeout(() => {
        document.querySelectorAll('.log-entry.new').forEach(entry => {
          entry.classList.remove('new');
        });
      }, 2000);
    }
    
  } catch (error) {
    console.error('Error loading tracking log:', error);
    logEntriesDiv.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
    lastUpdatedSpan.textContent = 'Error';
  }
}

function startAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  // Refresh every 5 seconds for live updates
  refreshInterval = setInterval(() => {
    if (isAutoRefreshEnabled) {
      loadTrackingLog(true); // Enable highlighting for auto-refresh
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
document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refreshBtn');
  const toggleAutoRefreshBtn = document.getElementById('toggleAutoRefresh');
  
  // Load initial data
  loadTrackingLog();
  
  // Start auto-refresh with faster interval for live updates
  startAutoRefresh();
  
  // Update status indicator
  updateStatusIndicator();
  
  // Manual refresh button
  refreshBtn.addEventListener('click', () => {
    loadTrackingLog(true); // Enable highlighting for manual refresh
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
  
  // Pause auto-refresh when window is hidden/minimized, resume when visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoRefresh();
    } else if (isAutoRefreshEnabled) {
      startAutoRefresh();
      // Immediately refresh when coming back to focus
      loadTrackingLog(true);
    }
  });
  
  // Handle window focus/blur for better performance
  window.addEventListener('focus', () => {
    if (isAutoRefreshEnabled) {
      loadTrackingLog(true);
      startAutoRefresh();
    }
  });
  
  window.addEventListener('blur', () => {
    // Keep running but don't highlight when not focused
  });
});
