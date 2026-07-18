const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// بدء السيرفر
function startServer() {
  serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });
}

// إنشاء نافذة التطبيق
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // انتظر قليلاً للتأكد من بدء السيرفر
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000');
  }, 2000);

  // قائمة التطبيق
  const menu = Menu.buildFromTemplate([
    {
      label: 'ملف',
      submenu: [
        { label: 'خروج', role: 'quit' }
      ]
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'تصغير', role: 'minimize' },
        { label: 'تكبير', role: 'maximize' },
        { type: 'separator' },
        { label: 'إعادة تحديث', role: 'reload' },
        { label: 'أدوات المطورين', role: 'toggleDevTools' }
      ]
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'حول',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'حول Barq Cashier',
              message: 'Barq Cashier System v1.0',
              detail: 'نظام كاشير متكامل للمطاعم والمقاهي'
            });
          }
        }
      ]
    }
  ]);

  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// بدء التطبيق
app.on('ready', () => {
  startServer();
  createWindow();
});

// إغلاق التطبيق
app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// معالجة الأخطاء
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
