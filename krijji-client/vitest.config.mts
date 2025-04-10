import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    esbuild: { jsx: "automatic" },
    plugins: [
        {
            name: "test-svg-components",
            transform(_source, id) {
                if (id.endsWith(".svg"))
                    return { code: "export default function Svg() { return null; }", map: null };
            },
        },
    ],
    test: {
        environment: "jsdom",
        setupFiles: ["./tests/setup.tsx"],
        include: ["tests/**/*.test.{ts,tsx}"],
        restoreMocks: true,
        clearMocks: true,
    },
});
