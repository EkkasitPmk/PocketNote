import { TranslationKey } from "@/shared/lib/configs/translations.config";
import {
  MainLayoutRoute,
  SyntheticCategory,
  MainContentClassNamesParams,
} from "../types/main-layout.type";

const MAIN_TAB_ROUTES = new Set<MainLayoutRoute>([
  "dashboard",
  "journal",
  "analytics",
  "transaction",
]);
const ANALYTICS_CATEGORY_ROUTE = /^\/analytics\/category\/([^/]+)$/;
const DESKTOP_SETTINGS_REDIRECT_PATHS = new Set([
  "/settings/account",
  "/categories",
  "/assets",
  "/support/feedback",
  "/support/contact",
]);

export function getMainLayoutRoute(pathname: string): MainLayoutRoute {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/journal") return "journal";
  if (pathname === "/analytics") return "analytics";
  if (pathname === "/transaction") return "transaction";
  if (pathname === "/categories") return "categories";
  if (pathname === "/assets") return "assets";
  if (pathname === "/assets/new") return "assetsNew";
  if (pathname === "/settings") return "settings";
  if (pathname === "/settings/account") return "settingsAccount";
  if (pathname === "/support/contact") return "supportContact";
  if (pathname === "/support/feedback") return "supportFeedback";
  if (ANALYTICS_CATEGORY_ROUTE.test(pathname)) return "analyticsCategory";
  return "other";
}

export function isMainTabRoute(pathname: string): boolean {
  return MAIN_TAB_ROUTES.has(getMainLayoutRoute(pathname));
}

export function getDesktopSettingsRedirectHref(
  pathname: string,
  assetId: string | null,
): string | null {
  if (pathname === "/assets" && assetId) return null;
  if (pathname === "/settings/account") return "/settings?tab=account";
  if (pathname === "/assets") return "/settings?tab=assets";
  if (pathname === "/categories") return "/settings?tab=categories";
  return DESKTOP_SETTINGS_REDIRECT_PATHS.has(pathname) ? "/settings" : null;
}

export function getBackFallbackHref(route: MainLayoutRoute): string {
  if (route === "assetsNew") return "/assets";
  if (route === "settingsAccount") return "/dashboard";
  if (route === "supportContact" || route === "supportFeedback") {
    return "/settings";
  }
  if (route === "analyticsCategory") return "/analytics";
  return "/dashboard";
}

export function shouldShowProfile(route: MainLayoutRoute): boolean {
  return route === "dashboard";
}

export function getMainLayoutDescription(
  route: MainLayoutRoute,
  t: (key: TranslationKey) => string,
): string {
  const descriptionKeys: Partial<Record<MainLayoutRoute, TranslationKey>> = {
    dashboard: "navDashboardDesc",
    journal: "navJournalDesc",
    transaction: "navTransactionsDesc",
    analytics: "navAnalyticsDesc",
    categories: "navCategoriesDesc",
    assets: "navAssetsDesc",
    assetsNew: "navAssetsNewDesc",
    settings: "navSettingsDesc",
    settingsAccount: "navSettingsAccountDesc",
    supportContact: "navSupportContactDesc",
    supportFeedback: "navSupportFeedbackDesc",
    analyticsCategory: "navAnalyticsCategoryDesc",
  };

  return t(descriptionKeys[route] || "appDescription");
}

export function shouldLockContentScroll(route: MainLayoutRoute): boolean {
  return ["transaction", "journal", "analytics"].includes(route);
}

export function extractCategoryId(pathname: string): string | null {
  const match = ANALYTICS_CATEGORY_ROUTE.exec(pathname);
  return match ? match[1] : null;
}

export function isSyntheticCategoryId(categoryId: string | null): boolean {
  if (!categoryId) return false;
  return [
    "uncategorized_transfer",
    "uncategorized_adjustment",
    "uncategorized",
  ].includes(categoryId);
}

export function getSyntheticCategory(
  id: string | null,
  t: (key: TranslationKey) => string,
): SyntheticCategory | null {
  if (!id) return null;
  if (id === "uncategorized_transfer") {
    return {
      id: "uncategorized_transfer",
      name: t("transfer"),
      color: "#3B82F6",
      type: "TRANSFER",
    };
  }
  if (id === "uncategorized_adjustment") {
    return {
      id: "uncategorized_adjustment",
      name: t("adjustment"),
      color: "#6B7280",
      type: "ADJUSTMENT",
    };
  }
  if (id === "uncategorized") {
    return {
      id: "uncategorized",
      name: "Uncategorized",
      color: "#9CA3AF",
      type: "EXPENSE",
    };
  }
  return null;
}

export function getMainContentClassNames({
  isMainTab,
  shouldShowTopAppBar,
  isSearchMode,
  pathname,
}: MainContentClassNamesParams): {
  mainContentClassName: string;
  mainOverflowClassName: string;
} {
  let mainContentClassName = "px-0 py-3";
  let mainOverflowClassName = "overflow-y-auto";

  const route = getMainLayoutRoute(pathname);

  if (isMainTab) {
    if (shouldLockContentScroll(route)) {
      mainContentClassName = "pt-3";
      mainOverflowClassName = "overflow-hidden";
    } else {
      mainContentClassName = "pt-15 md:py-4";
    }
  } else if (shouldShowTopAppBar) {
    if (route === "assets" && isSearchMode) {
      mainContentClassName = "";
    } else {
      mainContentClassName = "pt-12 md:py-4";
    }
  }

  return { mainContentClassName, mainOverflowClassName };
}
