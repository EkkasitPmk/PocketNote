import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const push = vi.fn();
const closeSheet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../hooks/transaction-sheet.hook", () => ({
  useTransactionSheetStore: (
    selector: (state: { close: () => void }) => unknown,
  ) => selector({ close: closeSheet }),
}));

vi.mock("../hooks/transaction.hook", () => ({
  useTransactionQuery: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("../components/TransactionTypeContent", () => ({
  default: ({ selection }: { selection: { onEditCategory: () => void } }) => (
    <button data-testid="edit-category-btn" onClick={selection.onEditCategory}>
      Edit Category
    </button>
  ),
}));

vi.mock("../components/TransactionHeader", () => ({ default: () => <div /> }));
vi.mock("../components/TransactionTypeTabs", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("../components/TransactionModals", () => ({ default: () => <div /> }));
vi.mock("../components/TransactionFormActions", () => ({
  default: () => <div />,
}));

vi.mock("../hooks/useTransactionSelections.hook", () => ({
  useTransactionSelections: () => ({
    filteredCategories: [],
    safeAssets: [],
    isLoadingCategoryList: false,
    isLoadingAssetList: false,
  }),
}));

vi.mock("../hooks/useTransactionMutations.hook", () => ({
  useTransactionMutations: () => ({
    createTransaction: { mutate: vi.fn(), isPending: false },
    updateTransaction: { mutate: vi.fn(), isPending: false },
    deleteTransaction: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock("../hooks/useTransactionAmount.hook", () => ({
  useTransactionAmount: () => ({
    amountInputRef: { current: null },
    displayAmount: "0",
    numericAmount: 0,
    handleCurrencyInput: vi.fn(),
  }),
}));

vi.mock("../hooks/useTransactionDate.hook", () => ({
  useTransactionDate: () => ({
    isCalendarOpen: false,
    handleOpenCalendar: vi.fn(),
    handleSelectDate: vi.fn(),
  }),
}));

vi.mock("../hooks/useTransactionAttachment.hook", () => ({
  useTransactionAttachment: () => ({
    imageUrls: [],
    fileErrors: [],
    isPendingUpload: false,
    handleFileSelect: vi.fn(),
    handleRemoveImage: vi.fn(),
  }),
}));

vi.mock("../hooks/transaction-form.hook", () => ({
  useTransactionInitialization: vi.fn(),
}));

vi.mock("@/shared/lib/hooks/useTranslation.hook", () => ({
  useTranslation: () => ({
    currentLanguage: "en",
    t: (key: string) => key,
  }),
}));

import TransactionsContainer from "./TransactionsContainer";

describe("TransactionsContainer - handleEditCategoryClick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes the sheet and navigates to /settings?tab=categories when in desktop sheet", () => {
    render(<TransactionsContainer isDesktopSheet={true} />);

    fireEvent.click(screen.getByTestId("edit-category-btn"));

    expect(closeSheet).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/settings?tab=categories");
  });

  it("navigates to /categories without closing sheet on mobile", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );

    render(<TransactionsContainer isDesktopSheet={false} />);

    fireEvent.click(screen.getByTestId("edit-category-btn"));

    expect(closeSheet).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/categories");
  });

  it("closes the sheet and navigates to /settings?tab=categories on desktop even if isDesktopSheet prop is false", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(min-width: 1024px)",
      })),
    );

    render(<TransactionsContainer isDesktopSheet={false} />);

    fireEvent.click(screen.getByTestId("edit-category-btn"));

    expect(closeSheet).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/settings?tab=categories");
  });
});
