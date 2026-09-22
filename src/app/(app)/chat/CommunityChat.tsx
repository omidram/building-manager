"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatDateTime } from "@/lib/format";
import { FileText, ImagePlus, Pencil, Send, Smile, X } from "lucide-react";

export type ChatMsg = {
  id: string;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  editedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  author: {
    id: string;
    name: string;
    unit: string | null;
    role: string;
    avatarHue: number;
  };
};

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤔",
  "👍", "👎", "👏", "🙏", "🔥", "✨", "✅", "❌", "❤️", "💙",
  "🎉", "🏠", "🔑", "🛠️", "📢", "💬", "📌", "⏰", "🌙", "☀️",
];

function toIso(value: string | Date | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.toISOString();
}

function normalize(m: ChatMsg): ChatMsg {
  return {
    ...m,
    createdAt: toIso(m.createdAt)!,
    updatedAt: toIso(m.updatedAt) || undefined,
    editedAt: toIso(m.editedAt),
  };
}

export function CommunityChat({
  initialMessages,
  currentUserId,
}: {
  initialMessages: ChatMsg[];
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages.map(normalize));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idsRef = useRef(new Set(initialMessages.map((m) => m.id)));
  const afterRef = useRef(
    initialMessages.length ? normalize(initialMessages[initialMessages.length - 1]!).createdAt : new Date(0).toISOString(),
  );
  const sinceRef = useRef(afterRef.current);

  const upsert = useCallback((incoming: ChatMsg[]) => {
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const raw of incoming) {
        const m = normalize(raw);
        idsRef.current.add(m.id);
        map.set(m.id, m);
        if (m.createdAt > afterRef.current) afterRef.current = m.createdAt;
        if (m.updatedAt && m.updatedAt > sinceRef.current) sinceRef.current = m.updatedAt;
      }
      return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    let stopped = false;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const pollOnce = async () => {
      try {
        const [createdRes, updatedRes] = await Promise.all([
          fetch(`/api/chat?after=${encodeURIComponent(afterRef.current)}`),
          fetch(`/api/chat?since=${encodeURIComponent(sinceRef.current)}`),
        ]);
        if (createdRes.ok) {
          const data = (await createdRes.json()) as ChatMsg[];
          if (data.length) upsert(data);
        }
        if (updatedRes.ok) {
          const data = (await updatedRes.json()) as ChatMsg[];
          if (data.length) upsert(data);
        }
      } catch {
        /* ignore */
      }
    };

    const startPoll = () => {
      if (pollTimer || stopped) return;
      setLive(false);
      pollTimer = setInterval(pollOnce, 1800);
      void pollOnce();
    };

    try {
      es = new EventSource(
        `/api/chat/stream?after=${encodeURIComponent(afterRef.current)}&since=${encodeURIComponent(sinceRef.current)}`,
      );
      es.addEventListener("ready", () => {
        if (!stopped) setLive(true);
      });
      es.addEventListener("messages", (ev) => {
        try {
          upsert(JSON.parse((ev as MessageEvent).data) as ChatMsg[]);
        } catch {
          /* ignore */
        }
      });
      es.addEventListener("updates", (ev) => {
        try {
          upsert(JSON.parse((ev as MessageEvent).data) as ChatMsg[]);
        } catch {
          /* ignore */
        }
      });
      es.onerror = () => {
        es?.close();
        es = null;
        if (!stopped) startPoll();
      };
    } catch {
      startPoll();
    }

    return () => {
      stopped = true;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [upsert]);

  function onPickFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    if (f?.type.startsWith("image/")) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if ((!body && !file) || sending) return;
    setSending(true);
    setShowEmoji(false);
    try {
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.set("body", body);
        fd.set("file", file);
        res = await fetch("/api/chat", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
      }
      if (res.ok) {
        upsert([await res.json()]);
        setText("");
        onPickFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    } finally {
      setSending(false);
    }
  }

  async function saveEdit(id: string) {
    const body = editText.trim();
    if (!body) return;
    const res = await fetch(`/api/chat/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      upsert([await res.json()]);
      setEditingId(null);
      setEditText("");
    }
  }

  return (
    <div className="flex h-[min(74vh,760px)] flex-col overflow-hidden rounded-[1.5rem] border border-line bg-elevated shadow-[var(--shadow)]">
      <div className="flex items-center justify-between border-b border-line bg-sky/50 px-4 py-3">
        <div>
          <p className="font-semibold text-teal-deep">گروه ساختمان</p>
          <p className="text-xs text-muted">چت همگانی با امکان ویرایش، فایل و ایموجی</p>
        </div>
        <span className={`badge ${live ? "bg-teal-soft text-teal" : "bg-gold-soft text-gold"}`}>
          {live ? "زنده" : "همگام‌سازی…"}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-sky/30 to-transparent px-4 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">هنوز پیامی نیست. اولین نفر باشید!</p>
        )}
        {messages.map((m) => {
          const mine = m.author.id === currentUserId;
          const isImage = Boolean(m.attachmentType?.startsWith("image/") && m.attachmentUrl);
          return (
            <div key={m.id} className={`group flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <div
                className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                style={{ background: `hsl(${m.author.avatarHue} 55% 42%)` }}
              >
                {m.author.name.slice(0, 1)}
              </div>
              <div className="max-w-[min(85%,30rem)]">
                <div className={`mb-1 flex flex-wrap items-center gap-2 text-[11px] text-muted ${mine ? "justify-end" : ""}`}>
                  <span className="font-semibold text-ink">{m.author.name}</span>
                  {m.author.unit && <span>{m.author.unit}</span>}
                  {m.author.role === "MANAGER" && <span className="badge bg-gold-soft text-gold">مدیر</span>}
                  <span>{formatDateTime(m.createdAt)}</span>
                  {m.editedAt && <span className="opacity-70">(ویرایش‌شده)</span>}
                  {mine && editingId !== m.id && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 opacity-70 hover:opacity-100"
                      onClick={() => {
                        setEditingId(m.id);
                        setEditText(m.body);
                      }}
                    >
                      <Pencil size={12} />
                      ویرایش
                    </button>
                  )}
                </div>

                {editingId === m.id ? (
                  <div className="space-y-2 rounded-2xl border border-line bg-elevated p-3">
                    <textarea
                      className="field min-h-20"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      maxLength={2000}
                    />
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-primary text-xs" onClick={() => saveEdit(m.id)}>
                        ذخیره
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary text-xs"
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-7 ${
                      mine
                        ? "rounded-tl-md bg-[var(--chat-mine)] text-[var(--chat-mine-text)]"
                        : "rounded-tr-md border border-line bg-elevated text-ink"
                    }`}
                  >
                    {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                    {isImage && m.attachmentUrl && (
                      <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl">
                        <Image
                          src={m.attachmentUrl}
                          alt={m.attachmentName || "پیوست"}
                          width={360}
                          height={240}
                          className="max-h-56 w-auto rounded-xl object-cover"
                          unoptimized
                        />
                      </a>
                    )}
                    {!isImage && m.attachmentUrl && (
                      <a
                        href={m.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`mt-2 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
                          mine ? "bg-white/15" : "bg-sky"
                        }`}
                      >
                        <FileText size={14} />
                        {m.attachmentName || "دانلود فایل"}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {file && (
        <div className="flex items-center gap-3 border-t border-line bg-sky/40 px-4 py-2 text-xs">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <FileText size={18} className="text-teal" />
          )}
          <span className="flex-1 truncate text-muted">{file.name}</span>
          <button type="button" className="text-coral" onClick={() => onPickFile(null)} aria-label="حذف فایل">
            <X size={16} />
          </button>
        </div>
      )}

      {showEmoji && (
        <div className="grid grid-cols-10 gap-1 border-t border-line bg-elevated px-3 py-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="rounded-lg p-1 text-lg hover:bg-sky"
              onClick={() => {
                setText((t) => t + e);
                inputRef.current?.focus();
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-line bg-elevated p-3">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="btn btn-secondary shrink-0 px-3"
          onClick={() => setShowEmoji((v) => !v)}
          aria-label="ایموجی"
        >
          <Smile size={16} />
        </button>
        <button
          type="button"
          className="btn btn-secondary shrink-0 px-3"
          onClick={() => fileRef.current?.click()}
          aria-label="ارسال فایل"
        >
          <ImagePlus size={16} />
        </button>
        <input
          ref={inputRef}
          className="field flex-1"
          placeholder="پیام، ایموجی یا فایل…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          autoComplete="off"
        />
        <button className="btn btn-primary shrink-0 px-4" disabled={sending || (!text.trim() && !file)} type="submit">
          <Send size={16} />
          ارسال
        </button>
      </form>
    </div>
  );
}
