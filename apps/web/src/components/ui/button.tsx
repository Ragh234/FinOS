import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border-border bg-white hover:bg-accent",
        ghost: "border-transparent hover:bg-accent",
        destructive: "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
      },
      size: {
        sm: "h-8 px-2 text-xs",
        default: "h-9 px-3",
        icon: "h-9 w-9 px-0"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
