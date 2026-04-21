import type { HttpClient } from "../infrastructure/HttpClient";
import type { Account, IAccountService } from "./interfaces/IAccountService";

export class AccountService implements IAccountService {
  constructor(private readonly http: HttpClient) {}

  async listMyAccounts(): Promise<Account[]> {
    const rows = await this.http.get<Account[]>("/accounts");
    return rows.map((r) => ({
      ...r,
      hasMeta: r.hasMeta ?? false,
      hasGoogle: r.hasGoogle ?? false,
    }));
  }
}
