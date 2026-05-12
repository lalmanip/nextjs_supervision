/** Typical MT release-pnr envelope (field names may vary by backend). */
export type TboReleasePnrError = {
  ErrorCode?: number;
  ErrorMessage?: string;
};

export type TboReleasePnrResponseBody = {
  B2B2BStatus?: unknown;
  ResponseStatus?: number;
  TraceId?: string;
  Error?: TboReleasePnrError;
};

export type TboReleasePnrUpstream = {
  Response?: TboReleasePnrResponseBody;
  response?: TboReleasePnrResponseBody;
};
