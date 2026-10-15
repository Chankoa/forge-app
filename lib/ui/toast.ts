export type ToastKind = "success" | "neutral";
export type ToastMessage = { id: number; message: string; kind: ToastKind };

export const toastEventName = "forge:toast";
let nextToastId = 0;

export function appendToast(current: ToastMessage[], toast: ToastMessage) {
  return [...current.slice(-2), toast];
}

export function removeToast(current: ToastMessage[], id: number) {
  return current.filter((toast) => toast.id !== id);
}

export function dispatchToast(message: string, kind: ToastKind = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastMessage>(toastEventName, {
    detail: { id: ++nextToastId, message, kind },
  }));
}
