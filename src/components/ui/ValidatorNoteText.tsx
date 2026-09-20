interface ValidatorNoteTextProps {
  text: string;
  className?: string;
}

/**
 * Validator sering menulis beberapa poin catatan dalam satu baris tanpa jeda baris
 * (mis. "1. ... 2. ... 3. ..."), sehingga tampil sebagai satu paragraf panjang yang
 * sulit dibaca. Fungsi ini memecahnya jadi daftar bernomor bila polanya terdeteksi,
 * dan tetap menampilkan teks apa adanya (dengan baris baru dihormati) bila tidak.
 */
function splitNumberedNotes(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(/\s+(?=\d{1,2}\.\s)/g)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [trimmed];
}

export function ValidatorNoteText({ text, className = "" }: ValidatorNoteTextProps) {
  const items = splitNumberedNotes(text || "");

  if (items.length === 0) {
    return null;
  }

  if (items.length === 1) {
    return <p className={`whitespace-pre-line leading-relaxed ${className}`}>{items[0]}</p>;
  }

  return (
    <ol className={`list-decimal list-outside pl-4 space-y-1 leading-relaxed ${className}`}>
      {items.map((item, i) => (
        <li key={i}>{item.replace(/^\d{1,2}\.\s*/, "")}</li>
      ))}
    </ol>
  );
}

export default ValidatorNoteText;
