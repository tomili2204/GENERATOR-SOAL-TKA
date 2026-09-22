"use client";

import React, { useState, useEffect } from "react";
import { LatexPreview } from "@/components/ui/LatexPreview";
import { SvgIllustration } from "@/components/ui/SvgIllustration";
import { GambarIllustration } from "@/components/ui/GambarIllustration";
import { ValidatorNoteText } from "@/components/ui/ValidatorNoteText";
import { validateLatexDelimiters } from "@/lib/validations/latex";
import { StimulusSelector } from "@/components/pembuat/StimulusSelector";
import { SlotData } from "./PackageSlotGrid";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  Layers,
  Save,
  Send,
  Eye,
  Edit3,
  FileText,
  Image as ImageIcon,
  Wand2,
  Loader2,
} from "lucide-react";

interface SlotQuestionModalProps {
  slot: SlotData;
  packageData: {
    id: string;
    code: string;
    nama: string;
    jenjang: string;
    mapel: string;
    tipeSumber: "manual" | "ai";
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isValidator?: boolean;
  currentUserId: string;
}

export function SlotQuestionModal({
  slot,
  packageData,
  isOpen,
  onClose,
  onSuccess,
  isValidator = false,
  currentUserId,
}: SlotQuestionModalProps) {
  const q = slot.question;
  const b = slot.blueprint;

  // Mode: "view" (jika sudah terisi) atau "edit" (jika kosong / ingin edit / ganti)
  const [mode, setMode] = useState<"view" | "edit">(slot.isFilled && q?.status === "disetujui" ? "view" : slot.isFilled ? "view" : "edit");

  // State Form
  const [elemen, setElemen] = useState(q?.elemen || "Materi Pokok");
  const [subElemen, setSubElemen] = useState(q?.subElemen || "");
  const [kompetensi, setKompetensi] = useState(q?.kompetensi || b.levelKognitif);
  const [levelKognitif, setLevelKognitif] = useState(q?.levelKognitif || b.levelKognitif);
  const [tingkatKesulitan, setTingkatKesulitan] = useState(q?.tingkatKesulitan || b.tingkatKesulitan);
  const [bentukSoal, setBentukSoal] = useState(q?.bentukSoal || b.bentukSoal);
  const [jenisSoal, setJenisSoal] = useState<"tunggal" | "grup">(q?.jenisSoal || b.rekomendasiJenisSoal);
  const [stimulusId, setStimulusId] = useState<string | null>(q?.stimulusId || null);

  const [soalText, setSoalText] = useState(q?.payload?.soal_text || "");
  const [pembahasan, setPembahasan] = useState(q?.payload?.pembahasan || "");
  const [gambar, setGambar] = useState<any>(q?.payload?.gambar || null);

  // Perbaikan Otomatis oleh AI berdasarkan Catatan Validator
  const [isAiRevising, setIsAiRevising] = useState(false);
  const [aiError, setAiError] = useState("");

  // Form PG
  const [opsi, setOpsi] = useState(
    q?.payload?.opsi?.length
      ? q.payload.opsi
      : [
          { label: "A", text: "" },
          { label: "B", text: "" },
          { label: "C", text: "" },
          { label: "D", text: "" },
        ]
  );
  const [kunciJawaban, setKunciJawaban] = useState<string[]>(q?.payload?.kunci_jawaban || ["A"]);

  // Form PGK Kategori
  const [kategoriRespons, setKategoriRespons] = useState<string[]>(
    q?.payload?.kategori_respons?.length ? q.payload.kategori_respons : ["Benar", "Salah"]
  );
  const [pernyataan, setPernyataan] = useState<Array<{ no: number; text: string }>>(
    q?.payload?.pernyataan?.length
      ? q.payload.pernyataan
      : [
          { no: 1, text: "" },
          { no: 2, text: "" },
          { no: 3, text: "" },
        ]
  );

  // Status & Pesan
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Sinkronisasi saat slot berganti
  useEffect(() => {
    if (slot.isFilled && q) {
      setMode("view");
      setElemen(q.elemen || "Materi Pokok");
      setSubElemen(q.subElemen || "");
      setKompetensi(q.kompetensi || b.levelKognitif);
      setLevelKognitif(q.levelKognitif || b.levelKognitif);
      setTingkatKesulitan(q.tingkatKesulitan || b.tingkatKesulitan);
      setBentukSoal(q.bentukSoal || b.bentukSoal);
      setJenisSoal(q.jenisSoal || b.rekomendasiJenisSoal);
      setStimulusId(q.stimulusId || null);
      setSoalText(q.payload?.soal_text || "");
      setPembahasan(q.payload?.pembahasan || "");
      setGambar(q.payload?.gambar || null);
      setOpsi(
        q.payload?.opsi?.length
          ? q.payload.opsi
          : [
              { label: "A", text: "" },
              { label: "B", text: "" },
              { label: "C", text: "" },
              { label: "D", text: "" },
            ]
      );
      setKunciJawaban(q.payload?.kunci_jawaban || ["A"]);
      setPernyataan(
        q.payload?.pernyataan?.length
          ? q.payload.pernyataan
          : [
              { no: 1, text: "" },
              { no: 2, text: "" },
              { no: 3, text: "" },
            ]
      );
      setKategoriRespons(q.payload?.kategori_respons?.length ? q.payload.kategori_respons : ["Benar", "Salah"]);
    } else {
      setMode("edit");
      setElemen("Materi Pokok");
      setSubElemen("");
      setKompetensi(b.levelKognitif);
      setLevelKognitif(b.levelKognitif);
      setTingkatKesulitan(b.tingkatKesulitan);
      setBentukSoal(b.bentukSoal);
      setJenisSoal(b.rekomendasiJenisSoal);
      setStimulusId(null);
      setSoalText("");
      setPembahasan("");
      setGambar(null);
      setOpsi([
        { label: "A", text: "" },
        { label: "B", text: "" },
        { label: "C", text: "" },
        { label: "D", text: "" },
      ]);
      setKunciJawaban(["A"]);
    }
    setErrorMessage("");
  }, [slot]);

  if (!isOpen) return null;

  // Handler Submit Pengisian / Penggantian Slot
  const handleSubmitSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!soalText.trim()) {
      setErrorMessage("Teks soal wajib diisi.");
      return;
    }
    if (!pembahasan.trim()) {
      setErrorMessage("Teks pembahasan wajib diisi.");
      return;
    }
    if (jenisSoal === "grup" && !stimulusId) {
      setErrorMessage("Soal bertipe Grup wajib memilih stimulus bacaan/tabel.");
      return;
    }

    // Validasi KaTeX
    const vSoal = validateLatexDelimiters(soalText, "Teks Soal");
    if (!vSoal.valid) {
      setErrorMessage(vSoal.error!);
      return;
    }
    const vPem = validateLatexDelimiters(pembahasan, "Pembahasan");
    if (!vPem.valid) {
      setErrorMessage(vPem.error!);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/packages/${packageData.id}/slots/${slot.nomorUrut}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elemen,
          sub_elemen: subElemen,
          kompetensi,
          level_kognitif: levelKognitif,
          tingkat_kesulitan: tingkatKesulitan,
          bentuk_soal: bentukSoal,
          jenis_soal: jenisSoal,
          stimulus_id: jenisSoal === "grup" ? stimulusId : null,
          soal_text: soalText,
          pembahasan,
          gambar,
          opsi: bentukSoal !== "PGK_KATEGORI" ? opsi : [],
          pernyataan: bentukSoal === "PGK_KATEGORI" ? pernyataan : [],
          kategori_respons: bentukSoal === "PGK_KATEGORI" ? kategoriRespons : [],
          kunci_jawaban: kunciJawaban,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan slot soal.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Perbaikan Otomatis oleh AI berdasarkan Catatan Validator
  const handleAiRevise = async () => {
    setAiError("");
    setIsAiRevising(true);
    try {
      const res = await fetch(`/api/packages/${packageData.id}/slots/${slot.nomorUrut}/ai-revise`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memperoleh revisi dari AI.");
      }

      setSoalText(data.data.soal_text || "");
      setPembahasan(data.data.pembahasan || "");
      setGambar(data.data.gambar || null);
      if (bentukSoal === "PGK_KATEGORI") {
        if (data.data.pernyataan?.length) setPernyataan(data.data.pernyataan);
        if (data.data.kategori_respons?.length) setKategoriRespons(data.data.kategori_respons);
      } else if (data.data.opsi?.length) {
        setOpsi(data.data.opsi);
      }
      if (data.data.kunci_jawaban?.length) setKunciJawaban(data.data.kunci_jawaban);

      setMode("edit");
    } catch (err: any) {
      setAiError(err.message || "Gagal memperbaiki soal dengan AI.");
    } finally {
      setIsAiRevising(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-mono font-bold text-sm flex items-center justify-center">
              #{slot.nomorUrut.toString().padStart(2, "0")}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">
                  {packageData.code}-{slot.nomorUrut.toString().padStart(2, "0")}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {q?.bentukSoal || b.bentukSoal} • {q?.tingkatKesulitan || b.tingkatKesulitan}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {packageData.nama} • {b.levelKognitif}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {slot.isFilled &&
              !isValidator &&
              (q?.status === "direvisi" || q?.status === "perlu_revisi") &&
              q?.validationNotes && (
                <button
                  type="button"
                  onClick={handleAiRevise}
                  disabled={isAiRevising}
                  title="Minta AI membuat draf revisi berdasarkan catatan validator (tetap perlu Anda tinjau & simpan)"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isAiRevising ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isAiRevising ? "Memperbaiki..." : "Perbaiki dengan AI"}</span>
                </button>
              )}
            {slot.isFilled && q?.status !== "disetujui" && !isValidator && (
              <button
                type="button"
                onClick={() => setMode(mode === "view" ? "edit" : "view")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              >
                {mode === "view" ? (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{q?.status === "ditolak" ? "Ganti Soal" : "Edit / Perbaiki"}</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Preview</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner Alert jika Soal Ditolak atau Direvisi */}
        {slot.isFilled && q?.status === "ditolak" && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-start gap-2.5 text-xs text-rose-900 shrink-0">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <span className="font-bold block">Slot ini DITOLAK oleh Validator:</span>
              <ValidatorNoteText text={q.validationNotes || "Tidak memenuhi kriteria kelulusan naskah."} />
              <p className="text-rose-700 font-medium">
                👉 Silakan perbaiki atau unggah butir soal baru sebagai pengganti slot ini agar paket dapat lolos 30/30.
              </p>
            </div>
          </div>
        )}

        {slot.isFilled && (q?.status === "direvisi" || q?.status === "perlu_revisi") && (
          <div className="bg-orange-50 border-b border-orange-200 px-6 py-3 flex items-start gap-2.5 text-xs text-orange-900 shrink-0">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <span className="font-bold block">Catatan Perbaikan Validator:</span>
              <ValidatorNoteText text={q.validationNotes || "Perlu penyesuaian formula atau redaksi."} />
            </div>
          </div>
        )}

        {aiError && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-start gap-2.5 text-xs text-rose-900 shrink-0">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Perbaikan AI Gagal:</span>
              <span>{aiError}</span>
            </div>
          </div>
        )}

        {/* Isi Modal (Bisa Scroll) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {mode === "view" && q ? (
            /* ================= VIEW MODE ================= */
            <div className="space-y-6">
              {/* Stimulus jika ada */}
              {q.stimulus && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Stimulus: {q.stimulus.judul}</span>
                    </span>
                    <span className="font-mono text-slate-500">{q.stimulus.jumlahKata || 0} kata</span>
                  </div>
                  <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200/80 font-sans leading-relaxed whitespace-pre-wrap">
                    <LatexPreview content={q.stimulus.konten} />
                  </div>
                </div>
              )}

              {/* Teks Soal */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">
                  Teks Soal
                </label>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-sm font-sans leading-relaxed">
                  <LatexPreview content={q.payload?.soal_text || ""} />
                </div>
              </div>

              {/* Ilustrasi / Diagram Visual SVG jika ada */}
              {q.payload?.gambar && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Visualisasi / Diagram Pendukung
                    </span>
                    {q.payload.gambar.deskripsi_alt && (
                      <span className="text-[11px] text-slate-400 font-sans normal-case italic">
                        {q.payload.gambar.deskripsi_alt}
                      </span>
                    )}
                  </label>
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col items-center justify-center">
                    <GambarIllustration gambar={q.payload.gambar} />
                  </div>
                </div>
              )}

              {/* Opsi / Pernyataan */}
              {q.bentukSoal === "PGK_KATEGORI" ? (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">
                    Matriks Pernyataan & Kunci
                  </label>
                  <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-semibold font-mono">
                      <tr>
                        <th className="p-2.5 text-left">Pernyataan</th>
                        <th className="p-2.5 text-center w-32">Kunci Jawaban</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(q.payload?.pernyataan || []).map((item: any, idx: number) => {
                        const answer = q.payload?.kunci_jawaban?.[idx] || "-";
                        const isNegative =
                          answer === "Salah" ||
                          answer === "Tidak Sesuai" ||
                          answer === "Tidak" ||
                          answer === "False";
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5">
                              <LatexPreview content={item.text} />
                            </td>
                            <td
                              className={`p-2.5 text-center font-bold ${
                                isNegative
                                  ? "text-red-700 bg-red-50/50"
                                  : "text-emerald-700 bg-emerald-50/50"
                              }`}
                            >
                              {answer}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                      Pilihan Jawaban
                    </label>
                    {q.bentukSoal === "PGK_MCMA" && (
                      <span className="text-[11px] font-medium text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        Pilihan Ganda Kompleks (Bisa lebih dari 1 kunci jawaban benar)
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(q.payload?.opsi || []).map((op: any) => {
                      const isCorrect = q.payload?.kunci_jawaban?.includes(op.label);
                      return (
                        <div
                          key={op.label}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${
                            isCorrect
                              ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium"
                              : "bg-white border-slate-200 text-slate-800"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-md font-mono font-bold flex items-center justify-center shrink-0 ${
                              isCorrect ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {op.label}
                          </span>
                          <div className="flex-1 pt-0.5">
                            <LatexPreview content={op.text} />
                          </div>
                          {isCorrect && (
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider shrink-0 font-mono">
                              Kunci
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pembahasan */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">
                  Pembahasan & Solusi
                </label>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-sans leading-relaxed text-slate-800">
                  <LatexPreview content={q.payload?.pembahasan || "Belum ada pembahasan."} />
                </div>
              </div>
            </div>
          ) : (
            /* ================= EDIT / FILL MODE ================= */
            <form onSubmit={handleSubmitSlot} className="space-y-5">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Grid Taksonomi */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bentuk Soal</label>
                  <select
                    value={bentukSoal}
                    onChange={(e) => setBentukSoal(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold"
                  >
                    <option value="PG">PG (Pilihan Ganda)</option>
                    <option value="PGK_MCMA">PGK MCMA (Multi-Jawaban)</option>
                    <option value="PGK_KATEGORI">PGK Kategori (Matriks)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tingkat Kesulitan</label>
                  <select
                    value={tingkatKesulitan}
                    onChange={(e) => setTingkatKesulitan(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs capitalize"
                  >
                    <option value="rendah">Rendah (Easy)</option>
                    <option value="sedang">Sedang (Medium)</option>
                    <option value="tinggi">Tinggi (Hard)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jenis Soal</label>
                  <select
                    value={jenisSoal}
                    onChange={(e) => setJenisSoal(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs"
                  >
                    <option value="tunggal">Soal Tunggal (Tanpa Stimulus)</option>
                    <option value="grup">Soal Grup (Tautkan Stimulus)</option>
                  </select>
                </div>
              </div>

              {/* Pemilih Stimulus jika bertipe Grup */}
              {jenisSoal === "grup" && (
                <StimulusSelector
                  jenjang={packageData.jenjang}
                  mapel={packageData.mapel}
                  selectedStimulusId={stimulusId}
                  onSelectStimulus={(s) => setStimulusId(s ? s.id : null)}
                />
              )}

              {/* Editor Teks Soal dengan Live KaTeX */}
              <div>
                <label className="font-semibold text-slate-900 block mb-1.5 text-xs">
                  Teks Soal <span className="text-rose-500">*</span>{" "}
                  <span className="font-normal text-slate-400 font-mono text-[11px]">
                    (Gunakan $...$ untuk inline LaTeX dan $$...$$ untuk blok)
                  </span>
                </label>
                <textarea
                  rows={4}
                  value={soalText}
                  onChange={(e) => setSoalText(e.target.value)}
                  placeholder="Ketik soal di sini... contoh: Hitunglah nilai dari $x = \frac{a+b}{2}$"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
                {soalText && (
                  <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-sans">
                    <p className="text-[10px] font-mono text-slate-400 font-bold uppercase mb-1">Live Render:</p>
                    <LatexPreview content={soalText} />
                  </div>
                )}
              </div>

              {/* Pratinjau Ilustrasi (dipertahankan otomatis kecuali diganti lewat Perbaiki dengan AI) */}
              {gambar && gambar.tipe === "svg" && gambar.svg_content && (
                <div>
                  <label className="font-semibold text-slate-900 block mb-1.5 text-xs">
                    Ilustrasi / Diagram Pendukung
                  </label>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <SvgIllustration svgContent={gambar.svg_content} altText={gambar.deskripsi_alt} />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Ilustrasi ini dipertahankan otomatis saat disimpan. Gunakan tombol "Perbaiki dengan AI" di
                      pojok kanan atas bila catatan validator meminta perubahan visual.
                    </p>
                  </div>
                </div>
              )}

              {/* Opsi Jawaban (PG / PGK_MCMA) */}
              {bentukSoal !== "PGK_KATEGORI" ? (
                <div className="space-y-2">
                  <label className="font-semibold text-slate-900 block text-xs">
                    Pilihan Opsi & Kunci Jawaban <span className="text-rose-500">*</span>
                  </label>
                  {opsi.map((op: any, idx: number) => {
                    const isChecked = kunciJawaban.includes(op.label);
                    return (
                      <div key={op.label} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (bentukSoal === "PG") {
                              setKunciJawaban([op.label]);
                            } else {
                              // MCMA: Toggle checkbox
                              if (isChecked) {
                                setKunciJawaban(kunciJawaban.filter((k) => k !== op.label));
                              } else {
                                setKunciJawaban([...kunciJawaban, op.label]);
                              }
                            }
                          }}
                          className={`w-7 h-7 rounded font-mono font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                            isChecked ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {op.label}
                        </button>
                        <input
                          type="text"
                          value={op.text}
                          onChange={(e) => {
                            const newOpsi = [...opsi];
                            newOpsi[idx].text = e.target.value;
                            setOpsi(newOpsi);
                          }}
                          placeholder={`Teks pilihan ${op.label}...`}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 font-mono"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* PGK Kategori */
                <div className="space-y-3">
                  <label className="font-semibold text-slate-900 block text-xs">
                    Matriks Pernyataan & Kunci Respons <span className="text-rose-500">*</span>
                  </label>
                  {pernyataan.map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 text-xs font-mono font-bold text-slate-500">{idx + 1}.</span>
                      <input
                        type="text"
                        value={p.text}
                        onChange={(e) => {
                          const newP = [...pernyataan];
                          newP[idx].text = e.target.value;
                          setPernyataan(newP);
                        }}
                        placeholder={`Pernyataan baris ke-${idx + 1}...`}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                      />
                      <select
                        value={kunciJawaban[idx] || kategoriRespons[0]}
                        onChange={(e) => {
                          const newK = [...kunciJawaban];
                          newK[idx] = e.target.value;
                          setKunciJawaban(newK);
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono font-bold bg-white"
                      >
                        {kategoriRespons.map((kat) => (
                          <option key={kat} value={kat}>
                            {kat}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Pembahasan */}
              <div>
                <label className="font-semibold text-slate-900 block mb-1.5 text-xs">
                  Pembahasan / Solusi <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={pembahasan}
                  onChange={(e) => setPembahasan(e.target.value)}
                  placeholder="Langkah penyelesaian soal..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              {/* Tombol Simpan */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? "Menyimpan..." : "Simpan ke Slot Naskah"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
