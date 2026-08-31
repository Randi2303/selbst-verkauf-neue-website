import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/shadcn-utils";

/**
 * shadcn-Baustein, von Hand auf unsere Design-Tokens gethemet:
 * Petrol als Primärfarbe, runde Pillen wie auf der Website, weiche
 * Schatten. Für den Konto-Bereich; die öffentliche Website behält ihre
 * btn-primary/btn-secondary-Klassen.
 */
const buttonVariants = cva(
  /* DRUCK-RUeCKMELDUNG: Der Knopf gibt beim Drücken minimal nach. Das
     bemerkt niemand bewusst, und genau darum geht es; ohne diese
     Rückmeldung fühlt sich vor allem auf dem Handy jeder Knopf tot an,
     bis die Antwort da ist. Klein gehalten (0,97), damit nichts
     hüpft.

     transition-all ist benannten Eigenschaften gewichen: Es hätte auch
     Größe und Position mitgezogen, sobald eine davon irgendwo
     umschlägt. */
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-[0.92rem] font-medium transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ease-swift active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-background shadow-soft hoverable:bg-primary-dark hoverable:shadow-lift",
        secondary:
          "border border-primary/25 bg-transparent text-primary hoverable:border-primary/60 hoverable:bg-surface-tint",
        ghost: "text-ink-muted hoverable:bg-surface hoverable:text-ink",
        subtle: "bg-surface text-ink hoverable:bg-surface-tint",
        destructive:
          "bg-accent-deep/10 text-accent-deep hoverable:bg-accent-deep/20",
      },
      size: {
        default: "px-5 py-2.5",
        sm: "px-4 py-2 text-[0.85rem]",
        lg: "px-7 py-3.5 text-[0.98rem]",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
