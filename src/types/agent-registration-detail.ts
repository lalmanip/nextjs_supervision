export type AgentDocumentInfo = {
  documentType: string;
  label: string;
  storedPath: string;
  fileName: string;
};

export type AgentRegistrationDetail = {
  userId: number;
  email?: string | null;
  userName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  countryCode?: number | null;
  phone?: string | null;
  status?: number | null;
  userCreatedOn?: string | null;

  agentProfileId?: number | null;
  companyName?: string | null;
  corporateId?: string | null;
  salesPersonName?: string | null;
  panNumber?: string | null;
  panCardHolderName?: string | null;
  gstNumber?: string | null;
  address?: string | null;
  pinCode?: string | null;
  state?: string | null;
  city?: number | null;
  cityName?: string | null;
  agentCountryName?: number | null;
  officePhone?: number | null;
  establishmentDate?: string | null;
  annualTransactionAmount?: number | string | null;
  noOfEmployees?: number | null;

  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankAccountHolderName?: string | null;

  documents?: AgentDocumentInfo[];
};

export type AgentRegistrationDetailApiOk = {
  status: "success";
  detail: AgentRegistrationDetail;
};
