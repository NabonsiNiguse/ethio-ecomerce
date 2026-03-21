import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        {...props}
        className={cn(
          "rounded-xl border px-4 py-2.5 text-sm outline-none transition",
          "bg-white text-gray-900 placeholder:text-gray-400",
          "dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500",
          "focus:ring-2 focus:ring-brand-500 focus:border-brand-500",
          error
            ? "border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-500"
            : "border-gray-200 dark:border-gray-700",
          className
        )}
      />
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
);

Input.displayName = "Input";
export default Input;
