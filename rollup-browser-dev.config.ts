import { RollupOptions } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import polyfills from "rollup-plugin-polyfill-node";

export default {
    input: "src/extension.ts",
    treeshake: false,
    external: "vscode",
    output: [
        {
            file: "out/browser.js",
            format: "cjs",
            sourcemap: true,
            compact: false,
        },
    ],
    plugins: [
        typescript({ sourceMap: true }),
        json(),
        // terser({ format: { comments: false } }),
        commonjs({
            ignoreDynamicRequires: true,
            sourceMap: false,
        }),
        polyfills(),
        nodeResolve(),
    ],
} as RollupOptions;
