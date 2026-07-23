import * as React from "react";
import { Upload } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadButtonProps extends Omit<ButtonProps, "onClick" | "asChild"> {
  /** Passed to the hidden file input, e.g. "image/*" or ".pdf". */
  accept?: string;
  onFile: (file: File) => void;
  icon?: React.ReactNode;
}

const UploadButton = React.forwardRef<HTMLButtonElement, UploadButtonProps>(
  (
    { accept, onFile, icon, disabled, children, className, variant = "outline", ...props },
    ref,
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
      // Reset so selecting the same file again re-fires onChange.
      e.target.value = "";
    };

    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={handleChange}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
        <Button
          ref={ref}
          type="button"
          variant={variant}
          disabled={disabled}
          className={cn(className)}
          onClick={() => inputRef.current?.click()}
          data-slot="upload-button"
          {...props}
        >
          {icon ?? <Upload className="size-4" aria-hidden="true" />}
          {children}
        </Button>
      </>
    );
  },
);
UploadButton.displayName = "UploadButton";

export { UploadButton };
