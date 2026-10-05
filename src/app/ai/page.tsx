"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Send,
  Sparkles,
  BookOpen,
  Calculator,
  Compass,
  CheckCircle2,
  Copy,
  Menu,
  X,
  PenTool,
  RotateCcw,
  Paperclip,
  Image as ImageIcon,
  FileText,
  LogOut,
} from "lucide-react";
import { renderKatexWithMarkdown } from "@/lib/tutor/render-katex";
import katex from "katex";
import { AiLandingPage } from "@/components/ai/AiLandingPage";

const MATH_EQUATION_SYMBOLS = [
  { latex: "\\frac{a}{b}", insert: "$\\frac{a}{b}$", label: "Pecahan (Fractions)" },
  { latex: "\\sqrt{x}", insert: "$\\sqrt{x}$", label: "Akar Kuadrat (Square Root)" },
  { latex: "x^2", insert: "$x^2$", label: "Pangkat / Eksponen" },
  { latex: "x_n", insert: "$x_n$", label: "Indeks / Subskrip" },
  { latex: "\\times", insert: "$\\times$", label: "Perkalian" },
  { latex: "\\div", insert: "$\\div$", label: "Pembagian" },
  { latex: "\\pm", insert: "$\\pm$", label: "Plus Minus" },
  { latex: "\\le", insert: "$\\le$", label: "Kurang dari sama dengan" },
  { latex: "\\ge", insert: "$\\ge$", label: "Lebih dari sama dengan" },
  { latex: "\\neq", insert: "$\\neq$", label: "Tidak sama dengan" },
  { latex: "\\pi", insert: "$\\pi$", label: "Pi" },
  { latex: "^\\circ", insert: "$^\\circ$", label: "Derajat Sudut" },
  { latex: "\\angle A", insert: "$\\angle A$", label: "Sudut" },
  { latex: "\\in", insert: "$\\in$", label: "Elemen Himpunan" },
  { latex: "\\infty", insert: "$\\infty$", label: "Tak Hingga" },
];

interface AttachedFile {
  id: string;
  name: string;
  type: "image" | "document";
  dataUrl?: string; // Data URI base64
  textContent?: string;
  size: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  documents?: Array<{ name: string; content: string }>;
  attachedFiles?: AttachedFile[];
  modelUsed?: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  userId?: string;
  title: string;
  mode: "socratic" | "solver" | "literacy" | "creator";
  messages: ChatMessage[];
  updatedAt: string;
}

const MODES = [
  {
    id: "socratic" as const,
    label: "Tutor Sokrates (SD/SMP)",
    desc: "Bimbingan langkah demi langkah, sabar & melatih nalar anak",
    icon: Compass,
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "solver" as const,
    label: "Pemecah Soal & Trik Cepat",
    desc: "Langkah presisi, rumus kilat, dan trik nalar efisien",
    icon: Calculator,
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "literacy" as const,
    label: "Analisis Literasi & Wacana",
    desc: "Bedah teks, ide pokok, fakta vs opini, dan kosakata",
    icon: BookOpen,
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "creator" as const,
    label: "Asisten Pembuat Soal",
    desc: "Bantuan guru menyusun soal standar Kemendikdasmen",
    icon: PenTool,
    color: "from-rose-500 to-pink-600",
  },
];

const SUGGESTED_PROMPTS = [
  {
    mode: "socratic" as const,
    title: "Konsep Penjumlahan Pecahan",
    text: "Kak, tolong ajarkan cara mudah memahami penjumlahan pecahan berpenyebut beda seperti 1/3 + 1/4 dong.",
    icon: "🔢",
  },
  {
    mode: "solver" as const,
    title: "Trik Sudut Garis Sejajar",
    text: "Bagaimana trik cepat menentukan besar sudut sehadap, sepihak, dan bertolak belakang pada dua garis sejajar?",
    icon: "📐",
  },
  {
    mode: "literacy" as const,
    title: "Menemukan Ide Pokok Paragraf",
    text: "Bagaimana cara cepat membedakan antara gagasan utama, kalimat penjelas, dan simpulan dalam wacana panjang?",
    icon: "📖",
  },
  {
    mode: "solver" as const,
    title: "Trik Nalar Skala & Denah",
    text: "Ada cara gampang mengingat konversi satuan peta skala 1:250.000 ke jarak sebenarnya dalam km?",
    icon: "🎯",
  },
];

export default function AiPortalPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [activeMode, setActiveMode] = useState<"socratic" | "solver" | "literacy" | "creator">("socratic");
  const [inputText, setInputText] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; email?: string; roles?: string[] } | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Cek autentikasi sesi pengguna AyoTKA saat pertama kali halaman dimuat
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch((err) => {
        console.warn("Info profil pengguna:", err);
        setCurrentUser(null);
      })
      .finally(() => {
        setIsAuthChecking(false);
      });
  }, []);

  // 2. Muat sesi terisolasi per user (layaknya ChatGPT / Claude pribadi)
  useEffect(() => {
    if (!currentUser?.id) {
      setSessions([]);
      setCurrentSessionId("");
      return;
    }

    const userStorageKey = `ayotka_ai_chat_sessions_${currentUser.id}`;
    try {
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
          setActiveMode(parsed[0].mode || "socratic");
          return;
        }
      }
    } catch (e) {
      console.warn("Gagal membaca riwayat sesi user:", e);
    }

    // Jika member belum memiliki riwayat sesi, buat sesi perdana khusus user ini
    const initialId = "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const welcomeMsg: ChatMessage = {
      id: "msg_welcome_" + Date.now(),
      role: "assistant",
      content: `Halo **${currentUser.name || "Siswa AyoTKA"}**! 👋 Senang bertemu denganmu.\n\nAku adalah **Tutor AI AyoTKA**, siap menemanimu belajar mandiri, membedah soal-soal sulit, atau melatih pemahaman konsep TKA.\n\nAda materi pelajaran atau soal yang ingin kita pelajari bersama hari ini? Kamu bisa langsung mengetik pertanyaan atau mengunggah foto lembar soalmu! 📚✨`,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    const initialSession: ChatSession = {
      id: initialId,
      userId: currentUser.id,
      title: "Sesi Belajar Baru",
      mode: "socratic",
      messages: [welcomeMsg],
      updatedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setSessions([initialSession]);
    setCurrentSessionId(initialId);
    setActiveMode("socratic");
  }, [currentUser]);

  // 3. Simpan setiap perubahan sesi ke localStorage khusus user yang sedang login
  useEffect(() => {
    if (currentUser?.id && sessions.length > 0) {
      try {
        const userStorageKey = `ayotka_ai_chat_sessions_${currentUser.id}`;
        localStorage.setItem(userStorageKey, JSON.stringify(sessions));
      } catch (e) {
        console.warn("Gagal menyimpan sesi user ke localStorage:", e);
      }
    }
  }, [sessions, currentUser]);

  // Scroll otomatis ke bawah jika ada pesan baru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, currentSessionId, isLoading, attachments]);

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const currentMessages = currentSession?.messages || [];

  function createNewSession(mode: "socratic" | "solver" | "literacy" | "creator" = activeMode) {
    const newId = "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const newSession: ChatSession = {
      id: newId,
      userId: currentUser?.id,
      title: "Percakapan Baru",
      mode,
      messages: [],
      updatedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setActiveMode(mode);
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("Logout error:", err);
    }
    setCurrentUser(null);
    setSessions([]);
    setCurrentSessionId("");
  }

  function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (currentSessionId === id) {
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
        setActiveMode(remaining[0].mode);
      } else {
        createNewSession();
      }
    }
  }

  // Handle upload file (foto / dokumen)
  async function processFile(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      alert("Ukuran file maksimal 15 MB.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isTextDoc =
      file.type.includes("text") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".json");

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: "att_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            name: file.name,
            type: "image",
            dataUrl,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    } else if (isTextDoc) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = e.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: "att_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            name: file.name,
            type: "document",
            textContent,
            size: file.size,
          },
        ]);
      };
      reader.readAsText(file);
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      // PDF: baca sebagai data URL base64 agar bisa diproses langsung oleh vision/document model
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: "att_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            name: file.name,
            type: "document",
            dataUrl,
            textContent: `[File PDF terlampir: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    } else {
      // Format dokumen lain: baca sebagai teks jika memungkinkan
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || `[Dokumen: ${file.name}]`;
        setAttachments((prev) => [
          ...prev,
          {
            id: "att_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
            name: file.name,
            type: "document",
            textContent: text,
            size: file.size,
          },
        ]);
      };
      reader.readAsText(file);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(processFile);
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
        }
      }
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSendMessage(customText?: string) {
    const rawText = customText !== undefined ? customText : inputText;
    const hasAttachments = attachments.length > 0;
    const textToSend = rawText.trim() || (hasAttachments ? "Tolong analisis dan bantu saya menjawab soal pada lampiran ini." : "");

    if (!textToSend && !hasAttachments) return;
    if (isLoading) return;

    const currentAtts = [...attachments];
    setInputText("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Ekstrak images dan documents
    const imagePayloads: string[] = [];
    const documentPayloads: Array<{ name: string; content: string }> = [];

    currentAtts.forEach((att) => {
      if (att.type === "image" && att.dataUrl) {
        imagePayloads.push(att.dataUrl);
      } else if (att.type === "document") {
        documentPayloads.push({
          name: att.name,
          content: att.textContent || `[Dokumen ${att.name}]`,
        });
      }
    });

    const userMsg: ChatMessage = {
      id: "msg_" + Date.now(),
      role: "user",
      content: textToSend,
      images: imagePayloads.length > 0 ? imagePayloads : undefined,
      documents: documentPayloads.length > 0 ? documentPayloads : undefined,
      attachedFiles: currentAtts.length > 0 ? currentAtts : undefined,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    // Update state pesan user
    const updatedMessages = [...currentMessages, userMsg];
    let updatedTitle = currentSession?.title || "Percakapan";
    if (currentMessages.length === 0) {
      updatedTitle = (textToSend || currentAtts[0]?.name || "Diskusi").slice(0, 32);
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              title: updatedTitle,
              messages: updatedMessages,
              updatedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            }
          : s
      )
    );

    setIsLoading(true);

    try {
      // Kirim ke backend Tutor AI yang sudah mendukung Vision & Multimodal
      const res = await fetch("/api/ai/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soalContext: {
            mode: activeMode,
          },
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
            images: m.images,
            documents: m.documents,
          })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      const rawReply = data.reply || data.data?.reply;

      const assistantMsg: ChatMessage = {
        id: "msg_" + Date.now() + "_ai",
        role: "assistant",
        content: rawReply || "Maaf, tidak ada tanggapan yang dihasilkan.",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: [...updatedMessages, assistantMsg],
                updatedAt: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
              }
            : s
        )
      );
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: "msg_" + Date.now() + "_err",
        role: "assistant",
        content: `⚠️ Mohon maaf, terjadi kendala saat menghubungi server AI: ${err.message}. Silakan tekan tombol coba lagi atau kirim ulang pertanyaanmu.`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...updatedMessages, errorMsg] }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function insertSymbol(sym: string) {
    setInputText((prev) => prev + sym);
    textareaRef.current?.focus();
  }

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white mb-4 animate-pulse">
          <Sparkles className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-bold text-slate-800">Menghubungkan ke Portal AI AyoTKA...</p>
        <p className="text-xs text-slate-400 mt-1">Memeriksa status autentikasi member</p>
      </div>
    );
  }

  // Jika pengunjung bukan member / belum login, tampilkan Landing Page Penjelasan Tutor Online
  if (!currentUser) {
    return <AiLandingPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.docx,.doc,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* SIDEBAR (Light Theme) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200/90 flex flex-col shadow-sm transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                AyoTKA AI
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Tutor Cerdas
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">Portal Tutor Cerdas</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => createNewSession(activeMode)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Percakapan Baru
          </button>
        </div>

        {/* Persona / Mode Selector */}
        <div className="px-3 py-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5 block">
            Mode Bimbingan
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = activeMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveMode(m.id);
                    if (currentSession) {
                      setSessions((prev) =>
                        prev.map((s) => (s.id === currentSessionId ? { ...s, mode: m.id } : s))
                      );
                    }
                  }}
                  className={`p-2 rounded-xl text-left transition-all border flex flex-col gap-1 ${
                    isSelected
                      ? "bg-blue-50 border-blue-300 text-blue-700 font-semibold shadow-xs"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                  <span className="text-[11px] leading-tight">{m.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1 block">
            Riwayat Diskusi
          </label>
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-400 px-2 py-4 italic text-center">Belum ada percakapan</p>
          ) : (
            sessions.map((s) => {
              const isCurrent = s.id === currentSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setCurrentSessionId(s.id);
                    setActiveMode(s.mode || "socratic");
                  }}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isCurrent
                      ? "bg-blue-50/80 border-blue-200 text-blue-900 font-medium shadow-xs"
                      : "bg-transparent border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? "text-blue-600" : "text-slate-400"}`} />
                    <div className="truncate">
                      <p className="text-xs truncate">{s.title}</p>
                      <p className="text-[10px] text-slate-400">{s.updatedAt}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-opacity"
                    title="Hapus sesi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Profil Pengguna AyoTKA Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 ring-white">
                {(currentUser?.name || "Pengguna AyoTKA").trim().charAt(0).toUpperCase()}
              </div>
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                title="Aktif"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p
                  className="text-xs font-bold text-slate-800 truncate leading-tight"
                  title={currentUser?.name || "Pengguna AyoTKA"}
                >
                  {currentUser?.name || "Pengguna AyoTKA"}
                </p>
                <button
                  onClick={handleLogout}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                  title="Keluar dari akun member"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p
                  className="text-[10px] text-slate-500 truncate"
                  title={currentUser?.email || "Siswa AyoTKA"}
                >
                  {currentUser?.email || "Siswa AyoTKA"}
                </p>
                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100/80 border border-emerald-300 px-1 py-0.2 rounded-full shrink-0">
                  Member
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT CANVAS (Light Theme) */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/60">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs md:text-sm text-slate-800">
                {currentSession?.title || "Percakapan"}
              </span>
              <span className="hidden sm:inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                {MODES.find((m) => m.id === activeMode)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (currentSessionId) {
                  setSessions((prev) =>
                    prev.map((s) => (s.id === currentSessionId ? { ...s, messages: [] } : s))
                  );
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Bersihkan riwayat percakapan sesi ini"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bersihkan</span>
            </button>
          </div>
        </header>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {currentMessages.length === 0 ? (
            /* Empty State Hero */
            <div className="max-w-2xl mx-auto my-auto pt-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
                Halo! Mau Belajar Apa Hari Ini?
              </h2>
              <p className="text-xs md:text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
                Tutor AI AyoTKA siap membimbingmu memahami materi, rumus matematika, foto soal, dan dokumen materi secara bertahap & menyenangkan.
              </p>

              {/* Upload CTA Card */}
              <div className="max-w-md mx-auto mb-8 p-3 rounded-2xl bg-white border border-blue-200 shadow-xs flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Punya Foto Soal atau Dokumen?</p>
                    <p className="text-[11px] text-slate-500">Kamera HP, screenshot, atau file PDF/Word</p>
                  </div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 shadow-sm transition"
                >
                  Unggah Foto
                </button>
              </div>

              {/* Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {SUGGESTED_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveMode(p.mode);
                      handleSendMessage(p.text);
                    }}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 shadow-xs hover:shadow-md transition-all text-left group"
                  >
                    <div className="text-xl mb-1.5">{p.icon}</div>
                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-1">
                      {p.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {p.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Message List */
            currentMessages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl mx-auto ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm text-white mt-1">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-2xl px-5 py-3.5 text-xs md:text-sm leading-relaxed shadow-xs ${
                        isUser
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-blue-500/10"
                          : "bg-white border border-slate-200/90 text-slate-800 rounded-tl-sm shadow-sm"
                      }`}
                    >
                      {/* Tampilkan Lampiran di Pesan Siswa jika ada */}
                      {isUser && msg.attachedFiles && msg.attachedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2.5">
                          {msg.attachedFiles.map((att) => (
                            <div key={att.id} className="rounded-xl overflow-hidden border border-white/30 bg-black/10">
                              {att.type === "image" && att.dataUrl ? (
                                <a
                                  href={att.dataUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Klik untuk melihat foto ukuran penuh"
                                  className="block"
                                >
                                  <img
                                    src={att.dataUrl}
                                    alt={att.name}
                                    className="max-h-48 max-w-xs rounded-lg object-contain bg-white/10 hover:opacity-90 transition"
                                  />
                                </a>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-white">
                                  <FileText className="w-4 h-4 shrink-0 text-blue-200" />
                                  <span className="truncate max-w-[200px] font-medium">{att.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {isUser ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <div
                          className="prose prose-slate prose-sm max-w-none space-y-2 [&_p]:leading-relaxed [&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-xl [&_code]:text-indigo-600 [&_code]:bg-indigo-50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md"
                          dangerouslySetInnerHTML={{
                            __html: renderKatexWithMarkdown(msg.content),
                          }}
                        />
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400">
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-slate-400">Tutor AI</span>
                          <button
                            onClick={() => copyText(msg.id, msg.content)}
                            className="hover:text-slate-600 flex items-center gap-1 transition-colors ml-1"
                            title="Salin pesan"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600 font-medium">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div
                      className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0 text-xs font-bold text-blue-700 mt-1"
                      title={currentUser?.name || "Pengguna AyoTKA"}
                    >
                      {(currentUser?.name || "U").trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-3xl mx-auto justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm text-white">
                <Sparkles className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 shadow-xs">
                <span className="text-xs text-slate-600 font-medium">Tutor sedang menganalisis foto & menyusun langkah</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* BOTTOM INPUT COMPOSER (Light Theme) */}
        <div className="p-3 md:p-4 border-t border-slate-200 bg-white/95 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* MathType Equation Toolbar & Upload Quick Button */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                  <Calculator className="w-3.5 h-3.5 text-blue-500" />
                  Simbol:
                </span>
                {MATH_EQUATION_SYMBOLS.map((sym, idx) => {
                  let renderedHtml = "";
                  try {
                    renderedHtml = katex.renderToString(sym.latex, {
                      throwOnError: false,
                      displayMode: false,
                    });
                  } catch {
                    renderedHtml = sym.latex;
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertSymbol(sym.insert)}
                      title={`Sisipkan ${sym.label}`}
                      className="h-8 min-w-[34px] px-2 rounded-lg bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200/90 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0 text-xs active:scale-95"
                      dangerouslySetInnerHTML={{ __html: renderedHtml }}
                    />
                  );
                })}
              </div>

              {/* Upload Shortcut Tag */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold transition text-xs shrink-0 cursor-pointer shadow-2xs"
                title="Unggah foto soal atau file dokumen"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Foto/Dokumen</span>
              </button>
            </div>

            {/* Input Box Container */}
            <div className="relative bg-slate-50 border border-slate-300/90 rounded-2xl shadow-inner focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all overflow-hidden">
              
              {/* Attachment Previews Tray */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2.5 border-b border-slate-200 bg-white/80">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative group flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-slate-200 bg-white shadow-xs"
                    >
                      {att.type === "image" && att.dataUrl ? (
                        <img
                          src={att.dataUrl}
                          alt={att.name}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="max-w-[130px] truncate text-[11px]">
                        <p className="font-semibold text-slate-800 truncate">{att.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {(att.size / 1024).toFixed(0)} KB {att.type === "image" ? "• Foto" : "• Dokumen"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="w-5 h-5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors ml-1 cursor-pointer"
                        title="Hapus lampiran"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea & Buttons Row */}
              <div className="flex items-end gap-2 p-2">
                {/* Paperclip Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Lampirkan foto soal atau dokumen (PNG, JPG, PDF, TXT)"
                  className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={
                    attachments.length > 0
                      ? "Tambahkan catatan untuk foto/dokumen ini... (atau langsung Enter)"
                      : "Tanyakan konsep, ketik soal, atau unggah foto/dokumen... (Enter untuk kirim)"
                  }
                  rows={1}
                  className="flex-1 bg-transparent border-0 resize-none text-xs md:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 max-h-40 py-1.5 px-1"
                />

                <button
                  onClick={() => handleSendMessage()}
                  disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
                  className={`p-2.5 rounded-xl transition-all shrink-0 flex items-center justify-center ${
                    (inputText.trim() || attachments.length > 0) && !isLoading
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-95 cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center">
              Tutor AI AyoTKA dapat membaca foto soal tulisan tangan/cetak & dokumen • Bisa tekan Ctrl+V untuk tempel screenshot langsung
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
