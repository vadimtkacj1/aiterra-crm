import { useOutletContext } from "react-router-dom";

export type AccountLayoutOutletContext = {
  accountLoading: boolean;
  currentAccount: { id: number; name: string; hasMeta: boolean; hasGoogle: boolean } | null;
  totalAccountCount: number;
};

const defaultCtx: AccountLayoutOutletContext = {
  accountLoading: false,
  currentAccount: null,
  totalAccountCount: 0,
};

export function useAccountLayoutOutlet(): AccountLayoutOutletContext {
  return useOutletContext<AccountLayoutOutletContext>() ?? defaultCtx;
}
