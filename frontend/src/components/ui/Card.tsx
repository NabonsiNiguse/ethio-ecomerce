import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children?: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className, hover = false }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-sm",
        "dark:border-gray-800 dark:bg-gray-900",
        hover && "transition hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}
