"use client";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useAssets } from "@/shared/lib/hooks/useAssets.hook";
import { getAssetIcon } from "@/shared/components/customs/AssetIcon";
import { EmptyAssetList } from "../../../shared/components/customs/EmptyAssetList";
import { AssetIconWrapper } from "@/shared/components/customs/AssetIconWrapper";
import { Button } from "@/shared/components/animate-ui/components/buttons/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@/shared/lib/hooks/useTranslation.hook";
import { TranslationKey } from "@/shared/lib/configs/translations.config";
import { Asset } from "@/shared/lib/types/asset.type";

const SKELETON_ASSETS = Array.from({ length: 3 }, (_, i) => i);

interface ListAssetsContainerProps {
  onAddAsset?: () => void;
  id?: string | null;
  initialAssets?: Asset[];
}

export default function ListAssetsContainer({
  onAddAsset,
  id,
  initialAssets,
}: Readonly<ListAssetsContainerProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { data: assets, isPending: isAssetsPending } = useAssets({
    initialData: initialAssets,
  });

  const handleAssetsTitleClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
  ) => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      event.preventDefault();
      router.push("/settings?tab=assets");
    }
  };

  const isLoading = isAssetsPending;

  const renderAssetsList = () => {
    if (isLoading) {
      return (
        <div className="space-y-1">
          {SKELETON_ASSETS.map((i) => (
            <div
              key={`asset-skeleton-${i}`}
              className="flex items-center justify-between bg-surface px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-secondary transition-colors border-l-4 border-border"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9.5 w-9.5 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="size-4 rounded" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (assets) {
      const activeAssets = assets.filter((a) => !a.isArchived);
      if (activeAssets.length > 0) {
        return (
          <div className="space-y-1">
            {activeAssets.map((asset) => (
              <motion.div
                key={asset.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={`/assets?id=${asset.id}&name=${encodeURIComponent(asset.name)}`}
                  className="flex items-center justify-between bg-surface px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-secondary transition-colors border-l-4"
                  style={{
                    borderLeftColor: asset.color || "transparent",
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3 mr-4">
                    <AssetIconWrapper color={asset.color}>
                      {getAssetIcon(asset.type, asset.color)}
                    </AssetIconWrapper>
                    <div className="flex min-w-0 flex-col text-primary-text">
                      <span className="truncate text-base font-semibold">
                        {asset.name}
                      </span>
                      <span className="text-xs">
                        {t(`assetType${asset.type}` as TranslationKey)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="font-semibold text-base text-primary-text">
                      ฿
                      {asset.balance.toLocaleString(locale, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <ChevronRight size={18} className="text-disabled-text" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        );
      }
    }

    return <EmptyAssetList onAddAsset={onAddAsset} />;
  };

  return (
    <>
      {id === undefined && pathname === "/assets" ? (
        <section className="px-4 my-2">{renderAssetsList()}</section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/assets"
                onClick={handleAssetsTitleClick}
                className="text-lg font-medium hover:text-primary transition-colors cursor-pointer flex items-center gap-1 group"
              >
                {t("assetsTitle")}
                <ChevronRight
                  size={18}
                  className="text-disabled-text group-hover:text-primary transition-colors"
                />
              </Link>
            </motion.div>
            <Button
              variant="unstyled"
              type="button"
              className="flex items-center justify-center bg-surface-secondary hover:bg-border transition-colors p-1 rounded-full cursor-pointer"
              onClick={onAddAsset}
              aria-label={t("addAsset")}
            >
              <Plus size={18} className="text-secondary-text" />
            </Button>
          </div>

          {renderAssetsList()}
        </section>
      )}
    </>
  );
}
