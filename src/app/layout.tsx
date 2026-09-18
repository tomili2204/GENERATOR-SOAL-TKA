import type { Metadata } from "next";
import { Poppins, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "soal.ayotka.id — Panel Manajemen Soal AyoTKA",
  description: "Panel internal manajemen, validasi, dan bank soal Tes Kemampuan Akademik (TKA) untuk jenjang SD & SMP mata pelajaran Matematika dan Bahasa Indonesia.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${poppins.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
        {children}
      </body>
    </html>
  );
}
