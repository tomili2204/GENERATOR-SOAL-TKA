import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://ai.ayotka.id"),
  title: "AyoTKA AI | AI Belajar & Tutor Interaktif Ayo TKA",
  description:
    "Portal AI resmi AyoTKA untuk bimbingan belajar interaktif 24/7, pembedahan soal sulit, penjelasan konsep materi, dan persiapan Tes Kemampuan Akademik (TKA).",
  keywords: [
    "AyoTKA AI",
    "Ayo TKA AI",
    "Tutor AI AyoTKA",
    "AyoTKA",
    "Bimbingan Belajar AI",
    "Tutor Online TKA",
    "Tes Kemampuan Akademik",
  ],
  openGraph: {
    title: "AyoTKA AI | AI Belajar & Tutor Interaktif Ayo TKA",
    description:
      "Portal AI resmi AyoTKA untuk bimbingan belajar interaktif 24/7, pembedahan soal sulit, penjelasan konsep materi, dan persiapan Tes Kemampuan Akademik (TKA).",
    url: "https://ai.ayotka.id",
    siteName: "AyoTKA AI",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "AyoTKA AI - Asisten Belajar Pintar",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AyoTKA AI | AI Belajar & Tutor Interaktif Ayo TKA",
    description:
      "Portal AI resmi AyoTKA untuk bimbingan belajar interaktif 24/7, pembedahan soal sulit, penjelasan konsep materi, dan persiapan Tes Kemampuan Akademik (TKA).",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
  },
};

export default function AiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
