"use client";

import { useEffect, useState } from "react";
import NextImage from "next/image";
import { addHistory, getAllHistory, clearHistory as clearDb } from "@/lib/storage/indexeddb";

type HistoryItem = {
  id: string;
  prompt: string;
  images: { url?: string; b64_json?: string }[];
  error?: string;
};

export default function ChatUI() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [size, setSize] = useState("1024x1024");
  const [n, setN] = useState(1);
  const [files, setFiles] = useState<{ mimeType: string; data: string; name: string }[]>([]);
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    // Load last history entries from IndexedDB on mount (best-effort, ignore errors)
    let cancelled = false;
    (async () => {
      try {
        const records = await getAllHistory(50);
        if (!cancelled) {
          setItems(
            records.map((r) => ({ id: r.id, prompt: r.prompt, images: r.images, error: r.error }))
          );
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    const text = prompt.trim();
    if (!text) return;
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, size, n, images: files.map(({ mimeType, data }) => ({ mimeType, data })) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed");
      const images = json.images as { url?: string; b64_json?: string }[];
      const id = crypto.randomUUID();
      // For offline storage, ensure any URL images are captured as base64 as well
      const persistedImages: { url?: string; b64_json?: string }[] = await Promise.all(
        images.map(async (img) => {
          if (img.b64_json || !img.url) return img;
          try {
            const res = await fetch(img.url, { mode: "cors" });
            const blob = await res.blob();
            const reader = new FileReader();
            const b64 = await new Promise<string>((resolve, reject) => {
              reader.onerror = () => reject(reader.error);
              reader.onload = () => {
                const result = String(reader.result || "");
                const m = result.match(/^data:[^;]+;base64,(.+)$/);
                resolve(m ? m[1] : "");
              };
              reader.readAsDataURL(blob);
            });
            if (b64) return { ...img, b64_json: b64 };
          } catch {
            // ignore conversion errors
          }
          return img;
        })
      );
      const rec = { id, prompt: text, images: persistedImages, createdAt: Date.now() };
      setItems((prev) => [{ id, prompt: text, images: images }, ...prev]);
  // Save to IndexedDB (fire-and-forget)
  addHistory(rec).catch(() => {});
      setPrompt("");
      setFiles([]);
    } catch (e: unknown) {
  const id = crypto.randomUUID();
  const message = e instanceof Error ? e.message : "Something went wrong";
  setItems((prev) => [{ id, prompt: text, images: [], error: message }, ...prev]);
  // Optionally store failed entry for context
  addHistory({ id, prompt: text, images: [], error: message, createdAt: Date.now() }).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const filesArr = Array.from(list).slice(0, 3);
    const reads = await Promise.all(
      filesArr.map(
        (f) =>
          new Promise<{ mimeType: string; data: string; name: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(reader.error);
            reader.onload = () => {
              const result = reader.result as string; // data URL
              const match = result.match(/^data:([^;]+);base64,(.+)$/);
              const mimeType = f.type || (match ? match[1] : "image/png");
              const data = match ? match[2] : "";
              resolve({ mimeType, data, name: f.name });
            };
            reader.readAsDataURL(f);
          })
      )
    );
    setFiles(reads);
  };

  const openPreview = (src: string, alt: string) => {
    if (!src) return;
    setPreview({ src, alt });
  };

  const closePreview = () => setPreview(null);

  const downloadImage = async (src: string, filename = "image.png") => {
    try {
      if (!src) return;
      let href = src;
      let revoke: (() => void) | undefined;
      if (!src.startsWith("data:")) {
        const res = await fetch(src, { mode: "cors" });
        const blob = await res.blob();
        href = URL.createObjectURL(blob);
        revoke = () => URL.revokeObjectURL(href);
      }
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (revoke) revoke();
    } catch (e) {
      console.error("download failed", e);
    }
  };

  const addImageToEditing = async (src: string, hintName = "image.png") => {
    try {
      let mimeType = "image/png";
      let b64 = "";
      if (src.startsWith("data:")) {
        const match = src.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          b64 = match[2];
        }
      } else {
        const res = await fetch(src, { mode: "cors" });
        const blob = await res.blob();
        mimeType = blob.type || mimeType;
        const reader = new FileReader();
        b64 = await new Promise<string>((resolve, reject) => {
          reader.onerror = () => reject(reader.error);
          reader.onload = () => {
            const result = String(reader.result || "");
            const m = result.match(/^data:[^;]+;base64,(.+)$/);
            resolve(m ? m[1] : "");
          };
          reader.readAsDataURL(blob);
        });
      }
      if (!b64) return;
      const name = hintName || "image.png";
      setFiles((prev) => [...prev, { mimeType, data: b64, name }]);
    } catch (e) {
      console.error("add to editing failed", e);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 px-2 sm:px-0">
      <h1 className="text-2xl font-semibold">Image Studio</h1>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            await clearDb().catch(() => {});
            setItems([]);
          }}
          className="text-xs px-2 py-1 rounded bg-black/5 dark:bg-white/10"
        >
          Clear local history
        </button>
        <div className="text-xs opacity-70">(stored only in this browser)</div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-black/10 dark:border-white/10 p-3 sm:p-4">
        <textarea
          className="w-full min-h-24 max-h-[40vh] p-3 rounded-md bg-black/5 dark:bg-white/10 outline-none resize-y"
          placeholder="Describe the image you want..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm opacity-80">Attach images</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onPickFiles}
            className="text-sm"
          />
          {files.length > 0 && (
            <button
              onClick={() => setFiles([])}
              className="ml-auto text-xs px-2 py-1 rounded bg-black/5 dark:bg-white/10"
            >
              Clear
            </button>
          )}
        </div>
        {files.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {files.map((f, i) => (
              <div key={i} className="relative w-full">
                <button
                  type="button"
                  onClick={() => openPreview(`data:${f.mimeType};base64,${f.data}`, f.name)}
                  className="block text-left"
                  aria-label={`Preview ${f.name}`}
                >
                  <NextImage
                    src={`data:${f.mimeType};base64,${f.data}`}
                    alt={f.name}
                    unoptimized
                    width={512}
                    height={512}
                    className="w-full h-auto rounded-md border border-black/10 dark:border-white/10 object-contain cursor-zoom-in"
                  />
                </button>
                <div className="mt-1 text-xs opacity-70 truncate">{f.name}</div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm opacity-80">Size</label>
          <select
            className="px-2 py-1 rounded-md bg-black/5 dark:bg-white/10"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          >
            <option value="256x256">256x256</option>
            <option value="512x512">512x512</option>
            <option value="1024x1024">1024x1024</option>
            <option value="1024x1536">1024x1536 (portrait)</option>
            <option value="1536x1024">1536x1024 (landscape)</option>
            <option value="1024x1792">1024x1792 (tall)</option>
            <option value="1792x1024">1792x1024 (wide)</option>
          </select>
          <label className="text-sm opacity-80">Count</label>
          <input
            type="number"
            min={1}
            max={4}
            className="w-16 px-2 py-1 rounded-md bg-black/5 dark:bg-white/10"
            value={n}
            onChange={(e) => setN(Math.max(1, Math.min(4, Number(e.target.value))))}
          />
          <button
            onClick={submit}
            disabled={loading}
            className="ml-auto rounded-md px-4 py-2 bg-foreground text-background disabled:opacity-50 w-full sm:w-auto"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4">
            <div className="mb-2 text-sm opacity-80">Prompt: {item.prompt}</div>
            {item.error ? (
              <div className="text-red-500 text-sm">{item.error}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {item.images.map((img, idx) => {
                  const src = img.url || (img.b64_json ? `data:image/png;base64,${img.b64_json}` : "");
                  return (
                    <div key={idx} className="relative w-full">
                      <button
                        type="button"
                        onClick={() => openPreview(src, item.prompt)}
                        className="block text-left"
                        aria-label="Preview generated image"
                      >
                        <NextImage
                          src={src}
                          alt={item.prompt}
                          unoptimized
                          width={1024}
                          height={1024}
                          className="w-full h-auto rounded-lg border border-black/10 dark:border-white/10 object-contain cursor-zoom-in"
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            className="absolute inset-0 bg-black/70"
            onClick={closePreview}
            aria-hidden="true"
          />
          <div className="relative z-10 max-w-[95vw] max-h-[90vh] w-auto bg-background text-foreground rounded-lg shadow-xl border border-black/20 dark:border-white/10 p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-sm truncate max-w-[60vw]" title={preview.alt}>{preview.alt}</div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadImage(preview.src, (preview.alt || "image").replace(/\s+/g, "_") + ".png")}
                  className="px-3 py-1.5 text-sm rounded-md bg-black/10 dark:bg-white/10"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await addImageToEditing(preview.src, preview.alt || "image.png");
                    closePreview();
                  }}
                  className="px-3 py-1.5 text-sm rounded-md bg-black/10 dark:bg-white/10"
                >
                  Use for editing
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="px-3 py-1.5 text-sm rounded-md bg-black/10 dark:bg-white/10"
                  aria-label="Close preview"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[75vh]">
              {/* Use a plain img to avoid Next.js layout constraints in a modal */}
              <img
                src={preview.src}
                alt={preview.alt}
                className="max-w-[90vw] max-h-[75vh] w-auto h-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
