import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  FileText,
  MinusCircle,
  Plus,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, type DefaultValues } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Form, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputNumber } from "@/components/ui/input-number";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { UploadButton } from "@/components/ui/upload-button";
import { confirm } from "@/lib/confirm";
import { message } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useApp } from "../../../../app/AppProviders";
import type { Contract } from "../../../../domain/Contract";
import type { SubscriptionStatus } from "../../../../services/admin/AdminService";
import { AppModal } from "../../../shared/components/AppModal";
import { EmptyState } from "../../../shared/components/EmptyState";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponsiveCardView, useMobileView } from "../../../shared/components/ResponsiveCardView";
import { TableActionButton } from "../../../shared/components/TableActionButton";
import { renderContractBody } from "../../user/contracts/components/contractBodyRenderer";
import { PdfViewer } from "../../user/contracts/components/PdfViewer";
import { SubscriptionPaymentHistory } from "../../user/subscriptions/components/SubscriptionPaymentHistory";
import { formatMoney } from "../payments/billingUi";
import { ContractRowActions } from "./ContractRowActions";
import { SubscriptionStatusModal } from "./SubscriptionStatusModal";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtMoney(amount: number, currency: string) {
  return formatMoney(amount, currency || "ILS");
}

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

function statusCfg(status: Contract["status"]): [BadgeVariant, string] {
  const map: Record<string, [BadgeVariant, string]> = {
    draft: ["default", "admin.contracts.status.draft"],
    pending_signature: ["processing", "admin.contracts.status.pending_signature"],
    signed: ["success", "admin.contracts.status.signed"],
    voided: ["error", "admin.contracts.status.voided"],
  };
  return map[status] ?? ["default", status];
}

function stageCfg(status: string): [BadgeVariant, string] {
  const map: Record<string, [BadgeVariant, string]> = {
    pending: ["default", "admin.contracts.stageStatus.pending"],
    invoiced: ["processing", "admin.contracts.stageStatus.invoiced"],
    paid: ["success", "admin.contracts.stageStatus.paid"],
  };
  return map[status] ?? ["default", status];
}

function getPaidCount(c: Contract) {
  return c.stages.filter((s) => s.status === "paid").length;
}
function getPaidAmount(c: Contract) {
  return c.stages.filter((s) => s.status === "paid").reduce((sum, s) => sum + (s.amount ?? 0), 0);
}

function splitEqual(totalMajor: number, count: number): number[] {
  if (count < 1 || totalMajor <= 0) return [];
  const cents = Math.round(totalMajor * 100);
  const base = Math.floor(cents / count);
  let rem = cents - base * count;
  return Array.from({ length: count }, () => {
    const add = rem > 0 ? 1 : 0;
    if (rem > 0) rem -= 1;
    return (base + add) / 100;
  });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      resolve(r.includes(",") ? r.split(",")[1] : r);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── types ──────────────────────────────────────────────────────────────────

interface StageRow {
  description: string;
  amount: number | null;
}

interface FormValues {
  accountId: number;
  title: string;
  body: string;
  currency: string;
  stages: StageRow[];
  isSubscription: boolean;
  monthlyAmount?: number | null;
  subscriptionMonths?: number | null;
  billingDay?: number | null;
  hasOneTime?: boolean;
  oneTimeAmount?: number | null;
  oneTimeDescription?: string;
}

const CREATE_DEFAULTS: DefaultValues<FormValues> = {
  title: "",
  body: "",
  currency: "ILS",
  stages: [{ description: "", amount: null }],
  isSubscription: false,
  hasOneTime: false,
  oneTimeDescription: "",
  oneTimeAmount: null,
};

// ─── small presentational bits ──────────────────────────────────────────────

function StepChip({ n }: { n: number }) {
  return (
    <div className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-(--ds-color-primary) text-[11px] font-bold text-white">
      {n}
    </div>
  );
}

// ─── component ──────────────────────────────────────────────────────────────

export function AdminContractsPage() {
  const { t } = useTranslation();
  const { services, users } = useApp();
  const isMobile = useMobileView();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailContract, setDetailContract] = useState<Contract | null>(null);
  const [subscriptionContractId, setSubscriptionContractId] = useState<number | null>(null);
  const [detailSubStatus, setDetailSubStatus] = useState<SubscriptionStatus | null>(null);
  const [expandedPayments, setExpandedPayments] = useState<Record<number, SubscriptionStatus>>({});
  const [expandedLoading, setExpandedLoading] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [splitTotal, setSplitTotal] = useState<number | null>(null);
  const [splitParts, setSplitParts] = useState<number>(2);
  /** Equal-split helper is an advanced utility — hidden until requested. */
  const [splitOpen, setSplitOpen] = useState(false);
  const [search, setSearch] = useState("");

  const form = useForm<FormValues>({ defaultValues: CREATE_DEFAULTS });
  const stagesArray = useFieldArray({ control: form.control, name: "stages" });

  // Live form values driving conditional UI + totals (replaces antd shouldUpdate)
  const isSubscription = form.watch("isSubscription");
  const hasOneTime = form.watch("hasOneTime");
  const watchedStages = form.watch("stages");
  const watchedCurrency = form.watch("currency") ?? "ILS";
  const watchedMonthly = form.watch("monthlyAmount");
  const watchedMonths = form.watch("subscriptionMonths");
  const watchedBillingDay = form.watch("billingDay");
  const watchedOneTimeAmt = form.watch("oneTimeAmount");

  const filteredContracts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) => {
      const u = users.find((x) => x.accountId === c.accountId);
      return (
        (c.title ?? "").toLowerCase().includes(q) ||
        (u?.displayName ?? "").toLowerCase().includes(q) ||
        (u?.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [contracts, users, search]);

  const clientOptions = useMemo(
    () =>
      users
        .filter((u) => u.role !== "admin" && u.accountId != null && u.accountId > 0)
        .map((u) => ({
          value: String(u.accountId),
          label: u.displayName || u.email,
          search: `${u.displayName ?? ""} ${u.email ?? ""}`,
        })),
    [users],
  );

  const reload = () => {
    setLoading(true);
    services.admin
      .listContracts()
      .then(setContracts)
      .catch(() => void message.error(t("errors.generic")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRowExpand = (expanded: boolean, contract: Contract) => {
    if (!expanded || !contract.monthlyAmount || contract.monthlyAmount <= 0) return;
    if (expandedPayments[contract.id]) return;
    setExpandedLoading((prev) => ({ ...prev, [contract.id]: true }));
    services.admin
      .getContractSubscriptionStatus(contract.id)
      .then((status) => setExpandedPayments((prev) => ({ ...prev, [contract.id]: status })))
      .catch(() => {})
      .finally(() => setExpandedLoading((prev) => ({ ...prev, [contract.id]: false })));
  };

  useEffect(() => {
    if (detailContract?.monthlyAmount && detailContract.monthlyAmount > 0) {
      services.admin
        .getContractSubscriptionStatus(detailContract.id)
        .then(setDetailSubStatus)
        .catch(() => setDetailSubStatus(null));
    } else {
      setDetailSubStatus(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailContract?.id]);

  const signUrl = (c: Contract) => `${window.location.origin}/contracts/sign/${c.signToken}`;
  const paymentUrl = (c: Contract) => `${window.location.origin}/contracts/sign/${c.signToken}/pay`;

  const copyLink = async (c: Contract) => {
    await navigator.clipboard.writeText(signUrl(c));
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyPaymentLink = async (c: Contract) => {
    await navigator.clipboard.writeText(paymentUrl(c));
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (c: Contract) => {
    try {
      const updated = await services.admin.sendContract(c.id);
      setContracts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      void message.success(t("admin.contracts.sentSuccess"));
    } catch (e) {
      void message.error(e instanceof Error ? e.message : t("errors.generic"));
    }
  };

  const handleVoid = (c: Contract) => {
    confirm({
      title: t("admin.contracts.voidConfirmTitle"),
      content: t("admin.contracts.voidConfirmContent"),
      danger: true,
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      onOk: async () => {
        try {
          const updated = await services.admin.voidContract(c.id);
          setContracts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
          void message.success(t("admin.contracts.voidedSuccess"));
        } catch (e) {
          void message.error(e instanceof Error ? e.message : t("errors.generic"));
        }
      },
    });
  };

  const handleDelete = (c: Contract) => {
    confirm({
      title: t("admin.contracts.deleteConfirmTitle"),
      content:
        c.status === "signed"
          ? t("admin.contracts.deleteSignedConfirmContent")
          : t("admin.contracts.deleteConfirmContent"),
      danger: true,
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      onOk: async () => {
        try {
          await services.admin.deleteContract(c.id);
          setContracts((prev) => prev.filter((x) => x.id !== c.id));
          void message.success(t("admin.contracts.deletedSuccess"));
        } catch (e) {
          void message.error(e instanceof Error ? e.message : t("errors.generic"));
        }
      },
    });
  };

  const resetCreateForm = () => {
    setCreateOpen(false);
    form.reset(CREATE_DEFAULTS);
    setPdfBase64(null);
    setPdfFileName(null);
    setSplitTotal(null);
    setSplitParts(2);
  };

  const applyEqualSplit = () => {
    if (splitTotal == null || splitTotal <= 0 || splitParts < 2) {
      void message.warning(t("admin.contracts.form.equalSplitInvalid"));
      return;
    }
    const doApply = () => {
      const amounts = splitEqual(splitTotal, splitParts);
      stagesArray.replace(
        amounts.map((amount, i) => ({
          description: t("admin.contracts.form.equalStageLabel", { current: i + 1, total: splitParts }),
          amount,
        })),
      );
      void message.success(t("admin.contracts.form.equalSplitApplied"));
    };
    const currentStages: StageRow[] = form.getValues("stages") ?? [];
    const hasData = currentStages.some((s) => s.description?.trim() || (s.amount && s.amount > 0));
    if (hasData) {
      confirm({
        title: t("admin.contracts.form.equalSplitConfirmTitle"),
        content: t("admin.contracts.form.equalSplitConfirmContent"),
        okText: t("admin.contracts.form.equalSplitConfirmOk"),
        cancelText: t("common.cancel"),
        onOk: doApply,
      });
    } else {
      doApply();
    }
  };

  const handlePdfFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      void message.error(t("admin.contracts.form.pdfSizeError"));
      return;
    }
    readFileAsBase64(file)
      .then((b64) => {
        setPdfBase64(b64);
        setPdfFileName(file.name);
        form.setValue("body", "");
      })
      .catch(() => void message.error(t("errors.generic")));
  };

  const handleCreate = async (values: FormValues) => {
    // For subscriptions, the subscription stage is auto-generated; optional one-time stages are passed separately
    if (values.isSubscription) {
      if (!values.monthlyAmount || values.monthlyAmount <= 0) {
        void message.error(t("admin.contracts.form.monthlyAmountRequired"));
        return;
      }
      const oneTimeStages: { description: string; amount: number }[] = [];
      if (values.hasOneTime && values.oneTimeAmount && values.oneTimeAmount > 0) {
        oneTimeStages.push({
          description: (values.oneTimeDescription?.trim() || t("admin.contracts.form.oneTimeDefaultDescription")),
          amount: values.oneTimeAmount,
        });
      }
      setCreating(true);
      try {
        const created = await services.admin.createContract({
          accountId: values.accountId,
          title: values.title,
          body: values.body ?? "",
          currency: values.currency ?? "ILS",
          pdfBase64: pdfBase64 ?? null,
          stages: oneTimeStages,
          isSubscription: true,
          monthlyAmount: values.monthlyAmount,
          subscriptionMonths: values.subscriptionMonths || null,
          billingDay: values.billingDay || null,
        });
        setContracts((prev) => [created, ...prev]);
        resetCreateForm();
        void message.success(t("admin.contracts.createdSuccess"));
      } catch (e) {
        void message.error(e instanceof Error ? e.message : t("errors.generic"));
      } finally {
        setCreating(false);
      }
      return;
    }

    // For one-time payments, validate manual stages
    const validStages = (values.stages ?? []).filter(
      (s) => s.description?.trim() && s.amount && s.amount > 0,
    );
    if (!validStages.length) {
      void message.error(t("admin.contracts.form.stagesRequired"));
      return;
    }
    setCreating(true);
    try {
      const created = await services.admin.createContract({
        accountId: values.accountId,
        title: values.title,
        body: values.body ?? "",
        currency: values.currency ?? "ILS",
        pdfBase64: pdfBase64 ?? null,
        stages: validStages as { description: string; amount: number }[],
        isSubscription: false,
        monthlyAmount: null,
        subscriptionMonths: null,
      });
      setContracts((prev) => [created, ...prev]);
      resetCreateForm();
      void message.success(t("admin.contracts.createdSuccess"));
    } catch (e) {
      void message.error(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setCreating(false);
    }
  };

  // ─── table ────────────────────────────────────────────────────────────────

  const columns: DataTableColumn<Contract>[] = [
    {
      title: t("admin.contracts.columns.account"),
      key: "account",
      render: (_, r) => {
        const u = users.find((x) => x.accountId === r.accountId);
        return (
          <div>
            <div className="font-semibold">{u?.displayName || `Account #${r.accountId}`}</div>
            {u?.email && <div className="text-xs text-(--ds-text-tertiary)">{u.email}</div>}
          </div>
        );
      },
    },
    {
      title: t("admin.contracts.columns.title"),
      key: "title",
      render: (_, r) => (
        <div>
          <span className="font-semibold">{r.title}</span>
          {r.monthlyAmount && r.monthlyAmount > 0 && (
            <div className="mt-1">
              <Badge variant="processing" className="text-[11px]">
                {!r.subscriptionMonths
                  ? t("admin.contracts.subscriptionTagOpenEnded", {
                      amount: fmtMoney(r.monthlyAmount, r.currency),
                    })
                  : t("admin.contracts.subscriptionTag", {
                      amount: fmtMoney(r.monthlyAmount, r.currency),
                      months: r.subscriptionMonths,
                    })}
              </Badge>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t("admin.contracts.columns.total"),
      key: "total",
      align: "end",
      onCell: () => ({ className: "tabular-nums" }),
      render: (_, r) => {
        const paidCount = getPaidCount(r);
        const total = r.stages.length;
        const paidAmt = getPaidAmount(r);
        return (
          <div className="text-end">
            <div className="font-semibold">{fmtMoney(r.totalAmount, r.currency)}</div>
            <div className="mt-0.5 text-xs text-(--ds-text-tertiary)">
              {paidCount === total && total > 0
                ? t("admin.contracts.installmentsTag.paid", { paid: paidCount, total })
                : paidCount === 0
                ? t("admin.contracts.installmentsTag.unpaid")
                : `${fmtMoney(paidAmt, r.currency)} ${t("admin.contracts.installmentsTag.partial", { paid: paidCount, total })}`}
            </div>
          </div>
        );
      },
    },
    {
      title: t("admin.contracts.columns.status"),
      key: "status",
      width: 150,
      render: (_, r) => {
        const [variant, key] = statusCfg(r.status);
        return (
          <div>
            <Badge variant={variant}>{t(key)}</Badge>
            {r.signedAt && (
              <div className="mt-1 text-[11px] text-(--ds-text-tertiary)">
                {new Date(r.signedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 100,
      render: (_, r) => (
        <ContractRowActions
          contract={r}
          copiedId={copiedId}
          onView={setDetailContract}
          onCopyLink={(c) => void copyLink(c)}
          onCopyPaymentLink={(c) => void copyPaymentLink(c)}
          onSubscription={setSubscriptionContractId}
          onSend={(c) => void handleSend(c)}
          onVoid={handleVoid}
          onDelete={handleDelete}
        />
      ),
    },
  ];

  // ─── create modal ─────────────────────────────────────────────────────────

  const createFooter = (
    <div className="flex w-full items-center justify-between">
      <Button variant="outline" onClick={resetCreateForm}>{t("common.cancel")}</Button>
      <Button
        disabled={creating}
        onClick={() => void form.handleSubmit(handleCreate)()}
      >
        {creating && <Spinner size="sm" className="text-current" aria-hidden="true" />}
        {t("admin.contracts.form.submit")}
      </Button>
    </div>
  );

  // Card styles for the payment-type selector
  const typeCardClass = (active: boolean) =>
    cn(
      "relative cursor-pointer select-none rounded-lg border p-4 transition-[border-color,box-shadow,background-color] duration-150",
      active
        ? "border-(--ds-color-primary) bg-(--ds-color-primary-surface) shadow-(--ds-shadow-focus)"
        : "border-(--ds-border-subtle) bg-(--ds-surface-0)",
    );

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.contracts.title")}
        subtitle={t("admin.contracts.subtitle")}
      />

      <Card className={isMobile ? "p-4" : "p-6"}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className={cn("relative max-w-full", isMobile ? "w-40" : "w-70")}>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 inset-s-3 my-auto size-4 text-muted-foreground"
            />
            <Input
              className="ps-9 pe-8"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label={t("common.cancel")}
                onClick={() => setSearch("")}
                className="absolute inset-y-0 inset-e-2 my-auto flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />
            {!isMobile && t("admin.contracts.create")}
          </Button>
        </div>
        {isMobile ? (
          <ResponsiveCardView
            items={filteredContracts.map((c) => {
              const u = users.find((x) => x.accountId === c.accountId);
              const [statusColor, statusKey] = statusCfg(c.status);
              const paidCount = getPaidCount(c);
              const total = c.stages.length;

              return {
                id: c.id,
                title: c.title,
                subtitle: u?.displayName || `Account #${c.accountId}`,
                description: u?.email,
                tags: [
                  { label: t(statusKey), color: statusColor },
                  ...(c.monthlyAmount && c.monthlyAmount > 0
                    ? [{
                        label: !c.subscriptionMonths
                          ? t("admin.contracts.subscriptionTagOpenEnded", {
                              amount: fmtMoney(c.monthlyAmount, c.currency),
                            })
                          : t("admin.contracts.subscriptionTag", {
                              amount: fmtMoney(c.monthlyAmount, c.currency),
                              months: c.subscriptionMonths,
                            }),
                        color: "blue",
                      }]
                    : []),
                ],
                extra: (
                  <div className="text-end">
                    <span className="text-sm font-semibold">
                      {fmtMoney(c.totalAmount, c.currency)}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {paidCount === total && total > 0
                        ? t("admin.contracts.installmentsTag.paid", { paid: paidCount, total })
                        : paidCount === 0
                        ? t("admin.contracts.installmentsTag.unpaid")
                        : `${paidCount}/${total}`}
                    </span>
                  </div>
                ),
                actions: [
                  {
                    label: t("common.view"),
                    onClick: () => setDetailContract(c),
                    type: "default" as const,
                  },
                ],
              };
            })}
            loading={loading}
            emptyText={t("common.noData")}
          />
        ) : (
          <DataTable<Contract>
            columns={columns}
            dataSource={filteredContracts}
            rowKey="id"
            loading={loading}
            size="middle"
            locale={{
              emptyText: search ? (
                <EmptyState title={t("common.noData")} />
              ) : (
                <EmptyState
                  title={t("admin.contracts.empty.title")}
                  description={t("admin.contracts.empty.description")}
                  action={{ label: t("admin.contracts.create"), onClick: () => setCreateOpen(true) }}
                />
              ),
            }}
            pagination={{ pageSize: 20, showTotal: (n) => t("admin.contracts.totalCount", { count: n }) }}
            expandable={{
              rowExpandable: (c) => !!(c.monthlyAmount && c.monthlyAmount > 0),
              onExpand: handleRowExpand,
              expandedRowRender: (c) => {
                const status = expandedPayments[c.id];
                const isLoading = expandedLoading[c.id];
                return (
                  <div className="px-4 pb-4 pt-2">
                    {isLoading ? (
                      <Spinner size="sm" />
                    ) : !status || status.payments.length === 0 ? (
                      <span className="text-[13px] text-muted-foreground">
                        {t("admin.contracts.noPaymentHistory")}
                      </span>
                    ) : (
                      <SubscriptionPaymentHistory payments={status.payments} t={t} />
                    )}
                  </div>
                );
              },
            }}
          />
        )}
      </Card>

      {/* ── Create modal ──────────────────────────────────────── */}
      <AppModal
        title={t("admin.contracts.create")}
        open={createOpen}
        onCancel={resetCreateForm}
        width={isMobile ? "100%" : 720}
        footer={createFooter}
        styles={isMobile ? { body: { maxHeight: "70vh", overflowY: "auto" } } : undefined}
      >
        <Form form={form} onFinish={handleCreate} className="space-y-5">
          {/* ── Step 1: Client ─────────────────────────────────── */}
          <div>
            <div className="mb-2.5 flex items-center gap-2">
              <StepChip n={1} />
              <span className="text-[13px] font-semibold text-(--ds-text-primary)">
                {t("admin.contracts.form.selectClient")}
              </span>
            </div>
            <FormItem<FormValues, "accountId">
              name="accountId"
              rules={{ required: t("errors.validation") }}
            >
              {(field, { invalid }) => (
                <Combobox
                  value={field.value != null ? String(field.value) : null}
                  onChange={(v) => field.onChange(v == null ? undefined : Number(v))}
                  options={clientOptions}
                  placeholder={t("admin.contracts.form.accountPlaceholder")}
                  searchPlaceholder={t("admin.contracts.form.accountPlaceholder")}
                  emptyText={t("common.noData")}
                  className={cn(invalid && "border-destructive")}
                  aria-label={t("admin.contracts.form.account")}
                />
              )}
            </FormItem>
          </div>

          {/* ── Step 2: Contract Details ────────────────────────── */}
          <div className="border-t border-(--ds-border-subtle) pt-4">
            <div className="mb-3.5 flex items-center gap-2">
              <StepChip n={2} />
              <span className="text-[13px] font-semibold text-(--ds-text-primary)">
                {t("admin.contracts.form.contractDetails")}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FormItem<FormValues, "title">
                  name="title"
                  label={t("admin.contracts.form.title")}
                  rules={{ required: t("errors.validation") }}
                  className="min-w-0 flex-1"
                >
                  {(field) => (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder={t("admin.contracts.form.titlePlaceholder")}
                    />
                  )}
                </FormItem>
                <FormItem<FormValues, "currency">
                  name="currency"
                  label={t("admin.contracts.form.currency")}
                >
                  {(field) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ILS">ILS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </FormItem>
              </div>

              {!pdfBase64 && (
                <FormItem<FormValues, "body">
                  name="body"
                  label={t("admin.contracts.form.body")}
                  hint={t("admin.contracts.form.bodyFormatHint")}
                >
                  {(field) => (
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={4}
                      className="font-mono text-[13px]"
                    />
                  )}
                </FormItem>
              )}

              {/* PDF upload — label omitted: the "Upload PDF" button already names it */}
              {pdfFileName ? (
                <div className="flex items-center gap-2 rounded-md border border-(--ds-color-primary-surface-deep) bg-(--ds-color-primary-surface) px-3 py-2">
                  <FileText aria-hidden="true" className="size-4 shrink-0 text-(--ds-color-primary)" />
                  <span
                    className="min-w-0 flex-1 truncate text-[13px] text-(--ds-text-primary)"
                    title={pdfFileName}
                  >
                    {pdfFileName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-destructive hover:text-destructive"
                    aria-label={t("common.remove")}
                    onClick={() => { setPdfBase64(null); setPdfFileName(null); }}
                  >
                    <MinusCircle className="size-4" />
                  </Button>
                </div>
              ) : (
                <UploadButton
                  accept=".pdf"
                  icon={<FileText aria-hidden="true" className="size-4" />}
                  onFile={handlePdfFile}
                >
                  {t("admin.contracts.form.pdfUpload")}
                </UploadButton>
              )}
            </div>
          </div>

          {/* ── Step 3: Payment Type ─────────────────────────────── */}
          <div className="border-t border-(--ds-border-subtle) pt-4">
            <div className="mb-3 flex items-center gap-2">
              <StepChip n={3} />
              <span className="text-[13px] font-semibold text-(--ds-text-primary)">
                {t("admin.contracts.form.paymentStages")}
              </span>
            </div>

            {/* ── Payment type selector cards ───────────────────── */}
            <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {/* One-time / Installments */}
              <div
                className={typeCardClass(!isSubscription)}
                onClick={() => form.setValue("isSubscription", false)}
                role="button"
                aria-pressed={!isSubscription}
              >
                {!isSubscription && (
                  <CheckCircle2 className="absolute inset-e-2.5 top-2.5 size-3.5 text-(--ds-color-primary)" />
                )}
                <Wallet
                  className={cn(
                    "mb-2 size-5.5 transition-colors duration-150",
                    !isSubscription ? "text-(--ds-color-primary)" : "text-(--ds-text-tertiary)",
                  )}
                />
                <span className="mb-0.5 block text-[13px] font-semibold">
                  {t("admin.contracts.form.typeOneTime")}
                </span>
                <span className="block text-xs leading-snug text-muted-foreground">
                  {t("admin.contracts.form.typeOneTimeDesc")}
                </span>
              </div>

              {/* Monthly Subscription */}
              <div
                className={typeCardClass(!!isSubscription)}
                onClick={() => form.setValue("isSubscription", true)}
                role="button"
                aria-pressed={!!isSubscription}
              >
                {isSubscription && (
                  <CheckCircle2 className="absolute inset-e-2.5 top-2.5 size-3.5 text-(--ds-color-primary)" />
                )}
                <RefreshCw
                  className={cn(
                    "mb-2 size-5.5 transition-colors duration-150",
                    isSubscription ? "text-(--ds-color-primary)" : "text-(--ds-text-tertiary)",
                  )}
                />
                <span className="mb-0.5 block text-[13px] font-semibold">
                  {t("admin.contracts.form.typeSubscription")}
                </span>
                <span className="block text-xs leading-snug text-muted-foreground">
                  {t("admin.contracts.form.typeSubscriptionDesc")}
                </span>
              </div>
            </div>

            {/* ── One-time / Installments ───────────────────────── */}
            {!isSubscription && (
              <div>
                {/* Subheader; the equal-split helper hides behind a toggle (advanced) */}
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold">
                    {t("admin.contracts.form.scheduleTitle")}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setSplitOpen((v) => !v)}
                  >
                    ÷ {t("admin.contracts.form.equalSplitTitle")}
                  </Button>
                </div>
                {splitOpen && (
                  <div
                    className={cn(
                      "mb-3.5 flex flex-wrap gap-2",
                      isMobile ? "flex-col items-stretch" : "items-center",
                    )}
                  >
                    <div className={cn("flex items-center gap-2", isMobile && "w-full")}>
                      <InputNumber
                        min={0.01}
                        value={splitTotal}
                        onChange={setSplitTotal}
                        placeholder={t("admin.contracts.form.equalSplitTotal")}
                        className={isMobile ? "flex-1" : "w-35"}
                      />
                      <span className="text-muted-foreground">÷</span>
                      <InputNumber
                        min={2}
                        max={60}
                        precision={0}
                        value={splitParts}
                        onChange={(v) => setSplitParts(v ?? 2)}
                        className="w-15"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(
                        "border-(--ds-color-primary) text-(--ds-color-primary) hover:text-(--ds-color-primary)",
                        isMobile && "w-full",
                      )}
                      onClick={applyEqualSplit}
                      disabled={!splitTotal || splitTotal <= 0}
                    >
                      {t("admin.contracts.form.equalSplitApply")}
                    </Button>
                  </div>
                )}

                {/* Stage list */}
                <div className="flex w-full flex-col gap-1.5">
                  {stagesArray.fields.map((f, index) => (
                    <div
                      key={f.id}
                      className={cn(
                        "flex items-start gap-2 py-2",
                        index < stagesArray.fields.length - 1 &&
                          "border-b border-(--ds-border-subtle)",
                      )}
                    >
                      {/* Row number only matters once there are several payments */}
                      {stagesArray.fields.length > 1 && (
                        <div className="mt-2.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-(--ds-color-primary-surface-deep) text-[11px] font-semibold text-(--ds-color-primary)">
                          {index + 1}
                        </div>
                      )}
                      <FormItem<FormValues, `stages.${number}.description`>
                        name={`stages.${index}.description`}
                        rules={{ required: t("admin.contracts.form.stageDescriptionRequired") }}
                        className="min-w-0 flex-1"
                      >
                        {(field) => (
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder={t("admin.contracts.form.stageDescription")}
                          />
                        )}
                      </FormItem>
                      <FormItem<FormValues, `stages.${number}.amount`>
                        name={`stages.${index}.amount`}
                        rules={{
                          validate: (v) =>
                            (typeof v === "number" && v >= 0.01) ||
                            t("admin.contracts.form.stageAmountRequired"),
                        }}
                        className="w-35"
                      >
                        {(field) => (
                          <InputNumber
                            min={0.01}
                            value={(field.value as number | null) ?? null}
                            onChange={field.onChange}
                            placeholder="0.00"
                          />
                        )}
                      </FormItem>
                      {/* Can't remove the only payment — hide instead of a dead button */}
                      {stagesArray.fields.length > 1 && (
                        <TableActionButton
                          tooltip={t("common.remove")}
                          icon={<MinusCircle className="size-4" />}
                          className="mt-1 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => stagesArray.remove(index)}
                        />
                      )}
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-1 w-full border-dashed"
                    onClick={() => stagesArray.append({ description: "", amount: null })}
                  >
                    <Plus aria-hidden="true" />
                    {t("admin.contracts.form.addStage")}
                  </Button>
                </div>

                {/* Live total */}
                {(() => {
                  const stages: StageRow[] = watchedStages ?? [];
                  const total = stages.reduce((sum, s) => sum + (s?.amount ?? 0), 0);
                  if (total <= 0) return null;
                  return (
                    <div className="mt-2.5 flex items-center justify-between rounded-md border border-(--ds-color-primary-surface-deep) bg-(--ds-color-primary-surface) px-3.5 py-2.5">
                      <span className="text-xs text-muted-foreground">
                        {t("admin.contracts.form.stagesTotal")} ({stages.filter((s) => (s?.amount ?? 0) > 0).length} {t("admin.contracts.form.stagesCount")})
                      </span>
                      <span className="text-[15px] font-semibold tabular-nums text-(--ds-color-primary)">
                        {fmtMoney(total, watchedCurrency)}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── Monthly Subscription ──────────────────────────── */}
            {isSubscription && (
              <div>
                {/* Monthly billing fields */}
                <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
                  <FormItem<FormValues, "monthlyAmount">
                    name="monthlyAmount"
                    label={t("admin.contracts.form.monthlyAmount")}
                    rules={{
                      validate: (v) =>
                        (typeof v === "number" && v >= 0.01) || t("errors.validation"),
                    }}
                  >
                    {(field) => (
                      <InputNumber
                        min={0.01}
                        value={(field.value as number | null) ?? null}
                        onChange={field.onChange}
                        placeholder="0.00"
                      />
                    )}
                  </FormItem>
                  <FormItem<FormValues, "subscriptionMonths">
                    name="subscriptionMonths"
                    label={t("admin.contracts.form.subscriptionMonths")}
                    hint={t("admin.contracts.form.subscriptionMonthsHint")}
                  >
                    {(field) => (
                      <InputNumber
                        min={1}
                        max={60}
                        precision={0}
                        value={(field.value as number | null) ?? null}
                        onChange={field.onChange}
                        placeholder={t("admin.contracts.form.subscriptionMonthsPlaceholder")}
                      />
                    )}
                  </FormItem>
                  <FormItem<FormValues, "billingDay">
                    name="billingDay"
                    label={t("admin.contracts.form.billingDay")}
                    hint={t("admin.contracts.form.billingDayHint")}
                  >
                    {(field) => (
                      <Combobox
                        value={field.value != null ? String(field.value) : null}
                        onChange={(v) => field.onChange(v == null ? null : Number(v))}
                        options={Array.from({ length: 28 }, (_, i) => ({
                          value: String(i + 1),
                          label: String(i + 1),
                        }))}
                        placeholder={t("admin.contracts.form.billingDayPlaceholder")}
                        clearable
                        aria-label={t("admin.contracts.form.billingDay")}
                      />
                    )}
                  </FormItem>
                </div>

                {/* ── One-time payment toggle ─────────────────────── */}
                <div className="mt-1 border-t border-(--ds-border-subtle) pt-3.5">
                  <div className="flex items-center">
                    <Switch
                      checked={hasOneTime ?? false}
                      onCheckedChange={(checked) => {
                        form.setValue("hasOneTime", checked);
                        if (!checked) {
                          form.setValue("oneTimeAmount", null);
                          form.setValue("oneTimeDescription", "");
                        }
                      }}
                      aria-label={t("admin.contracts.form.oneTimeToggle")}
                    />
                    <span
                      className="ms-2 cursor-pointer select-none text-[13px]"
                      onClick={() => {
                        const cur = form.getValues("hasOneTime") ?? false;
                        form.setValue("hasOneTime", !cur);
                        if (cur) {
                          form.setValue("oneTimeAmount", null);
                          form.setValue("oneTimeDescription", "");
                        }
                      }}
                    >
                      {t("admin.contracts.form.oneTimeToggle")}
                    </span>
                  </div>
                </div>

                {/* One-time payment fields */}
                {hasOneTime && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[7fr_5fr]">
                    <FormItem<FormValues, "oneTimeDescription">
                      name="oneTimeDescription"
                      label={t("admin.contracts.form.oneTimeDescription")}
                    >
                      {(field) => (
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder={t("admin.contracts.form.oneTimeDescriptionPlaceholder")}
                        />
                      )}
                    </FormItem>
                    <FormItem<FormValues, "oneTimeAmount">
                      name="oneTimeAmount"
                      label={t("admin.contracts.form.oneTimeAmount")}
                      rules={{
                        validate: (v) =>
                          v == null ||
                          (typeof v === "number" && v >= 0.01) ||
                          t("admin.contracts.form.stageAmountRequired"),
                      }}
                    >
                      {(field) => (
                        <InputNumber
                          min={0.01}
                          value={(field.value as number | null) ?? null}
                          onChange={field.onChange}
                          placeholder="0.00"
                        />
                      )}
                    </FormItem>
                  </div>
                )}

                {/* Live subscription preview */}
                {(() => {
                  const monthly = watchedMonthly ?? null;
                  const months = watchedMonths ?? null;
                  const day = watchedBillingDay ?? null;
                  const oneTimeAmt = watchedOneTimeAmt ?? null;
                  if (!monthly || monthly <= 0) return null;
                  const hasMonths = months && months > 0;
                  const recurringTotal = hasMonths ? monthly * months : null;
                  const showOneTime = hasOneTime && oneTimeAmt && oneTimeAmt > 0;
                  return (
                    <div className="mt-3 rounded-md border border-(--ds-color-primary-surface-deep) bg-(--ds-color-primary-surface) px-3.5 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-1 flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <RefreshCw className="size-3.25 text-(--ds-color-primary)" />
                            <span className="text-[13px] text-(--ds-text-secondary)">
                              {hasMonths
                                ? `${fmtMoney(monthly, watchedCurrency)} × ${months} ${t("admin.contracts.form.months")}`
                                : `${fmtMoney(monthly, watchedCurrency)} / ${t("admin.contracts.form.month")} · ${t("admin.contracts.form.openEnded")}`
                              }
                              {day ? ` · ${t("admin.contracts.form.billingDayPreview", { day })}` : ""}
                            </span>
                          </div>
                          {showOneTime && (
                            <div className="flex items-center gap-1.5">
                              <Wallet className="size-3.25 text-(--ds-color-primary)" />
                              <span className="text-[13px] text-(--ds-text-secondary)">
                                {t("admin.contracts.form.oneTimePreview", { amount: fmtMoney(oneTimeAmt, watchedCurrency) })}
                              </span>
                            </div>
                          )}
                        </div>
                        {recurringTotal !== null && (
                          <span className="text-[15px] font-semibold tabular-nums text-(--ds-color-primary)">
                            = {fmtMoney(recurringTotal + (showOneTime ? (oneTimeAmt ?? 0) : 0), watchedCurrency)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </Form>
      </AppModal>

      {/* ── Detail modal ──────────────────────────────────────── */}
      <AppModal
        open={!!detailContract}
        onCancel={() => setDetailContract(null)}
        footer={null}
        title={detailContract?.title}
        width={isMobile ? "100%" : 640}
        styles={isMobile ? { body: { maxHeight: "70vh", overflowY: "auto" } } : undefined}
      >
        {detailContract && (() => {
          const [statusVariant, statusKey] = statusCfg(detailContract.status);
          return (
            <div className="flex w-full flex-col gap-5">
              {/* Metadata grid (Descriptions replacement) */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">
                    {t("admin.contracts.columns.status")}
                  </div>
                  <Badge variant={statusVariant}>{t(statusKey)}</Badge>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">
                    {t("admin.contracts.columns.total")}
                  </div>
                  <span className="font-semibold tabular-nums">
                    {fmtMoney(detailContract.totalAmount, detailContract.currency)}
                  </span>
                </div>
                {detailContract.signedAt && (
                  <div className="md:col-span-2">
                    <div className="mb-1 text-xs text-muted-foreground">
                      {t("admin.contracts.columns.signedAt")}
                    </div>
                    <div>{new Date(detailContract.signedAt).toLocaleDateString()}</div>
                    {detailContract.signerName && (
                      <div className="text-xs text-(--ds-text-secondary)">
                        {detailContract.signerName}
                        {detailContract.signerPosition
                          ? ` · ${detailContract.signerPosition}`
                          : ""}
                      </div>
                    )}
                    {detailContract.signedCopyEmail && (
                      <div className="mt-0.5 text-[11px] text-(--ds-text-tertiary)">
                        {t("admin.contracts.signedCopyEmail", {
                          email: detailContract.signedCopyEmail,
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Contract body */}
              {detailContract.body && (
                <div className="border-t border-(--ds-border-subtle) pt-5 text-[13px] leading-[1.8]">
                  {renderContractBody(detailContract.body, {
                    signerName: detailContract.signerName,
                    signaturePngBase64: detailContract.signaturePngBase64,
                    signedAt: detailContract.signedAt,
                  })}
                </div>
              )}

              {/* PDF */}
              {detailContract.pdfBase64 && (
                <div>
                  <span className="mb-1.5 block text-xs text-muted-foreground">
                    {t("admin.contracts.form.pdf")}
                  </span>
                  <PdfViewer
                    base64={detailContract.pdfBase64}
                    style={{ border: "1px solid var(--ds-border-subtle)", borderRadius: 8, height: 400 }}
                  />
                </div>
              )}

              {/* Payment stages */}
              <div>
                <span className="mb-2.5 block font-semibold">
                  {t("admin.contracts.form.stages")}
                </span>
                <div className="flex w-full flex-col">
                  {detailContract.stages.map((s) => {
                    const [sv, sk] = stageCfg(s.status);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between border-b border-(--ds-border-subtle) py-2.5"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span>{s.description}</span>
                            <Badge variant={sv} className="text-[11px]">
                              {t(sk)}
                            </Badge>
                          </div>
                          {s.paidAt && (
                            <div className="mt-0.5 text-[11px] text-(--ds-text-tertiary)">
                              {t("admin.contracts.stage.paidAt", {
                                date: new Date(s.paidAt).toLocaleString(),
                              })}
                            </div>
                          )}
                        </div>
                        <span className="font-semibold tabular-nums">
                          {fmtMoney(s.amount, detailContract.currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Subscription payment history */}
              {detailSubStatus && detailSubStatus.payments.length > 0 && (
                <SubscriptionPaymentHistory payments={detailSubStatus.payments} t={t} />
              )}

              {/* Signature image — shown only when the body template doesn't already embed it;
                  signer name + date live in the metadata grid, so the caption stays neutral */}
              {detailContract.status === "signed" &&
                detailContract.signaturePngBase64 &&
                !(detailContract.body ?? "").includes("{{signerSignature}}") && (
                <div>
                  <span className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-3.5 text-(--ds-color-success)"
                    />
                    {t("admin.contracts.signatureCaption")}
                  </span>
                  <img
                    src={`data:image/png;base64,${detailContract.signaturePngBase64}`}
                    alt="signature"
                    className="max-w-70 rounded-lg border border-(--ds-border-subtle)"
                  />
                </div>
              )}

              {/* Sign link */}
              {(detailContract.status === "pending_signature" ||
                detailContract.status === "draft") && (
                <div>
                  <span className="mb-2 block text-xs text-muted-foreground">
                    {t("admin.contracts.signLink")}
                  </span>
                  <div className={cn("flex gap-2", isMobile && "flex-col")}>
                    <Input readOnly value={signUrl(detailContract)} className="h-8 min-w-0 flex-1 text-xs" />
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(isMobile && "w-full")}
                      onClick={() => void copyLink(detailContract)}
                    >
                      {copiedId === detailContract.id ? (
                        <Check aria-hidden="true" className="size-4 text-(--ds-color-success)" />
                      ) : (
                        <Copy aria-hidden="true" className="size-4" />
                      )}
                      {copiedId === detailContract.id
                        ? t("admin.contracts.linkCopied")
                        : t("admin.contracts.copyLink")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Payment link */}
              {detailContract.status === "signed" && (
                <div>
                  <span className="mb-2 block text-xs text-muted-foreground">
                    {t("admin.contracts.paymentLink")}
                  </span>
                  <div className={cn("flex gap-2", isMobile && "flex-col")}>
                    <Input readOnly value={paymentUrl(detailContract)} className="h-8 min-w-0 flex-1 text-xs" />
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(isMobile && "w-full")}
                      onClick={() => void copyPaymentLink(detailContract)}
                    >
                      {copiedId === detailContract.id ? (
                        <Check aria-hidden="true" className="size-4 text-(--ds-color-success)" />
                      ) : (
                        <CreditCard aria-hidden="true" className="size-4" />
                      )}
                      {copiedId === detailContract.id
                        ? t("admin.contracts.linkCopied")
                        : t("admin.contracts.copyPaymentLink")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </AppModal>

      <SubscriptionStatusModal
        contractId={subscriptionContractId}
        onClose={() => setSubscriptionContractId(null)}
      />
    </PageContainer>
  );
}
