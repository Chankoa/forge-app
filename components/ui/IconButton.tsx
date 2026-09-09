import type { ButtonHTMLAttributes, ReactNode } from "react";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode };
export function IconButton({ label, children, ...props }: Props) { return <button className="icon-button" aria-label={label} title={label} {...props}>{children}</button>; }