process.env.SESSION_SECRET = "ayotka_super_secret_session_key_32_bytes_length_internal_admin";
import { createSessionToken } from '../lib/auth/session';

async function checkQuestions() {
  const adminUser = {
    id: "usr-admin-001",
    name: "Super Admin AyoTKA",
    email: "admin@ayotka.id",
    roles: ["admin"]
  };

  const token = await createSessionToken(adminUser as any);
  const pkgsRes = await fetch('http://localhost:3000/api/packages', {
    headers: { Cookie: `ayotka_session=${token}` }
  });
  const pkgs = await pkgsRes.json();
  const allPkgs = pkgs.data || [];

  console.log('Total packages:', allPkgs.length);
  const tomiPkg = allPkgs.find((p: any) => p.assignedValidatorId === 'usr-c72634bf');
  console.log('Tomi assigned package:', tomiPkg?.code, tomiPkg?.id, tomiPkg?.nama);

  // Cek detail paket Tomi
  const tomiPkgDetail = await fetch('http://localhost:3000/api/packages/' + tomiPkg.id, {
    headers: { Cookie: `ayotka_session=${token}` }
  });
  const detail = await tomiPkgDetail.json();
  console.log('Total slots in Tomi package:', detail.data?.slots?.length);
  const tomiQuestions = detail.data?.slots?.map((s: any) => s.question).filter(Boolean) || [];
  console.log('Total questions in Tomi package:', tomiQuestions.length);
  console.log('Tomi questions status:', tomiQuestions.map((q: any) => q.status));
}

checkQuestions().catch(console.error);
