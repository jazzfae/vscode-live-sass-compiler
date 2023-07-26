import { RollupOptions } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import polyfills from "rollup-plugin-polyfill-node";
import terser from "@rollup/plugin-terser";

export default {
    input: "src/extension.ts",
    external: "vscode",
    output: [
        {
            file: "out/browser.js",
            format: "cjs",
            sourcemap: false,
            compact: true,
        },
    ],
    plugins: [
        typescript({ sourceMap: false }),
        json(),
        terser({ format: { comments: false } }),
        commonjs({
            ignoreDynamicRequires: true,
            sourceMap: false,
        }),
        polyfills(),
        nodeResolve(),
    ],
} as RollupOptions;
