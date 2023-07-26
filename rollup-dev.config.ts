import { RollupOptions } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
// import path from "path";

export default {
    input: "./src/extension.ts",
    treeshake: false,
    external: "vscode",
    output: [
        {
            file: "./out/extension.js",
            format: "cjs",
            sourcemap: true,
            sourcemapPathTransform: (r, s) => {
                if (!r.startsWith("..\\node_modules\\")) {
                    console.log(`Rel: ${r}`);
                    console.log(`Src: ${s}`);
                }

                return r.startsWith("..\\..\\") ? r.substring(3) : r;
            },
            compact: false,
        },
    ],
    plugins: [
        typescript({ sourceMap: true }),
        json(),
        commonjs({
            ignoreDynamicRequires: true,
            sourceMap: false,
        }),
        nodeResolve(),
    ],
} as RollupOptions;
