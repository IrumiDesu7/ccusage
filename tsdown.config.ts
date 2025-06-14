import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["./src/*.ts", "!./src/**/*.test.ts"],
	outDir: "dist",
	format: "esm",
	clean: true,
	sourcemap: false,
	dts: {
		resolve: ["valibot"],
	},
	publint: true,
	unused: true,
	exports: true,
});
