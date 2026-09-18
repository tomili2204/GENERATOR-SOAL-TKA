"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Plus,
  Trash2,
  Eye,
  Edit3,
  Sparkles,
  Info,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { LatexPreview } from "@/components/ui/LatexPreview";
import { StimulusSelector, StimulusItem } from "./StimulusSelector";
import { validateLatexDelimiters } from "@/lib/validations/latex";
import {
  LEVEL_KOGNITIF_MATEMATIKA,
  LEVEL_KOGNITIF_BAHASA,
} from "@/lib/validations/question";

export function ManualQuestionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  // Metadata & Taksonomi
  const [jenjang, setJenjang] = useState<string>("SD/MI");
  const [mapel, setMapel] = useState<string>("Matematika");
  const [elemen, setElemen] = useState<string>("Bilangan");
  const [subElemen, setSubElemen] = useState<string>("Pecahan dan Desimal");
  const [kompetensi, setKompetensi] = useState<string>(
    "Menyelesaikan masalah yang berkaitan dengan penjumlahan pecahan berbeda penyebut"
  );
  const [temaKonteks, setTemaKonteks] = useState<string>("");
  const [levelKognitif, setLevelKognitif] = useState<string>("Aplikasi");
  const [tingkatKesulitan, setTingkatKesulitan] = useState<string>("sedang");
  const [bentukSoal, setBentukSoal] = useState<"PG" | "PGK_MCMA" | "PGK_KATEGORI">("PG");
  const [jenisSoal, setJenisSoal] = useState<"tunggal" | "grup">("tunggal");
  const [selectedStimulus, setSelectedStimulus] = useState<StimulusItem | null>(null);

  // Gambar
  const [hasGambar, setHasGambar] = useState<boolean>(false);
  const [gambarTipe, setGambarTipe] = useState<"url" | "svg" | "perlu_ilustrasi">("url");
  const [gambarUrl, setGambarUrl] = useState<string>("");
  const [gambarSvg, setGambarSvg] = useState<string>("");
  const [gambarAlt, setGambarAlt] = useState<string>("");

  // Konten Utama
  const [soalText, setSoalText] = useState<string>(
    "Hitunglah hasil dari operasi pecahan berikut:\n$$\\frac{2}{3} + \\frac{1}{4} = ...$$\n"
  );
  const [pembahasan, setPembahasan] = useState<string>(
    "Samakan penyebut dengan KPK(3, 4) = 12:\n$$\\frac{2}{3} = \\frac{8}{12}, \\quad \\frac{1}{4} = \\frac{3}{12}$$\nMaka:\n$$\\frac{8}{12} + \\frac{3}{12} = \\frac{11}{12}$$\nJadi jawaban yang benar adalah **11/12**."
  );

  // Tab editor / pratinjau
  const [activeTab, setActiveTab] = useState<"editor" | "preview" | "split">("split");

  // Format Jawaban untuk PG & PGK_MCMA
  const [opsiList, setOpsiList] = useState<Array<{ label: string; text: string }>>([
    { label: "A", text: "$\\frac{11}{12}$" },
    { label: "B", text: "$\\frac{3}{7}$" },
    { label: "C", text: "$\\frac{9}{12}$" },
    { label: "D", text: "$\\frac{5}{12}$" },
  ]);
  const [kunciJawabanList, setKunciJawabanList] = useState<string[]>(["A"]);

  // Format Jawaban untuk PGK_KATEGORI
  const [kategoriRespons, setKategoriRespons] = useState<string[]>(["Benar", "Salah"]);
  const [pernyataanList, setPernyataanList] = useState<Array<{ no: number; text: string }>>([
    { no: 1, text: "Nilai $\\frac{2}{3}$ lebih besar daripada $\\frac{1}{2}$." },
    { no: 2, text: "Penjumlahan $\\frac{1}{4} + \\frac{1}{4}$ sama dengan $\\frac{2}{8}$." },
    { no: 3, text: "Hasil dari $\\frac{2}{3} + \\frac{1}{4}$ lebih kecil daripada $1$." },
  ]);
  const [kunciKategori, setKunciKategori] = useState<string[]>(["Benar", "Salah", "Benar"]);

  // Status Form & Feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successData, setSuccessData] = useState<any>(null);

  // Nilai Tetap / Taksonomi Dinamis (dari Admin)
  const [availableMapels, setAvailableMapels] = useState<string[]>(["Matematika", "Bahasa Indonesia"]);
  const [availableElements, setAvailableElements] = useState<Array<{ id: string; jenjang: string; mapel: string; name: string }>>([]);

  // Ambil daftar mapel & elemen dinamis dari backend
  useEffect(() => {
    fetch("/api/taxonomy")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          if (json.data.mapels && json.data.mapels.length > 0) {
            setAvailableMapels(json.data.mapels);
          }
          if (json.data.elements && json.data.elements.length > 0) {
            setAvailableElements(json.data.elements);
          }
        }
      })
      .catch((err) => console.error("Error loading dynamic taxonomies:", err));
  }, []);

  // Update level kognitif otomatis saat ganti mapel jika tidak sesuai
  useEffect(() => {
    if (mapel.toLowerCase().includes("matematika")) {
      if (!LEVEL_KOGNITIF_MATEMATIKA.includes(levelKognitif as any)) {
        setLevelKognitif("Aplikasi");
        setTingkatKesulitan("sedang");
      }
    } else {
      if (!LEVEL_KOGNITIF_BAHASA.includes(levelKognitif as any)) {
        setLevelKognitif("Pemahaman Inferensial");
        setTingkatKesulitan("sedang");
      }
    }
  }, [mapel]);

  // Otomatisasi pemetaan tingkat kesulitan saat level kognitif berubah
  const handleLevelKognitifChange = (val: string) => {
    setLevelKognitif(val);
    if (val === "Pengetahuan dan Pemahaman" || val === "Pemahaman Tekstual") {
      setTingkatKesulitan("rendah");
    } else if (val === "Aplikasi" || val === "Pemahaman Inferensial") {
      setTingkatKesulitan("sedang");
    } else if (val === "Penalaran" || val === "Evaluasi dan Apresiasi") {
      setTingkatKesulitan("tinggi");
    }
  };

  // Muat data jika dalam mode edit
  useEffect(() => {
    if (editId) {
      setInitialLoading(true);
      fetch(`/api/questions/${editId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            const q = json.data;
            setJenjang(q.jenjang);
            setMapel(q.mapel);
            setElemen(q.elemen);
            setSubElemen(q.subElemen || "");
            setKompetensi(q.kompetensi || "");
            setLevelKognitif(q.levelKognitif || "Aplikasi");
            setTingkatKesulitan(q.tingkatKesulitan || "sedang");
            setBentukSoal(q.bentukSoal || "PG");
            setJenisSoal(q.jenisSoal || "tunggal");
            if (q.temaKonteks) setTemaKonteks(q.temaKonteks);
            if (q.stimulus) setSelectedStimulus(q.stimulus);

            const payload = q.payload || {};
            setSoalText(payload.soal_text || "");
            setPembahasan(payload.pembahasan || "");

            if (payload.gambar) {
              setHasGambar(true);
              setGambarTipe(payload.gambar.tipe || "url");
              setGambarUrl(payload.gambar.url || "");
              setGambarSvg(payload.gambar.svg_content || "");
              setGambarAlt(payload.gambar.deskripsi_alt || "");
            }

            if (payload.opsi && payload.opsi.length > 0) {
              setOpsiList(payload.opsi);
            }
            if (payload.pernyataan && payload.pernyataan.length > 0) {
              setPernyataanList(payload.pernyataan);
            }
            if (payload.kategori_respons && payload.kategori_respons.length > 0) {
              setKategoriRespons(payload.kategori_respons);
            }
            if (payload.kunci_jawaban) {
              if (q.bentukSoal === "PGK_KATEGORI") {
                setKunciKategori(payload.kunci_jawaban);
              } else {
                setKunciJawabanList(payload.kunci_jawaban);
              }
            }
          }
        })
        .catch((e) => console.error("Gagal memuat detail soal:", e))
        .finally(() => setInitialLoading(false));
    }
  }, [editId]);

  // Validasi LaTeX real-time
  const latexValidation = useMemo(() => {
    const textCheck = validateLatexDelimiters(soalText, "Teks Soal");
    if (!textCheck.valid) return textCheck;
    const pembCheck = validateLatexDelimiters(pembahasan, "Pembahasan");
    if (!pembCheck.valid) return pembCheck;
    return { valid: true };
  }, [soalText, pembahasan]);

  // Opsi Helpers
  const addOption = () => {
    const nextChar = String.fromCharCode(65 + opsiList.length);
    setOpsiList([...opsiList, { label: nextChar, text: "" }]);
  };

  const removeOption = (index: number) => {
    if (opsiList.length <= 2) return;
    const removedLabel = opsiList[index].label;
    const updated = opsiList.filter((_, i) => i !== index);
    setOpsiList(updated);
    setKunciJawabanList(kunciJawabanList.filter((k) => k !== removedLabel));
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const updated = [...opsiList];
    updated[index].text = text;
    setOpsiList(updated);
  };

  const toggleAnswerPG = (label: string) => {
    setKunciJawabanList([label]);
  };

  const toggleAnswerMCMA = (label: string) => {
    if (kunciJawabanList.includes(label)) {
      setKunciJawabanList(kunciJawabanList.filter((k) => k !== label));
    } else {
      setKunciJawabanList([...kunciJawabanList, label]);
    }
  };

  // Pernyataan Kategori Helpers
  const addPernyataan = () => {
    const nextNo = pernyataanList.length + 1;
    setPernyataanList([...pernyataanList, { no: nextNo, text: "" }]);
    setKunciKategori([...kunciKategori, kategoriRespons[0] || "Benar"]);
  };

  const removePernyataan = (index: number) => {
    if (pernyataanList.length <= 1) return;
    const updated = pernyataanList
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, no: i + 1 }));
    setPernyataanList(updated);
    setKunciKategori(kunciKategori.filter((_, i) => i !== index));
  };

  const handlePernyataanTextChange = (index: number, text: string) => {
    const updated = [...pernyataanList];
    updated[index].text = text;
    setPernyataanList(updated);
  };

  const handleSelectKategoriAnswer = (statementIdx: number, val: string) => {
    const updated = [...kunciKategori];
    updated[statementIdx] = val;
    setKunciKategori(updated);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    const kunci_jawaban = bentukSoal === "PGK_KATEGORI" ? kunciKategori : kunciJawabanList;

    const payloadBody = {
      jenjang,
      mapel,
      elemen,
      sub_elemen: subElemen,
      kompetensi,
      level_kognitif: levelKognitif,
      tingkat_kesulitan: tingkatKesulitan,
      bentuk_soal: bentukSoal,
      jenis_soal: jenisSoal,
      stimulus_id: jenisSoal === "grup" ? selectedStimulus?.id || null : null,
      soal_text: soalText,
      pembahasan,
      tema_konteks: temaKonteks.trim() || undefined,
      gambar: hasGambar
        ? {
            tipe: gambarTipe,
            url: gambarTipe === "url" ? gambarUrl : undefined,
            svg_content: gambarTipe === "svg" ? gambarSvg : undefined,
            deskripsi_alt: gambarAlt || "Ilustrasi soal",
          }
        : null,
      opsi: bentukSoal === "PG" || bentukSoal === "PGK_MCMA" ? opsiList : undefined,
      pernyataan: bentukSoal === "PGK_KATEGORI" ? pernyataanList : undefined,
      kategori_respons: bentukSoal === "PGK_KATEGORI" ? kategoriRespons : undefined,
      kunci_jawaban,
    };

    try {
      const url = editId ? `/api/questions/${editId}` : "/api/questions";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.errors && Array.isArray(json.errors)) {
          setErrors(json.errors);
        } else {
          setErrors([json.error || "Gagal menyimpan soal."]);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      setSuccessData(json.data || { code: "Berhasil Diperbarui" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setErrors([err.message || "Terjadi kesalahan pada jaringan."]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
        <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2"></div>
        <p>Memuat data butir soal...</p>
      </div>
    );
  }

  // Jika Berhasil Disimpan
  if (successData) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs max-w-2xl mx-auto my-6 text-center animate-in fade-in zoom-in-95">
        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          {editId ? "Pembaruan Soal Berhasil Diajukan" : "Soal Berhasil Diunggah!"}
        </h3>
        <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
          Soal telah tersimpan di sistem dengan status{" "}
          <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            menunggu_validasi
          </span>{" "}
          dan sumber{" "}
          <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
            manual_upload
          </span>
          .
        </p>

        {successData.code && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg inline-block font-mono text-xs text-slate-800">
            Kode Butir Soal: <strong>{successData.code}</strong>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSuccessData(null);
              if (editId) {
                router.push("/pembuat/my-soal");
              } else {
                setSoalText("");
                setPembahasan("");
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {editId ? "Kembali ke Koleksi Soal" : "Unggah Soal Baru Lainnya"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/pembuat/my-soal")}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <span>Lihat di Soal Milik Saya</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Banner Notifikasi Error Backend */}
      {errors.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-rose-900">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Validasi Penyimpanan Gagal ({errors.length} masalah):</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-5 text-[11.5px]">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Bagian 1: Taksonomi & Kisi-Kisi (Dropdown Terstandarisasi) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              1. Taksonomi & Pemetaan Kisi-Kisi
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Bidang Bertanda Dropdown Wajib Sesuai Standar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Jenjang */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Jenjang Sasaran <span className="text-rose-500">*</span>
            </label>
            <select
              value={jenjang}
              onChange={(e) => setJenjang(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="SD/MI">SD / MI</option>
              <option value="SMP/MTs">SMP / MTs</option>
              <option value="SMA/MA">SMA / MA</option>
              <option value="SMK/MAK">SMK / MAK</option>
            </select>
          </div>

          {/* Mapel */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <select
              value={mapel}
              onChange={(e) => setMapel(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {availableMapels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Level Kognitif (Dinamis per Mapel) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Level Kognitif <span className="text-rose-500">*</span>
            </label>
            <select
              value={levelKognitif}
              onChange={(e) => handleLevelKognitifChange(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {mapel.toLowerCase().includes("matematika")
                ? LEVEL_KOGNITIF_MATEMATIKA.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))
                : LEVEL_KOGNITIF_BAHASA.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
            </select>
          </div>

          {/* Tingkat Kesulitan */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Tingkat Kesulitan <span className="text-rose-500">*</span>
            </label>
            <select
              value={tingkatKesulitan}
              onChange={(e) => setTingkatKesulitan(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="rendah">Rendah (Mudah)</option>
              <option value="sedang">Sedang</option>
              <option value="tinggi">Tinggi (HOTS)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Elemen Materi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              list="elemen-suggestions"
              value={elemen}
              onChange={(e) => setElemen(e.target.value)}
              placeholder="Contoh: Bilangan / Geometri / Pemahaman Tekstual"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <datalist id="elemen-suggestions">
              {availableElements
                .filter((el) => !el.mapel || el.mapel.toLowerCase() === mapel.toLowerCase())
                .map((el) => (
                  <option key={el.id} value={el.name}>
                    {el.name} ({el.mapel})
                  </option>
                ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Sub Elemen <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={subElemen}
              onChange={(e) => setSubElemen(e.target.value)}
              placeholder="Contoh: Operasi Pecahan / Menentukan Ide Pokok"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Redaksi Kompetensi (Kisi-Kisi) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={kompetensi}
              onChange={(e) => setKompetensi(e.target.value)}
              placeholder="Contoh: Peserta didik mampu menghitung..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
            <span>Tema Konteks / Latar Cerita Soal</span>
            <span className="text-[10px] text-slate-400 font-normal">Opsional (2-5 kata, misal: koperasi simpan pinjam sekolah, tambak garam Madura)</span>
          </label>
          <input
            type="text"
            value={temaKonteks}
            onChange={(e) => setTemaKonteks(e.target.value)}
            placeholder="Contoh: koperasi sekolah / panen raya padi sawah / tambak garam"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Bagian 2: Tipe & Bentuk Soal serta Stimulus */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              2. Bentuk Soal & Tipe Penyajian
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Bentuk Soal <span className="text-rose-500">*</span>
            </label>
            <select
              value={bentukSoal}
              onChange={(e) => {
                const val = e.target.value as any;
                setBentukSoal(val);
                if (val === "PG" && kunciJawabanList.length > 1) {
                  setKunciJawabanList([kunciJawabanList[0] || "A"]);
                }
              }}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
            >
              <option value="PG">Pilihan Ganda (PG Tunggal - 1 Kunci)</option>
              <option value="PGK_MCMA">PGK MCMA (Pilihan Ganda Kompleks - Multi Kunci)</option>
              <option value="PGK_KATEGORI">PGK Kategori (Matriks Benar-Salah / Sesuai-Tidak Sesuai)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Jenis Soal <span className="text-rose-500">*</span>
            </label>
            <select
              value={jenisSoal}
              onChange={(e) => {
                const val = e.target.value as any;
                setJenisSoal(val);
                if (val === "tunggal") setSelectedStimulus(null);
              }}
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="tunggal">Soal Tunggal (Mandiri tanpa stimulus grup)</option>
              <option value="grup">Soal Grup (Wajib terhubung ke Stimulus Bacaan/Data)</option>
            </select>
          </div>
        </div>

        {/* Kondisional: Pemilih Stimulus jika jenis_soal = 'grup' */}
        {jenisSoal === "grup" && (
          <StimulusSelector
            jenjang={jenjang}
            mapel={mapel}
            selectedStimulusId={selectedStimulus?.id || null}
            onSelectStimulus={(st) => setSelectedStimulus(st)}
          />
        )}
      </div>

      {/* Bagian 3: Editor Teks Soal & Pratinjau Real-Time KaTeX */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              3. Teks Soal & Pratinjau Real-Time
            </h3>
          </div>

          {/* Indikator Keseimbangan Delimiter LaTeX */}
          <div className="flex items-center gap-2">
            {latexValidation.valid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                LaTeX Delimiter Seimbang ($ / $$)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 animate-pulse">
                <AlertCircle className="w-3 h-3" />
                {latexValidation.error}
              </span>
            )}

            {/* Toggle View Mode */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("editor")}
                className={`px-2.5 py-1 rounded ${
                  activeTab === "editor"
                    ? "bg-white text-indigo-700 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("split")}
                className={`px-2.5 py-1 rounded ${
                  activeTab === "split"
                    ? "bg-white text-indigo-700 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-2.5 py-1 rounded ${
                  activeTab === "preview"
                    ? "bg-white text-indigo-700 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pratinjau
              </button>
            </div>
          </div>
        </div>

        <p className="text-[11.5px] text-slate-500">
          Gunakan <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-600">$...$</code> untuk rumus inline dan <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-600">$$...$$</code> untuk rumus blok matematika. Tabel Markdown (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">| col1 | col2 |</code>) juga didukung secara otomatis.
        </p>

        {/* Editor Layout Sesuai Mode */}
        <div
          className={`grid gap-4 ${
            activeTab === "split" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {(activeTab === "editor" || activeTab === "split") && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1">
                <span>Input Teks Soal:</span>
                <span>{soalText.length} karakter</span>
              </div>
              <textarea
                rows={7}
                value={soalText}
                onChange={(e) => setSoalText(e.target.value)}
                placeholder="Tuliskan butir soal di sini..."
                className="w-full font-mono text-xs border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          )}

          {(activeTab === "preview" || activeTab === "split") && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[160px] flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Hasil Render KaTeX Soal:
              </span>
              <div className="flex-1 bg-white border border-slate-200/80 rounded p-3 overflow-y-auto max-h-[180px]">
                <LatexPreview content={soalText || "_Belum ada teks soal._"} />
              </div>
            </div>
          )}
        </div>

        {/* Gambar Tambahan (Opsional) */}
        <div className="pt-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={hasGambar}
              onChange={(e) => setHasGambar(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Sertakan Ilustrasi Gambar / Diagram SVG</span>
          </label>

          {hasGambar && (
            <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Tipe Gambar
                  </label>
                  <select
                    value={gambarTipe}
                    onChange={(e) => setGambarTipe(e.target.value as any)}
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="url">URL Gambar Eksternal</option>
                    <option value="svg">Konten Mentah SVG</option>
                    <option value="perlu_ilustrasi">Tandai: Perlu Dibuatkan Ilustrasi</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Deskripsi Alt Gambar (Aksesibilitas)
                  </label>
                  <input
                    type="text"
                    value={gambarAlt}
                    onChange={(e) => setGambarAlt(e.target.value)}
                    placeholder="Contoh: Diagram lingkaran proporsi nilai siswa"
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                  />
                </div>
              </div>

              {gambarTipe === "url" && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    URL Gambar (HTTPS)
                  </label>
                  <input
                    type="url"
                    value={gambarUrl}
                    onChange={(e) => setGambarUrl(e.target.value)}
                    placeholder="https://domain.com/path/gambar.png"
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                  />
                </div>
              )}

              {gambarTipe === "svg" && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Konten Kode SVG
                  </label>
                  <textarea
                    rows={3}
                    value={gambarSvg}
                    onChange={(e) => setGambarSvg(e.target.value)}
                    placeholder="<svg ...>...</svg>"
                    className="w-full font-mono text-xs bg-white border border-slate-300 rounded p-2 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bagian 4: Format Opsi / Jawaban Dinamis Berdasarkan Bentuk Soal */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              4. Opsi & Kunci Jawaban (Bentuk: {bentukSoal})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {bentukSoal === "PG" && "Pilih tepat 1 radio untuk kunci jawaban benar"}
            {bentukSoal === "PGK_MCMA" && "Centang satu atau lebih kotak untuk kunci jawaban benar"}
            {bentukSoal === "PGK_KATEGORI" && "Pilih kategori respons untuk setiap butir pernyataan"}
          </span>
        </div>

        {/* Kasus A: PG & PGK_MCMA */}
        {(bentukSoal === "PG" || bentukSoal === "PGK_MCMA") && (
          <div className="space-y-3">
            {opsiList.map((op, idx) => {
              const isChecked = kunciJawabanList.includes(op.label);

              return (
                <div
                  key={op.label}
                  className={`p-3 rounded-lg border transition-colors flex items-start gap-3 ${
                    isChecked
                      ? "bg-indigo-50/50 border-indigo-300"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Selector Radio atau Checkbox */}
                  <div className="pt-2">
                    {bentukSoal === "PG" ? (
                      <input
                        type="radio"
                        name="answer_pg"
                        checked={isChecked}
                        onChange={() => toggleAnswerPG(op.label)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAnswerMCMA(op.label)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  {/* Label Opsi */}
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-1.5 rounded border border-slate-200 shrink-0 mt-0.5">
                    {op.label}
                  </span>

                  {/* Input Teks Opsi & Live Pratinjau */}
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={op.text}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      placeholder={`Teks pilihan opsi ${op.label} (mendukung $...$)`}
                      className="w-full text-xs font-mono border border-slate-300 rounded px-3 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    {op.text && (
                      <div className="text-xs bg-slate-50 border border-slate-200/80 rounded px-2.5 py-1">
                        <LatexPreview content={op.text} />
                      </div>
                    )}
                  </div>

                  {/* Tombol Hapus Opsi */}
                  {opsiList.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded transition-colors"
                      title="Hapus opsi ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-3 py-1.5 rounded-lg shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Pilihan Opsi ({String.fromCharCode(65 + opsiList.length)})
              </button>

              <div className="text-[11px] font-mono text-slate-500">
                Kunci Jawaban Terpilih:{" "}
                <strong className="text-indigo-700">
                  {kunciJawabanList.length > 0 ? kunciJawabanList.join(", ") : "Belum Dipilih"}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Kasus B: PGK_KATEGORI (Matriks Pernyataan & Kategori Respons) */}
        {bentukSoal === "PGK_KATEGORI" && (
          <div className="space-y-4">
            {/* Konfigurasi Kategori Respons */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Kategori Respons:</span>
                <div className="flex items-center gap-1.5">
                  {kategoriRespons.map((kat, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded font-mono font-medium text-indigo-700 bg-white border border-indigo-200"
                    >
                      {kat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preset Tombol */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px]">Preset:</span>
                <button
                  type="button"
                  onClick={() => {
                    setKategoriRespons(["Benar", "Salah"]);
                    setKunciKategori(pernyataanList.map(() => "Benar"));
                  }}
                  className="px-2 py-0.5 text-[11px] bg-white border border-slate-300 rounded hover:bg-slate-100"
                >
                  Benar / Salah
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKategoriRespons(["Sesuai", "Tidak Sesuai"]);
                    setKunciKategori(pernyataanList.map(() => "Sesuai"));
                  }}
                  className="px-2 py-0.5 text-[11px] bg-white border border-slate-300 rounded hover:bg-slate-100"
                >
                  Sesuai / Tidak Sesuai
                </button>
              </div>
            </div>

            {/* Matriks Tabel Pernyataan */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-100/80 border-b border-slate-200 font-semibold text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3">Teks Pernyataan (Mendukung KaTeX)</th>
                    {kategoriRespons.map((kat) => (
                      <th key={kat} className="py-2.5 px-3 w-28 text-center bg-slate-50 font-mono">
                        {kat}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 w-12 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pernyataanList.map((item, idx) => (
                    <tr key={item.no} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                        {item.no}
                      </td>
                      <td className="py-2.5 px-3 space-y-1">
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => handlePernyataanTextChange(idx, e.target.value)}
                          placeholder={`Pernyataan nomor ${item.no}...`}
                          className="w-full text-xs font-mono border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                        {item.text && (
                          <div className="text-[11.5px] bg-slate-50 p-1.5 rounded border border-slate-200/60">
                            <LatexPreview content={item.text} />
                          </div>
                        )}
                      </td>
                      {kategoriRespons.map((kat) => (
                        <td key={kat} className="py-2.5 px-3 text-center bg-slate-50/40">
                          <input
                            type="radio"
                            name={`kategori_${item.no}`}
                            checked={kunciKategori[idx] === kat}
                            onChange={() => handleSelectKategoriAnswer(idx, kat)}
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-center">
                        {pernyataanList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePernyataan(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            title="Hapus baris ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={addPernyataan}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-3 py-1.5 rounded-lg shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Baris Pernyataan
              </button>

              <div className="text-[11px] font-mono text-slate-500">
                Kunci Terpilih:{" "}
                <strong className="text-indigo-700">
                  [{kunciKategori.join(", ")}]
                </strong>{" "}
                ({kunciKategori.length} respons)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bagian 5: Pembahasan Soal & KaTeX Preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              5. Pembahasan Lengkap & KaTeX
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Mendukung rumus LaTeX & Markdown
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <textarea
              rows={6}
              value={pembahasan}
              onChange={(e) => setPembahasan(e.target.value)}
              placeholder="Tuliskan pembahasan sistematis butir soal di sini..."
              className="w-full font-mono text-xs border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-y-auto max-h-[160px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Pratinjau Pembahasan:
            </span>
            <LatexPreview content={pembahasan || "_Belum ada teks pembahasan._"} />
          </div>
        </div>
      </div>

      {/* Bagian 6: Penegakan Aturan Backend & Tombol Aksi */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-0.5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Penegakan Integritas Backend:</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Soal akan otomatis berstatus{" "}
            <span className="font-semibold text-amber-800">menunggu_validasi</span> dan sumber{" "}
            <span className="font-mono text-slate-700">manual_upload</span>. Tidak dapat diedit sepihak setelah disetujui.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => router.push("/pembuat/my-soal")}
            className="px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || !latexValidation.valid}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{loading ? "Menyimpan..." : editId ? "Simpan Perubahan Soal" : "Unggah & Ajukan Soal"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
