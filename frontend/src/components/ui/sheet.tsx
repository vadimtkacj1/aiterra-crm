import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    data-slot="sheet-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-foreground/50 transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 flex flex-col gap-4 overflow-y-auto bg-card p-6 text-card-foreground shadow-xl transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
  {
    variants: {
      side: {
        start: "inset-y-0 start-0 h-full w-[360px] max-w-[calc(100vw-2rem)] border-e border-border",
        end: "inset-y-0 end-0 h-full w-[360px] max-w-[calc(100vw-2rem)] border-s border-border",
        bottom: "inset-x-0 bottom-0 max-h-[85vh] w-full rounded-t-2xl border-t border-border",
      },
    },
    defaultVariants: { side: "end" },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Accessible label for the close (X) button — required for a11y, passed by the caller (no hardcoded strings). */
  closeLabel?: string;
  /** Hide the built-in close button. */
  hideClose?: boolean;
}

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "end", className, children, closeLabel, hideClose = false, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      data-slot="sheet-content"
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      {!hideClose && (
        <SheetPrimitive.Close
          aria-label={closeLabel}
          className={cn(
            "absolute end-4 top-4 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity",
            "hover:opacity-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:pointer-events-none",
          )}
        >
          <X className="size-4" aria-hidden="true" />
        </SheetPrimitive.Close>
      )}
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="sheet-header"
    className={cn("flex flex-col gap-1.5 text-start", className)}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="sheet-footer"
    className={cn("mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    data-slot="sheet-title"
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    data-slot="sheet-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
