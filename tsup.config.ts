import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	clean: true,
	dts: true,
	format: ["cjs", "esm"],
	shims: false,
	splitting: false,
	sourcemap: true,
	minify: false,
	target: "node16",
	outDir: "dist",
});
