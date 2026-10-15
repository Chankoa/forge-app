"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Info, X } from "lucide-react";
import { appendToast, removeToast, toastEventName, type ToastMessage } from "@/lib/ui/toast";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef(new Map<number, number>());

  useEffect(() => {
    const activeTimers = timers.current;
    const remove = (id: number) => {
      setToasts((current) => removeToast(current, id));
      const timer = timers.current.get(id);
      if (timer !== undefined) window.clearTimeout(timer);
      timers.current.delete(id);
    };
    const onToast = (event: Event) => {
      const toast = (event as CustomEvent<ToastMessage>).detail;
      if (!toast?.message.trim()) return;
      setToasts((current) => appendToast(current, toast));
      timers.current.set(toast.id, window.setTimeout(() => remove(toast.id), 4000));
    };
    window.addEventListener(toastEventName, onToast);
    return () => {
      window.removeEventListener(toastEventName, onToast);
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  return <>
    {children}
    <div className="product-toasts" aria-live="polite" aria-relevant="additions text" aria-atomic="false">
      {toasts.map((toast) => <div className={`product-toast product-toast--${toast.kind}`} key={toast.id} role="status">
        {toast.kind === "success" ? <Check size={17} aria-hidden="true" /> : <Info size={17} aria-hidden="true" />}
        <span>{toast.message}</span>
        <button type="button" aria-label="Fermer la notification" onClick={() => {
          setToasts((current) => removeToast(current, toast.id));
          const timer = timers.current.get(toast.id);
          if (timer !== undefined) window.clearTimeout(timer);
          timers.current.delete(toast.id);
        }}><X size={15} aria-hidden="true" /></button>
      </div>)}
    </div>
  </>;
}
