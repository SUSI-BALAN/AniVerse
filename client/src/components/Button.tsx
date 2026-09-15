import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  to?: string;
  className?: string;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-background hover:bg-white",
  secondary: "border border-outline bg-surface-glass text-foreground hover:bg-white/10",
  ghost: "text-muted hover:bg-white/8 hover:text-foreground",
  danger: "bg-danger text-background hover:brightness-110"
};

export function Button({ children, variant = "primary", to, className = "", disabled, ...props }: ButtonProps) {
  const classes = `inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition duration-200 ${variants[variant]} ${disabled ? "cursor-not-allowed opacity-45" : ""} ${className}`;

  if (to && !disabled) return <Link to={to} className={classes}>{children}</Link>;
  return <button type="button" className={classes} disabled={disabled} {...props}>{children}</button>;
}
