import { App } from "antd";
import { useEffect, useState } from "react";
import type { SubscriptionStatus } from "@/services/admin/AdminService";
import { useApp } from "../../../../../app/AppProviders";

interface UseSubscriptionStatusResult {
  status: SubscriptionStatus | null;
  loading: boolean;
  simulating: boolean;
  loadStatus: () => Promise<void>;
  simulatePayment: () => Promise<void>;
}

export function useSubscriptionStatus(contractId: number | null): UseSubscriptionStatusResult {
  const { services } = useApp();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
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

  return {
    status,
    loading,
    simulating,
    loadStatus,
    simulatePayment,
  };
}
