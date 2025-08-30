"use client";

import { useEffect, useState } from "react";

import NextImage from "next/image";
import { addHistory, getAllHistory, clearHistory as clearDb, deleteHistory } from "@/lib/storage/indexeddb";
import { ImageQuality, ImageSize } from "@/lib/providers/types";
import icon from "../icon.png";
import TypingEffect from "./TypingEffect";

type HistoryItem = {
  id: string;
  prompt: string;
  model: string;
  images: { url?: string; b64_json?: string }[];
  error?: string;
};

type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
type SampleImageSize = "1K" | "2K";
type PersonGeneration = "dont_allow" | "allow_adult" | "allow_all";
type OperationMode = "generate" | "edit";

export default function ChatUI() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [n, setN] = useState(1);
  const [files, setFiles] = useState<{ mimeType: string; data: string; name: string }[]>([]);
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const [enhancePrompt, setEnhancePrompt] = useState(false);
  const [model, setModel] = useState("openai/dall-e-3");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("low");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [sampleImageSize, setSampleImageSize] = useState<SampleImageSize>("1K");
  const [personGeneration, setPersonGeneration] = useState<PersonGeneration>("allow_adult");
  const [operationMode, setOperationMode] = useState<OperationMode>("generate");
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDropzone, setShowDropzone] = useState(false);

  const isImagen = model.startsWith("google/imagen-4.0");
  const isDalle3 = model.includes("dall-e-3");
  const isGptImage = model.includes("gpt-image-1");
  const supportsQuality = isDalle3 || isGptImage;
  const supportsSize = model.startsWith("openai/");
  const supportsCount = !isDalle3 && !isGptImage;
  const supportsFiles = model === "openai/gpt-image-1" || (model === "google/gemini-2.5-flash-image-preview" && operationMode === "generate") || (model === "google/gemini-2.5-flash-image-preview" && operationMode === "edit");
  
  // Operation mode constraints
  const canEdit = model === "openai/gpt-image-1";
  const requiresFiles = operationMode === "edit";

  // Auto-adjust quality when switching models
  useEffect(() => {
    if (isGptImage && (quality === "standard" || quality === "hd")) {
      setQuality("low");
    } else if (isDalle3 && (quality === "auto" || quality === "low" || quality === "medium" || quality === "high")) {
      setQuality("standard");
    }
  }, [model, isGptImage, isDalle3, quality]);

  // Auto-adjust size when switching models
  useEffect(() => {
    if (isGptImage && (size === "1024x1792" || size === "1792x1024")) {
      setSize("1024x1024");
    } else if (!isGptImage && (size === "1024x1536" || size === "1536x1024")) {
      setSize("1024x1024");
    }
  }, [model, isGptImage, size]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const records = await getAllHistory(50);
        if (!cancelled) {
          setItems(
            records.map((r) => ({
              id: r.id,
              prompt: r.prompt,
              images: r.images,
              error: r.error,
              model: r.model,
            }))
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
    let text = prompt.trim();
    
    // Validation based on operation mode
    if (operationMode === "generate" && !text) {
      alert("Please enter a prompt for image generation.");
      return;
    }
    if ((operationMode === "edit") && (!text || files.length === 0)) {
      alert("Please enter a prompt and upload at least one image for editing.");
      return;
    }
    
    setLoading(true);
    let errorMessage = "";
    try {
      if (enhancePrompt) {
        try {
          const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
          const geminiApiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=" + geminiApiKey;
          const geminiPrompt = `Rewrite the following prompt to be a single, highly descriptive prompt for image generation. Do not provide options or suggestions, just return the enhanced prompt only: ${text}`;
          const geminiRes = await fetch(geminiApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: geminiPrompt }
                  ]
                }
              ]
            }),
          });
          let geminiJson;
          try {
            geminiJson = await geminiRes.json();
          } catch {
            errorMessage = "Gemini API returned malformed response.";
            throw new Error(errorMessage);
          }
          if (geminiRes.ok && geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text) {
            text = geminiJson.candidates[0].content.parts[0].text;
          } else {
            errorMessage = geminiJson?.error?.message || "Gemini API error.";
            throw new Error(errorMessage);
          }
        } catch (err) {
          // fallback to original prompt, but record error
          if (!errorMessage) errorMessage = err instanceof Error ? err.message : "Gemini API error.";
        }
      }
      
      let res;
      if (operationMode === "generate") {
        res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text,
            n: supportsCount ? n : 1,
            model,
            size: supportsSize ? size : undefined,
            quality: supportsQuality ? quality : undefined,
            aspectRatio: isImagen ? aspectRatio : undefined,
            sampleImageSize: isImagen ? sampleImageSize : undefined,
            personGeneration: isImagen ? personGeneration : undefined,
            images: supportsFiles ? files.map(({ mimeType, data }) => ({ mimeType, data })) : undefined,
          }),
        });
      } else { // edit
        const formData = new FormData();
        formData.append("prompt", text);
        formData.append("model", model);
        formData.append("n", String(n));
        if (size) formData.append("size", size);
        if (quality) formData.append("quality", quality);
        formData.append("response_format", "b64_json");
        
        files.forEach((file) => {
          const blob = new Blob([Uint8Array.from(atob(file.data), c => c.charCodeAt(0))], { type: file.mimeType });
          formData.append(`image`, blob, file.name);
        });
        
        res = await fetch("/api/edit", {
          method: "POST",
          body: formData,
        });
      }
      let json;
      try {
        json = await res.json();
      } catch {
        errorMessage = "API returned malformed response.";
        throw new Error(errorMessage);
      }
      if (!res.ok || json?.error) {
        errorMessage = json?.error || `Request failed with status ${res.status}`;
        throw new Error(errorMessage);
      }
      const images = json.images as { url?: string; b64_json?: string }[];
      if (!images || !Array.isArray(images) || images.length === 0) {
        errorMessage = "No images returned. There may have been an error.";
        throw new Error(errorMessage);
      }
      const id = crypto.randomUUID();
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
      const rec = { id, prompt: text, model, images: persistedImages, createdAt: Date.now() };
      setItems((prev) => [{ id, prompt: text, model, images: images }, ...prev]);
      addHistory(rec).catch(() => {});
      setPrompt("");
      setFiles([]);
    } catch (e: unknown) {
      const id = crypto.randomUUID();
      const message = errorMessage || (e instanceof Error ? e.message : "Something went wrong");
      setItems((prev) => [{ id, prompt: text, model, images: [], error: message }, ...prev]);
      addHistory({ id, prompt: text, model, images: [], error: message, createdAt: Date.now() }).catch(
        () => {}
      );
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
              const result = reader.result as string;
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

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setShowDropzone(false);
    const list = e.dataTransfer.files;
    if (!list || list.length === 0) return;
    const filesArr = Array.from(list).slice(0, 3);
    const reads = await Promise.all(
      filesArr.map(
        (f) =>
          new Promise<{ mimeType: string; data: string; name: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(reader.error);
            reader.onload = () => {
              const result = reader.result as string;
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
    <div className="w-full max-w-5xl mx-auto flex flex-col px-2 sm:px-6 py-4 sm:py-8">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
        <div className="flex items-center gap-3">
          <TypingEffect text="Image Studio" className="text-2xl sm:text-4xl font-bold text-[var(--accent)] space-mono-bold" />
          <NextImage src={icon} alt="Image Studio Icon" width={180} height={180} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              if (window.confirm("Are you sure you want to clear the local history?")) {
                await clearDb().catch(() => {});
                setItems([]);
              }
            }}
            className="text-sm px-3 py-1 border-2 border-[var(--border-color)] bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] shadow-[2px_2px_0px_0px_var(--accent)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] text-[var(--foreground)]"
          >
            Clear History
          </button>
          <div className="hidden sm:block text-sm opacity-70 text-[var(--foreground)]">(stored locally)</div>
        </div>
      </header>

      <div className="glassmorphism flex flex-col gap-6 p-4 sm:p-8">
        {/* Operation Mode Selector */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium opacity-80">Operation</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOperationMode("generate")}
              className={`px-4 py-2 text-sm font-semibold border-2 border-[var(--border-color)] ${
                operationMode === "generate"
                  ? "bg-[var(--accent)] text-[var(--background)]"
                  : "bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] text-[var(--foreground)]"
              }`}
            >
              Generate
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canEdit) {
                  alert("Image editing is only available with OpenAI GPT Image 1 model.");
                  return;
                }
                setOperationMode("edit");
              }}
              disabled={!canEdit}
              className={`px-4 py-2 text-sm font-semibold border-2 border-[var(--border-color)] ${
                operationMode === "edit"
                  ? "bg-[var(--accent)] text-[var(--background)]"
                  : canEdit
                  ? "bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] text-[var(--foreground)]"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              Edit
            </button>
          </div>
        </div>

        {/* Operation Mode Description */}
        <div className="text-sm opacity-80 bg-[var(--input-bg)] p-3 border-2 border-[var(--border-color)] inset-shadow text-[var(--foreground)]">
          {operationMode === "generate" && "Create new images from text descriptions."}
          {operationMode === "edit" && "Modify existing images using text prompts. Upload images and describe the changes you want."}
        </div>

        <textarea
          className="w-full min-h-28 max-h-[40vh] p-4 bg-[var(--input-bg)] text-lg placeholder-gray-500 outline-none resize-y border-2 border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
          placeholder={
            operationMode === "generate"
              ? "Describe the image you want to create..."
              : "Describe how you want to modify the uploaded image(s)..."
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium opacity-80">
            {operationMode === "edit" ? "Images to edit" : "Attach images"}
          </label>
          <label
            htmlFor="file-upload"
            className={`px-4 py-2 text-sm font-semibold border-2 border-[var(--border-color)] ${
              !supportsFiles && !requiresFiles
                ? "opacity-50 cursor-not-allowed bg-gray-700"
                : "cursor-pointer bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] text-[var(--foreground)]"
            }`}
            title={
              operationMode === "edit"
                ? "Upload images to edit with your prompt"
                : supportsFiles
                ? "Attach images for editing"
                : "Select a model that supports image editing to enable this feature."
            }
          >
            Choose Files
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={onPickFiles}
            className="hidden"
            disabled={!supportsFiles && !requiresFiles}
          />
          <button
            type="button"
            onClick={() => setShowDropzone(!showDropzone)}
            className={`px-4 py-2 text-sm font-semibold border-2 border-[var(--border-color)] ${
              !supportsFiles && !requiresFiles
                ? "opacity-50 cursor-not-allowed bg-gray-700"
                : "cursor-pointer bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] text-[var(--foreground)]"
            }`}
            disabled={!supportsFiles && !requiresFiles}
          >
            Drag & Drop
          </button>
          {files.length > 0 && (
            <>
              <div
                className="text-sm opacity-70 truncate max-w-xs"
                title={files.map((f) => f.name).join(", ")}
              >
                {files.map((f) => f.name).join(", ")}
              </div>
              <button
                onClick={() => setFiles([])}
                className="ml-auto text-xs px-3 py-1 border-2 border-[var(--border-color)] bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] shadow-[2px_2px_0px_0px_var(--accent)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] text-[var(--foreground)]"
              >
                Clear
              </button>
            </>
          )}
        </div>
        {files.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {files.map((f, i) => (
              <div key={i} className="relative w-full group">
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
                    className="w-full h-auto border-2 border-[var(--border-color)] group-hover:border-[var(--accent)] transition-all object-contain cursor-zoom-in"
                  />
                </button>
                <div className="mt-2 text-xs opacity-70 truncate">{f.name}</div>
              </div>
            ))}
          </div>
        )}
        {showDropzone && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setShowDropzone(false)}
            className="w-full h-48 border-2 border-dashed border-[var(--border-color)] rounded-lg flex items-center justify-center text-center text-[var(--foreground)] bg-[var(--input-bg)]"
          >
            <p>Drop up to 3 image files here</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <label className="text-sm font-medium opacity-80">Model</label>
          <select
            className="px-3 py-2 bg-[var(--input-bg)] outline-none border-2 border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {operationMode === "edit" ? (
              <option value="openai/gpt-image-1">OpenAI GPT Image 1 (Editing)</option>
            ) : (
              <>
                <option value="openai/dall-e-3">OpenAI DALL-E 3</option>
                <option value="openai/gpt-image-1">OpenAI GPT Image 1</option>
                <option value="google/gemini-2.5-flash-image-preview">Google Gemini 2.5 Flash</option>
                <option value="google/imagen-4.0-generate-001">Google Imagen 4</option>
                <option value="google/imagen-4.0-ultra-generate-001">Google Imagen 4 Ultra</option>
                <option value="google/imagen-4.0-fast-generate-001">Google Imagen 4 Fast</option>
              </>
            )}
          </select>

          {isImagen && (
            <>
              <label className="text-sm font-medium opacity-80">Aspect Ratio</label>
              <select
                className="px-3 py-2 bg-[var(--input-bg)] outline-none border-2 border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              >
                <option value="1:1">1:1</option>
                <option value="3:4">3:4</option>
                <option value="4:3">4:3</option>
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
              </select>
              <label className="text-sm font-medium opacity-80">Image Size</label>
              <select
                className="px-3 py-2 bg-[var(--input-bg)] outline-none border-2 border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
                value={sampleImageSize}
                onChange={(e) => setSampleImageSize(e.target.value as SampleImageSize)}
              >
                <option value="1K">1K</option>
                <option value="2K">2K</option>
              </select>
              <label className="text-sm font-medium opacity-80">Person Generation</label>
              <select
                className="px-3 py-2 bg-[var(--input-bg)] outline-none border-2 border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
                value={personGeneration}
                onChange={(e) => setPersonGeneration(e.target.value as PersonGeneration)}
              >
                <option value="dont_allow">Don&apos;t Allow</option>
                <option value="allow_adult">Allow Adults</option>
                <option value="allow_all">Allow All</option>
              </select>
            </>
          )}

          {supportsSize && (
            <>
              <label className="text-sm font-medium opacity-80">Size</label>
              <select
                className="px-3 py-2 bg-[var(--input-bg)] outline-none border-2 border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
                value={size}
                onChange={(e) => setSize(e.target.value as ImageSize)}
              >
                <option value="1024x1024">1024x1024</option>
                {isGptImage ? (
                  <>
                    <option value="1024x1536">1024x1536</option>
                    <option value="1536x1024">1536x1024</option>
                  </>
                ) : (
                  <>
                    <option value="1024x1792">1024x1792</option>
                    <option value="1792x1024">1792x1024</option>
                  </>
                )}
              </select>
            </>
          )}

          {supportsQuality && (
            <>
              <label className="text-sm font-medium opacity-80">Quality</label>
              <select
                className="px-3 py-2 bg-[var(--input-bg)] outline-none border-2 border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
                value={quality}
                onChange={(e) => setQuality(e.target.value as ImageQuality)}
              >
                {isGptImage ? (
                  <>
                    <option value="auto">Auto</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </>
                ) : (
                  <>
                    <option value="standard">Standard</option>
                    <option value="hd">HD</option>
                  </>
                )}
              </select>
            </>
          )}

          <label className="text-sm font-medium opacity-80">Count</label>
          <input
            type="number"
            min={1}
            max={4}
            disabled={!supportsCount}
            className="w-20 px-3 py-2 bg-[var(--input-bg)] disabled:opacity-50 outline-none border-2 border-[var(--border-color)] focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
            value={n}
            onChange={(e) => setN(Math.max(1, Math.min(4, Number(e.target.value))))}
          />
          <div className="relative flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-medium opacity-80 cursor-pointer">
              <input
                type="checkbox"
                checked={enhancePrompt}
                onChange={(e) => setEnhancePrompt(e.target.checked)}
                className="h-5 w-5 appearance-none border-2 border-[var(--border-color)] bg-[var(--input-bg)] checked:bg-[var(--accent)] checked:after:content-['✓'] checked:text-[var(--background)] flex items-center justify-center"
              />
              Enhance Prompt
            </label>
            <button type="button" onClick={() => setShowTooltip(!showTooltip)} className="cursor-help">
              <svg className="w-5 h-5 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </button>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-sm text-[var(--foreground)] bg-[var(--background)] border-2 border-[var(--border-color)] shadow-[4px_4px_0px_0px_var(--accent)] z-10">
                This feature uses Google Gemini to enhance your prompt by making it more descriptive for better image generation.
                <button onClick={() => setShowTooltip(false)} className="absolute top-0 right-0 mt-1 mr-1 text-[var(--foreground)]">
                  &times;
                </button>
              </div>
            )}
          </div>
          <button
            onClick={submit}
            disabled={loading}
            className="ml-auto px-8 py-3 bg-[var(--accent)] text-[var(--background)] font-bold text-lg disabled:opacity-50 w-full sm:w-auto border-2 border-[var(--border-color)] shadow-[4px_4px_0px_0px_var(--accent)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="retro-spinner !w-6 !h-6 !border-2"></div>
                <span className="ml-2">{operationMode === "edit" ? "Editing…" : "Generating…"}</span>
              </div>
            ) : (
              operationMode === "edit" ? "Edit Image" : "Generate"
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {items.map((item) => (
          <div key={item.id} className="glassmorphism p-6">
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <div className="mb-4 text-sm opacity-70 leading-relaxed">
                  <span className="font-semibold text-[var(--accent)]">Model:</span> {item.model} <br />
                  <span className="font-semibold text-[var(--accent)]">Prompt:</span> {item.prompt}
                </div>
                {item.error ? (
                  <div className="text-[var(--error-text)] text-sm p-4 bg-[var(--error-bg)] border-2 border-[var(--error-border)]">{item.error}</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {item.images.map((img, idx) => {
                      const src = img.url || (img.b64_json ? `data:image/png;base64,${img.b64_json}` : "");
                      return (
                        <div key={idx} className="relative w-full group">
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
                              className="w-full h-auto border-2 border-[var(--border-color)] group-hover:border-[var(--accent)] transition-all object-contain cursor-zoom-in"
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm("Are you sure you want to delete this item?")) {
                    await deleteHistory(item.id).catch(() => {});
                    setItems((prev) => prev.filter((i) => i.id !== item.id));
                  }
                }}
                className="text-xs px-3 py-1 border-2 border-[var(--border-color)] bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] shadow-[2px_2px_0px_0px_var(--accent)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] text-[var(--foreground)]"
                aria-label="Delete item"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closePreview}
            aria-hidden="true"
          />
          <div className="glassmorphism relative z-10 max-w-4xl max-h-[90vh] w-full bg-[var(--background)] text-foreground p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-sm font-medium truncate flex-1" title={preview.alt}>{preview.alt}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadImage(preview.src, (preview.alt || "image").replace(/\s+/g, "_") + ".png")}
                  className="px-4 py-2 text-sm font-semibold border-2 border-[var(--border-color)] bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] text-[var(--foreground)]"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await addImageToEditing(preview.src, preview.alt || "image.png");
                    closePreview();
                  }}
                  disabled={!supportsFiles}
                  title={
                    supportsFiles
                      ? "Use this image for editing"
                      : "Select a model that supports image editing to enable this feature."
                  }
                  className="px-4 py-2 text-sm font-semibold border-2 border-[var(--border-color)] disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] text-[var(--foreground)]"
                >
                  Use for editing
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="px-4 py-2 text-sm border-2 border-[var(--border-color)] bg-[var(--button-bg)] hover:bg-[var(--button-hover-bg)] text-[var(--foreground)]"
                  aria-label="Close preview"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[75vh] flex justify-center items-center">
              {/* Use a plain img to avoid Next.js layout constraints in a modal */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.src}
                alt={preview.alt}
                className="max-w-full max-h-full w-auto h-auto object-contain border-2 border-[var(--border-color)]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
