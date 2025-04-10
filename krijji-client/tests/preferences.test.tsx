import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import ThemeSwitcher from "@/app/(currency-converter)/[lang]/components/switchers/ThemeSwitcher";

afterEach(() => {
    document.body.className = "";
    document.cookie = "theme=; Max-Age=0; path=/";
});
it("toggles the persisted theme and the applied body class in both directions", async () => {
    const user = userEvent.setup();
    document.body.className = "dark";
    render(<ThemeSwitcher selectedTheme="dark" themeNames={{ dark: "Dark", light: "Light" }} />);
    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(document.body).toHaveClass("light");
    expect(document.body).not.toHaveClass("dark");
    expect(document.cookie).toContain("theme=light");
    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(document.body).toHaveClass("dark");
    expect(document.cookie).toContain("theme=dark");
});
it.each([
    ["preferredLanguage=fr", "de-DE,en;q=0.9", "/fr"],
    ["preferredLanguage=en", "fr-FR", null],
    ["preferredLanguage=unsupported", "de-DE,en;q=0.9", "/de"],
    ["", "ja-JP,es-ES;q=0.9,en;q=0.8", "/es"],
    ["", "ja-JP", null],
    ["", "", null],
])("resolves root locale for cookie %s and header %s", (cookie, acceptLanguage, destination) => {
    const request = new NextRequest("https://rateoro.test/", {
        headers: { cookie, "accept-language": acceptLanguage },
    });
    const response = middleware(request)!;
    if (destination) {
        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe(`https://rateoro.test${destination}`);
    } else {
        expect(response.headers.get("location")).toBeNull();
        expect(response.headers.get("x-middleware-next")).toBe("1");
    }
});
it("does not redirect a directly requested language page", () => {
    const request = new NextRequest("https://rateoro.test/es", {
        headers: { cookie: "preferredLanguage=fr" },
    });
    expect(middleware(request)).toBeUndefined();
});
