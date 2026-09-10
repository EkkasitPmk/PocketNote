import { ChevronRight, Pencil } from "lucide-react";
import { Asset } from "@/shared/lib/types/asset.type";
import { GroupedTransaction } from "@/shared/lib/types/transaction.type";
import { cn } from "@/shared/lib/utils/core.util";
import { Button } from "@/shared/components/animate-ui/components/buttons/button";
import { DropdownSelect } from "@/shared/components/customs/DropdownSelect";
import { Dispatch, SetStateAction, RefObject } from "react";
import { TransactionListContainer } from "@/features/transactions/containers/TransactionListContainer";
import { useTranslation } from "@/shared/lib/hooks/useTranslation.hook";
import { TranslationKey } from "@/shared/lib/configs/translations.config";
import { Slide } from "@/shared/components/animate-ui/primitives/effects/slide";
import AssetPageSkeleton from "./AssetPageSkeleton";

const DEFAULT_ASSET_COLOR = "#2563EB";

interface AssetDetailProps {
  asset?: Asset;
  groupedTransactions: GroupedTransaction[];
  isLoading: boolean;
  isLoadingTransactions: boolean;
  isAddMenuOpen: boolean;
  onAddMenuToggle: () => void;
  onAddMenuClose: () => void;
  onTransferClick: () => void;
  onAdjustmentClick: () => void;
  onEditClick: () => void;
  onAddTransactionClick: () => void;
  onAddExpenseClick: () => void;
  onAddIncomeClick: () => void;
  selected: string;
  months: string[];
  handleSelect: (months: string) => void;
  years: string[];
  selectedYear: string;
  handleSelectYear: (year: string) => void;
  isMonthOpen: boolean;
  setIsMonthOpen: Dispatch<SetStateAction<boolean>>;
  isYearOpen: boolean;
  setIsYearOpen: Dispatch<SetStateAction<boolean>>;
  viewOption: string;
  isViewOptionOpen: boolean;
  viewOptionRef: RefObject<HTMLDivElement | null>;
  onViewOptionToggle: () => void;
  onViewOptionSelect: (option: string) => void;
  monthRef: RefObject<HTMLDivElement | null>;
  yearRef: RefObject<HTMLDivElement | null>;
  isSearchMode?: boolean;
  searchKeyword?: string;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  translateDropdownItem: (item: string) => string;
}

export default function AssetDetail({
  asset,
  groupedTransactions,
  isLoading,
  isLoadingTransactions,
  isAddMenuOpen,
  onAddMenuToggle,
  onAddMenuClose,
  onTransferClick,
  onAdjustmentClick,
  onEditClick,
  onAddTransactionClick,
  onAddExpenseClick,
  onAddIncomeClick,
  selected,
  months,
  handleSelect,
  years,
  selectedYear,
  handleSelectYear,
  isMonthOpen,
  setIsMonthOpen,
  isYearOpen,
  setIsYearOpen,
  viewOption,
  isViewOptionOpen,
  viewOptionRef,
  onViewOptionToggle,
  onViewOptionSelect,
  monthRef,
  yearRef,
  isSearchMode,
  searchKeyword,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  translateDropdownItem,
}: Readonly<AssetDetailProps>) {
  const { t, locale } = useTranslation();
  const viewOptionsList = ["recentTransactions", "showDeletedItems"];

  if (isLoading) return <AssetPageSkeleton />;

  return (
    <div className="relative flex flex-col h-full space-y-4">
      {!isSearchMode && (
        <section className="relative flex flex-col items-center justify-center mt-6">
          <div
            className="px-3 py-1 rounded-full bg-opacity-10 mb-2"
            style={{
              backgroundColor: `${asset?.color || DEFAULT_ASSET_COLOR}1A`,
            }}
          >
            <p
              className="font-semibold text-lg tracking-widest uppercase"
              style={{ color: asset?.color || undefined }}
            >
              {t("balance")}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-3xl font-bold opacity-80"
              style={{ color: asset?.color || undefined }}
            >
              ฿
            </span>
            <p className="text-3xl font-extrabold tracking-tight text-primary-text">
              {(asset?.balance ?? 0).toLocaleString(locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </section>
      )}

      {!isSearchMode && (
        <section className="mb-2 px-4">
          <DropdownSelect
            ref={viewOptionRef}
            options={viewOptionsList.map((opt) => t(opt as TranslationKey))}
            selected={t(viewOption as TranslationKey)}
            isOpen={isViewOptionOpen}
            onToggle={onViewOptionToggle}
            themeColor={asset?.color}
            onSelect={(selectedLabel) => {
              const originalKey =
                viewOptionsList.find(
                  (opt) => t(opt as TranslationKey) === selectedLabel,
                ) || viewOptionsList[0];
              onViewOptionSelect(originalKey);
            }}
            className="w-full text-base font-medium"
          />

          {groupedTransactions?.length > 0 && (
            <>
              <p className="text-secondary-text text-sm mt-2">{t("period")}</p>

              <div className="flex items-center justify-between gap-4">
                <DropdownSelect
                  ref={monthRef}
                  options={months.map(translateDropdownItem)}
                  selected={translateDropdownItem(selected)}
                  isOpen={isMonthOpen}
                  onToggle={() => setIsMonthOpen(!isMonthOpen)}
                  themeColor={asset?.color}
                  onSelect={(translatedMonth) => {
                    const originalKey =
                      months.find(
                        (opt) => translateDropdownItem(opt) === translatedMonth,
                      ) || months[0];
                    if (originalKey) handleSelect(originalKey);
                    setIsMonthOpen(false);
                  }}
                  className="grow"
                />
                <DropdownSelect
                  ref={yearRef}
                  options={years.map(translateDropdownItem)}
                  selected={translateDropdownItem(selectedYear)}
                  isOpen={isYearOpen}
                  onToggle={() => setIsYearOpen(!isYearOpen)}
                  themeColor={asset?.color}
                  onSelect={(translatedYear) => {
                    const originalKey =
                      years.find(
                        (opt) => translateDropdownItem(opt) === translatedYear,
                      ) || years[0];
                    if (originalKey) handleSelectYear(originalKey);
                    setIsYearOpen(false);
                  }}
                  className="grow"
                />
              </div>
            </>
          )}
        </section>
      )}

      <section
        className={cn(
          "flex-1 relative flex flex-col min-h-0 m-0",
          isSearchMode && "pb-6",
        )}
      >
        {isSearchMode && (
          <div className="flex items-end justify-end shrink-0 px-4 py-1">
            <DropdownSelect
              ref={yearRef}
              options={years.map(translateDropdownItem)}
              selected={translateDropdownItem(selectedYear)}
              isOpen={isYearOpen}
              onToggle={() => setIsYearOpen(!isYearOpen)}
              themeColor={asset?.color}
              onSelect={(translatedYear) => {
                const originalKey =
                  years.find(
                    (opt) => translateDropdownItem(opt) === translatedYear,
                  ) || years[0];
                if (originalKey) handleSelectYear(originalKey);
                setIsYearOpen(false);
              }}
            />
          </div>
        )}
        <TransactionListContainer
          groupedTransactions={groupedTransactions}
          isLoadingTransactions={isLoadingTransactions}
          assetId={asset?.id}
          isSearchMode={isSearchMode}
          searchKeyword={searchKeyword}
          page="asset"
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        />
      </section>

      {/* nav action bottom */}
      {!isSearchMode && (
        <Slide
          asChild
          direction="up"
          offset={96}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <section className="absolute bottom-4 left-3 right-3 z-50 rounded-xl border border-border/70 bg-surface/95 px-1.5 py-1.5 backdrop-blur-xl">
            <div className="flex items-center gap-1.5 md:gap-4">
              <Button
                variant="unstyled"
                onClick={onEditClick}
                className="flex min-h-10 w-[25%] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-white transition-colors duration-150 hover:bg-primary-light hover:text-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                style={{ backgroundColor: asset?.color || undefined }}
              >
                <Pencil className="h-4.5 w-4.5" strokeWidth={2} />
                <span className="text-[0.5625rem] font-semibold">
                  {t("edit")}
                </span>
              </Button>
              <div
                className={cn(
                  "relative flex w-[75%] items-center rounded-lg bg-primary text-sm font-medium text-white cursor-pointer",
                  isAddMenuOpen ? "rounded-tl-none rounded-tr-none" : "",
                )}
                style={{ backgroundColor: asset?.color || undefined }}
              >
                <Button
                  variant="unstyled"
                  onClick={onAddTransactionClick}
                  className={cn(
                    "min-h-10 w-full truncate rounded-xl px-2 transition-colors hover:bg-black/10",
                    isAddMenuOpen
                      ? "rounded-tl-none rounded-tr-none rounded-br-none"
                      : "rounded-tr-none rounded-br-none",
                  )}
                >
                  {t("addTransaction")}
                </Button>

                <div className="min-h-10 w-px bg-background" />

                <Button
                  variant="unstyled"
                  onClick={onAddMenuToggle}
                  className={cn(
                    "flex min-h-10 w-[20%] items-center justify-center rounded-xl transition-colors hover:bg-black/10",
                    isAddMenuOpen
                      ? "rounded-tr-none rounded-tl-none rounded-bl-none"
                      : "rounded-tl-none rounded-bl-none",
                  )}
                >
                  <ChevronRight
                    size={20}
                    className={cn(
                      "transition-transform",
                      isAddMenuOpen && "-rotate-90",
                    )}
                  />
                </Button>

                {isAddMenuOpen && (
                  <>
                    <Button
                      variant="unstyled"
                      type="button"
                      aria-label="Close add menu"
                      className="fixed inset-0 z-0 w-full h-full cursor-default focus:outline-none"
                      onClick={onAddMenuClose}
                      tabIndex={-1}
                    />
                    <div
                      className={cn(
                        "absolute bottom-full left-1/2 z-10 flex w-full -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-primary py-1 text-white",
                        isAddMenuOpen ? "rounded-bl-none rounded-br-none" : "",
                      )}
                      style={{ backgroundColor: asset?.color || undefined }}
                    >
                      <Button
                        variant="unstyled"
                        onClick={onAddExpenseClick}
                        className="w-full py-2 text-sm hover:bg-black/10 border-b border-border/20 font-medium"
                      >
                        {t("expense")}
                      </Button>
                      <Button
                        variant="unstyled"
                        onClick={onAddIncomeClick}
                        className="w-full py-2 text-sm hover:bg-black/10 border-b border-border/20 font-medium"
                      >
                        {t("income")}
                      </Button>
                      <Button
                        variant="unstyled"
                        onClick={onTransferClick}
                        className="w-full py-2 text-sm hover:bg-black/10 border-b border-border/20 font-medium"
                      >
                        {t("transfer")}
                      </Button>
                      <Button
                        variant="unstyled"
                        onClick={onAdjustmentClick}
                        className="w-full py-2 text-sm hover:bg-black/10 font-medium"
                      >
                        {t("adjustment")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </Slide>
      )}
    </div>
  );
}
