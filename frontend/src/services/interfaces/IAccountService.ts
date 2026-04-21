export interface Account {
  id: number;
  name: string;
  /** At least one Meta campaign is linked to this business. */
  hasMeta: boolean;
  /** Google Ads API credentials are linked to this business. */
  hasGoogle: boolean;
}

export interface IAccountService {
  listMyAccounts(): Promise<Account[]>;
}

