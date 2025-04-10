import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import FiatConversionBox from "@/app/(currency-converter)/[lang]/components/conversion-boxes/FiatConversionBox";
import CryptoConversionBox from "@/app/(currency-converter)/[lang]/components/conversion-boxes/CryptoConversionBox";
const fiat = [
    { code: "USD", name: "US Dollar", rateToUsd: 1 },
    { code: "EUR", name: "Euro", rateToUsd: 1.25 },
    { code: "JPY", name: "Japanese Yen", rateToUsd: 0.01 },
];
const crypto = [
    { code: "BTC", name: "Bitcoin", rateToUsd: 50000 },
    { code: "ETH", name: "Ethereum", rateToUsd: 2500 },
];
const translation = {
    title: "Convert",
    subtitle: "currencies",
    amount: "Amount",
    convertedTo: "Converted to",
    accordingToCb: "Central bank rates",
    rateLastUpdated: "Updated",
};
// Inputs and swap currently lack accessible names; currency controls have names.
function inputs() {
    return screen.getAllByRole("textbox");
}
function swapButton() {
    return screen.getAllByRole("button").find((b) => !b.getAttribute("aria-label"))!;
}

describe("fiat conversion", () => {
    it("converts comma-separated amounts and swaps rates while retaining the entered amount", async () => {
        const user = userEvent.setup();
        render(<FiatConversionBox currencies={fiat} translation={translation} />);
        expect(inputs()[1]).toHaveValue("800.00");
        await user.clear(inputs()[0]);
        await user.type(inputs()[0], "2,500.50");
        expect(inputs()[1]).toHaveValue("2,000.40");
        await user.click(swapButton());
        expect(inputs()[0]).toHaveValue("2,500.50");
        expect(inputs()[1]).toHaveValue("3,125.63");
        expect(screen.getByText("1 EUR = 1.25 USD")).toBeInTheDocument();
    });
    it("filters names case-insensitively, shows no matches, and recalculates after selecting", async () => {
        const user = userEvent.setup();
        render(<FiatConversionBox currencies={fiat} translation={translation} />);
        await user.click(screen.getByRole("button", { name: "To" }));
        const search = screen.getByPlaceholderText("Search for a currency...");
        await user.type(search, "missing");
        expect(screen.getByText("No currency found.")).toBeInTheDocument();
        await user.clear(search);
        await user.type(search, "jApAnEsE");
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).queryByRole("option", { name: /EUR/ })).not.toBeInTheDocument();
        await user.click(within(dialog).getByRole("option", { name: /JPY/ }));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(inputs()[1]).toHaveValue("100,000.00");
    });
    it("ignores alphabetic input and resets the result when cleared", async () => {
        const user = userEvent.setup();
        render(<FiatConversionBox currencies={fiat} translation={translation} />);
        await user.type(inputs()[0], "abc-");
        expect(inputs()[0]).toHaveValue("1,000");
        expect(inputs()[1]).toHaveAttribute("readonly");
        await user.clear(inputs()[0]);
        expect(inputs()[1]).toHaveValue("0.00");
    });
});
it("uses crypto precision and switches to fiat precision and crypto options after swapping", async () => {
    const user = userEvent.setup();
    render(
        <CryptoConversionBox
            fiatCurrencies={fiat}
            cryptoCurrencies={crypto}
            translation={translation}
            lastUpdatedDate={0}
            locale="en"
        />,
    );
    expect(inputs()[1]).toHaveValue("0.0200000000");
    await user.clear(inputs()[0]);
    await user.type(inputs()[0], "0.5");
    expect(inputs()[1]).toHaveValue("0.0000100000");
    await user.click(swapButton());
    expect(inputs()[1]).toHaveValue("25,000.00");
    await user.click(screen.getByRole("button", { name: "From" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("option", { name: /USD/ })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("option", { name: /ETH/ }));
    expect(inputs()[1]).toHaveValue("1,250.00");
    expect(screen.getByText("1 ETH = 2,500.00 USD")).toBeInTheDocument();
});
