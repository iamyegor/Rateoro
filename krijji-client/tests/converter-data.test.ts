import { expect, it, vi } from "vitest";
import { fetchConverterData } from "@/app/(currency-converter)/[lang]/utils/fetchConverterData";
const payload = () => ({
    fiat: [
        { code: "JPY", name: "Yen", rateToUsd: 0.01 },
        { code: "USD", name: "Dollar", rateToUsd: 1 },
        { code: "ZZZ", name: null, rateToUsd: 2 },
    ],
    crypto: [
        { code: "ETH", name: "Ethereum", rateToUsd: 2500 },
        { code: "BTC", name: "Bitcoin", rateToUsd: 50000 },
    ],
    fiatLastUpdateDate: "2024-10-02T03:04:05Z",
    cryptoLastUpdateDate: "2024-10-02T03:05:00Z",
});
it("requests localized data from the configured server and prioritizes currencies without losing rates", async () => {
    vi.stubEnv("server", "http://converter.test/api");
    const fetchStub = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload())));
    vi.stubGlobal("fetch", fetchStub);
    const data = await fetchConverterData("fr");
    expect(fetchStub).toHaveBeenCalledWith("http://converter.test/api/converter?language=fr", {
        next: { revalidate: 0 },
    });
    expect(data.fiat.map((c) => c.code)).toEqual(["USD", "JPY", "ZZZ"]);
    expect(data.crypto.map((c) => c.code)).toEqual(["BTC", "ETH"]);
    expect(data.crypto[0]).toEqual({ code: "BTC", name: "Bitcoin", rateToUsd: 50000 });
    expect(data.fiatLastUpdateDate).toBe("2024-10-02T03:04:05Z");
    expect(data.cryptoLastUpdateDate).toBe("2024-10-02T03:05:00Z");
});
it("keeps unknown currencies in their provider order after prioritized currencies", async () => {
    const raw = payload();
    raw.fiat = [
        { code: "XYZ", name: null, rateToUsd: 2 },
        { code: "ABC", name: null, rateToUsd: 3 },
        raw.fiat[1],
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(raw))));
    expect((await fetchConverterData("en")).fiat.map((c) => c.code)).toEqual(["USD", "XYZ", "ABC"]);
});
it.each([
    ["network failure", () => Promise.reject(new Error("offline"))],
    ["invalid JSON", () => Promise.resolve(new Response("not JSON"))],
    ["unavailable API", () => Promise.resolve(new Response("unavailable", { status: 503 }))],
])("propagates %s instead of fabricating rates", async (_label, response) => {
    vi.stubGlobal("fetch", vi.fn(response));
    await expect(fetchConverterData("en")).rejects.toThrow();
});
