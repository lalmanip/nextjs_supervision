import { z } from "zod";

export type B2bWalletSnapshot = {
  b2bUserDetailsId: number;
  userOid: number;
  balance: number;
  creditLimit: number;
  dueAmount: number;
  availableToBook: number;
};

export const b2bWalletInitializeBodySchema = z.object({
  initialBalance: z.coerce.number().min(0),
  initialCreditLimit: z.coerce.number().min(0),
  currencyConverterFk: z.coerce.number().int().positive(),
  performedByUserId: z.coerce.number().int().positive(),
});

export type B2bWalletInitializeBody = z.infer<typeof b2bWalletInitializeBodySchema>;
