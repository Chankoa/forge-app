import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost";
type NextLinkProps = ComponentProps<typeof Link>;
type DataAttributes = { [key: `data-${string}`]: string | number | boolean | undefined };

type SharedProps = DataAttributes & {
  children: ReactNode;
  className?: string;
  variant?: Variant;
};

type NativeButtonProps = SharedProps & ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: never;
};

type LinkButtonProps = SharedProps & Omit<NextLinkProps, "children" | "className" | "href" | "type"> & {
  href: NextLinkProps["href"];
  /** Renders a non-interactive element so a disabled link cannot navigate. */
  disabled?: boolean;
  type?: never;
};

export type ButtonProps = NativeButtonProps | LinkButtonProps;

function buttonClassName(variant: Variant, className?: string) {
  return ["button", `button--${variant}`, className].filter(Boolean).join(" ");
}

function isLinkButton(props: ButtonProps): props is LinkButtonProps {
  return typeof props.href !== "undefined";
}

export function Button(props: ButtonProps) {
  if (isLinkButton(props)) {
    const {
      children,
      className,
      disabled = false,
      href,
      variant = "primary",
      ...linkProps
    } = props;
    const classes = buttonClassName(variant, className);

    if (disabled) {
      const {
        onNavigate: _onNavigate,
        onAuxClick: _onAuxClick,
        onClick: _onClick,
        prefetch: _prefetch,
        replace: _replace,
        scroll: _scroll,
        tabIndex: _tabIndex,
        transitionTypes: _transitionTypes,
        ref: _ref,
        ...anchorProps
      } = linkProps;
      void _onNavigate;
      void _onAuxClick;
      void _onClick;
      void _prefetch;
      void _replace;
      void _scroll;
      void _tabIndex;
      void _transitionTypes;
      void _ref;
      return <span {...anchorProps} aria-disabled="true" className={classes}>{children}</span>;
    }

    return <Link {...linkProps} className={classes} href={href}>{children}</Link>;
  }

  const { children, className, href: _href, type = "button", variant = "primary", ...buttonProps } = props;
  void _href;
  return <button {...buttonProps} className={buttonClassName(variant, className)} type={type}>{children}</button>;
}
