import {app, BrowserWindow, Menu} from 'electron';
import {join} from 'node:path';
import {registerReviewerIpc} from './ipc';

type AppPage = 'review' | 'terms' | 'rules';

function createWindow(): void {
  const window = new BrowserWindow({
    title: 'ДокРевью',
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const navigate = (page: AppPage) => window.webContents.send('reviewer:navigate', page);
  const menu = Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{role: 'appMenu' as const}] : []),
    {
      label: 'Разделы',
      submenu: [
        {label: 'Проверка', click: () => navigate('review')},
        {label: 'Словарь терминов', click: () => navigate('terms')},
        {label: 'Правила проверки', click: () => navigate('rules')},
      ],
    },
    {role: 'viewMenu'},
    {role: 'windowMenu'},
  ]);
  Menu.setApplicationMenu(menu);

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerReviewerIpc();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
