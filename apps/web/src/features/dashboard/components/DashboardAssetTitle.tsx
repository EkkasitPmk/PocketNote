"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import DashboardAssetTitleMotion from "./DashboardAssetTitleMotion";
import {
  translations,
  type Language,
} from "@/shared/lib/configs/translations.config";

export default function DashboardAssetTitle({
  language,
}: Readonly<{ language: Language }>) {
  const router = useRouter();
  const title =
    translations[language].assetsTitle ?? translations.en.assetsTitle;

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      event.preventDefault();
      router.push("/settings?tab=assets");
    }
  };

  return (
    <DashboardAssetTitleMotion>
      <Link
        href="/assets"
        onClick={handleClick}
        className="text-lg font-medium hover:text-primary transition-colors cursor-pointer flex items-center gap-1 group"
      >
        {title}
        <ChevronRight
          size={18}
          className="text-disabled-text group-hover:text-primary transition-colors"
        />
      </Link>
    </DashboardAssetTitleMotion>
  );
}
