"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, useRouter } from "next/navigation";
import { useTransactionQuery } from "../hooks/transaction.hook";
import {
  createTransactionSchema,
  CreateTransactionFormValues,
} from "../schemas/transaction.form.schema";
import { toast } from "react-toastify";
import TransactionFormActions from "../components/TransactionFormActions";
import TransactionModals from "../components/TransactionModals";
import TransactionHeader from "../components/TransactionHeader";
import TransactionTypeTabs from "../components/TransactionTypeTabs";
import TransactionTypeContent from "../components/TransactionTypeContent";
import { useTransactionInitialization } from "../hooks/transaction-form.hook";
import { useConfirmModal } from "@/shared/lib/hooks/useConfirmModal.hook";
import { useModalState } from "@/shared/lib/hooks/useModalState.hook";
import { convertAmountToDigits } from "@/shared/lib/utils/currency.util";
import { formatDisplayDate } from "@/shared/lib/helpers/date.helper";
import { th, enUS } from "date-fns/locale";
import {
  submitTransaction,
  resolveDefaultTransactionType,
  createDefaultFormValues,
  getTransactionTypeOptions,
  getTypeLabel,
  checkIsTxLoading,
  isCategoryType,
  getLoadingModalProps,
} from "../helpers/transaction.helper";
import { cn } from "@/shared/lib/utils/core.util";
import { TransactionType } from "@/shared/lib/types/transaction.type";
import { useTransactionAttachment } from "../hooks/useTransactionAttachment.hook";
import { useTransactionDate } from "../hooks/useTransactionDate.hook";
import { useTransactionAmount } from "../hooks/useTransactionAmount.hook";
import { useTransactionMutations } from "../hooks/useTransactionMutations.hook";
import { useTransactionSelections } from "../hooks/useTransactionSelections.hook";
import { useTranslation } from "@/shared/lib/hooks/useTranslation.hook";
import { useTransactionSheetStore } from "../hooks/transaction-sheet.hook";
import type { Asset } from "@/shared/lib/types/asset.type";
import type { Category } from "@/shared/lib/types/category.type";
import type { TransactionResponse } from "@/shared/lib/types/transaction.type";

export default function TransactionsContainer({
  isDesktopSheet = false,
  initialAssets,
  initialCategories,
  initialTransaction,
  desktopTransaction,
}: Readonly<{
  isDesktopSheet?: boolean;
  initialAssets?: Asset[];
  initialCategories?: Category[];
  initialTransaction?: TransactionResponse;
  desktopTransaction?: TransactionResponse | null;
}>) {
  const router = useRouter();
  const closeTransactionSheet = useTransactionSheetStore(
    (state) => state.close,
  );
  const searchParams = useSearchParams();
  const editId = desktopTransaction?.id ?? searchParams.get("id");
  const hasAssetId =
    Boolean(desktopTransaction?.assetId) || searchParams.has("assetId");
  const defaultAssetId =
    desktopTransaction?.assetId ?? searchParams.get("assetId");
  const typeParam = desktopTransaction?.type ?? searchParams.get("type");
  const { t, locale, currentLanguage } = useTranslation();

  const { data: existingTx, isPending: isTxPending } = useTransactionQuery(
    editId || undefined,
    {
      initialData:
        initialTransaction?.id === editId ? initialTransaction : undefined,
    },
  );

  const isTxLoading = checkIsTxLoading(editId, isTxPending);

  const defaultType = useMemo(
    () => resolveDefaultTransactionType(existingTx, typeParam),
    [existingTx, typeParam],
  );

  const [transactionType, setTransactionType] =
    useState<TransactionType>(defaultType);

  const [prevTxId, setPrevTxId] = useState<string | null>(null);
  const [prevTypeParam, setPrevTypeParam] = useState<string | null>(typeParam);

  const [isMoreDetailsOpen, setIsMoreDetailsOpen] = useState(false);
  const [isUnconfirmedDateModalOpen, setIsUnconfirmedDateModalOpen] =
    useState(false);
  const [pendingSubmission, setPendingSubmission] =
    useState<CreateTransactionFormValues | null>(null);
  const {
    file,
    setFile,
    removedAttachment,
    setRemovedAttachment,
    isPhotoMenuOpen,
    setIsPhotoMenuOpen,
    fileInputRef,
    cameraInputRef,
    handleFileChange,
    handleRemoveFile,
    handleTakeAPhoto,
    handleSelectAPhoto,
  } = useTransactionAttachment((key) => t(key));
  const { modalState, setModalState, resetModalState } = useModalState();

  const {
    isOpen: isDeleteModalOpen,
    open: openDeleteModal,
    close: closeDeleteModal,
    isHardDelete,
    setIsHardDelete,
    inputValue: confirmInput,
    setInputValue: setConfirmInput,
  } = useConfirmModal();

  const defaultValues = useMemo(
    () => createDefaultFormValues(existingTx, defaultAssetId),
    [existingTx, defaultAssetId],
  );

  const {
    handleSubmit,
    setValue,
    control,
    reset,
    register,
    clearErrors,
    formState: { errors, isSubmitted, touchedFields },
  } = useForm<CreateTransactionFormValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues,
  });

  const {
    setAmountDigits,
    displayAmount,
    numericAmount,
    inputRef: amountInputRef,
    handleCurrencyInput,
  } = useTransactionAmount(setValue);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const watchTransactionDate = useWatch({ control, name: "transactionDate" });
  const watchCategoryId = useWatch({ control, name: "categoryId" });
  const watchAssetId = useWatch({ control, name: "assetId" });
  const watchToAssetId = useWatch({ control, name: "toAssetId" });
  const watchNote = useWatch({ control, name: "note" });

  const date = useMemo(
    () => (watchTransactionDate ? new Date(watchTransactionDate) : new Date()),
    [watchTransactionDate],
  );

  const {
    displayMonth,
    setDisplayMonth,
    tempDate,
    handleSelectDate,
    isCalendarOpen,
    setIsCalendarOpen,
    hasUnconfirmedDateSelection,
    handleOpenCalendar,
    handleConfirmDate,
    handlePresetClick,
  } = useTransactionDate(date, setValue);

  useTransactionInitialization({
    existingTx,
    prevTxId,
    setPrevTxId,
    setTransactionType,
    setAmountDigits,
    setDisplayMonth,
    setRemovedAttachment,
    setIsMoreDetailsOpen,
    typeParam,
    prevTypeParam,
    setPrevTypeParam,
    resolveDefaultTransactionType,
    convertAmountToDigits,
    setFile,
  });

  const handleSuccess = useCallback(
    (message: string, shouldRedirect: boolean = false) => {
      if (isDesktopSheet) {
        closeTransactionSheet();
        router.refresh();
        return;
      }
      setModalState({
        isOpen: true,
        status: "success",
        message,
        shouldRedirect,
      });
      if (!shouldRedirect) {
        reset(defaultValues);
        setAmountDigits("");
        setFile(null);
        setRemovedAttachment(false);
        setIsPhotoMenuOpen(false);
      }
      router.refresh();
    },
    [
      reset,
      defaultValues,
      setModalState,
      setAmountDigits,
      setFile,
      setRemovedAttachment,
      setIsPhotoMenuOpen,
      closeTransactionSheet,
      isDesktopSheet,
      router,
    ],
  );

  const {
    createTransaction,
    updateTransaction,
    deleteTransaction,
    isSubmitting,
  } = useTransactionMutations({
    editId,
    t,
    onSuccess: handleSuccess,
    onError: (message) => {
      setModalState({ isOpen: true, status: "error", message });
    },
  });

  const handleModalClose = () => {
    const shouldRedirect = modalState.shouldRedirect;
    resetModalState();
    if (shouldRedirect) {
      router.back();
    }
  };

  const handleConfirmDelete = () => {
    if (editId) {
      deleteTransaction.mutate({
        id: editId,
        isHardDelete: Boolean(isHardDelete),
      });
      closeDeleteModal();
    }
  };

  const handleEditCategoryClick = () => {
    if (
      isDesktopSheet ||
      (typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1024px)").matches)
    ) {
      closeTransactionSheet();
      router.push("/settings?tab=categories");
      return;
    }
    router.push("/categories");
  };

  const {
    filteredCategories,
    safeAssets,
    isLoadingCategoryList,
    isLoadingAssetList,
  } = useTransactionSelections({
    transactionType,
    watchCategoryId,
    watchAssetId,
    watchToAssetId,
    setValue,
    initialAssets,
    initialCategories,
  });

  const handleResetForm = () => {
    reset(defaultValues);
    setAmountDigits("");
    setFile(null);
    setRemovedAttachment(false);
    setIsPhotoMenuOpen(false);
  };

  const displayDate = formatDisplayDate(date, true, locale, t);
  const calendarLocale = currentLanguage === "th" ? th : enUS;

  const submit = (data: CreateTransactionFormValues) => {
    submitTransaction({
      transactionType,
      data,
      file,
      createTransaction,
      updateTransaction,
      editId,
      removedAttachment,
      toast,
      t,
    });
  };

  const onSubmit = (data: CreateTransactionFormValues) => {
    if (hasUnconfirmedDateSelection) {
      setPendingSubmission(data);
      setIsUnconfirmedDateModalOpen(true);
      return;
    }
    submit(data);
  };

  const handleConfirmUnconfirmedDate = () => {
    if (pendingSubmission) submit(pendingSubmission);
    setPendingSubmission(null);
    setIsUnconfirmedDateModalOpen(false);
  };

  const handleCloseUnconfirmedDate = () => {
    setPendingSubmission(null);
    setIsUnconfirmedDateModalOpen(false);
    setIsCalendarOpen(true);
  };

  const selectedDateTime = tempDate
    ? formatDisplayDate(tempDate, true, locale, t)
    : "";

  const transactionTypeOptions = useMemo(
    () => getTransactionTypeOptions(editId, existingTx?.type, t),
    [editId, existingTx?.type, t],
  );

  const transactionTypeStr = getTypeLabel(transactionType, t);
  const showCategoryList = isTxLoading || isCategoryType(transactionType);
  const showCategorySkeleton = isLoadingCategoryList || isTxLoading;
  const showAssetSkeleton = isLoadingAssetList || isTxLoading;
  const tabsValue = isTxLoading ? "LOADING" : transactionType;
  const tabsContentOptions = isTxLoading
    ? [{ label: "", value: "LOADING" }]
    : transactionTypeOptions;
  const loadingModalProps = getLoadingModalProps(modalState, isSubmitting);
  const attachmentUrl = removedAttachment ? null : existingTx?.attachmentUrl;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onReset={handleResetForm}
      className={cn(
        "grid grid-cols-1 grid-rows-[79dvh_auto] sm:grid-rows-[87dvh_auto]",
        editId ? "lg:grid-rows-[80dvh_auto]" : "lg:grid-rows-[86dvh_auto]",
      )}
    >
      <div className="min-h-0 overflow-y-auto mb-2 lg:m-0">
        <TransactionHeader
          hasAssetId={hasAssetId}
          isEditing={Boolean(editId)}
          hideActions={isDesktopSheet && Boolean(editId)}
          title={editId ? t("editTransaction") : t("addTransaction")}
          deleteLabel={t("delete")}
          onBack={() => router.back()}
          onDelete={openDeleteModal}
        />

        <div className="px-4 lg:px-0">
          <TransactionTypeTabs
            value={tabsValue}
            options={transactionTypeOptions}
            isLoading={isTxLoading}
            onValueChange={(val) => {
              if (isTxLoading) return;
              setTransactionType(val as TransactionType);
              clearErrors();
            }}
          >
            <TransactionTypeContent
              options={tabsContentOptions}
              amount={{
                isLoading: isTxLoading,
                inputRef: amountInputRef,
                displayAmount,
                numericAmount,
                onChange: handleCurrencyInput,
                showError: isSubmitted || Boolean(touchedFields.amount),
                errorMessage: errors.amount?.message,
              }}
              selection={{
                showCategoryList,
                categories: filteredCategories,
                activeCategoryId: watchCategoryId || null,
                onSelectCategory: (id) => setValue("categoryId", id),
                onEditCategory: handleEditCategoryClick,
                isLoadingCategoryList: showCategorySkeleton,
                assets: safeAssets,
                activeAssetId: watchAssetId || null,
                onSelectAsset: (id) => setValue("assetId", id),
                activeAssetToId: watchToAssetId || null,
                onSelectAssetTo: (id) => setValue("toAssetId", id),
                transactionType,
                isLoadingAssetList: showAssetSkeleton,
              }}
              moreDetails={{
                isMoreDetailsOpen,
                setIsMoreDetailsOpen,
                displayDate,
                onOpenCalendar: handleOpenCalendar,
                isCalendarOpen,
                onCalendarOpenChange: setIsCalendarOpen,
                isPhotoMenuOpen,
                setIsPhotoMenuOpen,
                file,
                attachmentUrl,
                onRemoveFile: handleRemoveFile,
                onTakeAPhoto: handleTakeAPhoto,
                onSelectAPhoto: handleSelectAPhoto,
                fileInputRef,
                cameraInputRef,
                handleFileChange,
                register,
                noteValue: watchNote || "",
                onNoteChange: (value) => setValue("note", value),
                isLoadingTx: isTxLoading,
              }}
              datePicker={{
                selectedDate: tempDate,
                onSelectDate: handleSelectDate,
                displayMonth,
                onMonthChange: setDisplayMonth,
                onConfirm: handleConfirmDate,
                onPresetClick: handlePresetClick,
                locale: calendarLocale,
              }}
            />
          </TransactionTypeTabs>
        </div>
      </div>

      <TransactionFormActions
        isLoading={isTxLoading}
        isSubmitting={isSubmitting}
        isDesktopSheet={isDesktopSheet}
        isEditing={Boolean(editId)}
        transactionTypeLabel={transactionTypeStr}
        saveLabel={t("saveTransactionStr")}
        deleteLabel={t("delete")}
        onDelete={openDeleteModal}
      />

      <TransactionModals
        isDeleteModalOpen={isDeleteModalOpen}
        onCloseDelete={closeDeleteModal}
        onConfirmDelete={handleConfirmDelete}
        isHardDelete={isHardDelete}
        onHardDeleteChange={setIsHardDelete}
        confirmInput={confirmInput}
        onConfirmInputChange={setConfirmInput}
        deleteTitle={t("deleteTransaction")}
        deleteDescription={t("deleteTransactionDesc")}
        deleteLabel={t("delete")}
        deletePermanentlyLabel={t("deletePermanently")}
        loadingModal={loadingModalProps}
        onCloseLoading={handleModalClose}
        isUnconfirmedDateModalOpen={isUnconfirmedDateModalOpen}
        onCloseUnconfirmedDate={handleCloseUnconfirmedDate}
        onConfirmUnconfirmedDate={handleConfirmUnconfirmedDate}
        unconfirmedDateTitle={t("unconfirmedDateTitle")}
        unconfirmedDateDescription={t("unconfirmedDateDesc").replace(
          "{dateTime}",
          selectedDateTime,
        )}
        saveConfirmedDateLabel={t("saveConfirmedDate")}
        returnToDatePickerLabel={t("returnToDatePicker")}
      />
    </form>
  );
}
