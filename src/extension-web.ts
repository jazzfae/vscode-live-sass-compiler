"use strict";

import * as vscode from "vscode";

import { AppModel } from "./appModel";
import { checkNewAnnouncement } from "./announcement/index";
import { ErrorLogger, OutputLevel, OutputWindow } from "./VscodeExtensions";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    try {
        OutputWindow.Show(OutputLevel.Trace, '"live-sass-compiler" is now activate');

        const appModel = new AppModel(true, context.workspaceState);

        checkNewAnnouncement(context.globalState);

        context.subscriptions.push(...appModel.getDisposables());

        OutputWindow.Show(OutputLevel.Trace, "Live SASS commands ready", [
            "Commands have been saved and are ready to be used",
        ]);
    } catch (err) {
        if (err instanceof Error) {
            await new ErrorLogger(context.workspaceState).LogIssueWithAlert(
                `Unhandled error with Live Sass Compiler. Error message: ${err.message}`,
                {
                    error: ErrorLogger.PrepErrorForLogging(err),
                }
            );
        } else {
            await new ErrorLogger(context.workspaceState).LogIssueWithAlert(
                "Unhandled error with Live Sass Compiler. Error message: UNKNOWN (not Error type)",
                {
                    error: JSON.stringify(err),
                }
            );
        }
    }
}

export function deactivate(): void {
    // No actual actions are required

    OutputWindow.Show(OutputLevel.Trace, '"live-sass-compiler" deactivated');
}
