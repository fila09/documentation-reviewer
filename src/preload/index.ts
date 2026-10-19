import {contextBridge, ipcRenderer} from 'electron';

ipcRenderer.on('reviewer:navigate', (_event, page: unknown) => {
  if (page === 'review' || page === 'terms' || page === 'rules') {
    window.dispatchEvent(new CustomEvent('docreview:navigate', {detail: page}));
  }
});

contextBridge.exposeInMainWorld('reviewer', {
  getUserWords: (): Promise<string[]> => ipcRenderer.invoke('reviewer:user-words:get'),
  setUserWords: (words: string[]): Promise<string[]> => ipcRenderer.invoke('reviewer:user-words:set', words),
  selectProject: () => ipcRenderer.invoke('reviewer:select-project'),
  selectDocsRoot: (projectRoot: string): Promise<string | null> =>
    ipcRenderer.invoke('reviewer:select-docs-root', projectRoot),
  reviewProject: (projectRoot: string, docsRoot: string) =>
    ipcRenderer.invoke('reviewer:run', projectRoot, docsRoot),
  reviewFile: (projectRoot: string, docsRoot: string, relativePath: string) =>
    ipcRenderer.invoke('reviewer:run-file', projectRoot, docsRoot, relativePath),
  reviewTextProject: (projectRoot: string, docsRoot: string) =>
    ipcRenderer.invoke('reviewer:run-text', projectRoot, docsRoot),
  reviewTextFile: (projectRoot: string, docsRoot: string, relativePath: string) =>
    ipcRenderer.invoke('reviewer:run-text-file', projectRoot, docsRoot, relativePath),
});
