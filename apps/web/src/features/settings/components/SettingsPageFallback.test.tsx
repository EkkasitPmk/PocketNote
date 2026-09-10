import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SettingsPageFallback from "./SettingsPageFallback";

describe("SettingsPageFallback", () => {
  it("renders desktop tabs and account tab skeleton sections including security and danger zone", () => {
    const markup = renderToStaticMarkup(<SettingsPageFallback />);

    expect(markup).toContain('aria-label="Loading settings"');
    // Desktop tabs header width classes
    expect(markup).toContain("w-36");
    expect(markup).toContain("w-28");
    // Avatar skeleton
    expect(markup).toContain("size-18 rounded-full");
    // Personal info inputs
    expect(markup).toContain("rounded-b-none");
    expect(markup).toContain("rounded-t-none");
    // Security row skeleton
    expect(markup).toContain("w-32");
    // Danger Zone box skeleton
    expect(markup).toContain("border-expense/20");
    expect(markup).toContain("bg-expense-light/10");
  });
});
