import axios from "axios";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SubscriptionStatus } from "@/services/admin/AdminService";
import { useApp } from "../../../../../app/AppProviders";
import { message } from "@/lib/toast";

function extractErrorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const detail = (e.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string" && detail) return detail;
    if (detail && typeof detail === "object") {
      const d = detail as { error?: string; message?: string; returnCode?: number; logs?: string[] };
      const parts: string[] = [];
      if (d.message) parts.push(d.message);
      if (d.returnCode !== undefined) parts.push(`code: ${d.returnCode}`);
      if (d.logs?.length) parts.push(d.logs.join(" → "));
      if (parts.length) return parts.join(" | ");
    }
  }
  return e instanceof Error ? e.message : fallback;
}

interface UseSubscriptionStatusResult {
  status: SubscriptionStatus | null;
  loading: boolean;
  simulating: boolean;
  updatingBillingDay: boolean;
  pausingOrResuming: boolean;
  cancelling: boolean;
  settingTestInterval: boolean;
  loadStatus: () => Promise<void>;
  simulatePayment: () => Promise<void>;
  updateBillingDay: (day: number | null) => Promise<void>;
  pauseSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  setTestInterval: (minutes: number | null) => Promise<void>;
}

export function useSubscriptionStatus(contractId: number | null): UseSubscriptionStatusResult {
  const { services } = useApp();
  const { t } = useTranslation();
  const k = (s: string) => `admin.contracts.subscription.${s}`;

  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [updatingBillingDay, setUpdatingBillingDay] = useState(false);
  const [pausingOrResuming, setPausingOrResuming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [settingTestInterval, setSettingTestInterval] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    if (contractId) {
      void loadStatus();
    }
  }, [contractId]);

  const loadStatus = async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const data = await services.admin.getContractSubscriptionStatus(contractId);
      setStatus(data);
    } catch (e) {
      void message.error(extractErrorMessage(e, t(k("errLoad"))));
    } finally {
      setLoading(false);
    }
  };

  const simulatePayment = async () => {
    if (!contractId) return;
    setSimulating(true);
    try {
      const result = await services.admin.simulateMonthlyPayment(contractId);
      void message.success(result.message);
      await loadStatus();
    } catch (e) {
      void message.error(extractErrorMessage(e, t(k("errSimulate"))));
    } finally {
      setSimulating(false);
    }
  };

  const updateBillingDay = async (day: number | null) => {
    if (!contractId) return;
    setUpdatingBillingDay(true);
    try {
      const updated = await services.admin.updateContractBillingDay(contractId, day);
      setStatus(updated);
      void message.success(t(k("billingDayUpdated")));
    } catch (e) {
      void message.error(extractErrorMessage(e, t(k("errBillingDay"))));
    } finally {
      setUpdatingBillingDay(false);
    }
  };

  const pauseSubscription = async () => {
    if (!contractId) return;
    setPausingOrResuming(true);
    try {
      const updated = await services.admin.pauseSubscription(contractId);
      setStatus(updated);
      void message.success(t(k("paused")));
    } catch (e) {
      void message.error(extractErrorMessage(e, t(k("errPause"))));
    } finally {
      setPausingOrResuming(false);
    }
  };

  const resumeSubscription = async () => {
    if (!contractId) return;
    setPausingOrResuming(true);
    try {
      const updated = await services.admin.resumeSubscription(contractId);
      setStatus(updated);
      void message.success(t(k("resumed")));
    } catch (e) {
      void message.error(extractErrorMessage(e, t(k("errResume"))));
    } finally {
      setPausingOrResuming(false);
    }
  };

  const cancelSubscription = async () => {
    if (!contractId) return;
    setCancelling(true);
    try {
      const updated = await services.admin.cancelSubscription(contractId);
      setStatus(updated);
      void message.success(t(k("cancelled")));
    } catch (e) {
      void message.error(extractErrorMessage(e, t(k("errCancel"))));
    } finally {
      setCancelling(false);
    }
  };

  const setTestInterval = async (minutes: number | null) => {
    if (!contractId) return;
    setSettingTestInterval(true);
    try {
      const updated = await services.admin.setTestInterval(contractId, minutes);
      setStatus(updated);
      void message.success(minutes ? t(k("testModeEnabled"), { minutes }) : t(k("testModeDisabled")));
    } catch (e) {
      void message.error(extractErrorMessage(e, t(k("errTestInterval"))));
    } finally {
      setSettingTestInterval(false);
    }
  };

  return {
    status,
    loading,
    simulating,
    updatingBillingDay,
    pausingOrResuming,
    cancelling,
    settingTestInterval,
    loadStatus,
    simulatePayment,
    updateBillingDay,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    setTestInterval,
  };
}
