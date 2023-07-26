import vscode from "vscode";

import { OutputWindow } from "../VscodeExtensions";
import { OutputLevel } from "../Enums/OutputLevel";
import { IFileResolver } from "../Interfaces/IFileResolver";

export class FileHelper {
    static async writeToOneFile(targetFileUri: string, data: string): Promise<IFileResolver> {
        OutputWindow.Show(OutputLevel.Trace, `Saving file`, [
            "Saving a file to the system",
            `Target: ${targetFileUri}`,
        ]);

        try {
            await vscode.workspace.fs.writeFile(vscode.Uri.file(targetFileUri), Buffer.from(data));

            return { FileUri: targetFileUri };
        } catch (error) {
            return { FileUri: targetFileUri, Exception: error };
        }
    }

    static async MakeDirIfNotAvailable(dir: string): Promise<void> {
        OutputWindow.Show(
            OutputLevel.Trace,
            "Create directory is unexistent",
            [`Directory: ${dir}`],
            false
        );

        return vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));

        // if (!fs.existsSync(path.dirname(dir))) {
        //     OutputWindow.Show(OutputLevel.Trace, "NO PARENT DIRECTORY", [
        //         "Parent directory doesn't exist, we must create it",
        //     ]);

        //     this.MakeDirIfNotAvailable(path.dirname(dir));
        // }

        // OutputWindow.Show(OutputLevel.Trace, "Directory doesn't exist, creating it");

        // fs.mkdirSync(dir);
    }

    static normalisePath = (path: string) => path.replace(/\\/g, "/");
}
