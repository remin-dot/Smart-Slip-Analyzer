"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  ImageIcon,
  Loader2,
  Maximize2,
  Pencil,
  RotateCcw,
  RotateCw,
  Sparkles,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Quality = { score: number; dark: boolean; bright: boolean; blurry: boolean };

// Heuristic image-quality check (runs on a downscaled canvas, image files only).
// ponytail: thresholds are tuned for ~220px analysis — nudge BLUR_MIN / the
// brightness bands if real photos read too strict or too lenient.
const BLUR_MIN = 100; // laplacian variance below this ≈ blurry
function analyzeQuality(img: HTMLImageElement): Quality {
  const w = 220;
  const h = Math.max(1, Math.round((img.height / img.width) * w));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return { score: 100, dark: false, bright: false, blurry: false };
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = g;
    sum += g;
  }
  const brightness = sum / (w * h);

  // Variance of the Laplacian ≈ sharpness.
  let ls = 0, ls2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      ls += lap;
      ls2 += lap * lap;
      n++;
    }
  }
  const variance = n ? ls2 / n - (ls / n) ** 2 : 0;

  const dark = brightness < 60;
  const bright = brightness > 205;
  const blurry = variance < BLUR_MIN;

  const lighting = brightness < 70 ? (brightness / 70) * 100 : brightness > 200 ? ((255 - brightness) / 55) * 100 : 100;
  const sharp = Math.max(0, Math.min(100, (variance / 300) * 100));
  const score = Math.round(Math.max(0, Math.min(100, 0.45 * Math.min(100, lighting) + 0.55 * sharp)));
  return { score, dark, bright, blurry };
}

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
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [editing, setEditing] = useState(false);
  const [editMerchant, setEditMerchant] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const startEditTx = useCallback(() => {
    if (!result?.transaction) return;
    setEditMerchant(result.transaction.merchant);
    setEditAmount(String(Number(result.transaction.amount)));
    setEditing(true);
  }, [result]);

  const saveEditTx = useCallback(async () => {
    if (!result?.transaction) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/transactions/${result.transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant: editMerchant.trim(), amount: Number(editAmount) }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult((r) =>
        r && r.transaction
          ? { ...r, transaction: { ...r.transaction, merchant: data.transaction.merchant, amount: data.transaction.amount } }
          : r
      );
      setEditing(false);
    } catch {
      setError(t("scan.editFailed"));
    } finally {
      setSavingEdit(false);
    }
  }, [result, editMerchant, editAmount, t]);

  const resetState = useCallback(() => {
    setFile(null);
    setPreview(null);
    setStatus("idle");
    setResult(null);
    setError(null);
    setZoom(1);
    setRotation(0);
    setQuality(null);
    setEditing(false);
  }, []);

  // Analyze image quality whenever a new image preview is set.
  useEffect(() => {
    if (!preview) {
      setQuality(null);
      return;
    }
    const img = new Image();
    img.onload = () => setQuality(analyzeQuality(img));
    img.src = preview;
  }, [preview]);

  const handleFile = useCallback((f: File) => {
    if (f.size > MAX_SIZE) {
      setError(`${t("scan.fileTooLarge")} (${(f.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(f.type)) {
      const ext = f.name.includes(".") ? f.name.split(".").pop()!.toUpperCase() : f.type || "unknown";
      setError(`${t("scan.unsupported")} (${ext})`);
      return;
    }

    setError(null);
    setFile(f);
    setResult(null);
    setStatus("idle");
    setZoom(1);
    setRotation(0);

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
            <div className="grid w-full gap-3">
              <div className="relative mx-auto grid h-[240px] w-full place-items-center overflow-hidden rounded-lg bg-white shadow-sm">
                <img
                  alt={t("scan.previewAlt")}
                  className="max-h-[240px] object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                  src={preview}
                />
                {isProcessing && (
                  <div className="pointer-events-none absolute inset-0 bg-teal/5">
                    <div className="animate-scanY absolute left-0 right-0 h-10 bg-gradient-to-b from-transparent via-teal/50 to-transparent shadow-[0_0_12px_2px_rgba(255,56,92,0.35)]" />
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 px-3 py-1 text-xs font-black text-white">
                      {t("scan.scanning")}
                    </span>
                  </div>
                )}
              </div>

              {/* zoom / rotate / reset toolbar */}
              {!isProcessing && (
                <div className="flex items-center justify-center gap-1.5">
                  <ToolBtn label={t("scan.zoomOut")} onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} disabled={zoom <= 1}>
                    <ZoomOut size={16} />
                  </ToolBtn>
                  <span className="w-12 text-center text-xs font-black text-muted">{Math.round(zoom * 100)}%</span>
                  <ToolBtn label={t("scan.zoomIn")} onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} disabled={zoom >= 3}>
                    <ZoomIn size={16} />
                  </ToolBtn>
                  <ToolBtn label={t("scan.rotate")} onClick={() => setRotation((r) => (r + 90) % 360)}>
                    <RotateCw size={16} />
                  </ToolBtn>
                  <ToolBtn label={t("scan.resetView")} onClick={() => { setZoom(1); setRotation(0); }}>
                    <Maximize2 size={16} />
                  </ToolBtn>
                </div>
              )}

              {quality && <QualityMeter quality={quality} />}
              <p className="text-center text-sm font-bold text-muted">{file?.name}</p>
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
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-ink hover:bg-slate-50"
                  onClick={() => inputRef.current?.click()}
                  type="button"
                >
                  {t("scan.browse")}
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-extrabold text-white hover:opacity-90"
                  onClick={() => cameraRef.current?.click()}
                  type="button"
                >
                  <Camera size={16} /> {t("scan.takePhoto")}
                </button>
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                {["JPG", "PNG", "PDF"].map((fmt) => (
                  <span key={fmt} className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-black text-muted">
                    {fmt}
                  </span>
                ))}
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-black text-muted">
                  ≤ 10 MB
                </span>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            accept={ACCEPT}
            className="hidden"
            onChange={onFileChange}
            type="file"
          />
          {/* Rear-camera capture on mobile; opens a file picker on desktop. */}
          <input
            ref={cameraRef}
            accept="image/*"
            capture="environment"
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

          {isProcessing ? (
            <div className="mt-5 grid animate-pulse gap-3" aria-label={t("scan.processing")}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
                  <span className="h-3 w-20 rounded bg-slate-200" />
                  <span className="h-3 w-24 rounded bg-slate-200" />
                </div>
              ))}
              <div className="mt-2 h-20 rounded-lg bg-slate-100" />
            </div>
          ) : result ? (
            <div className="mt-5 grid gap-4">
              {/* AI summary */}
              {result.aiReport?.summary && (
                <div className="rounded-xl border border-rausch/20 bg-gradient-to-br from-rausch/5 to-amber/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-rausch">
                      <Sparkles size={14} /> {t("scan.aiSummary")}
                    </p>
                    <CopyButton text={result.aiReport.summary} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink">{result.aiReport.summary}</p>
                </div>
              )}

              {/* Low-confidence heads-up */}
              {result.extraction.confidence < 0.6 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 text-sm font-bold text-amber">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /> {t("scan.lowConfidence")}
                </div>
              )}

              {/* Transaction group */}
              <div className="grid gap-2">
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted">{t("scan.groupTransaction")}</p>
                <ResultRow label={t("scan.date")} value={result.extraction.date} conf={result.extraction.confidence} />
                <ResultRow label={t("scan.time")} value={result.extraction.time} conf={result.extraction.confidence} />
                <ResultRow label={t("scan.type")} value={result.extraction.transactionType} conf={result.extraction.confidence} />
              </div>

              {/* Payment group */}
              <div className="grid gap-2">
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted">{t("scan.groupPayment")}</p>
                <ResultRow
                  label={t("scan.amount")}
                  value={result.extraction.amount?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  conf={result.extraction.confidence}
                />
                <ResultRow label={t("scan.bank")} value={result.extraction.bank} conf={result.extraction.confidence} />
                <ResultRow label={t("scan.receiver")} value={result.extraction.receiver} conf={result.extraction.confidence} />
                <ResultRow label={t("scan.reference")} value={result.extraction.referenceNumber} conf={result.extraction.confidence} />
              </div>

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
                <div className="animate-pop mt-3 rounded-lg border border-mint/30 bg-mint/10 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-bold text-mint">
                      <CheckCircle2 size={16} className="animate-pop" /> {t("scan.txSaved")}
                    </p>
                    {!editing && (
                      <button onClick={startEditTx} className="inline-flex items-center gap-1 text-xs font-black text-teal hover:underline" type="button">
                        <Pencil size={13} /> {t("tx.edit")}
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <div className="mt-3 grid gap-2">
                      <input
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-teal"
                        value={editMerchant}
                        onChange={(e) => setEditMerchant(e.target.value)}
                        placeholder={t("tx.merchantName")}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-teal"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        placeholder={t("scan.amount")}
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEditTx} disabled={savingEdit} className="inline-flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-sm font-black text-white disabled:opacity-50" type="button">
                          {savingEdit && <Loader2 size={13} className="animate-spin" />} {t("tx.save")}
                        </button>
                        <button onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-muted hover:text-ink" type="button">
                          {t("tx.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted">
                      {result.transaction.merchant} · {Number(result.transaction.amount).toLocaleString()} · {result.transaction.type}
                    </p>
                  )}
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

function ToolBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-muted transition-colors hover:bg-slate-50 hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// Literal class strings (no template interpolation) so Tailwind's JIT keeps them.
const QUALITY_TONE = {
  mint: { box: "border-mint/30 bg-mint/10", text: "text-mint", bar: "bg-mint" },
  amber: { box: "border-amber/30 bg-amber/10", text: "text-amber", bar: "bg-amber" },
  coral: { box: "border-coral/30 bg-coral/10", text: "text-coral", bar: "bg-coral" },
} as const;

function QualityMeter({ quality }: { quality: Quality }) {
  const { t } = useI18n();
  const { score, dark, bright, blurry } = quality;
  const tone = QUALITY_TONE[score >= 75 ? "mint" : score >= 50 ? "amber" : "coral"];
  const warnings = [
    blurry && t("scan.qBlurry"),
    dark && t("scan.qDark"),
    bright && t("scan.qBright"),
  ].filter(Boolean) as string[];

  return (
    <div className={`rounded-lg border px-4 py-3 ${tone.box}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-muted">{t("scan.imgQuality")}</span>
        <span className={`font-black ${tone.text}`}>{score}/100</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${score}%` }} />
      </div>
      {warnings.length > 0 ? (
        <ul className="mt-2 grid gap-1">
          {warnings.map((w) => (
            <li key={w} className={`flex items-start gap-1.5 text-xs font-bold ${tone.text}`}>
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-mint">
          <CheckCircle2 size={13} /> {t("scan.qGood")}
        </p>
      )}
    </div>
  );
}

// Literal class strings so Tailwind's JIT keeps them.
const CONF_TONE = {
  mint: "bg-mint/15 text-mint",
  amber: "bg-amber/15 text-amber",
  coral: "bg-coral/15 text-coral",
} as const;

function CopyButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? t("scan.copied") : t("scan.copy")}
      title={copied ? t("scan.copied") : t("scan.copy")}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors ${copied ? "text-mint" : "text-slate-400 hover:bg-slate-200 hover:text-ink"}`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function ResultRow({ label, value, conf }: { label: string; value: string | null | undefined; conf?: number }) {
  const { t } = useI18n();
  const detected = value != null && value !== "";
  const tone = conf == null || conf >= 0.75 ? "mint" : conf >= 0.5 ? "amber" : "coral";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className={`font-black ${detected ? "text-ink" : "text-slate-300"}`}>{value ?? "—"}</span>
        {detected ? (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${CONF_TONE[tone]}`}>
            {conf != null ? `${Math.round(conf * 100)}%` : t("scan.detected")}
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-400">{t("scan.notFound")}</span>
        )}
        {detected && <CopyButton text={String(value)} />}
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
