export interface Account {
  id: number;
  name: string;
  hasMeta: boolean;
  hasGoogle: boolean;
}

export interface IAccountService {
  listMyAccounts(): Promise<Account[]>;
}
