import { UserRoleType, QuestionStatusType, PaketSoalStatusType, JenjangType, MapelType } from "@/db/schema";
import {
  LayoutDashboard,
  Users,
  Cpu,
  Bookmark,
  FileQuestion,
  History,
  UploadCloud,
  CheckSquare,
  ShieldCheck,
  LucideIcon,
  Package,
  Layers,
  FolderCheck,
  Wallet,
  UserCheck,
  Coins,
  Rocket,
} from "lucide-react";

export interface RoleConfig {
  key: UserRoleType;
  label: string;
  badgeLabel: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  description: string;
}

export const ROLE_CONFIGS: Record<UserRoleType, RoleConfig> = {
  admin: {
    key: "admin",
    label: "Administrator",
    badgeLabel: "Admin",
    bgClass: "bg-indigo-50",
    textClass: "text-indigo-700",
    borderClass: "border-indigo-200",
    dotClass: "bg-indigo-600",
    description: "Mengelola pengguna, peran, konfigurasi auto-generate, taksonomi, dan audit log.",
  },
  pembuat_soal: {
    key: "pembuat_soal",
    label: "Pembuat Soal",
    badgeLabel: "Pembuat Soal",
    bgClass: "bg-violet-50",
    textClass: "text-violet-700",
    borderClass: "border-violet-200",
    dotClass: "bg-violet-600",
    description: "Mengunggah dan mengedit soal manual miliknya sendiri yang belum disetujui.",
  },
  validator_soal: {
    key: "validator_soal",
    label: "Validator Soal",
    badgeLabel: "Validator",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
    dotClass: "bg-emerald-600",
    description: "Memeriksa antrean soal menunggu validasi dan memberikan keputusan telaah.",
  },
};

export interface StatusConfig {
  key: QuestionStatusType;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
}

export const STATUS_CONFIGS: Record<QuestionStatusType, StatusConfig> = {
  draft: {
    key: "draft",
    label: "Draft",
    bgClass: "bg-slate-100",
    textClass: "text-slate-700",
    borderClass: "border-slate-200",
    dotClass: "bg-slate-400",
  },
  menunggu_validasi: {
    key: "menunggu_validasi",
    label: "Menunggu Validasi",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    borderClass: "border-amber-200",
    dotClass: "bg-amber-500",
  },
  disetujui: {
    key: "disetujui",
    label: "Disetujui",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-800",
    borderClass: "border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  direvisi: {
    key: "direvisi",
    label: "Direvisi",
    bgClass: "bg-orange-50",
    textClass: "text-orange-800",
    borderClass: "border-orange-200",
    dotClass: "bg-orange-500",
  },
  perlu_revisi: {
    key: "perlu_revisi",
    label: "Perlu Revisi",
    bgClass: "bg-orange-50",
    textClass: "text-orange-800",
    borderClass: "border-orange-200",
    dotClass: "bg-orange-500",
  },
  ditolak: {
    key: "ditolak",
    label: "Ditolak",
    bgClass: "bg-rose-50",
    textClass: "text-rose-800",
    borderClass: "border-rose-200",
    dotClass: "bg-rose-500",
  },
};

export interface PackageStatusConfig {
  key: PaketSoalStatusType;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  badgeText: string;
}

export const PACKAGE_STATUS_CONFIGS: Record<PaketSoalStatusType, PackageStatusConfig> = {
  draft: {
    key: "draft",
    label: "Draft",
    bgClass: "bg-slate-100",
    textClass: "text-slate-700",
    borderClass: "border-slate-300",
    dotClass: "bg-slate-400",
    badgeText: "Draft (Belum 30 Slot)",
  },
  dalam_validasi: {
    key: "dalam_validasi",
    label: "Dalam Validasi",
    bgClass: "bg-amber-50",
    textClass: "text-amber-800",
    borderClass: "border-amber-300",
    dotClass: "bg-amber-500",
    badgeText: "Dalam Validasi (30 Slot Lengkap)",
  },
  perlu_revisi: {
    key: "perlu_revisi",
    label: "Perlu Revisi / Pengganti",
    bgClass: "bg-orange-50",
    textClass: "text-orange-800",
    borderClass: "border-orange-300",
    dotClass: "bg-orange-500",
    badgeText: "Perlu Revisi / Pengganti",
  },
  siap_rilis: {
    key: "siap_rilis",
    label: "Siap Rilis",
    bgClass: "bg-indigo-50",
    textClass: "text-indigo-800",
    borderClass: "border-indigo-300",
    dotClass: "bg-indigo-600",
    badgeText: "Siap Rilis (100% Lolos)",
  },
  diterbitkan: {
    key: "diterbitkan",
    label: "Diterbitkan",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-800",
    borderClass: "border-emerald-300",
    dotClass: "bg-emerald-600",
    badgeText: "Diterbitkan (Tayang ke Siswa)",
  },
};

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: UserRoleType[];
  section: "Ringkasan" | "Pembuat Soal" | "Validator Soal" | "Administrator";
  badgeCountKey?: string;
}

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  {
    title: "Beranda Panel",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "pembuat_soal", "validator_soal"],
    section: "Ringkasan",
  },
  // Menu Pembuat Soal
  {
    title: "Manajemen Paket (H)",
    href: "/pembuat/paket",
    icon: Package,
    roles: ["pembuat_soal"],
    section: "Pembuat Soal",
  },
  {
    title: "Unggah Soal Satuan",
    href: "/pembuat/upload",
    icon: UploadCloud,
    roles: ["pembuat_soal"],
    section: "Pembuat Soal",
  },
  {
    title: "Soal Milik Saya",
    href: "/pembuat/my-soal",
    icon: FileQuestion,
    roles: ["pembuat_soal"],
    section: "Pembuat Soal",
  },
  // Menu Validator Soal
  {
    title: "Telaah Per Paket",
    href: "/validator/paket",
    icon: FolderCheck,
    roles: ["validator_soal"],
    section: "Validator Soal",
  },
  {
    title: "Antrean Butir Soal",
    href: "/validator/antrean",
    icon: CheckSquare,
    roles: ["validator_soal"],
    section: "Validator Soal",
  },
  {
    title: "Riwayat Validasi",
    href: "/validator/riwayat",
    icon: History,
    roles: ["validator_soal"],
    section: "Validator Soal",
  },
  // Menu Administrator
  {
    title: "Pengguna & Peran",
    href: "/admin/users",
    icon: Users,
    roles: ["admin"],
    section: "Administrator",
  },
  {
    title: "Toggle Generator Otomatis",
    href: "/admin/generator",
    icon: Cpu,
    roles: ["admin"],
    section: "Administrator",
  },
  {
    title: "Nilai Tetap & Taksonomi",
    href: "/admin/taxonomy",
    icon: Bookmark,
    roles: ["admin"],
    section: "Administrator",
  },
  {
    title: "Semua Soal & Paket",
    href: "/admin/all-soal",
    icon: FileQuestion,
    roles: ["admin"],
    section: "Administrator",
  },
  {
    title: "Penugasan Paket Soal",
    href: "/admin/penugasan",
    icon: UserCheck,
    roles: ["admin"],
    section: "Administrator",
  },
  {
    title: "Paket Siap Rilis",
    href: "/admin/siap-rilis",
    icon: Rocket,
    roles: ["admin"],
    section: "Administrator",
  },
  {
    title: "Besaran Biaya (Tarif)",
    href: "/admin/tarif",
    icon: Coins,
    roles: ["admin"],
    section: "Administrator",
  },
  {
    title: "Laporan Validasi & HR",
    href: "/admin/honorarium",
    icon: Wallet,
    roles: ["admin"],
    section: "Administrator",
  },
  {
    title: "Log Audit Aktivitas",
    href: "/admin/audit-log",
    icon: ShieldCheck,
    roles: ["admin"],
    section: "Administrator",
  },
];
