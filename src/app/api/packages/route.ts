import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questionPackages, questions, auditLogs, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { hasRole, hasAnyRole } from "@/lib/auth/roles";
import { eq, and, desc, count, inArray } from "drizzle-orm";
import { generatePackageCode, calculatePackageStatus, getStandard30SlotBlueprint } from "@/lib/validations/package-blueprint";
import { getJenjangVariants } from "@/lib/jenjang-utils";

// GET /api/packages - Mengambil daftar paket beserta agregasi progres 30 slot
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jenjang = searchParams.get("jenjang");
    const mapel = searchParams.get("mapel");
    const tipeSumber = searchParams.get("tipeSumber") || searchParams.get("tipe_sumber");
    const status = searchParams.get("status");
    const authorOnly = searchParams.get("authorOnly") === "true";
    const assignedOnly = searchParams.get("assignedOnly") === "true" || searchParams.get("assignedToMe") === "true";
    const assignedValidatorId = searchParams.get("assignedValidatorId");

    // Query daftar paket
    let query = db.select().from(questionPackages);
    const conditions = [];

    if (jenjang && jenjang !== "all") {
      const variants = getJenjangVariants(jenjang);
      conditions.push(inArray(questionPackages.jenjang, variants as any));
    }
    if (mapel && mapel !== "all") {
      conditions.push(eq(questionPackages.mapel, mapel));
    }
    if (tipeSumber && tipeSumber !== "all") {
      conditions.push(eq(questionPackages.tipeSumber, tipeSumber as any));
    }
    if (status && status !== "all") {
      conditions.push(eq(questionPackages.status, status as any));
    }

    // Role-based Access & Assignment Filtering:
    if (assignedValidatorId) {
      // Filter eksplisit ID validator tertentu (khusus admin atau validator bersangkutan)
      if (hasRole(user, "admin") || user.id === assignedValidatorId) {
        conditions.push(eq(questionPackages.assignedValidatorId, assignedValidatorId));
      } else {
        conditions.push(eq(questionPackages.assignedValidatorId, user.id));
      }
    } else if (authorOnly) {
      // Khusus workspace Pembuat Soal: hanya paket ciptaan sendiri
      conditions.push(eq(questionPackages.authorId, user.id));
    } else if (assignedOnly) {
      // Eksplisit minta hanya paket yang ditugaskan ke user ini
      conditions.push(eq(questionPackages.assignedValidatorId, user.id));
    } else if (!hasRole(user, "admin")) {
      // Pengguna non-admin (misal: Dr. Tomi Listiawan):
      // Jika memiliki peran validator_soal, defaultnya adalah HANYA menampilkan paket yang ditugaskan kepadanya!
      if (hasRole(user, "validator_soal")) {
        conditions.push(eq(questionPackages.assignedValidatorId, user.id));
      } else {
        conditions.push(eq(questionPackages.authorId, user.id));
      }
    }

    const packagesList = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(questionPackages.createdAt))
      : await query.orderBy(desc(questionPackages.createdAt));

    const allUsers: any[] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        instansi: users.instansi,
      })
      .from(users);

    const userMap = new Map(allUsers.map((u: any) => [u.id, u]));

    // Ambil agregasi butir soal per paket
    const enrichedPackages = await Promise.all(
      packagesList.map(async (pkg: any) => {
        const pkgQuestions = await db
          .select({
            id: questions.id,
            nomorUrut: questions.nomorUrut,
            status: questions.status,
          })
          .from(questions)
          .where(eq(questions.paketId, pkg.id));

        const calculation = calculatePackageStatus(pkgQuestions, pkg.status);

        // Perbarui status paket di DB jika berbeda dari kalkulasi terbaru
        if (pkg.status !== calculation.status) {
          await db
            .update(questionPackages)
            .set({ status: calculation.status, updatedAt: new Date() })
            .where(eq(questionPackages.id, pkg.id));
          pkg.status = calculation.status;
        }

        const author = pkg.authorId ? userMap.get(pkg.authorId) : null;
        const assignedValidator = pkg.assignedValidatorId ? userMap.get(pkg.assignedValidatorId) : null;

        return {
          ...pkg,
          author,
          assignedValidator,
          progress: calculation,
        };
      })
    );

    // Pastikan urutan selalu konsisten dari yang terbaru ke yang terlama (createdAt DESC)
    enrichedPackages.sort(
      (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return NextResponse.json({
      success: true,
      data: enrichedPackages,
    });
  } catch (error: any) {
    console.error("GET /api/packages error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat daftar paket." },
      { status: 500 }
    );
  }
}

// POST /api/packages - Membuat paket soal baru (target 30 slot)
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(user, ["pembuat_soal", "admin"])) {
      return NextResponse.json(
        { success: false, error: "Hanya Pembuat Soal atau Admin yang dapat membuat paket." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { jenjang, mapel, tipeSumber = "manual", customNama } = body;

    if (!jenjang || !mapel) {
      return NextResponse.json(
        { success: false, error: "Jenjang dan Mata Pelajaran wajib dipilih." },
        { status: 400 }
      );
    }

    // Hitung sequence number untuk penomoran kode paket (misal H1, H2, dst)
    const existingCountRes = await db
      .select({ val: count() })
      .from(questionPackages)
      .where(
        and(
          eq(questionPackages.jenjang, jenjang),
          eq(questionPackages.mapel, mapel),
          eq(questionPackages.tipeSumber, tipeSumber)
        )
      );

    const sequenceNumber = (existingCountRes[0]?.val || 0) + 1;
    const { code, nama } = generatePackageCode(tipeSumber, sequenceNumber, jenjang, mapel);

    const packageId = `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newPackage = {
      id: packageId,
      code,
      nama: customNama?.trim() ? customNama.trim() : nama,
      jenjang,
      mapel,
      tipeSumber: tipeSumber as "manual" | "ai",
      authorId: user.id,
      jumlahSoal: 30,
      distribusiBentukSoal: { PG: 15, PGK_MCMA: 8, PGK_KATEGORI: 7 },
      distribusiKesulitan: { rendah: 6, sedang: 18, tinggi: 6 },
      status: "draft" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(questionPackages).values(newPackage);

    // Catat log audit
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userEmail: user.email,
      action: "CREATE_PACKAGE",
      targetResource: `question_packages/${code}`,
      details: {
        packageId,
        code,
        nama: newPackage.nama,
        jenjang,
        mapel,
        tipeSumber,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    const progress = calculatePackageStatus([]);

    return NextResponse.json({
      success: true,
      message: `Paket ${code} berhasil dibuat dengan 30 slot cetak biru.`,
      data: {
        ...newPackage,
        progress,
      },
    });
  } catch (error: any) {
    console.error("POST /api/packages error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal membuat paket soal." },
      { status: 500 }
    );
  }
}
