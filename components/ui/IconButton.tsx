import type { ButtonHTMLAttributes, ReactNode } from "react";

type DataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined };

type Props = DataAttributes & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children" | "className" | "title"> & {
  label: string;
  children: ReactNode;
  className?: string;
  title?: string;
};

export function IconButton({ label, children, className, title, ...props }: Props) {
  return <button {...props} aria-label={label} className={["icon-button", className].filter(Boolean).join(" ")} title={title ?? label}>{children}</button>;
}
