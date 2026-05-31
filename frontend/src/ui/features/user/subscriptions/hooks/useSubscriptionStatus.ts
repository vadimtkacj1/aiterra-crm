import { App } from "antd";
import { useEffect, useState } from "react";
import type { SubscriptionStatus } from "@/services/admin/AdminService";
import { useApp } from "../../../../../app/AppProviders";

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
  const { message } = App.useApp();

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
      void message.error(e instanceof Error ? e.message : "Failed to load subscription status");
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
      void message.error(e instanceof Error ? e.message : "Failed to simulate payment");
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
      void message.success("Billing day updated");
    } catch (e) {
      void message.error(e instanceof Error ? e.message : "Failed to update billing day");
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
      void message.success("Subscription paused");
    } catch (e) {
      void message.error(e instanceof Error ? e.message : "Failed to pause subscription");
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
      void message.success("Subscription resumed");
    } catch (e) {
      void message.error(e instanceof Error ? e.message : "Failed to resume subscription");
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
      void message.success("Subscription cancelled");
    } catch (e) {
      void message.error(e instanceof Error ? e.message : "Failed to cancel subscription");
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
      void message.success(minutes ? `Test mode: every ${minutes} min` : "Test mode disabled");
    } catch (e) {
      void message.error(e instanceof Error ? e.message : "Failed to set test interval");
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
