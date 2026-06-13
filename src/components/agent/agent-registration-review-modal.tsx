"use client";

import * as React from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { http } from "@/services/http";
import { getApiErrorMessage } from "@/services/http/client";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/common/modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  agentDocumentPreviewUrl,
  isImageFileName,
  isPdfFileName,
} from "@/lib/agent-document-url";
import type { AgentRegistrationDetail } from "@/types/agent-registration-detail";
import type { AgentRegistrationDetailApiOk } from "@/types/agent-registration-detail";

type Props = {
  open: boolean;
  userOid: number | null;
  summaryLabel: string;
  canApprove: boolean;
  approving: boolean;
  onClose: () => void;
  onApprove: () => void;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:gap-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100 break-words">{value ?? "—"}</dd>
    </div>
  );
}

export function AgentRegistrationReviewModal({
  open,
  userOid,
  summaryLabel,
  canApprove,
  approving,
  onClose,
  onApprove,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<AgentRegistrationDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || userOid == null) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const { data } = await http.get<AgentRegistrationDetailApiOk>(
          `/api/supervision/user/b2b/agent-registration/${userOid}`,
        );
        if (!cancelled) {
          setDetail(data.detail);
        }
      } catch (e) {
        if (!cancelled) {
          setDetail(null);
          setError(getApiErrorMessage(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, userOid]);

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Review agent registration</ModalTitle>
          <ModalDescription>{summaryLabel}</ModalDescription>
        </ModalHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400 py-4">{error}</p>
        ) : detail ? (
          <div className="space-y-6 py-2">
            <section>
              <h3 className="text-sm font-semibold mb-2">Contact</h3>
              <dl>
                <DetailRow label="User ID" value={detail.userId} />
                <DetailRow
                  label="Name"
                  value={[detail.firstName, detail.lastName].filter(Boolean).join(" ")}
                />
                <DetailRow label="Email" value={detail.email} />
                <DetailRow label="Username" value={detail.userName} />
                <DetailRow label="Phone" value={detail.phone} />
                <DetailRow label="Country code" value={detail.countryCode} />
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-2">Company</h3>
              <dl>
                <DetailRow label="Corporate ID" value={detail.corporateId} />
                <DetailRow label="Sales person" value={detail.salesPersonName} />
                <DetailRow label="Company" value={detail.companyName} />
                <DetailRow label="PAN" value={detail.panNumber} />
                <DetailRow label="PAN holder name" value={detail.panCardHolderName} />
                <DetailRow label="GST / IATA" value={detail.gstNumber} />
                <DetailRow label="Address" value={detail.address} />
                <DetailRow label="PIN" value={detail.pinCode} />
                <DetailRow label="State" value={detail.state} />
                <DetailRow
                  label="City"
                  value={
                    detail.cityName
                      ? detail.city != null
                        ? `${detail.cityName} (${detail.city})`
                        : detail.cityName
                      : detail.city
                  }
                />
                <DetailRow label="Office phone" value={detail.officePhone} />
                <DetailRow label="Establishment date" value={detail.establishmentDate} />
                <DetailRow
                  label="Annual transaction (INR)"
                  value={
                    detail.annualTransactionAmount != null
                      ? Number(detail.annualTransactionAmount).toLocaleString()
                      : null
                  }
                />
                <DetailRow label="Employees" value={detail.noOfEmployees} />
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-2">Bank details</h3>
              <dl>
                <DetailRow label="Account holder" value={detail.bankAccountHolderName} />
                <DetailRow label="Account number" value={detail.bankAccountNumber} />
                <DetailRow label="IFSC" value={detail.bankIfsc} />
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-3">Attachments</h3>
              {!detail.documents?.length ? (
                <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
                  No documents on file. This agent may have registered before document upload was
                  enabled.
                </p>
              ) : (
                <div className="space-y-4">
                  {detail.documents.map((doc) => {
                    const url = agentDocumentPreviewUrl(doc.storedPath);
                    const pdf = isPdfFileName(doc.fileName);
                    const image = isImageFileName(doc.fileName);
                    return (
                      <div
                        key={doc.storedPath}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-900/80">
                          <span className="text-sm font-medium">{doc.label}</span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Open
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="p-2 bg-white dark:bg-zinc-950">
                          {pdf ? (
                            <iframe
                              title={doc.label}
                              src={url}
                              className="w-full h-64 rounded border-0"
                            />
                          ) : image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={doc.label}
                              className="max-h-64 mx-auto object-contain"
                            />
                          ) : (
                            <p className="text-xs text-zinc-500 px-2 py-4 text-center">
                              Preview not available — use Open link.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {canApprove ? (
              <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <Button type="button" variant="outline" onClick={onClose} disabled={approving}>
                  Close
                </Button>
                <Button type="button" onClick={onApprove} disabled={approving}>
                  {approving ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Approving…
                    </>
                  ) : (
                    "Approve registration"
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex justify-end pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </ModalContent>
    </Modal>
  );
}
