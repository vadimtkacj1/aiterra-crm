import { CirclePlay, FileImage, Link as LinkIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdCreative } from "@/domain/CampaignAnalytics";
import { EmptyState } from "@/ui/shared/components/EmptyState";
import { classifyCampaignObjective } from "../utils/campaignObjective";

interface CampaignCreativeGalleryProps {
  ads: AdCreative[];
  currency: string;
  loading?: boolean;
  objective?: string;
}

function resultsLabel(objective: string, t: (key: string) => string): string {
  const k = classifyCampaignObjective(objective);
  switch (k) {
    case "leads":
      return t("meta.result.leads");
    case "sales":
      return t("meta.deepdive.purchases");
    case "engagement":
      return t("meta.result.engagements");
    case "traffic":
      return t("meta.result.linkClicks");
    default:
      return t("meta.creatives.resultsGeneric");
  }
}

function MiniStat({
  label,
  value,
  suffix,
  valueClassName,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  suffix?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium tabular-nums ${valueClassName ?? ""}`}>
        {value}
        {suffix ? <span className="ms-1 text-[10px]">{suffix}</span> : null}
      </div>
    </div>
  );
}

type SortKey = "spend" | "results" | "ctr";

export function CampaignCreativeGallery({ ads, currency, loading, objective = "" }: CampaignCreativeGalleryProps) {
  const { t } = useTranslation();
  const resultLabel = resultsLabel(objective, t);
  const [sortBy, setSortBy] = useState<SortKey>("spend");
  const [preview, setPreview] = useState<AdCreative | null>(null);
  const [videoError, setVideoError] = useState(false);

  const sorted = useMemo(() => {
    return [...ads].sort((a, b) => {
      if (sortBy === "spend") return b.spend - a.spend;
      if (sortBy === "results") return b.results - a.results;
      if (sortBy === "ctr") return b.ctr - a.ctr;
      return 0;
    });
  }, [ads, sortBy]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((k) => (
          <Card key={k} className="p-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!ads.length) {
    return (
      <Card className="p-6">
        <EmptyState title={t("meta.creatives.noAds")} style={{ padding: "8px 0" }} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-[13px] text-muted-foreground">
          {t("meta.creatives.sortBy")}:
        </span>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="h-8 w-32 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spend">{t("meta.creatives.sortSpend")}</SelectItem>
            <SelectItem value="results">{t("meta.creatives.sortResults")}</SelectItem>
            <SelectItem value="ctr">{t("meta.creatives.sortCtr")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {ads.length} {ads.length === 1 ? t("meta.creatives.adSingular") : t("meta.creatives.adPlural")}
        </span>
      </div>

      {/* Lightbox */}
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) {
            setPreview(null);
            setVideoError(false);
          }
        }}
      >
        <DialogContent
          closeLabel={t("common.close")}
          className="w-[min(90vw,900px)] max-w-none gap-0 overflow-hidden rounded-lg border-none p-0 leading-none"
        >
          <DialogTitle className="sr-only">{preview?.adName ?? ""}</DialogTitle>
          {preview && (
            preview.videoUrl && !videoError ? (
              <div style={{ lineHeight: 0, background: "#000", borderRadius: 8 }}>
                <video
                  key={preview.adId}
                  src={preview.videoUrl}
                  poster={preview.thumbnailUrl}
                  controls
                  autoPlay
                  style={{ display: "block", width: "100%", maxHeight: "80vh" }}
                  onError={() => setVideoError(true)}
                />
              </div>
            ) : preview.videoUrl && videoError && preview.permalinkUrl ? (
              <div style={{ position: "relative", lineHeight: 0, borderRadius: 8, overflow: "hidden" }}>
                <img
                  src={preview.thumbnailUrl}
                  alt={preview.adName}
                  style={{ display: "block", width: "100%", maxHeight: "80vh", objectFit: "cover", filter: "brightness(0.5)" }}
                />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                  <a
                    href={preview.permalinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "#1877f2", color: "#fff", borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: "none" }}
                  >
                    <CirclePlay aria-hidden="true" style={{ width: 20, height: 20 }} /> {t("meta.creatives.watchOnFacebook")}
                  </a>
                </div>
              </div>
            ) : (
              <img
                src={preview.thumbnailUrl}
                alt={preview.adName}
                style={{ display: "block", maxWidth: "100%", maxHeight: "85vh", margin: "0 auto", borderRadius: 8 }}
              />
            )
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sorted.map((ad) => {
          const cpr = ad.results > 0 ? (ad.spend / ad.results).toFixed(2) : null;

          return (
            <Card key={ad.adId} className="overflow-hidden">
              {ad.thumbnailUrl ? (
                <div
                  onClick={() => setPreview(ad)}
                  className="relative flex h-45 cursor-pointer items-center justify-center overflow-hidden"
                >
                  <img
                    src={ad.thumbnailUrl}
                    alt={ad.adName}
                    className="block max-h-full max-w-full object-contain"
                  />
                  {ad.videoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <CirclePlay aria-hidden="true" className="size-12 text-white/90" />
                    </div>
                  )}
                  {ad.previewUrl && (
                    <a
                      href={ad.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute end-2 top-2 flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-xs text-white"
                    >
                      <LinkIcon aria-hidden="true" className="size-3" /> {t("common.preview")}
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex h-45 items-center justify-center bg-muted">
                  <FileImage aria-hidden="true" className="size-10 text-muted-foreground" strokeWidth={1.5} />
                </div>
              )}
              <div className="p-3">
                <span
                  className="mb-2 block truncate font-semibold"
                  title={ad.adName}
                >
                  {ad.adName}
                </span>
                <div className={`grid gap-2 ${cpr ? "grid-cols-3" : "grid-cols-2"}`}>
                  <MiniStat
                    label={t("analytics.stats.spend")}
                    value={ad.spend.toFixed(2)}
                    suffix={currency}
                  />
                  <MiniStat
                    label={resultLabel}
                    value={ad.results}
                    valueClassName={ad.results > 0 ? "text-primary" : ""}
                  />
                  {cpr && (
                    <MiniStat
                      label={t("meta.creatives.costPerResult")}
                      value={cpr}
                      suffix={currency}
                    />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {ad.impressions.toLocaleString()} {t("analytics.stats.impressions").toLowerCase()}
                  </span>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {ad.clicks.toLocaleString()} {t("analytics.table.clicks").toLowerCase()}
                  </span>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    CTR {ad.ctr.toFixed(2)}%
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
