import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tutor AI AyoTKA — Tanya Tutor & Bahas Soal",
  description:
    "Bimbingan interaktif bersama Tutor AI AyoTKA untuk memahami konsep soal dan langkah penyelesaian.",
  icons: {
    icon: "/logo.png",
  },
};

export default function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
