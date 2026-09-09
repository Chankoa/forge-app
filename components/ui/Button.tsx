import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; href?: string; variant?: "primary" | "secondary" | "ghost"; };
export function Button({ children, href, variant = "primary", type = "button", ...props }: ButtonProps) {
  const className = `button button--${variant}`;
  return href ? <Link href={href} className={className}>{children}</Link> : <button className={className} type={type} {...props}>{children}</button>;
}