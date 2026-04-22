import { FileImageOutlined, LinkOutlined, PlayCircleFilled } from "@ant-design/icons";
import { Card, Col, Empty, Flex, Modal, Row, Select, Skeleton, Statistic, Typography } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdCreative } from "../../../../domain/CampaignAnalytics";
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
      <Row gutter={[16, 16]}>
        {[0, 1, 2, 3].map((k) => (
          <Col key={k} xs={24} sm={12} lg={6}>
            <Card size="small">
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  if (!ads.length) {
    return (
      <Card size="small" styles={{ body: { padding: 24 } }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("meta.creatives.noAds")} />
      </Card>
    );
  }

  return (
    <Flex vertical gap={12}>
      {/* Sort controls */}
      <Flex align="center" gap={8}>
        <Typography.Text type="secondary" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
          {t("meta.creatives.sortBy")}:
        </Typography.Text>
        <Select<SortKey>
          value={sortBy}
          onChange={setSortBy}
          size="small"
          style={{ width: 110 }}
          options={[
            { value: "spend", label: t("meta.creatives.sortSpend") },
            { value: "results", label: t("meta.creatives.sortResults") },
            { value: "ctr", label: t("meta.creatives.sortCtr") },
          ]}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {ads.length} {ads.length === 1 ? "ad" : "ads"}
        </Typography.Text>
      </Flex>

      <Modal
        open={!!preview}
        onCancel={() => { setPreview(null); setVideoError(false); }}
        footer={null}
        centered
        width="min(90vw, 900px)"
        styles={{ body: { padding: 0, lineHeight: 0, borderRadius: 8, overflow: "hidden" } }}
        title={null}
        destroyOnHidden
      >
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
                  <PlayCircleFilled style={{ fontSize: 20 }} /> Дивитися на Facebook
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
      </Modal>

      <Row gutter={[16, 16]}>
        {sorted.map((ad) => {
          const cpr = ad.results > 0 ? (ad.spend / ad.results).toFixed(2) : null;

          return (
            <Col key={ad.adId} xs={24} sm={12} lg={6}>
              <Card
                size="small"
                cover={
                  ad.thumbnailUrl ? (
                    <div
                      onClick={() => setPreview(ad)}
                      style={{ position: "relative", height: 180, overflow: "hidden", borderRadius: "8px 8px 0 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <img
                        src={ad.thumbnailUrl}
                        alt={ad.adName}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
                      />
                      {ad.videoUrl && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)" }}>
                          <PlayCircleFilled style={{ fontSize: 48, color: "rgba(255,255,255,0.9)" }} />
                        </div>
                      )}
                      {ad.previewUrl && (
                        <a
                          href={ad.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            background: "rgba(0,0,0,0.55)",
                            borderRadius: 4,
                            padding: "2px 6px",
                            color: "#fff",
                            fontSize: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <LinkOutlined /> Preview
                        </a>
                      )}
                    </div>
                  ) : (
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        height: 180,
                        background: "var(--ant-color-fill-tertiary)",
                        borderRadius: "8px 8px 0 0",
                      }}
                    >
                      <FileImageOutlined style={{ fontSize: 40, color: "var(--ant-color-text-tertiary)" }} />
                    </Flex>
                  )
                }
                styles={{ body: { padding: 12 }, cover: { padding: 0, lineHeight: 0 } }}
              >
                <Typography.Text
                  strong
                  ellipsis={{ tooltip: ad.adName }}
                  style={{ display: "block", marginBottom: 8 }}
                >
                  {ad.adName}
                </Typography.Text>
                <Row gutter={[8, 8]}>
                  <Col span={cpr ? 8 : 12}>
                    <Statistic
                      title={<span style={{ fontSize: 10 }}>{t("analytics.stats.spend")}</span>}
                      value={ad.spend.toFixed(2)}
                      suffix={<span style={{ fontSize: 10 }}>{currency}</span>}
                      valueStyle={{ fontSize: 14 }}
                    />
                  </Col>
                  <Col span={cpr ? 8 : 12}>
                    <Statistic
                      title={<span style={{ fontSize: 10 }}>{resultLabel}</span>}
                      value={ad.results}
                      valueStyle={{ fontSize: 14, color: ad.results > 0 ? "var(--ant-color-primary)" : undefined }}
                    />
                  </Col>
                  {cpr && (
                    <Col span={8}>
                      <Statistic
                        title={<span style={{ fontSize: 10 }}>{t("meta.creatives.costPerResult")}</span>}
                        value={cpr}
                        suffix={<span style={{ fontSize: 10 }}>{currency}</span>}
                        valueStyle={{ fontSize: 14 }}
                      />
                    </Col>
                  )}
                </Row>
                <Flex gap={8} style={{ marginTop: 8 }} wrap="wrap">
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {ad.impressions.toLocaleString()} {t("analytics.stats.impressions").toLowerCase()}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>·</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {ad.clicks.toLocaleString()} {t("analytics.table.clicks").toLowerCase()}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>·</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    CTR {ad.ctr.toFixed(2)}%
                  </Typography.Text>
                </Flex>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Flex>
  );
}
