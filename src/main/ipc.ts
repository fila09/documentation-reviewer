import {dialog, ipcMain} from 'electron';
import {reviewProject} from '../engine/reviewProject';

export function registerReviewerIpc(): void {
  ipcMain.handle('reviewer:select-project', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Выберите папку проекта',
    });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('reviewer:run', async (_event, projectRoot: string) => {
    if (typeof projectRoot !== 'string' || projectRoot.trim() === '') {
      throw new Error('Не выбрана папка проекта.');
    }

    return reviewProject(projectRoot);
  });
}
