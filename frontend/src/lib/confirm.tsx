/* Imperative confirm dialog — antd `modal.confirm` compat on AlertDialog.
   Mount <ConfirmHost /> once at the app root; call `confirm({...})` anywhere. */
import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmOptions {
  title: React.ReactNode;
  content?: React.ReactNode;
  okText: string;
  cancelText: string;
  danger?: boolean;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
}

type Listener = (opts: ConfirmOptions | null) => void;
let listener: Listener | null = null;
let pending: ConfirmOptions | null = null;

/** antd modal.confirm compat. Safe to call before the host mounts (queued). */
export function confirm(opts: ConfirmOptions): void {
  if (listener) listener(opts);
  else pending = opts;
}

export function ConfirmHost() {
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    listener = setOpts;
    if (pending) {
      setOpts(pending);
      pending = null;
    }
    return () => {
      if (listener === setOpts) listener = null;
    };
  }, []);

  const close = () => {
    setOpts(null);
    setBusy(false);
  };

  return (
    <AlertDialog open={opts != null} onOpenChange={(open) => { if (!open && !busy) { opts?.onCancel?.(); close(); } }}>
      <AlertDialogContent>
        {opts && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{opts.title}</AlertDialogTitle>
              {opts.content != null && <AlertDialogDescription>{opts.content}</AlertDialogDescription>}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => { opts.onCancel?.(); close(); }}
              >
                {opts.cancelText}
              </Button>
              <Button
                variant={opts.danger ? "destructive" : "default"}
                disabled={busy}
                onClick={() => {
                  const r = opts.onOk?.();
                  if (r instanceof Promise) {
                    setBusy(true);
                    void r.finally(close);
                  } else {
                    close();
                  }
                }}
              >
                {opts.okText}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
