import { Check } from "lucide-react";

export function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 py-1">
          <span>{item}</span>
          <Check className="mt-[3px] size-4 shrink-0 text-success" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
}
