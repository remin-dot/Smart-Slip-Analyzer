"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { initials } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/toast";

// ponytail: avatars are stored as a small resized JPEG data URL right in the
// user row — no blob storage / R2 needed. Fine for tiny profile pics; swap to
// object storage if users ever upload large media.
async function fileToSquareDataUrl(file: File, size = 256): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.max(size / img.width, size / img.height); // cover
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function AvatarUploader({ name, image }: { name: string; image?: string | null }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(imageUrl: string | null) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (!res.ok) throw new Error();
      toast(t("toast.updated"));
      router.refresh();
    } catch {
      setError(t("avatar.error"));
      toast(t("avatar.error"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError(t("avatar.error")); return; }
    setBusy(true);
    try {
      await save(await fileToSquareDataUrl(file));
    } catch {
      setError(t("avatar.error"));
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="relative h-24 w-24">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} className="h-24 w-24 rounded-full object-cover ring-2 ring-rausch/20" />
        ) : (
          <div className="grid h-24 w-24 place-items-center rounded-full bg-rausch text-2xl font-bold text-white ring-2 ring-rausch/20">
            {initials(name)}
          </div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-label={t("avatar.change")}
          className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-rausch text-white shadow hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm font-bold">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="text-teal hover:underline disabled:opacity-60">
          {t("avatar.change")}
        </button>
        {image && (
          <button type="button" onClick={() => save(null)} disabled={busy} className="inline-flex items-center gap-1 text-muted hover:text-coral disabled:opacity-60">
            <Trash2 size={13} /> {t("avatar.remove")}
          </button>
        )}
      </div>

      {error && <p className="text-xs font-bold text-coral">{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
    </div>
  );
}
