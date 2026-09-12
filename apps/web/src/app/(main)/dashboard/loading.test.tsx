import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import DashboardLoading from "./loading";

describe("DashboardLoading", () => {
  it("renders pure skeletons without ChevronRight icons", () => {
    const markup = renderToStaticMarkup(<DashboardLoading />);

    // Profile header (mobile)
    expect(markup).toContain("bg-background fixed md:hidden top-0");
    // Financial snapshot split cards
    expect(markup).toContain("h-14.5 w-[42%]");
    // Assets header skeleton
    expect(markup).toContain("h-6 w-28");
    // 3 asset rows with skeleton blocks instead of icons
    expect(markup).toContain("border-l-4 border-border");
    expect(markup).toContain("size-4 rounded");
    // No Lucide chevron icons
    expect(markup).not.toContain("lucide-chevron-right");
    // Recent journal section header skeleton
    expect(markup).toContain("h-6 w-32");
    expect(markup).toContain("h-4 w-16");
  });
});
