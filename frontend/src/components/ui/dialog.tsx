import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="dialog-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-foreground/50",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Accessible label for the close (X) button — required for a11y, passed by the caller (no hardcoded strings). */
  closeLabel?: string;
  /** Hide the built-in close button. */
  hideClose?: boolean;
}

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, closeLabel, hideClose = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-slot="dialog-content"
      className={cn(
        /* THE dialog rule: exactly one scroller, and it is DialogBody.
           This shell is `overflow-hidden` and owns NO padding — the header,
           body and footer each own theirs, which is what lets the header and
           footer hairlines run edge to edge instead of floating inside a
           padded box. It also means the title and the actions never scroll
           away: on a long form you can always see what you are filling in and
           always reach Save. */
        "fixed left-1/2 top-1/2 z-50 flex w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col",
        "max-h-[calc(100dvh-4rem)] overflow-hidden border border-(--ds-border-subtle) bg-card text-card-foreground",
        "rounded-2xl shadow-(--ds-shadow-modal) duration-200",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className,
      )}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className={cn(
            "absolute end-3 top-3 flex size-8 items-center justify-center rounded-input text-(--ds-text-tertiary) transition-colors",
            "hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:pointer-events-none",
          )}
        >
          <X className="size-4" aria-hidden="true" />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

/** Pinned. Never scrolls — the title has to stay readable while filling a long form. */
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-header"
    className={cn(
      "flex shrink-0 flex-col gap-1 border-b border-(--ds-border-subtle) px-5 py-3.5 pe-14 text-start",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/**
 * The dialog's ONE scroll container.
 *
 * Every long-form modal needs a scroller somewhere; the bug is having two.
 * Putting it here — and making the shell `overflow-hidden` — means there is
 * exactly one, and the chrome around it stays put.
 */
const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-body"
    className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5", className)}
    {...props}
  />
);
DialogBody.displayName = "DialogBody";

/** Pinned. The primary action is reachable at any scroll position. */
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-footer"
    className={cn(
      "flex shrink-0 flex-col-reverse gap-2 border-t border-(--ds-border-subtle) px-5 py-3.5 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    data-slot="dialog-title"
    className={cn(
      "text-[17px] font-semibold leading-snug tracking-(--ds-track-subhead)",
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    data-slot="dialog-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
