import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton", className)} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <Skeleton className="mb-3 h-48 w-full rounded-xl" />
      <Skeleton className="mb-2 h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

export function SkeletonProductDetail() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="lg:w-1/2">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <div className="mt-3 flex gap-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-16 rounded-xl" />)}
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:w-1/2">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-9 w-1/3" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <SkeletonText lines={4} />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-10">
      <div className="flex flex-col gap-3 lg:w-56">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
      <div className="flex-1 flex flex-col gap-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  );
}
