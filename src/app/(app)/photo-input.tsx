"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WEIGH_IN_BUCKET } from "@/lib/photos";

/**
 * Lets the user attach a scale photo. Uploads straight to Storage under the
 * signed-in user's folder and reports the stored path back via onChange.
 */
export function PhotoInput({
  userId,
  onChange,
  required,
}: {
  userId: string;
  onChange: (path: string | null) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(WEIGH_IN_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      setPreview(URL.createObjectURL(file));
      onChange(path);
    } catch {
      setError("Upload failed — try again.");
      onChange(null);
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium">
        Scale photo {required ? "(required)" : "(optional)"}
      </span>

      {preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="scale"
            className="h-16 w-16 rounded-lg border border-border object-cover"
          />
          <button
            type="button"
            onClick={clear}
            className="text-sm text-muted underline hover:text-foreground"
          >
            Remove
          </button>
        </div>
      ) : (
        <label
          className={`flex cursor-pointer items-center justify-center rounded-lg border border-dashed px-3 py-3 text-sm ${
            uploading ? "border-border text-muted" : "border-border text-muted hover:border-brand"
          }`}
        >
          {uploading ? "Uploading…" : "📷 Take / choose a photo"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>
      )}

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
