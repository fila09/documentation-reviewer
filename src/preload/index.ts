import {contextBridge, ipcRenderer} from 'electron';

contextBridge.exposeInMainWorld('reviewer', {
  selectProject: () => ipcRenderer.invoke('reviewer:select-project'),
  selectDocsRoot: (projectRoot: string): Promise<string | null> =>
    ipcRenderer.invoke('reviewer:select-docs-root', projectRoot),
  reviewProject: (projectRoot: string, docsRoot: string) =>
    ipcRenderer.invoke('reviewer:run', projectRoot, docsRoot),
  reviewFile: (projectRoot: string, docsRoot: string, relativePath: string) =>
    ipcRenderer.invoke('reviewer:run-file', projectRoot, docsRoot, relativePath),
});
