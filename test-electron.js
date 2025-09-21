// Test file to check Electron import
try {
  console.log('Testing Electron import...');
  const electron = require('electron');
  console.log('Electron type:', typeof electron);
  console.log('Electron keys:', Object.keys(electron));
  
  const { app } = electron;
  console.log('App object:', app);
  console.log('App type:', typeof app);
  
  if (app && app.whenReady) {
    console.log('App.whenReady exists');
  } else {
    console.log('App.whenReady does NOT exist');
  }
} catch (error) {
  console.error('Error importing electron:', error);
}
