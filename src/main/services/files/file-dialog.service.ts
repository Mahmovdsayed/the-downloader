import { dialog, BrowserWindow } from "electron";
import os from "node:os";

export class FileDialogService {
  public static async chooseSaveLocation(
    browserWindow: BrowserWindow | null,
    defaultPath?: string,
  ): Promise<string | null> {
    const fallbackPath = defaultPath || os.homedir();

    const result = await dialog.showOpenDialog(
      browserWindow || (undefined as unknown as BrowserWindow),
      {
        title: "Select Destination Folder",
        defaultPath: fallbackPath,
        properties: ["openDirectory", "createDirectory"],
        buttonLabel: "Select Folder",
      },
    );

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  }
}
