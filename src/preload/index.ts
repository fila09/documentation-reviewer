import {contextBridge, ipcRenderer} from 'electron';

contextBridge.exposeInMainWorld('reviewer', {
  selectProject: (): Promise<string | null> =>
    ipcRenderer.invoke('reviewer:select-project'),
  reviewProject: (projectRoot: string) =>
    ipcRenderer.invoke('reviewer:run', projectRoot),
});
