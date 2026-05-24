import { useMemo } from "react";

type PolicyKind = "cancel" | "privacy";

/**
 * Single source of truth: backend `app/legal/fragments/*.html` served at `/api/*-policy?embed=1`.
 * Vite dev proxy forwards `/api` to the FastAPI server.
 */
export function LegalPolicyIframe({ policy, title }: { policy: PolicyKind; title: string }) {
  const src = useMemo(() => {
    const path = policy === "cancel" ? "cancel-policy" : "privacy-policy";
    const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
    return `${apiBase}/${path}?embed=1`;
  }, [policy]);

  return (
    <iframe
      title={title}
      src={src}
      style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
    />
  );
}
