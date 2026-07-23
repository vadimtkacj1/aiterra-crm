import { toast as sonner } from "sonner";

/** antd `message` compat on sonner — used app-wide during/after the antd → shadcn
    migration so call sites keep the familiar API (`message.success(...)`). */
export const message = {
  success: (content: string) => void sonner.success(content),
  error: (content: string) => void sonner.error(content),
  warning: (content: string) => void sonner.warning(content),
  info: (content: string) => void sonner.info(content),
  /** Returns a dismiss function like antd's message.loading */
  loading: (content: string) => {
    const id = sonner.loading(content);
    return () => sonner.dismiss(id);
  },
};

export { sonner as toast };
