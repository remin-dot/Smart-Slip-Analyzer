"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

type ProcessingStatus = "idle" | "uploading" | "extracting" | "saving" | "done" | "error";

type ExtractionResult = {
  extraction: {
    date: string | null;
    time: string | null;
    amount: number | null;
    bank: string | null;
    receiver: string | null;
    referenceNumber: string | null;
    transactionType: string;
    confidence: number;
    modelName: string;
  };
  classification: {
    category: string;
    confidence: number;
    explanation: string;
    modelName: string;
  } | null;
  transaction: {
    id: string;
    merchant: string;
    amount: string;
    occurredAt: string;
    type: string;
    source: string;
    category: { id: string; name: string; color: string } | null;
  } | null;
  aiReport: {
    id: string;
    title: string;
    summary: string;
    confidence: number;
  } | null;
};

const ACCEPT = ".jpg,.jpeg,.png,.pdf";
const MAX_SIZE = 10 * 1024 * 1024;

const STATUS_LABEL_KEYS: Record<ProcessingStatus, string> = {
  idle: "scan.statusIdle",
  uploading: "scan.statusUploading",
  extracting: "scan.statusExtracting",
  saving: "scan.statusSaving",
  done: "scan.statusDone",
  error: "scan.statusError",
};

export function SlipUpload() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setFile(null);
    setPreview(null);
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  const handleFile = useCallback((f: File) => {
    if (f.size > MAX_SIZE) {
      setError(t("scan.fileTooLarge"));
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(f.type)) {
      setError(t("scan.unsupported"));
      return;
    }

    setError(null);
    setFile(f);
    setResult(null);
    setStatus("idle");

    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, [t]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile]
  );

  const processSlip = useCallback(async () => {
    if (!file) return;

    setError(null);
    setResult(null);

    try {
      setStatus("uploading");
      const formData = new FormData();
      formData.append("file", file);

      setStatus("extracting");
      const res = await fetch("/api/slips/scan", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t("scan.serverError", { code: res.status }));
      }

      setStatus("saving");
      const data: ExtractionResult = await res.json();

      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("scan.failed"));
      setStatus("error");
    }
  }, [file, t]);

  const isProcessing = status === "uploading" || status === "extracting" || status === "saving";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Upload zone */}
      <div className="grid gap-4">
        <div
          className={`relative grid min-h-[320px] place-items-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragOver
              ? "border-teal bg-teal/5"
              : file
                ? "border-teal/40 bg-teal/5"
                : "border-slate-300 bg-slate-50 hover:border-slate-400"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {file && !isProcessing && (
            <button
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted hover:bg-slate-200 hover:text-ink"
              onClick={resetState}
              type="button"
            >
              <X size={18} />
            </button>
          )}

          {preview ? (
            <div className="grid gap-4">
              <img
                alt={t("scan.previewAlt")}
                className="mx-auto max-h-[240px] rounded-lg object-contain shadow-sm"
                src={preview}
              />
              <p className="text-sm font-bold text-muted">{file?.name}</p>
            </div>
          ) : file ? (
            <div className="grid gap-3">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-teal/10 text-teal">
                <FileText size={32} />
              </div>
              <p className="font-black">{file.name}</p>
              <p className="text-sm text-muted">
                {t("scan.pdfDoc", { kb: (file.size / 1024).toFixed(0) })}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-teal text-white">
                <Upload size={28} />
              </div>
              <div>
                <p className="font-black">{t("scan.dropTitle")}</p>
                <p className="mt-1 text-sm text-muted">
                  {t("scan.dropSub")}
                </p>
              </div>
              <button
                className="mx-auto rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-ink hover:bg-slate-50"
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                {t("scan.browse")}
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            accept={ACCEPT}
            className="hidden"
            onChange={onFileChange}
            type="file"
          />
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
          <StatusIcon status={status} />
          <span className="text-sm font-bold">{t(STATUS_LABEL_KEYS[status])}</span>
          {isProcessing && (
            <div className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full animate-pulse rounded-full bg-teal" style={{ width: statusProgress(status) }} />
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg bg-coral/10 px-4 py-3 text-sm text-coral">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-lg bg-teal px-5 py-3 font-extrabold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!file || isProcessing}
            onClick={processSlip}
            type="button"
          >
            {isProcessing ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={18} />
                {t("scan.processing")}
              </span>
            ) : (
              t("scan.scanExtract")
            )}
          </button>
          {(status === "done" || status === "error") && (
            <button
              className="rounded-lg border border-slate-200 bg-white px-5 py-3 font-extrabold text-ink hover:bg-slate-50"
              onClick={resetState}
              type="button"
            >
              <RotateCcw size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Results panel */}
      <div className="grid gap-4">
        <div className="panel p-5">
          <p className="eyebrow">{t("scan.extractionResults")}</p>
          <h3 className="mt-1 text-xl font-black">{t("scan.txDetails")}</h3>

          {result ? (
            <div className="mt-5 grid gap-3">
              <ResultRow label={t("scan.date")} value={result.extraction.date} />
              <ResultRow label={t("scan.time")} value={result.extraction.time} />
              <ResultRow
                label={t("scan.amount")}
                value={result.extraction.amount?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              />
              <ResultRow label={t("scan.bank")} value={result.extraction.bank} />
              <ResultRow label={t("scan.receiver")} value={result.extraction.receiver} />
              <ResultRow label={t("scan.reference")} value={result.extraction.referenceNumber} />
              <ResultRow label={t("scan.type")} value={result.extraction.transactionType} />

              {result.classification && (
                <div className="mt-2 rounded-lg border border-teal/20 bg-teal/5 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-normal text-teal">{t("scan.aiClassification")}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: result.transaction?.category?.color ?? "#687188" }}
                      />
                      <span className="text-lg font-black">{result.classification.category}</span>
                    </div>
                    <span className="rounded-full bg-teal/10 px-3 py-1 text-sm font-black text-teal">
                      {(result.classification.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{result.classification.explanation}</p>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between rounded-lg bg-teal/10 px-4 py-3">
                <span className="text-sm font-bold text-teal">{t("scan.extractionConfidence")}</span>
                <span className="font-black text-teal">
                  {(result.extraction.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-sm font-bold text-muted">{t("scan.model")}</span>
                <span className="font-black">{result.extraction.modelName}</span>
              </div>

              {result.transaction && (
                <div className="mt-3 rounded-lg border border-mint/30 bg-mint/10 px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-bold text-mint">
                    <CheckCircle2 size={16} /> {t("scan.txSaved")}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {result.transaction.merchant} - {result.transaction.type}
                  </p>
                </div>
              )}

              {!result.transaction && result.extraction.amount === null && (
                <div className="mt-3 rounded-lg border border-amber/30 bg-amber/10 px-4 py-3">
                  <p className="text-sm font-bold text-amber">
                    {t("scan.noAmount")}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {t("scan.noAmountSub")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 grid min-h-[200px] place-items-center rounded-lg bg-slate-50 p-6 text-center">
              <div>
                <ImageIcon size={32} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-muted">
                  {t("scan.emptyHint")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-muted">{label}</span>
      <span className={`font-black ${value ? "text-ink" : "text-slate-300"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function StatusIcon({ status }: { status: ProcessingStatus }) {
  switch (status) {
    case "uploading":
    case "extracting":
    case "saving":
      return <Loader2 className="animate-spin text-teal" size={18} />;
    case "done":
      return <CheckCircle2 className="text-mint" size={18} />;
    case "error":
      return <AlertCircle className="text-coral" size={18} />;
    default:
      return <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />;
  }
}

function statusProgress(status: ProcessingStatus): string {
  switch (status) {
    case "uploading":
      return "33%";
    case "extracting":
      return "66%";
    case "saving":
      return "90%";
    default:
      return "0%";
  }
}
