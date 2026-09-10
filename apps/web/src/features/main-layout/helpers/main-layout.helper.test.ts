import { describe, it, expect } from "vitest";
import { TranslationKey } from "@/shared/lib/configs/translations.config";
import {
  isMainTabRoute,
  extractCategoryId,
  isSyntheticCategoryId,
  getSyntheticCategory,
  getMainContentClassNames,
  getBackFallbackHref,
  getMainLayoutRoute,
  getMainLayoutDescription,
  getDesktopSettingsRedirectHref,
  shouldShowProfile,
  shouldLockContentScroll,
} from "./main-layout.helper";

describe("main-layout.helper", () => {
  it("redirects mobile-only management routes to desktop settings", () => {
    expect(getDesktopSettingsRedirectHref("/settings/account", null)).toBe(
      "/settings?tab=account",
    );
    expect(getDesktopSettingsRedirectHref("/categories", null)).toBe(
      "/settings?tab=categories",
    );
    expect(getDesktopSettingsRedirectHref("/assets", null)).toBe(
      "/settings?tab=assets",
    );
    expect(getDesktopSettingsRedirectHref("/support/feedback", null)).toBe(
      "/settings",
    );
    expect(getDesktopSettingsRedirectHref("/support/contact", null)).toBe(
      "/settings",
    );
  });

  it("keeps asset detail and unrelated routes available on desktop", () => {
    expect(getDesktopSettingsRedirectHref("/assets", "asset-1")).toBeNull();
    expect(getDesktopSettingsRedirectHref("/assets/new", null)).toBeNull();
    expect(getDesktopSettingsRedirectHref("/dashboard", null)).toBeNull();
  });

  it("maps supported paths to one route policy", () => {
    expect(getMainLayoutRoute("/dashboard")).toBe("dashboard");
    expect(getMainLayoutRoute("/assets/new")).toBe("assetsNew");
    expect(getMainLayoutRoute("/settings/account")).toBe("settingsAccount");
    expect(getMainLayoutRoute("/support/contact")).toBe("supportContact");
    expect(getMainLayoutRoute("/support/feedback")).toBe("supportFeedback");
    expect(getMainLayoutRoute("/analytics/category/cat-123")).toBe(
      "analyticsCategory",
    );
    expect(getMainLayoutRoute("/analytics/category/cat-123/extra")).toBe(
      "other",
    );
  });

  it("shows the profile only on the home route", () => {
    expect(shouldShowProfile("dashboard")).toBe(true);
    expect(shouldShowProfile("journal")).toBe(false);
    expect(shouldShowProfile("analytics")).toBe(false);
  });

  it("returns a description for supported pages", () => {
    const mockT = (key: TranslationKey) => key;

    expect(getMainLayoutDescription("dashboard", mockT)).toBe(
      "navDashboardDesc",
    );
    expect(getMainLayoutDescription("supportFeedback", mockT)).toBe(
      "navSupportFeedbackDesc",
    );
    expect(getMainLayoutDescription("other", mockT)).toBe("appDescription");
  });

  it("locks content scrolling only for full-height main tabs", () => {
    expect(shouldLockContentScroll("journal")).toBe(true);
    expect(shouldLockContentScroll("analytics")).toBe(true);
    expect(shouldLockContentScroll("transaction")).toBe(true);
    expect(shouldLockContentScroll("dashboard")).toBe(false);
  });

  it("correctly identifies main tab routes", () => {
    expect(isMainTabRoute("/dashboard")).toBe(true);
    expect(isMainTabRoute("/journal")).toBe(true);
    expect(isMainTabRoute("/analytics")).toBe(true);
    expect(isMainTabRoute("/transaction")).toBe(true);
    expect(isMainTabRoute("/categories")).toBe(false);
    expect(isMainTabRoute("/settings")).toBe(false);
  });

  it("returns an in-app fallback when browser history has no previous page", () => {
    expect(getBackFallbackHref("assetsNew")).toBe("/assets");
    expect(getBackFallbackHref("settingsAccount")).toBe("/dashboard");
    expect(getBackFallbackHref("supportContact")).toBe("/settings");
    expect(getBackFallbackHref("analyticsCategory")).toBe("/analytics");
    expect(getBackFallbackHref("categories")).toBe("/dashboard");
  });

  it("extracts category ID from analytics category path", () => {
    expect(extractCategoryId("/analytics/category/cat-123")).toBe("cat-123");
    expect(extractCategoryId("/analytics")).toBeNull();
  });

  it("identifies synthetic category IDs", () => {
    expect(isSyntheticCategoryId("uncategorized_transfer")).toBe(true);
    expect(isSyntheticCategoryId("uncategorized_adjustment")).toBe(true);
    expect(isSyntheticCategoryId("uncategorized")).toBe(true);
    expect(isSyntheticCategoryId("real-cat-id")).toBe(false);
    expect(isSyntheticCategoryId(null)).toBe(false);
  });

  it("returns correct synthetic category object", () => {
    const mockT = (key: TranslationKey) => key.toUpperCase();
    const synth = getSyntheticCategory("uncategorized_transfer", mockT);
    expect(synth).toEqual({
      id: "uncategorized_transfer",
      name: "TRANSFER",
      color: "#3B82F6",
      type: "TRANSFER",
    });

    expect(getSyntheticCategory(null, mockT)).toBeNull();
  });

  it("calculates content class names based on route and header conditions", () => {
    const mainTabRes = getMainContentClassNames({
      isMainTab: true,
      shouldShowTopAppBar: false,
      isSearchMode: false,
      pathname: "/transaction",
    });
    expect(mainTabRes.mainContentClassName).toBe("pt-3");
    expect(mainTabRes.mainOverflowClassName).toBe("overflow-hidden");

    const assetSearchRes = getMainContentClassNames({
      isMainTab: false,
      shouldShowTopAppBar: true,
      isSearchMode: true,
      pathname: "/assets",
    });
    expect(assetSearchRes.mainContentClassName).toBe("");
  });
});
