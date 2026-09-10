import { Skeleton } from "@/shared/components/ui/skeleton";

export default function SettingsPageFallback() {
  return (
    <div
      aria-label="Loading settings"
      className="animate-pulse px-4 py-3 lg:px-0 lg:py-0"
    >
      <div className="mx-auto hidden max-w-360 px-6 pb-6 lg:block">
        <div className="mb-6 flex h-10 items-center gap-7 border-b border-border">
          {["w-20", "w-36", "w-28", "w-32", "w-24"].map((widthClass, index) => (
            <div
              key={`settings-tab-skeleton-${index}`}
              className="flex shrink-0 items-center gap-2 px-3"
            >
              <Skeleton className="size-4 rounded" />
              <Skeleton className={`h-4 ${widthClass}`} />
            </div>
          ))}
        </div>

        <div className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-surface pb-4 shadow-xs">
          <div className="w-full min-w-0 lg:max-w-xl">
            <div className="my-6 flex flex-col items-center gap-4">
              <Skeleton className="size-18 rounded-full" />
            </div>
            <section className="space-y-4 px-4 pb-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-28" />
                <div>
                  <div className="rounded-md rounded-b-none border border-border bg-surface p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                  </div>
                  <div className="rounded-md rounded-t-none border border-t-0 border-border bg-surface p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <div className="flex h-12.5 w-full items-center justify-between rounded-md border border-border bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-4 rounded" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="size-4 rounded" />
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="space-y-3 rounded-xl border border-expense/20 bg-expense-light/10 p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="mt-0.5 size-4.5 shrink-0 rounded" />
                    <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-1.5 py-4">
          <Skeleton className="h-3.5 w-64" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <div className="lg:hidden space-y-6">
        <div className="space-y-3">
          <Skeleton className="ml-1 h-3 w-24" />
          <div className="flex h-12.5 items-center justify-between rounded-xl border border-border bg-surface px-3.5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="size-4 rounded" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="ml-1 h-3 w-24" />
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            {Array.from({ length: 2 }, (_, index) => (
              <div
                key={`settings-preference-skeleton-${index}`}
                className="flex h-13 items-center justify-between px-3.5"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-7 w-32 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        {Array.from({ length: 2 }, (_, sectionIndex) => (
          <div
            className="space-y-3"
            key={`settings-menu-skeleton-${sectionIndex}`}
          >
            <Skeleton className="ml-1 h-3 w-24" />
            <div className="divide-y divide-border rounded-xl border border-border bg-surface">
              {Array.from({ length: 2 }, (_, itemIndex) => (
                <div
                  key={`settings-menu-item-skeleton-${sectionIndex}-${itemIndex}`}
                  className="flex h-12 items-center justify-between px-3.5"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-lg" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="size-4 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-col items-center justify-center gap-1.5 py-4">
          <Skeleton className="h-3.5 w-64" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
    </div>
  );
}
