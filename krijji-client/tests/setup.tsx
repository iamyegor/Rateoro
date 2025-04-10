import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import type { ImgHTMLAttributes, ReactNode } from "react";
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    document.body.innerHTML = "";
});
// Next's navigation and image loader require a running Next server.
vi.mock("next/navigation", () => ({ useParams: () => ({ lang: "en" }) }));
vi.mock("next/image", () => ({
    default: ({
        src,
        unoptimized: _unoptimized,
        ...props
    }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
        <img {...props} src={typeof src === "string" ? src : undefined} />
    ),
}));
// jsdom has no layout: supply dimensions but keep the actual virtualized list.
vi.mock("react-virtualized", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react-virtualized")>();
    return {
        ...actual,
        AutoSizer: ({
            children,
        }: {
            children: (size: { width: number; height: number }) => ReactNode;
        }) => children({ width: 200, height: 300 }),
    };
});

// jsdom lacks geometry observers and scrolling; cmdk uses these for layout only.
beforeEach(() => {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        },
    );
    Element.prototype.scrollIntoView = vi.fn();
});
