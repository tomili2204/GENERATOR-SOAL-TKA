"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, Bot, User, Sparkles, Paperclip, ImageIcon } from "lucide-react";
import { renderLatexInText } from "@/lib/tutor/render-katex";

export interface TutorSoalProps {
  soalId?: string;
  jenjang?: string;
  mapel?: string;
  stimulus?: string;
  soal_text?: string;
  opsi?: Array<{ label: string; text: string }>;
  kunci_jawaban?: string | string[];
  pembahasan?: string;
  jawaban_siswa?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface TutorAiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  soalContext: TutorSoalProps;
}

export function TutorAiChatModal({ isOpen, onClose, soalContext }: TutorAiChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedName, setAttachedName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSoalDetail, setShowSoalDetail] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inisialisasi salam awal saat modal dibuka
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const salamAwal = soalContext.jawaban_siswa
        ? `Halo! Saya **Tutor AI AyoTKA**. Saya melihat kamu sedang memeriksa soal nomor ini. Kemarin kamu memilih jawaban **${soalContext.jawaban_siswa}**. Ada bagian mana yang ingin kita pelajari bersama? Kamu juga bisa kirim foto coretan/caramu jika ada! 😊`
        : `Halo! Saya **Tutor AI AyoTKA**. Siap membantu kamu memahami konsep dan langkah penyelesaian soal ini. Apa yang ingin kamu tanyakan? 😊`;
      
      setMessages([{ role: "assistant", content: salamAwal }]);
    }
  }, [isOpen, soalContext]);

  // Auto scroll ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, attachedImage]);

  if (!isOpen) return null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("Ukuran file maksimal 15 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage(event.target?.result as string);
      setAttachedName(file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSend(textToSend?: string) {
    const rawText = textToSend || input;
    const hasImage = !!attachedImage;
    const text = rawText.trim() || (hasImage ? "Tolong periksa foto cara pengerjaan saya ini." : "");

    if (!text && !hasImage) return;
    if (isLoading) return;

    const currentImg = attachedImage;
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text, image: currentImg || undefined },
    ];

    setMessages(newMessages);
    setInput("");
    setAttachedImage(null);
    setAttachedName(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soalId: soalContext.soalId,
          soalContext,
          jawaban_siswa: soalContext.jawaban_siswa,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
            images: m.image ? [m.image] : undefined,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.reply) {
        setMessages([...newMessages, { role: "assistant", content: data.data.reply }]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: `Maaf, Tutor AI mengalami kendala: ${data.error || "Gagal memproses jawaban."}. Silakan coba lagi sebentar ya!`,
          },
        ]);
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Maaf, terjadi gangguan jaringan. Silakan periksa koneksi internetmu dan coba lagi.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const quickPrompts = [
    { label: "🔍 Di mana salah saya?", prompt: `Saya kemarin menjawab ${soalContext.jawaban_siswa || "salah"}. Bisa jelaskan kenapa jawaban itu keliru tanpa langsung memberi kunci?` },
    { label: "💡 Langkah demi langkah", prompt: "Tolong pandu saya cara mengerjakan soal ini dari langkah paling awal." },
    { label: "📐 Rumus & Konsep", prompt: "Rumus atau konsep dasar apa yang sebenarnya dipakai untuk soal ini?" },
    { label: "✨ Contoh serupa", prompt: "Bisa berikan contoh soal serupa beserta angkanya yang lebih sederhana?" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl sm:rounded-l-3xl sm:border-l border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-600/10 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white sm:rounded-tl-3xl shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
              <Sparkles className="h-5 w-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Tutor AI AyoTKA
                <span className="rounded-full bg-emerald-400/25 px-2 py-0.5 text-[10px] font-semibold text-white border border-emerald-300/40">
                  Online
                </span>
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                {soalContext.jenjang || "TKA"} • {soalContext.mapel || "Pembahasan Soal"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white cursor-pointer"
            title="Tutup Chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Ringkasan Soal (Expandable) */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 truncate max-w-[280px]">
              📌 Soal: {soalContext.soal_text ? soalContext.soal_text.slice(0, 50) + "..." : "Soal TKA"}
            </span>
            <button
              onClick={() => setShowSoalDetail(!showSoalDetail)}
              className="text-blue-600 hover:text-blue-700 hover:underline font-semibold cursor-pointer"
            >
              {showSoalDetail ? "Sembunyikan" : "Lihat Soal"}
            </button>
          </div>

          {showSoalDetail && (
            <div className="mt-2.5 space-y-2 rounded-xl border border-slate-200 bg-white p-3.5 text-slate-800 shadow-xs">
              {soalContext.stimulus && (
                <div className="text-[11px] italic text-slate-600 border-l-2 border-blue-500 pl-2.5 py-0.5 bg-blue-50/50 rounded-r">
                  {soalContext.stimulus}
                </div>
              )}
              <div
                className="font-medium text-xs leading-relaxed text-slate-800"
                dangerouslySetInnerHTML={{
                  __html: renderLatexInText(soalContext.soal_text || ""),
                }}
              />
              {soalContext.opsi && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {soalContext.opsi.map((o) => (
                    <div
                      key={o.label}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] border ${
                        soalContext.jawaban_siswa === o.label
                          ? "border-red-400 bg-red-50 text-red-700 font-semibold"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="font-bold">{o.label}.</span> {o.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs mt-1">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs md:text-sm leading-relaxed shadow-xs ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none"
                    : "bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm"
                }`}
              >
                {/* Gambar terlampir di chat bubble */}
                {m.image && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-white/30 bg-black/10">
                    <a href={m.image} target="_blank" rel="noreferrer" title="Klik untuk memperbesar">
                      <img
                        src={m.image}
                        alt="Foto Coretan Siswa"
                        className="max-h-48 max-w-full rounded-lg object-contain bg-white/10 hover:opacity-90 transition"
                      />
                    </a>
                  </div>
                )}

                <div
                  className="space-y-1.5 prose prose-slate prose-xs md:prose-sm max-w-none text-slate-800 [&_pre]:bg-slate-900 [&_pre]:text-white [&_pre]:p-3 [&_pre]:rounded-xl [&_code]:text-indigo-600 [&_code]:bg-indigo-50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded"
                  dangerouslySetInnerHTML={{
                    __html: renderLatexInText(m.content),
                  }}
                />
              </div>
              {m.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 border border-blue-200 text-blue-700 shadow-xs font-bold text-xs mt-1">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 items-center text-slate-500 text-xs">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3.5 py-2.5 rounded-2xl rounded-bl-none border border-slate-200 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce"></span>
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
                <span className="ml-2 font-medium text-slate-600">Tutor AI sedang menganalisis foto & jawabanmu...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="border-t border-slate-100 bg-white px-4 py-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                disabled={isLoading}
                onClick={() => handleSend(p.prompt)}
                className="whitespace-nowrap rounded-full border border-blue-200 bg-blue-50/60 px-3 py-1 font-medium text-blue-700 transition hover:bg-blue-100 hover:border-blue-300 disabled:opacity-50 shadow-2xs cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Attachment Preview Tray */}
        {attachedImage && (
          <div className="px-4 py-2 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={attachedImage}
                alt="Preview"
                className="w-9 h-9 object-cover rounded-lg border border-slate-300 shadow-xs"
              />
              <div className="text-xs">
                <p className="font-semibold text-slate-800 truncate max-w-[200px]">{attachedName || "Foto Coretan"}</p>
                <p className="text-[10px] text-slate-400">Siap dianalisis oleh Tutor AI</p>
              </div>
            </div>
            <button
              onClick={() => {
                setAttachedImage(null);
                setAttachedName(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
              title="Batalkan foto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="border-t border-slate-200 p-3.5 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Tombol Upload Foto/Dokumen */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition shrink-0 cursor-pointer"
              title="Unggah foto coretan atau soal (Kamera/Galeri/PDF)"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={attachedImage ? "Tulis pesan untuk foto ini... (atau langsung Enter)" : "Tanyakan ke Tutor AI atau lampirkan foto caramu..."}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition-all"
            />

            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachedImage)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-1.5 text-center text-[10px] text-slate-400">
            Tutor AI dapat menganalisis foto tulisan tangan, rumus, coretan, dan buku soal.
          </div>
        </div>

      </div>
    </div>
  );
}
