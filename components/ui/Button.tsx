import type { ReactNode } from "react";
import Link from "next/link";

type ButtonProps = { children: ReactNode; href?: string; variant?: "primary" | "secondary" | "ghost"; type?: "button" | "submit"; };
export function Button({ children, href, variant = "primary", type = "button" }: ButtonProps) {
  const className = `button button--${variant}`;
  return href ? <Link href={href} className={className}>{children}</Link> : <button className={className} type={type}>{children}</button>;
}