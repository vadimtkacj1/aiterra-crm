import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { defaultLanguage } from "../../../i18n";

const options = [
  { value: "en", labelKey: "common.english" as const },
  { value: "he", labelKey: "common.hebrew" as const },
];

export function LanguageSwitcher(props: { variant?: "default" | "sidebar" }) {
  const { t, i18n } = useTranslation();
  const sidebar = props.variant === "sidebar";

  return (
    <Select
      value={i18n.language.startsWith("he") ? "he" : "en"}
      onValueChange={(lng) => void i18n.changeLanguage(lng ?? defaultLanguage)}
    >
      <SelectTrigger
        aria-label={t("common.language")}
        className={cn(
          "h-9",
          sidebar ? "w-full min-w-0 border-transparent bg-(--ds-surface-2)" : "w-auto min-w-32.5",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Globe aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {t(o.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
