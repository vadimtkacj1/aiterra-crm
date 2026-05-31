/**
 * Renders a contract body with template variable substitution.
 *
 * Supported variables (wrap in double curly braces in the body text):
 *   signerName       — replaced with the signer's full name
 *   signerSignature  — replaced with an inline signature image
 *   signedDate       — replaced with the formatted signing date
 *
 * Before signing, each variable renders as a blank underline placeholder.
 */

import type { ReactNode } from "react";
import { tokens } from "@/styles/designSystem";

const VAR_RE = /(\{\{signerName\}\}|\{\{signerSignature\}\}|\{\{signedDate\}\})/g;

const blank = (width: number) => (
  <span
    style={{
      display: "inline-block",
      minWidth: width,
      borderBottom: `1.5px solid ${tokens.colors.border}`,
      verticalAlign: "bottom",
      margin: "0 2px",
    }}
  >
    &nbsp;
  </span>
);

export interface ContractBodyVars {
  signerName?: string | null;
  signaturePngBase64?: string | null;
  signedAt?: string | null;
}

export function renderContractBody(
  body: string,
  vars: ContractBodyVars = {},
): ReactNode {
  const parts = body.split(VAR_RE);

  const nodes: ReactNode[] = parts.map((part, i) => {
    switch (part) {
      case "{{signerName}}":
        return vars.signerName ? (
          <strong key={i} style={{ color: tokens.colors.primary }}>
            {vars.signerName}
          </strong>
        ) : (
          blank(140)
        );

      case "{{signerSignature}}":
        return vars.signaturePngBase64 ? (
          <img
            key={i}
            src={`data:image/png;base64,${vars.signaturePngBase64}`}
            alt="signature"
            style={{
              height: 48,
              maxWidth: 200,
              verticalAlign: "middle",
              margin: "0 4px",
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.sm,
              background: tokens.colors.bg,
            }}
          />
        ) : (
          blank(160)
        );

      case "{{signedDate}}":
        return vars.signedAt ? (
          <strong key={i} style={{ color: tokens.colors.primary }}>
            {new Date(vars.signedAt).toLocaleDateString()}
          </strong>
        ) : (
          blank(90)
        );

      default:
        return part.split("\n").flatMap((line, j, arr) =>
          j < arr.length - 1
            ? [line, <br key={`${i}-${j}`} />]
            : [line],
        );
    }
  });

  return <>{nodes}</>;
}

/** Hint string for the admin form label */
export const BODY_VARIABLE_HINT =
  "{{signerName}}  ·  {{signerSignature}}  ·  {{signedDate}}";
