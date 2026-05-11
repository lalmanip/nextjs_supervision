export type AgencyBalanceRequest = {
  AgencyName: string;
};

export type AgencyBalanceResponse = {
  Status: number;
  Message: string;
  AgencyType: number;
  CashBalance: number;
  CreditBalance: number;
};
