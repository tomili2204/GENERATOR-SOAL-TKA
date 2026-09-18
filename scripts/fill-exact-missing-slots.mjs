// Script untuk melengkapi 9 slot butir soal yang belum lengkap pada 6 paket draft
const BASE_URL = "http://localhost:3000";

async function run() {
  console.log("=================================================");
  console.log("MELENGKAPI 9 SLOT PADA 6 PAKET SOAL DRAFT");
  console.log("=================================================\n");

  // 1. Login Admin
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ayotka.id", password: "admin123" }),
  });
  const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

  // 2. Ambil ID paket-paket yang draft
  const pkgRes = await fetch(`${BASE_URL}/api/packages`, {
    headers: { Cookie: cookie },
  });
  const pkgs = (await pkgRes.json()).data;

  const pkgMap = {};
  for (const p of pkgs) {
    pkgMap[p.code] = p.id;
  }

  // Definisi 9 butir soal PGK_KATEGORI berkualitas tinggi sesuai kisi-kisi BSKAP & tema masing-masing paket
  const missingItems = [
    // 1. A04-SD-MAT - Slot 30 (Olahraga & Kesehatan)
    {
      packageCode: "A04-SD-MAT",
      slotNumber: 30,
      data: {
        elemen: "Data dan Peluang",
        sub_elemen: "Data",
        kompetensi: "Menganalisis dan menyimpulkan data frekuensi konsumsi nutrisi dan aktivitas fisik siswa.",
        level_kognitif: "Penalaran",
        tingkat_kesulitan: "tinggi",
        bentuk_soal: "PGK_KATEGORI",
        jenis_soal: "tunggal",
        tema_konteks: "kandungan protein sarapan",
        soal_text:
          "Dalam rangka program hidup sehat, dokter sekolah mencatat kebutuhan kalori dan durasi olahraga lari pagi dari 4 kelompok siswa. Kelompok A berlatih lari selama 30 menit dan membakar 210 kalori. Kelompok B berlatih selama 45 menit dan membakar 360 kalori. Kelompok C berlatih selama 20 menit dan membakar 160 kalori, sedangkan Kelompok D berlatih selama 40 menit dan membakar 280 kalori.\n\nTentukan kebenaran dari setiap pernyataan berikut berdasarkan data tersebut!",
        pernyataan: [
          {
            no: 1,
            text: "Rata-rata kalori yang dibakar per menit pada Kelompok B ($8$ kalori/menit) lebih tinggi daripada Kelompok A ($7$ kalori/menit).",
          },
          {
            no: 2,
            text: "Kelompok C memiliki laju pembakaran kalori per menit paling rendah di antara semua kelompok.",
          },
          {
            no: 3,
            text: "Jika seorang siswa di Kelompok D menambah durasi lari 15 menit dengan laju pembakaran yang sama, maka total kalori yang dibakar bertambah sebesar 105 kalori.",
          },
        ],
        kategori_respons: ["Benar", "Salah"],
        kunci_jawaban: ["Benar", "Salah", "Benar"],
        pembahasan:
          "Diketahui laju pembakaran kalori per menit tiap kelompok:\n" +
          "Kelompok A: $\\frac{210}{30} = 7$ kalori/menit.\n" +
          "Kelompok B: $\\frac{360}{45} = 8$ kalori/menit.\n" +
          "Kelompok C: $\\frac{160}{20} = 8$ kalori/menit.\n" +
          "Kelompok D: $\\frac{280}{40} = 7$ kalori/menit.\n\n" +
          "Analisis pernyataan:\n" +
          "1. Kelompok B ($8$) lebih tinggi daripada Kelompok A ($7$). Pernyataan bernilai Benar.\n" +
          "2. Kelompok C bernilai $8$ kalori/menit, sedangkan yang paling rendah adalah Kelompok A dan D ($7$ kalori/menit). Pernyataan bernilai Salah.\n" +
          "3. Tambahan 15 menit untuk Kelompok D dengan laju 7 kalori/menit: $15 \\times 7 = 105$ kalori. Pernyataan bernilai Benar.",
      },
    },

    // 2. A05-SD-MAT - Slot 29 (Lingkungan & Cuaca)
    {
      packageCode: "A05-SD-MAT",
      slotNumber: 29,
      data: {
        elemen: "Geometri dan Pengukuran",
        sub_elemen: "Pengukuran",
        kompetensi: "Memecahkan masalah perbandingan volume dan kapasitas penampungan air hujan ramah lingkungan.",
        level_kognitif: "Penalaran",
        tingkat_kesulitan: "tinggi",
        bentuk_soal: "PGK_KATEGORI",
        jenis_soal: "tunggal",
        tema_konteks: "penampungan air hujan sekolah",
        soal_text:
          "Sebuah sekolah Adiwiyata memiliki dua bak penampung air hujan berbentuk balok. Bak X memiliki ukuran panjang $120\\text{ cm}$, lebar $80\\text{ cm}$, dan tinggi $100\\text{ cm}$. Bak Y memiliki ukuran panjang $100\\text{ cm}$, lebar $100\\text{ cm}$, dan tinggi $90\\text{ cm}$. Kedua bak dalam kondisi kosong saat hujan deras mulai turun. Air hujan dialirkan ke Bak X dengan debit $16\\text{ liter/menit}$ dan ke Bak Y dengan debit $18\\text{ liter/menit}$. ($1\\text{ liter} = 1.000\\text{ cm}^3$).\n\nTentukan kebenaran dari setiap pernyataan berikut!",
        pernyataan: [
          {
            no: 1,
            text: "Kapasitas penuh Bak X ($960\\text{ liter}$) lebih besar daripada kapasitas penuh Bak Y ($900\\text{ liter}$).",
          },
          {
            no: 2,
            text: "Bak Y akan terisi penuh lebih cepat daripada Bak X.",
          },
          {
            no: 3,
            text: "Setelah pengisian berlangsung selama 30 menit, ketinggian air pada Bak X telah mencapai $50\\text{ cm}$.",
          },
        ],
        kategori_respons: ["Benar", "Salah"],
        kunci_jawaban: ["Benar", "Benar", "Benar"],
        pembahasan:
          "Diketahui:\n" +
          "Volume Bak X = $120 \\times 80 \\times 100 = 960.000\\text{ cm}^3 = 960\\text{ liter}$.\n" +
          "Volume Bak Y = $100 \\times 100 \\times 90 = 900.000\\text{ cm}^3 = 900\\text{ liter}$.\n\n" +
          "Waktu pengisian penuh:\n" +
          "Bak X: $\\frac{960}{16} = 60\\text{ menit}$.\n" +
          "Bak Y: $\\frac{900}{18} = 50\\text{ menit}$.\n\n" +
          "Analisis pernyataan:\n" +
          "1. Kapasitas Bak X ($960\\text{ liter}$) > Bak Y ($900\\text{ liter}$). Pernyataan bernilai Benar.\n" +
          "2. Bak Y penuh dalam 50 menit, sedangkan Bak X 60 menit. Jadi Bak Y lebih cepat penuh. Pernyataan bernilai Benar.\n" +
          "3. Dalam 30 menit, volume air di Bak X = $30 \\times 16 = 480\\text{ liter} = 480.000\\text{ cm}^3$.\n" +
          "Tinggi air = $\\frac{480.000}{120 \\times 80} = \\frac{480.000}{9.600} = 50\\text{ cm}$. Pernyataan bernilai Benar.",
      },
    },

    // 3. A05-SD-MAT - Slot 30 (Lingkungan & Cuaca)
    {
      packageCode: "A05-SD-MAT",
      slotNumber: 30,
      data: {
        elemen: "Data dan Peluang",
        sub_elemen: "Data",
        kompetensi: "Mengevaluasi dan menafsirkan data rata-rata timbulan sampah daur ulang per minggu.",
        level_kognitif: "Penalaran",
        tingkat_kesulitan: "tinggi",
        bentuk_soal: "PGK_KATEGORI",
        jenis_soal: "tunggal",
        tema_konteks: "perbandingan berat sampah",
        soal_text:
          "Bank Sampah Desa Bersih mencatat pengumpulan sampah daur ulang selama 4 pekan berturut-turut:\n" +
          "- Pekan I: $140\\text{ kg}$ sampah organik dan $60\\text{ kg}$ anorganik.\n" +
          "- Pekan II: $160\\text{ kg}$ sampah organik dan $80\\text{ kg}$ anorganik.\n" +
          "- Pekan III: $150\\text{ kg}$ sampah organik dan $90\\text{ kg}$ anorganik.\n" +
          "- Pekan IV: $190\\text{ kg}$ sampah organik dan $110\\text{ kg}$ anorganik.\n\n" +
          "Tentukan kebenaran setiap pernyataan berikut berdasarkan data di atas!",
        pernyataan: [
          {
            no: 1,
            text: "Rata-rata timbulan sampah organik per pekan adalah $160\\text{ kg}$.",
          },
          {
            no: 2,
            text: "Persentase sampah anorganik terhadap total seluruh sampah yang terkumpul selama 4 pekan melebihi $40\\%$.",
          },
          {
            no: 3,
            text: "Kenaikan jumlah sampah anorganik terbesar terjadi dari Pekan II ke Pekan III.",
          },
        ],
        kategori_respons: ["Benar", "Salah"],
        kunci_jawaban: ["Benar", "Salah", "Salah"],
        pembahasan:
          "Perhitungan data:\n" +
          "Total sampah organik = $140 + 160 + 150 + 190 = 640\\text{ kg}$.\n" +
          "Rata-rata organik = $\\frac{640}{4} = 160\\text{ kg}$.\n" +
          "Total anorganik = $60 + 80 + 90 + 110 = 340\\text{ kg}$.\n" +
          "Total seluruh sampah = $640 + 340 = 980\\text{ kg}$.\n\n" +
          "Analisis pernyataan:\n" +
          "1. Rata-rata organik adalah $160\\text{ kg}$. Pernyataan bernilai Benar.\n" +
          "2. Persentase anorganik = $\\frac{340}{980} \\times 100\\% \\approx 34{,}69\\%$, tidak melebihi $40\\%$. Pernyataan bernilai Salah.\n" +
          "3. Kenaikan anorganik: Pekan I ke II = $+20\\text{ kg}$, Pekan II ke III = $+10\\text{ kg}$, Pekan III ke IV = $+20\\text{ kg}$. Kenaikan terbesar bukan dari Pekan II ke III. Pernyataan bernilai Salah.",
      },
    },

    // 4. A02-SMP-MAT - Slot 30 (Teknologi & Literasi Digital)
    {
      packageCode: "A02-SMP-MAT",
      slotNumber: 30,
      data: {
        elemen: "Aljabar",
        sub_elemen: "Sistem Persamaan Linier",
        kompetensi: "Menganalisis sistem persamaan linier kontekstual biaya paket langganan cloud storage dan kuota internet.",
        level_kognitif: "Penalaran",
        tingkat_kesulitan: "tinggi",
        bentuk_soal: "PGK_KATEGORI",
        jenis_soal: "tunggal",
        tema_konteks: "perbandingan harga kuota data",
        soal_text:
          "Sebuah agensi pembuat konten digital berlangganan dua jenis layanan digital: Akun Cloud Storage ($x$) dan Paket Kuota Internet ($y$). Pada bulan Januari, pembayaran untuk 3 akun Cloud Storage dan 2 paket Kuota Internet adalah Rp 340.000. Pada bulan Februari, pembayaran untuk 2 akun Cloud Storage dan 4 paket Kuota Internet adalah Rp 440.000 dengan harga satuan yang sama.\n\nTentukan kebenaran dari setiap pernyataan berikut!",
        pernyataan: [
          {
            no: 1,
            text: "Biaya langganan 1 akun Cloud Storage per bulan adalah Rp 60.000.",
          },
          {
            no: 2,
            text: "Biaya langganan 1 paket Kuota Internet per bulan adalah Rp 80.000.",
          },
          {
            no: 3,
            text: "Jika pada bulan Maret agensi membutuhkan 4 akun Cloud Storage dan 3 paket Kuota Internet, total biaya yang harus dibayarkan adalah Rp 480.000.",
          },
        ],
        kategori_respons: ["Benar", "Salah"],
        kunci_jawaban: ["Benar", "Benar", "Benar"],
        pembahasan:
          "Sistem Persamaan Linear Dua Variabel:\n" +
          "1) $3x + 2y = 340.000$\n" +
          "2) $2x + 4y = 440.000 \\iff x + 2y = 220.000 \\implies x = 220.000 - 2y$.\n\n" +
          "Substitusikan ke persamaan 1:\n" +
          "$3(220.000 - 2y) + 2y = 340.000$\n" +
          "$660.000 - 6y + 2y = 340.000$\n" +
          "$-4y = -320.000 \\implies y = 80.000$.\n\n" +
          "Maka nilai $x$:\n" +
          "$x = 220.000 - 2(80.000) = 220.000 - 160.000 = 60.000$.\n\n" +
          "Analisis pernyataan:\n" +
          "1. Biaya Cloud Storage ($x$) = Rp 60.000. Pernyataan bernilai Benar.\n" +
          "2. Biaya Kuota Internet ($y$) = Rp 80.000. Pernyataan bernilai Benar.\n" +
          "3. Biaya 4 akun Cloud dan 3 paket Kuota: $4(60.000) + 3(80.000) = 240.000 + 240.000 = 480.000$. Pernyataan bernilai Benar.",
      },
    },

    // 5. A02-SD-BIN - Slot 30 (Olahraga & Kesehatan)
    {
      packageCode: "A02-SD-BIN",
      slotNumber: 30,
      data: {
        elemen: "Membaca dan Memirsa",
        sub_elemen: "Teks Informasi",
        kompetensi: "Mengevaluasi kesesuaian informasi faktual dan saran kesehatan dalam teks pola hidup aktif anak.",
        level_kognitif: "Evaluasi dan Apresiasi",
        tingkat_kesulitan: "tinggi",
        bentuk_soal: "PGK_KATEGORI",
        jenis_soal: "tunggal",
        tema_konteks: "statistik pertandingan lari",
        soal_text:
          "Bacalah teks informasi berikut dengan saksama!\n\n" +
          "Dalam kejuaraan lari estafet antarsekolah dasar tingkat kecamatan, tim putra SDN Cendikia berhasil finis terdepan dengan catatan waktu 58 detik, unggul tipis 2 detik dari runner-up. Pelatih mengungkapkan bahwa kunci kebugaran anak-anak asuhnya adalah konsistensi pemanasan dinamis selama 15 menit sebelum berlari dan istirahat malam teratur minimal 8 jam. Selain itu, asupan cairan dipantau ketat agar tidak ada pelari yang mengalami dehidrasi di lintasan terbuka.\n\nTentukan kesesuaian pernyataan berikut berdasarkan isi teks di atas!",
        pernyataan: [
          {
            no: 1,
            text: "Tim runner-up pada kejuaraan lari estafet menyelesaikan perlombaan dengan catatan waktu 60 detik.",
          },
          {
            no: 2,
            text: "Pemanasan statis selama 30 menit disebutkan sebagai salah satu faktor penentu kebugaran pelari SDN Cendikia.",
          },
          {
            no: 3,
            text: "Teks tersebut menekankan pentingnya menjaga hidrasi dan kecukupan waktu istirahat untuk menunjang performa fisik atlet cilik.",
          },
        ],
        kategori_respons: ["Sesuai", "Tidak Sesuai"],
        kunci_jawaban: ["Sesuai", "Tidak Sesuai", "Sesuai"],
        pembahasan:
          "Analisis kesesuaian teks:\n" +
          "1. SDN Cendikia mencatat waktu 58 detik dan unggul 2 detik dari runner-up, artinya catatan waktu runner-up adalah $58 + 2 = 60$ detik. Pernyataan Sesuai.\n" +
          "2. Pada teks tertulis 'pemanasan dinamis selama 15 menit', bukan pemanasan statis selama 30 menit. Pernyataan Tidak Sesuai.\n" +
          "3. Teks secara eksplisit menyebutkan istirahat malam teratur minimal 8 jam dan pemantauan ketat asupan cairan agar tidak dehidrasi. Pernyataan Sesuai.",
      },
    },

    // 6. A05-SD-BIN - Slot 30 (Kerajinan & Industri Lokal)
    {
      packageCode: "A05-SD-BIN",
      slotNumber: 30,
      data: {
        elemen: "Membaca dan Memirsa",
        sub_elemen: "Teks Informasi",
        kompetensi: "Menilai kelogisan tahapan dan nilai ekonomi kerajinan tradisional pada teks wacana.",
        level_kognitif: "Evaluasi dan Apresiasi",
        tingkat_kesulitan: "tinggi",
        bentuk_soal: "PGK_KATEGORI",
        jenis_soal: "tunggal",
        tema_konteks: "kerajinan bambu Desa Sukamaju",
        soal_text:
          "Cermati kutipan teks berikut!\n\n" +
          "Warga pengrajin bambu di Desa Sukamaju mempertahankan metode pengawetan alami dengan cara merendam bilah-bilah bambu tali di dalam lumpur kolam selama dua pekan. Proses perendaman ini terbukti ampuh melarutkan kadar glukosa dalam serat bambu sehingga hasil anyaman tahan terhadap serangan rayap bertahun-tahun. Meskipun membutuhkan waktu pengolahan lebih lama dibandingkan pengawetan kimia, produk besek dan kap lampu bambu Desa Sukamaju diminati pasar ekspor karena dinilai ramah lingkungan dan aman untuk wadah pangan.\n\nTentukan kebenaran setiap pernyataan berikut berdasarkan isi teks!",
        pernyataan: [
          {
            no: 1,
            text: "Tujuan utama perendaman bilah bambu di dalam lumpur kolam adalah melarutkan kadar glukosa agar tahan terhadap serangga hama.",
          },
          {
            no: 2,
            text: "Produk kerajinan bambu Desa Sukamaju sulit menembus pasar luar negeri karena proses pembuatannya memakan waktu terlalu lama.",
          },
          {
            no: 3,
            text: "Keunggulan nilai jual anyaman bambu alami tersebut terletak pada aspek keamanan bagi makanan dan sifatnya yang ramah lingkungan.",
          },
        ],
        kategori_respons: ["Benar", "Salah"],
        kunci_jawaban: ["Benar", "Salah", "Benar"],
        pembahasan:
          "Analisis pernyataan berdasarkan teks:\n" +
          "1. Teks menyatakan: 'ampuh melarutkan kadar glukosa dalam serat bambu sehingga hasil anyaman tahan terhadap serangan rayap'. Pernyataan bernilai Benar.\n" +
          "2. Teks menyatakan produk tersebut 'diminati pasar ekspor', bukan sulit menembus pasar luar negeri. Pernyataan bernilai Salah.\n" +
          "3. Teks secara jelas menggarisbawahi produk diminati karena 'dinilai ramah lingkungan dan aman untuk wadah pangan'. Pernyataan bernilai Benar.",
      },
    },

    // 7. A02-SMP-BIN - Slot 28 (Kerajinan & Industri Lokal)
    {
      packageCode: "A02-SMP-BIN",
      slotNumber: 28,
      data: {
        elemen: "Membaca dan Memirsa",
        sub_elemen: "Teks Informasi",
        kompetensi: "Menganalisis hubungan sebab-akibat penggunaan fiksator alami pada kerajinan kain ecoprint.",
        level_kognitif: "Pemahaman Inferensial",
        tingkat_kesulitan: "sedang",
        bentuk_soal: "PGK_KATEGORI",
        jenis_soal: "tunggal",
        tema_konteks: "produksi UMKM ecoprint",
        soal_text:
          "Bacalah teks laporan teknis produksi kain ecoprint berikut!\n\n" +
          "Pada proses pembuatan kain ecoprint teknik kukus (steaming), daun jati muda dan daun jarak wulung menghasilkan jejak pigmen warna alami yang tajam jika kain katun telah melalui tahap mordan dengan tawas. Tahap akhir fiksasi menggunakan larutan tunjung (besi sulfat) akan mengunci pigmen sekaligus menggelapkan nuansa warna dasar kain. Sebaliknya, jika pengrajin menghendaki warna daun tetap cerah menyerupai warna aslinya, larutan kapur tohor digunakan sebagai fiksator pilihan.\n\nTentukan kebenaran setiap pernyataan inferensial berikut!",
        pernyataan: [
          {
            no: 1,
            text: "Penggunaan larutan tunjung menghasilkan efek warna akhir yang cenderung lebih gelap daripada penggunaan larutan kapur tohor.",
          },
          {
            no: 2,
            text: "Tahap mordan dengan tawas dilakukan setelah proses pengukusan kain ecoprint selesai.",
          },
          {
            no: 3,
            text: "Jika pengrajin ingin mempertahankan warna hijau terang dari daun jarak wulung, maka larutan kapur tohor lebih tepat dipilih sebagai fiksator.",
          },
        ],
        kategori_respons: ["Benar", "Salah"],
        kunci_jawaban: ["Benar", "Salah", "Benar"],
        pembahasan:
          "Analisis teks teknis:\n" +
          "1. Teks menyatakan tunjung 'menggelapkan nuansa warna', sedangkan kapur tohor mempertahankan warna 'tetap cerah'. Pernyataan bernilai Benar.\n" +
          "2. Teks menyebutkan pigmen tajam muncul 'jika kain katun telah melalui tahap mordan dengan tawas', artinya tahap mordan dilakukan sebelum perlekatan dan pengukusan. Pernyataan bernilai Salah.\n" +
          "3. Untuk warna yang tetap cerah menyerupai aslinya, teks merekomendasikan larutan kapur tohor. Pernyataan bernilai Benar.",
      },
    },

    // 8. A02-SMP-BIN - Slot 29 (Kerajinan & Industri Lokal)
    {
      packageCode: "A02-SMP-BIN",
      slotNumber: 29,
      data: {
        elemen: "Membaca dan Memirsa",
        sub_elemen: "Teks Informasi",
        kompetensi: "Mengevaluasi keabsahan argumen keunggulan ekologis produk kerajinan tekstil ramah lingkungan.",
        level_kognitif: "Evaluasi dan Apresiasi",
        tingkat_kesulitan: "tinggi",
        bentuk_soal: "PGK_KATEGORI",
        jenis_soal: "tunggal",
        tema_konteks: "produksi UMKM ecoprint",
        soal_text:
          "Perhatikan kutipan artikel opini ekonomi kreatif berikut!\n\n" +
          "Limbah pewarna sintetis dari industri tekstil konvensional menjadi salah satu penyumbang pencemaran logam berat di sungai-sungai pulau Jawa. Hadirnya UMKM kerajinan ecoprint membuktikan bahwa fesyen berkelanjutan (sustainable fashion) dapat menjadi alternatif nyata. Selain memanfaatkan daun gugur dan tanaman liar sekitar, air sisa fiksasi alami tidak merusak ekosistem tanah ketika dialirkan ke bak resapan tanaman. Kendati demikian, harga jual yang lebih tinggi dan perlunya edukasi perawatan kain berbasis detergen lerak masih menjadi tantangan di pasar domestik.\n\nTentukan kesesuaian setiap simpulan berikut dengan teks!",
        pernyataan: [
          {
            no: 1,
            text: "Ecoprint diposisikan sebagai solusi industri kreatif karena proses produksinya meminimalkan risiko pencemaran limbah beracun ke lingkungan perairan.",
          },
          {
            no: 2,
            text: "Perawatan kain ecoprint dianjurkan menggunakan detergen kimia berkonsentrasi tinggi agar serat kain tidak mudah rusak.",
          },
          {
            no: 3,
            text: "Penetapan harga yang premium dan kebiasaan konsumen dalam merawat kain masih menjadi kendala ekspansi UMKM ecoprint di dalam negeri.",
          },
        ],
        kategori_respons: ["Sesuai", "Tidak Sesuai"],
        kunci_jawaban: ["Sesuai", "Tidak Sesuai", "Sesuai"],
        pembahasan:
          "Analisis kesesuaian argumen:\n" +
          "1. Teks membandingkan limbah sintetis konvensional dengan ecoprint yang air sisanya tidak merusak ekosistem tanah dan sungai. Simpulan Sesuai.\n" +
          "2. Teks menyebutkan perlunya edukasi perawatan berbasis detergen lerak alami, bukan detergen kimia keras. Simpulan Tidak Sesuai.\n" +
          "3. Teks secara gamblang mencatat bahwa harga jual lebih tinggi dan edukasi perawatan kain menjadi tantangan di pasar domestik. Simpulan Sesuai.",
      },
    },

    // 9. A02-SMP-BIN - Slot 30 (Kerajinan & Industri Lokal)
    {
      packageCode: "A02-SMP-BIN",
      slotNumber: 30,
      data: {
        elemen: "Membaca dan Memirsa",
        sub_elemen: "Teks Informasi",
        kompetensi: "Mengevaluasi kelogisan struktur teks eksposisi proses sertifikasi produk kerajinan ramah lingkungan.",
        level_kognitif: "Evaluasi dan Apresiasi",
        tingkat_kesulitan: "tinggi",
        bentuk_soal: "PGK_KATEGORI",
        jenis_soal: "tunggal",
        tema_konteks: "produksi UMKM ecoprint",
        soal_text:
          "Cermati teks panduan mutu berikut!\n\n" +
          "Untuk mendapatkan label sertifikasi 'Ecolabel Indonesia', pelaku UMKM kerajinan ecoprint diwajibkan memenuhi tiga pilar utama: ketertelusuran bahan baku daun yang dipanen tanpa merusak kelestarian pohon induk, ketiadaan bahan kimia berbahaya pada lembar uji laboratorium kain jadi, serta pengelolaan limbah bilasan yang memenuhi baku mutu air lingkungan. Penerapan standar ini menjamin integritas produk di mata konsumen global yang semakin peduli pada etika produksi hijau.\n\nTentukan kebenaran setiap pernyataan berikut berdasarkan teks panduan mutu di atas!",
        pernyataan: [
          {
            no: 1,
            text: "Sertifikasi Ecolabel mempersyaratkan bahwa daun yang digunakan untuk ecoprint tidak boleh diperoleh dengan menebang atau merusak pohon induk.",
          },
          {
            no: 2,
            text: "Uji laboratorium kain jadi difokuskan untuk mengonfirmasi ketahanan warna kain terhadap sinar matahari selama 100 jam.",
          },
          {
            no: 3,
            text: "Penerapan standar sertifikasi ramah lingkungan tersebut bertujuan meningkatkan kepercayaan pasar internasional terhadap komitmen etika produksi produk.",
          },
        ],
        kategori_respons: ["Benar", "Salah"],
        kunci_jawaban: ["Benar", "Salah", "Benar"],
        pembahasan:
          "Analisis pernyataan:\n" +
          "1. Teks mensyaratkan: 'ketertelusuran bahan baku daun yang dipanen tanpa merusak kelestarian pohon induk'. Pernyataan bernilai Benar.\n" +
          "2. Pada teks tertulis uji laboratorium bertujuan membuktikan 'ketiadaan bahan kimia berbahaya pada lembar uji laboratorium kain jadi', bukan uji ketahanan sinar matahari 100 jam. Pernyataan bernilai Salah.\n" +
          "3. Teks menyatakan standar menjamin integritas di mata 'konsumen global yang semakin peduli pada etika produksi hijau'. Pernyataan bernilai Benar.",
      },
    },
  ];

  for (const item of missingItems) {
    const pkgId = pkgMap[item.packageCode];
    if (!pkgId) {
      console.error(`Paket ${item.packageCode} tidak ditemukan di database!`);
      continue;
    }

    console.log(`Mengisi [${item.packageCode}] Slot ${item.slotNumber}...`);
    const res = await fetch(`${BASE_URL}/api/packages/${pkgId}/slots/${item.slotNumber}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(item.data),
    });

    const resData = await res.json();
    if (res.ok && resData.success) {
      console.log(`   ✅ Berhasil mengisi Slot ${item.slotNumber} pada ${item.packageCode}`);
    } else {
      console.error(`   ❌ Gagal pada ${item.packageCode} Slot ${item.slotNumber}:`, resData.error);
    }
  }

  // Verifikasi Ulang Semua Paket
  console.log("\n=================================================");
  console.log("VERIFIKASI AKHIR KELENGKAPAN STATUS SEMUA PAKET");
  console.log("=================================================");

  const checkRes = await fetch(`${BASE_URL}/api/packages`, {
    headers: { Cookie: cookie },
  });
  const checkPkgs = (await checkRes.json()).data || [];

  let all30 = true;
  let allValidated = true;

  checkPkgs.sort((a, b) => a.code.localeCompare(b.code));
  for (const p of checkPkgs) {
    const filled = p.progress?.filledSoal || 0;
    const is30 = filled === 30;
    const isVal = p.status === "dalam_validasi";
    if (!is30) all30 = false;
    if (!isVal) allValidated = false;

    console.log(
      `[${p.code}] ${p.nama.padEnd(38)} | Butir: ${filled}/30 | Status: ${p.status.padEnd(16)} | ${
        is30 && isVal ? "🟢 100% LENGKAP" : "🟡 BELUM LENGKAP"
      }`
    );
  }

  console.log("\n-------------------------------------------------");
  console.log(`Total Paket Terdaftar: ${checkPkgs.length} paket`);
  console.log(`Semua Paket Genap 30/30: ${all30 ? "YA (100%)" : "TIDAK"}`);
  console.log(`Semua Paket Dalam Validasi: ${allValidated ? "YA (100%)" : "TIDAK"}`);
  console.log("-------------------------------------------------\n");
}

run().catch((e) => console.error(e));
