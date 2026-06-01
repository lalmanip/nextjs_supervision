export type Permission =
  | "supervision.dashboard.view"
  | "supervision.agencyBalance.view"
  | "supervision.failedTransactions.view"
  | "supervision.holdTickets.view"
  | "supervision.cancelledTickets.view"
  | "supervision.b2cEnquiries.view"
  | "supervision.agent.newRegistration.view"
  | "supervision.agent.topUpRequest.view"
  | "supervision.holidaysEnquiries.view"
  | "supervision.holidays.createPackage.view"
  | "supervision.holidays.updatePackage.view"
  | "supervision.setupMarkup.view"
  | "supervision.setupCommission.view"
  | "supervision.setupPromotions.view";

export type Role = "SUPERADMIN";

