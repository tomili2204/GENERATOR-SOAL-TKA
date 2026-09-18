import fs from 'fs';

const BASE_URL = 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  const cookie = res.headers.get('set-cookie');
  return { email, cookie, user: data.user || data.data?.user };
}

const testResults = [];

function recordResult(num, name, status, detail) {
  testResults.push({ num, name, status, detail });
  const icon = status === 'LOLOS' ? '✅' : status === 'PERBAIKAN' ? '⚠️' : '❌';
  console.log(`\n${icon} [TEST ${num}] ${name}`);
  console.log(`   Status : ${status}`);
  console.log(`   Detail : ${detail}`);
}

async function main() {
  console.log('================================================================================');
  console.log('      AUDIT & VERIFIKASI KOMPREHENSIF PLATFORM SOAL.AYOTKA.ID (FASE 1-5)       ');
  console.log('================================================================================');

  const admin = await login('admin@ayotka.id', 'admin123');
  const pembuat = await login('pembuat@ayotka.id', 'pembuat123');
  const validator = await login('validator@ayotka.id', 'validator123');
  const ganda = await login('ganda@ayotka.id', 'ganda123');
  console.log('Akun uji terautentikasi: Admin, Pembuat, Validator, Ganda.');

  // --- UJI 1 ---
  console.log('\n--- UJI 1: Toggle Generate 4 Kombinasi Serentak & Isolasi Data ---');
  try {
    for (const id of ['gen-sd-mat', 'gen-sd-indo', 'gen-smp-mat', 'gen-smp-indo']) {
      await fetch(`${BASE_URL}/api/admin/generator-toggle`, {
        method: 'POST',
        headers: { cookie: admin.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isAutoActive: true })
      });
    }

    const combinations = [
      { jenjang: 'SD', mapel: 'Matematika', configId: 'gen-sd-mat' },
      { jenjang: 'SD', mapel: 'Bahasa Indonesia', configId: 'gen-sd-indo' },
      { jenjang: 'SMP', mapel: 'Matematika', configId: 'gen-smp-mat' },
      { jenjang: 'SMP', mapel: 'Bahasa Indonesia', configId: 'gen-smp-indo' }
    ];

    const genResults = await Promise.all(combinations.map(c => 
      fetch(`${BASE_URL}/api/admin/generator/trigger`, {
        method: 'POST',
        headers: { cookie: admin.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...c, forceMock: true, totalSoal: 30 })
      }).then(r => r.json())
    ));

    let isolationValid = true;
    const codes = [];
    for (let i = 0; i < combinations.length; i++) {
      const r = genResults[i];
      if (!r.success || !r.data?.packageId) {
        isolationValid = false;
        break;
      }
      codes.push(r.data.packageCode);
      const pkgRes = await fetch(`${BASE_URL}/api/packages/${r.data.packageId}`, { headers: { cookie: admin.cookie } });
      const pkg = await pkgRes.json();
      const slots = pkg.data?.slots || [];
      const isMat = combinations[i].mapel.toLowerCase().includes('matematika');
      for (const s of slots) {
        if (!s.question) continue;
        if (isMat && (s.question.mapel !== 'Matematika' || s.question.elemen?.toLowerCase().includes('membaca'))) {
          isolationValid = false;
        }
        if (!isMat && (s.question.mapel !== 'Bahasa Indonesia' || s.question.elemen?.toLowerCase().includes('aljabar'))) {
          isolationValid = false;
        }
      }
    }

    if (isolationValid) {
      recordResult('1', 'Toggle Multi-Kombinasi & Isolasi Data Paket', 'LOLOS', `4 paket (${codes.join(', ')}) terbentuk serentak tanpa saling mencampuri konten.`);
    } else {
      recordResult('1', 'Toggle Multi-Kombinasi & Isolasi Data Paket', 'GAGAL', 'Terjadi kontaminasi konten atau gagal generate.');
    }
  } catch (e) {
    recordResult('1', 'Toggle Multi-Kombinasi & Isolasi Data Paket', 'GAGAL', e.message);
  }

  // --- UJI 2 ---
  console.log('\n--- UJI 2: Generate Berulang Kombinasi Sama (Sequence & Non-Overwrite) ---');
  try {
    const g1 = await fetch(`${BASE_URL}/api/admin/generator/trigger`, {
      method: 'POST',
      headers: { cookie: admin.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jenjang: 'SMP', mapel: 'Matematika', forceMock: true, totalSoal: 30 })
    }).then(r => r.json());

    await new Promise(r => setTimeout(r, 1200));

    const g2 = await fetch(`${BASE_URL}/api/admin/generator/trigger`, {
      method: 'POST',
      headers: { cookie: admin.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jenjang: 'SMP', mapel: 'Matematika', forceMock: true, totalSoal: 30 })
    }).then(r => r.json());

    const pkg1Id = g1.data?.packageId;
    const pkg2Id = g2.data?.packageId;
    const pkg1Code = g1.data?.packageCode;
    const pkg2Code = g2.data?.packageCode;

    const v1 = await fetch(`${BASE_URL}/api/packages/${pkg1Id}`, { headers: { cookie: admin.cookie } }).then(r => r.json());
    const v2 = await fetch(`${BASE_URL}/api/packages/${pkg2Id}`, { headers: { cookie: admin.cookie } }).then(r => r.json());

    const ok = v1.success && v2.success && pkg1Id !== pkg2Id && pkg1Code !== pkg2Code &&
               v1.data?.slots?.filter(s => s.isFilled).length === 30 &&
               v2.data?.slots?.filter(s => s.isFilled).length === 30;

    if (ok) {
      recordResult('2', 'Generate Berulang Kombinasi Sama (Sequence & Non-Overwrite)', 'LOLOS', `Terbentuk 2 paket berbeda: ${pkg1Code} dan ${pkg2Code}. Paket pertama tidak tertimpa.`);
    } else {
      recordResult('2', 'Generate Berulang Kombinasi Sama', 'GAGAL', 'Paket tertimpa atau ID kembar.');
    }
  } catch (e) {
    recordResult('2', 'Generate Berulang Kombinasi Sama', 'GAGAL', e.message);
  }

  // --- UJI 3 ---
  console.log('\n--- UJI 3: Lifecycle End-to-End Soal AI (3 Aksi + Revisi + Setuju) ---');
  try {
    const pkgGen = await fetch(`${BASE_URL}/api/admin/generator/trigger`, {
      method: 'POST',
      headers: { cookie: admin.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jenjang: 'SMP', mapel: 'Matematika', forceMock: true, totalSoal: 30 })
    }).then(r => r.json());
    const testPkgId = pkgGen.data.packageId;

    const pkgDetail = await fetch(`${BASE_URL}/api/packages/${testPkgId}`, { headers: { cookie: admin.cookie } }).then(r => r.json());
    const q1 = pkgDetail.data.slots[0].question;
    const q2 = pkgDetail.data.slots[1].question;
    const q3 = pkgDetail.data.slots[2].question;

    await fetch(`${BASE_URL}/api/admin/packages/assign`, {
      method: 'POST',
      headers: { cookie: admin.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: testPkgId, validatorId: validator.user.id })
    });

    // Aksi 1: Disetujui
    const appRes = await fetch(`${BASE_URL}/api/validator/review`, {
      method: 'POST',
      headers: { cookie: validator.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q1.id, decision: 'disetujui', notes: 'Sangat baik.' })
    }).then(r => r.json());

    // Aksi 2: Ditolak (uji tolak kosong vs tolak beralasan)
    const rejEmpty = await fetch(`${BASE_URL}/api/validator/review`, {
      method: 'POST',
      headers: { cookie: validator.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q2.id, decision: 'ditolak', notes: '' })
    });
    const rejOk = await fetch(`${BASE_URL}/api/validator/review`, {
      method: 'POST',
      headers: { cookie: validator.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q2.id, decision: 'ditolak', notes: 'Materi di luar cakupan kurikulum.' })
    }).then(r => r.json());

    // Aksi 3: Direvisi -> Edit -> Re-submit -> Setujui
    const revRes = await fetch(`${BASE_URL}/api/validator/review`, {
      method: 'POST',
      headers: { cookie: validator.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q3.id, decision: 'direvisi', notes: 'Perjelas gambar dan satuan.' })
    }).then(r => r.json());

    const q3Data = await fetch(`${BASE_URL}/api/questions/${q3.id}`, { headers: { cookie: admin.cookie } }).then(r => r.json());
    const editRes = await fetch(`${BASE_URL}/api/questions/${q3.id}`, {
      method: 'PUT',
      headers: { cookie: admin.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jenjang: q3Data.data.jenjang,
        mapel: q3Data.data.mapel,
        elemen: q3Data.data.elemen,
        sub_elemen: q3Data.data.subElemen || 'Umum',
        kompetensi: q3Data.data.kompetensi,
        level_kognitif: q3Data.data.levelKognitif,
        tingkat_kesulitan: q3Data.data.tingkatKesulitan,
        bentuk_soal: q3Data.data.bentukSoal,
        jenis_soal: q3Data.data.jenisSoal,
        soal_text: q3Data.data.payload.soal_text + ' (Direvisi sesuai catatan)',
        opsi: q3Data.data.payload.opsi,
        pernyataan: q3Data.data.payload.pernyataan,
        kategori_respons: q3Data.data.payload.kategori_respons,
        kunci_jawaban: q3Data.data.payload.kunci_jawaban,
        pembahasan: q3Data.data.payload.pembahasan
      })
    }).then(r => r.json());

    const q3StatusAfter = await fetch(`${BASE_URL}/api/questions/${q3.id}`, { headers: { cookie: admin.cookie } }).then(r => r.json());
    const reSubmitted = q3StatusAfter.data?.status === 'menunggu_validasi';

    const finalApp = await fetch(`${BASE_URL}/api/validator/review`, {
      method: 'POST',
      headers: { cookie: validator.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: q3.id, decision: 'disetujui', notes: 'Revisi diterima. Disetujui.' })
    }).then(r => r.json());

    const pass3 = appRes.success && rejEmpty.status === 400 && rejOk.success && revRes.success &&
                  editRes.success && reSubmitted && finalApp.success;

    if (pass3) {
      recordResult('3', 'Lifecycle End-to-End Soal AI (3 Aksi + Revisi + Re-submit)', 'LOLOS', `Soal AI (${q1.code}, ${q2.code}, ${q3.code}) berhasil melalui alur validasi dan siklus revisi hingga disetujui.`);
    } else {
      recordResult('3', 'Lifecycle End-to-End Soal AI', 'GAGAL', `appRes=${appRes.success}, rejEmpty=${rejEmpty.status}, rejOk=${rejOk.success}, revRes=${revRes.success}, editRes=${editRes.success}, reSubmitted=${reSubmitted}, finalApp=${finalApp.success}`);
    }
  } catch (e) {
    recordResult('3', 'Lifecycle End-to-End Soal AI', 'GAGAL', e.message);
  }

  // --- UJI 4 ---
  console.log('\n--- UJI 4: Lifecycle End-to-End Soal Manual (Upload -> Revisi -> Setuju) ---');
  try {
    const manualCreate = await fetch(`${BASE_URL}/api/questions`, {
      method: 'POST',
      headers: { cookie: pembuat.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jenjang: 'SMP',
        mapel: 'Matematika',
        elemen: 'Geometri',
        sub_elemen: 'Pythagoras',
        kompetensi: 'Penerapan teorema pythagoras',
        level_kognitif: 'Aplikasi',
        tingkat_kesulitan: 'sedang',
        bentuk_soal: 'PG',
        jenis_soal: 'tunggal',
        soal_text: 'Segitiga siku-siku memiliki sisi tegak 3 cm dan 4 cm. Sisi miringnya adalah...',
        opsi: [
          { label: 'A', text: '5 cm' },
          { label: 'B', text: '6 cm' },
          { label: 'C', text: '7 cm' },
          { label: 'D', text: '8 cm' }
        ],
        kunci_jawaban: ['A'],
        pembahasan: 'c = sqrt(3^2 + 4^2) = 5 cm.'
      })
    }).then(r => r.json());

    const mQId = manualCreate.data.id;
    const initialWaiting = manualCreate.data.status === 'menunggu_validasi';

    const mRev = await fetch(`${BASE_URL}/api/validator/review`, {
      method: 'POST',
      headers: { cookie: validator.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: mQId, decision: 'direvisi', notes: 'Gunakan KaTeX pada satuan.' })
    }).then(r => r.json());

    const mEdit = await fetch(`${BASE_URL}/api/questions/${mQId}`, {
      method: 'PUT',
      headers: { cookie: pembuat.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jenjang: 'SMP',
        mapel: 'Matematika',
        elemen: 'Geometri',
        sub_elemen: 'Pythagoras',
        kompetensi: 'Penerapan teorema pythagoras',
        level_kognitif: 'Aplikasi',
        tingkat_kesulitan: 'sedang',
        bentuk_soal: 'PG',
        jenis_soal: 'tunggal',
        soal_text: 'Segitiga siku-siku memiliki sisi tegak $3\\text{ cm}$ dan $4\\text{ cm}$. Sisi miringnya adalah...',
        opsi: [
          { label: 'A', text: '$5\\text{ cm}$' },
          { label: 'B', text: '$6\\text{ cm}$' },
          { label: 'C', text: '$7\\text{ cm}$' },
          { label: 'D', text: '$8\\text{ cm}$' }
        ],
        kunci_jawaban: ['A'],
        pembahasan: '$c = \\sqrt{3^2 + 4^2} = 5\\text{ cm}$.'
      })
    }).then(r => r.json());

    const mAfter = await fetch(`${BASE_URL}/api/questions/${mQId}`, { headers: { cookie: admin.cookie } }).then(r => r.json());
    const mReSub = mAfter.data?.status === 'menunggu_validasi';

    const mFinal = await fetch(`${BASE_URL}/api/validator/review`, {
      method: 'POST',
      headers: { cookie: validator.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: mQId, decision: 'disetujui', notes: 'KaTeX rapi. Disetujui.' })
    }).then(r => r.json());

    const pass4 = initialWaiting && mRev.success && mEdit.success && mReSub && mFinal.success;
    if (pass4) {
      recordResult('4', 'Lifecycle End-to-End Soal Manual (Upload -> Revisi -> Setuju)', 'LOLOS', `Soal manual ${manualCreate.data.code} berhasil melewati seluruh tahapan identik dengan soal AI.`);
    } else {
      recordResult('4', 'Lifecycle End-to-End Soal Manual', 'GAGAL', 'Siklus manual gagal.');
    }
  } catch (e) {
    recordResult('4', 'Lifecycle End-to-End Soal Manual', 'GAGAL', e.message);
  }

  // --- UJI 5 ---
  console.log('\n--- UJI 5: Penegakan RBAC & Pemisahan Tugas (Data Sungguhan) ---');
  try {
    // 5.1 Self-validation prohibition (Akun peran ganda membuat soal, lalu coba telaah sendiri)
    const qGandaRes = await fetch(`${BASE_URL}/api/questions`, {
      method: 'POST',
      headers: { cookie: ganda.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jenjang: 'SD',
        mapel: 'Matematika',
        elemen: 'Bilangan',
        sub_elemen: 'Operasi Hitung',
        kompetensi: 'Operasi hitung bilangan bulat',
        level_kognitif: 'Pengetahuan dan Pemahaman',
        tingkat_kesulitan: 'rendah',
        bentuk_soal: 'PG',
        jenis_soal: 'tunggal',
        soal_text: 'Hasil dari $25 + (-10) \\times 2$ adalah...',
        opsi: [
          { label: 'A', text: '$5$' },
          { label: 'B', text: '$30$' },
          { label: 'C', text: '$70$' },
          { label: 'D', text: '$-5$' }
        ],
        kunci_jawaban: ['A'],
        pembahasan: '$25 + (-20) = 5$.'
      })
    });
    const qGanda = await qGandaRes.json();
    if (!qGanda.success || !qGanda.data?.id) {
      throw new Error(`Gagal membuat soal ganda: ${JSON.stringify(qGanda)}`);
    }

    const selfVal = await fetch(`${BASE_URL}/api/validator/review`, {
      method: 'POST',
      headers: { cookie: ganda.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: qGanda.data.id, decision: 'disetujui', notes: 'Validasi sendiri' })
    });
    const selfValBlocked = selfVal.status === 403;

    // 5.2 Cross-author edit prohibition
    const crossEdit = await fetch(`${BASE_URL}/api/questions/${qGanda.data.id}`, {
      method: 'PUT',
      headers: { cookie: pembuat.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jenjang: 'SD',
        mapel: 'Matematika',
        elemen: 'Bilangan',
        sub_elemen: 'Operasi Hitung',
        kompetensi: 'Operasi hitung bilangan bulat',
        level_kognitif: 'Pengetahuan dan Pemahaman',
        tingkat_kesulitan: 'rendah',
        bentuk_soal: 'PG',
        jenis_soal: 'tunggal',
        soal_text: 'Membajak soal orang lain',
        opsi: [{ label: 'A', text: '1' }, { label: 'B', text: '2' }, { label: 'C', text: '3' }, { label: 'D', text: '4' }],
        kunci_jawaban: ['A'],
        pembahasan: 'Salah'
      })
    });
    const crossEditBlocked = crossEdit.status === 403;

    // 5.3 Non-admin generator toggle prohibition
    const nonAdminToggle = await fetch(`${BASE_URL}/api/admin/generator-toggle`, {
      method: 'POST',
      headers: { cookie: pembuat.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'gen-sd-mat', isAutoActive: false })
    });
    const toggleBlocked = nonAdminToggle.status === 403;

    // 5.4 Non-admin taxonomy modification prohibition
    const nonAdminTax = await fetch(`${BASE_URL}/api/admin/taxonomy`, {
      method: 'POST',
      headers: { cookie: validator.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'elemen', name: 'Illegal Elemen' })
    });
    const taxBlocked = nonAdminTax.status === 403;

    // 5.5 Non-admin inspect-data prohibition
    const nonAdminInspect = await fetch(`${BASE_URL}/api/admin/inspect-data`, {
      headers: { cookie: validator.cookie }
    });
    const inspectBlocked = nonAdminInspect.status === 403;

    const pass5 = selfValBlocked && crossEditBlocked && toggleBlocked && taxBlocked && inspectBlocked;
    if (pass5) {
      recordResult('5', 'Penegakan RBAC & Pemisahan Tugas (Data Sungguhan)', 'LOLOS', 'Seluruh guard aktif: Self-Validation Block (403), Cross-Author Block (403), Admin Generator Restriction (403), Admin Taxonomy Restriction (403), Admin Data Inspection Restriction (403).');
    } else {
      recordResult('5', 'Penegakan RBAC & Pemisahan Tugas', 'GAGAL', `selfVal=${selfVal.status}, crossEdit=${crossEdit.status}, toggle=${nonAdminToggle.status}, tax=${nonAdminTax.status}, inspect=${nonAdminInspect.status}`);
    }
  } catch (e) {
    recordResult('5', 'Penegakan RBAC & Pemisahan Tugas', 'GAGAL', e.message);
  }

  // --- REKAP AKHIR ---
  console.log('\n================================================================================');
  console.log('                        TABEL RANGKUMAN AUDIT AKHIR                             ');
  console.log('================================================================================');
  console.table(testResults);

  const allPassed = testResults.every(r => r.status === 'LOLOS');
  console.log('\nSTATUS AKHIR SISTEM: ' + (allPassed ? '✅ SIAP OPERASIONAL 100%' : '❌ BELUM MEMENUHI SYARAT'));
}

main().catch(console.error);
