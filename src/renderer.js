let refreshInterval;
let isAutoRefreshEnabled = true;
let previousApps = [];

async function loadAggregatedApps(highlightNew = false) {
  const appListDiv = document.getElementById('appList');
  const lastUpdatedSpan = document.getElementById('lastUpdated');
  const totalTimeSpan = document.getElementById('totalTime');
  
  try {
    const result = await window.electronAPI.getAggregatedApps();
    
    if (!result.success) {
      appListDiv.innerHTML = `<div class="loading">Error loading data: ${result.error}</div>`;
      return;
    }
    
    const apps = result.data;
    
    if (apps.length === 0) {
      appListDiv.innerHTML = '<div class="loading">No tracking data available yet. Start using your computer to see apps here.</div>';
      lastUpdatedSpan.textContent = 'No data';
      totalTimeSpan.textContent = '0s';
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
      
      return `
        <div class="app-entry${updatedClass}">
          <div class="app-header-content">
            <span class="app-type ${typeClass}">${app.type.toUpperCase()}</span>
            <span class="app-name">${app.display_name}</span>
            <span class="app-duration">${app.duration_formatted}</span>
          </div>
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

function startAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  // Refresh every 5 seconds for live updates
  refreshInterval = setInterval(() => {
    if (isAutoRefreshEnabled) {
      loadAggregatedApps(true); // Enable highlighting for auto-refresh
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
  loadAggregatedApps();
  
  // Start auto-refresh with faster interval for live updates
  startAutoRefresh();
  
  // Update status indicator
  updateStatusIndicator();
  
  // Manual refresh button
  refreshBtn.addEventListener('click', () => {
    loadAggregatedApps(true); // Enable highlighting for manual refresh
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
      loadAggregatedApps(true);
    }
  });
  
  // Handle window focus/blur for better performance
  window.addEventListener('focus', () => {
    if (isAutoRefreshEnabled) {
      loadAggregatedApps(true);
      startAutoRefresh();
    }
  });
  
  window.addEventListener('blur', () => {
    // Keep running but don't highlight when not focused
  });
});
