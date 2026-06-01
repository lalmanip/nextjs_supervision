import { proxyB2bWalletRequestAction } from "@/lib/b2b-wallet-request-action";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(req: Request, context: RouteContext) {
  return proxyB2bWalletRequestAction(req, context, "approve");
}
