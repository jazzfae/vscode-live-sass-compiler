import { sep, relative, join } from "path";
import { fileURLToPath } from "url";
import { Uri, workspace } from "vscode";

import { Helper } from "./helper";
import { OutputWindow } from "./VscodeExtensions";
import { FileHelper } from "./Class/FileHelper";
import { OutputLevel } from "./Enums/OutputLevel";
import { IFormat } from "./Interfaces/IFormat";

import * as sass from "../node_modules/sass/sass.node";

export class SassHelper {
    private static parsePath<T>(importUrl: string, cb: (newPath: string) => T): T | null {
        if (workspace.workspaceFolders) {
            const normalisedUrl = FileHelper.normalisePath(importUrl),
                urlParts = normalisedUrl
                    .substring(1)
                    .split("/")
                    .filter((x) => x.length > 0);

            if (normalisedUrl.startsWith("~") && normalisedUrl.indexOf("/") > -1) {
                for (let i = 0; i < workspace.workspaceFolders.length; i++) {
                    const workingPath = Uri.file(
                        [workspace.workspaceFolders[i].uri.fsPath, "node_modules"]
                            .concat(...urlParts.slice(0, -1))
                            .join("/")
                    );

                    try {
                        workspace.fs.stat(workingPath);

                        return cb(workingPath.fsPath + sep + urlParts.slice(-1).join(sep));
                    } catch {
                        /* empty */
                    }
                }
            } else if (normalisedUrl.startsWith("/")) {
                for (let i = 0; i < workspace.workspaceFolders.length; i++) {
                    const folder = workspace.workspaceFolders[i],
                        rootIsWorkspace = Helper.getConfigSettings<boolean>(
                            "rootIsWorkspace",
                            folder
                        );

                    if (rootIsWorkspace) {
                        const filePath = [folder.uri.fsPath, normalisedUrl.substring(1)].join("/");

                        try {
                            workspace.fs.stat(
                                Uri.file(filePath.substring(0, filePath.lastIndexOf("/")))
                            );

                            return cb(filePath);
                        } catch {
                            /* empty */
                        }
                    }
                }
            }
        }

        return null;
    }

    private static readonly loggerProperty: sass.Logger = {
        warn: (message, options) => {
            OutputWindow.Show(
                OutputLevel.Warning,
                "Warning:",
                [message].concat(this.format(options.span, options.stack, options.deprecation))
            );
        },
        debug: (message, options) => {
            OutputWindow.Show(
                OutputLevel.Debug,
                "Debug info:",
                [message].concat(this.format(options.span))
            );
        },
    };

    static toSassOptions<T extends boolean>(
        format: IFormat,
        useNew: T
    ): T extends true ? sass.LegacyStringOptions<"sync"> : sass.StringOptions<"sync">;
    static toSassOptions(
        format: IFormat,
        useNew: boolean
    ): sass.LegacyStringOptions<"sync"> | sass.StringOptions<"sync"> {
        if (useNew) {
            const options: sass.StringOptions<"sync"> = {
                style: format.format,
                importer: {
                    findFileUrl: (importUrl) =>
                        SassHelper.parsePath(importUrl, (newPath) => new URL(newPath)),
                },
                logger: SassHelper.loggerProperty,
                sourceMap: true,
                sourceMapIncludeSources: true,
            };

            return options;
        } else {
            const legacyOptions: sass.LegacyStringOptions<"sync"> = {
                data: "",
                outputStyle: format.format,
                omitSourceMapUrl: true,
                linefeed: format.linefeed,
                indentType: format.indentType,
                indentWidth: format.indentWidth,
                importer: (importUrl) =>
                    SassHelper.parsePath(importUrl, (newPath) => {
                        return { file: newPath };
                    }),
                logger: SassHelper.loggerProperty,
            };

            return legacyOptions;
        }
    }

    static async compileOne(
        SassPath: string,
        targetCssUri: string,
        mapFileUri: string,
        options: sass.LegacyStringOptions<"sync"> | sass.StringOptions<"sync">
    ): Promise<{
        result: { css: string; map?: string } | null;
        errorString: string | null;
    }> {
        try {
            //const fileContents = (await workspace.fs.readFile(Uri.file(SassPath))).toString();

            if ("data" in options) {
                const data: sass.LegacyFileOptions<"sync"> = { file: "" };

                Object.assign(data, options);

                // data.data = fileContents;
                data.file = SassPath;

                data.outFile = targetCssUri;
                data.sourceMap = mapFileUri;

                const renderResult = sass.renderSync(data);

                return {
                    result: {
                        css: renderResult.css.toString(),
                        map: renderResult.map?.toString(),
                    },
                    errorString: null,
                };
            }

            const data: sass.StringOptionsWithImporter<"sync"> = {
                url: new URL(SassPath),
                importer: { findFileUrl: () => null },
            };

            Object.assign(data, options);

            const compileResult = sass.compile(SassPath, data);

            if (compileResult.sourceMap) {
                compileResult.sourceMap.sources = compileResult.sourceMap.sources.map(
                    (sourcePath) => relative(join(targetCssUri, "../"), fileURLToPath(sourcePath))
                );
            }

            return {
                result: {
                    css: compileResult.css,
                    map: compileResult.sourceMap
                        ? JSON.stringify(compileResult.sourceMap)
                        : undefined,
                },
                errorString: null,
            };
        } catch (err) {
            if (this.instanceOfSassExcpetion(err)) {
                return { result: null, errorString: err.formatted };
            } else if (err instanceof Error) {
                return { result: null, errorString: err.message };
            }

            return { result: null, errorString: "Unexpected error" };
        }
    }

    private static instanceOfSassExcpetion(object: unknown): object is sass.LegacyException {
        return "formatted" in (object as sass.LegacyException);
    }

    private static format(
        span: sass.SourceSpan | undefined | null,
        stack?: string,
        deprecated?: boolean
    ): string[] {
        const stringArray: string[] = [];

        if (span === undefined || span === null) {
            if (stack !== undefined) {
                stringArray.push(stack);
            }
        } else {
            stringArray.push(this.charOfLength(span.start.line.toString().length, "╷"));

            let lineNumber = span.start.line;

            do {
                stringArray.push(
                    `${lineNumber} |${
                        span.context?.split("\n")[lineNumber - span.start.line] ??
                        span.text.split("\n")[lineNumber - span.start.line]
                    }`
                );

                lineNumber++;
            } while (lineNumber < span.end.line);

            stringArray.push(
                this.charOfLength(span.start.line.toString().length, this.addUnderLine(span))
            );

            stringArray.push(this.charOfLength(span.start.line.toString().length, "╵"));

            if (span.url) {
                // possibly include `,${span.end.line}:${span.end.column}`, if VS Code ever supports it
                stringArray.push(`${span.url.toString()}:${span.start.line}:${span.start.column}`);
            }
        }

        if (deprecated === true) {
            stringArray.push("THIS IS DEPRECATED AND WILL BE REMOVED IN SASS 2.0");
        }

        return stringArray;
    }

    private static charOfLength(charCount: number, suffix?: string, char = " "): string {
        if (charCount < 0) {
            return suffix ?? "";
        }

        let outString = "";

        for (let item = 0; item <= charCount; item++) {
            outString += char;
        }

        return outString + (suffix ?? "");
    }

    private static addUnderLine(span: sass.SourceSpan): string {
        let outString = "|";

        if (span.start.line !== span.end.line) {
            outString += this.charOfLength(span.end.column - 4, "...^");
        } else {
            outString +=
                this.charOfLength(span.start.column - 2, "^") +
                this.charOfLength(span.end.column - span.start.column - 1, "^", ".");
        }

        return outString;
    }
}
