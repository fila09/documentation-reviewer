import {dialog, ipcMain} from 'electron';
import {resolveProjectPaths, suggestDefaultDocsRoot} from '../engine/projectPaths';
import {reviewProject} from '../engine/reviewProject';
import type {ProjectSelection} from '../shared/reviewer-api';

export function registerReviewerIpc(): void {
  ipcMain.handle('reviewer:select-project', async (): Promise<ProjectSelection | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Выберите папку проекта',
    });

    if (result.canceled) return null;

    const projectRoot = result.filePaths[0];
    return {
      projectRoot,
      suggestedDocsRoot: await suggestDefaultDocsRoot(projectRoot),
    };
  });

  ipcMain.handle('reviewer:select-docs-root', async (_event, projectRoot: string) => {
    if (typeof projectRoot !== 'string' || projectRoot.trim() === '') {
      throw new Error('Сначала выберите проект.');
    }

    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Выберите папку документации',
      defaultPath: projectRoot,
    });

    if (result.canceled) return null;

    const docsRoot = result.filePaths[0];
    const resolved = await resolveProjectPaths(projectRoot, docsRoot);
    return resolved.docsRoot;
  });

  ipcMain.handle('reviewer:run', async (_event, projectRoot: string, docsRoot: string) => {
    if (typeof projectRoot !== 'string' || projectRoot.trim() === '') {
      throw new Error('Не выбрана папка проекта.');
    }
    if (typeof docsRoot !== 'string' || docsRoot.trim() === '') {
      throw new Error('Не выбрана папка документации.');
    }

    return reviewProject(projectRoot, docsRoot);
  });
}
