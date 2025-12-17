"use client";

import { useEffect, useState } from "react";
import { CheckIcon, Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type ToastProps = {
  toast: Toast;
  onDismiss: (id: string) => void;
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setIsVisible(true);

    // Auto-dismiss after duration (default 5 seconds)
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for fade-out animation before removing
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckIcon className="h-5 w-5" />;
      case "error":
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-rose-50 border-rose-200 text-rose-800";
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300",
        getStyles(),
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
      )}
      role="alert"
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 rounded p-1 hover:bg-black/10 transition-colors"
        aria-label="Dismiss"
      >
        <Cross2Icon className="h-4 w-4" />
      </button>
    </div>
  );
}

type ToastContainerProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

