import fg from "fast-glob";
import { defineConfig } from "vite";
import { babel } from "@rollup/plugin-babel";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import copy from "rollup-plugin-copy";

const getEntryPoints = (entryPoints: string[]) => {
  const files = fg.sync(entryPoints, { absolute: true });
  const entities = files.map((file) => {
    const [key] = file.match(/(?<=src\/).*$/) || [];
    const keyWithoutExt = key?.replace(/\.[^/.]+$/, "") || "";
    return [keyWithoutExt, file];
  });
  return Object.fromEntries(entities);
};

export default defineConfig({
  mode: "production",
  build: {
    lib: {
      entry: getEntryPoints(["src/tests**/*.ts", "!src/**/*.spec.ts"]),
      formats: ["cjs"],
      fileName: "[name]",
    },
    rollupOptions: {
      external: [new RegExp(/^(k6|https?\:\/\/)(\/.*)?/)],
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [
    copy({
      targets: [
        {
          src: "assets/**/*",
          dest: "dist",
        },
      ],
    }),
    babel({
      babelHelpers: "bundled",
      exclude: /node_modules/,
    }),
    nodeResolve(),
  ],
});
