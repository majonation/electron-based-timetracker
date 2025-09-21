console.log('Testing simple Electron app...');

try {
  const { app, BrowserWindow } = require('electron');
  
  console.log('Electron imported successfully');
  console.log('App:', typeof app);
  
  if (app && app.whenReady) {
    app.whenReady().then(() => {
      console.log('App is ready!');
      
      const win = new BrowserWindow({
        width: 400,
        height: 300
      });
      
      win.loadURL('data:text/html,<h1>Hello World!</h1>');
    });
    
    app.on('window-all-closed', () => {
      app.quit();
    });
  } else {
    console.error('App object is invalid:', app);
  }
} catch (error) {
  console.error('Error importing electron:', error);
}
