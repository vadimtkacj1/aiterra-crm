import { Code, Copy, Link, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { confirm } from "@/lib/confirm";
import { message } from "@/lib/toast";

interface Props {
  accountId: string;
  publicToken: string | null;
  apiBaseUrl: string;
  onTokenRegenerated: (newToken: string) => void;
  regenerateToken: (accountId: string) => Promise<{ publicToken: string | null }>;
  sendTestNotification?: (accountId: string, email: string) => Promise<void>;
}

export function SiteIntegrationCard({ accountId, publicToken, apiBaseUrl, onTokenRegenerated, regenerateToken, sendTestNotification }: Props) {
  const { t } = useTranslation();
  const [regenerating, setRegenerating] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);

  const endpoint = `${apiBaseUrl}/site-leads/submit`;
  const token = publicToken ?? "…";

  const snippet = `fetch("${endpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    publicToken: "${token}",
    name: "John Doe",           // required
    phone: "+972501234567",     // optional
    email: "john@example.com",  // optional
    message: "Hello!",          // optional
    source: window.location.href, // tracks which page sent the lead
  }),
});`;

  function copyToClipboard(text: string, key: string) {
    void navigator.clipboard.writeText(text).then(() => {
      message.success(t(`site.integration.copied.${key}`));
    });
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const config = await regenerateToken(accountId);
      if (config.publicToken) {
        onTokenRegenerated(config.publicToken);
        message.success(t("site.integration.regenerated"));
      }
    } catch {
      message.error(t("site.integration.regenerateError"));
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSendTest() {
    if (!sendTestNotification || !testEmail) return;
    setTestSending(true);
    try {
      await sendTestNotification(accountId, testEmail);
      message.success(t("site.integration.testSent"));
    } catch {
      message.error(t("site.integration.testError"));
    } finally {
      setTestSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="size-4" />
          {t("site.integration.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div>
          <span className="mb-1.5 block text-sm text-muted-foreground">
            {t("site.integration.tokenLabel")}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary" className="px-2.5 py-0.5 font-mono text-[13px]">
              {token}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(token, "token")}>
              <Copy />
              {t("site.integration.copy")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={regenerating}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() =>
                confirm({
                  title: t("site.integration.regenerateConfirm"),
                  okText: t("site.integration.regenerateOk"),
                  cancelText: t("site.integration.regenerateCancel"),
                  danger: true,
                  onOk: () => void handleRegenerate(),
                })
              }
            >
              {regenerating ? <Spinner size="sm" className="text-current" /> : <RefreshCw />}
              {t("site.integration.regenerateBtn")}
            </Button>
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            {t("site.integration.tokenHint")}
          </span>
        </div>

        <div>
          <span className="mb-1.5 block text-sm text-muted-foreground">
            {t("site.integration.endpointLabel")}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="px-2 py-0.5 text-xs" dir="ltr">
              <Link />
              POST {endpoint}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(endpoint, "endpoint")}>
              <Copy />
              {t("site.integration.copy")}
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("site.integration.snippetLabel")}</span>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(snippet, "snippet")}>
              <Copy />
              {t("site.integration.copy")}
            </Button>
          </div>
          <pre
            dir="ltr"
            className="m-0 overflow-x-auto rounded-md px-4 py-3 font-mono text-xs whitespace-pre"
            style={{ background: "#1a1a2e", color: "#a8dadc" }}
          >
            {snippet}
          </pre>
        </div>

        {sendTestNotification && (
          <div>
            <span className="mb-1.5 block text-sm text-muted-foreground">
              {t("site.integration.testLabel")}
            </span>
            <div className="flex items-center gap-2">
              <Input
                placeholder="email@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-8 w-[220px] text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={testSending || !testEmail}
                onClick={() => void handleSendTest()}
              >
                {testSending ? <Spinner size="sm" className="text-current" /> : <Send />}
                {t("site.integration.testBtn")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
