// Provinsi penerbit tidak disimpan sebagai kolom; dideteksi dari teks alamat (nama provinsi, singkatan,
// atau kota/kabupaten utamanya). shortcut: heuristik teks, ganti ke kolom `province` di formulir bila akurasi kurang.
const PROVINCES = [
  ['Aceh', ['aceh', 'nanggroe aceh darussalam', 'banda aceh', 'lhokseumawe', 'langsa']],
  ['Sumatera Utara', ['sumatera utara', 'sumatra utara', 'sumut', 'medan', 'binjai', 'pematang siantar', 'pematangsiantar', 'deli serdang']],
  ['Sumatera Barat', ['sumatera barat', 'sumatra barat', 'sumbar', 'padang', 'bukittinggi', 'payakumbuh']],
  ['Riau', ['riau', 'pekanbaru', 'dumai']],
  ['Kepulauan Riau', ['kepulauan riau', 'kepri', 'batam', 'tanjung pinang', 'tanjungpinang']],
  ['Jambi', ['jambi']],
  ['Sumatera Selatan', ['sumatera selatan', 'sumatra selatan', 'sumsel', 'palembang', 'prabumulih', 'lubuklinggau']],
  ['Kepulauan Bangka Belitung', ['bangka belitung', 'babel', 'pangkal pinang', 'pangkalpinang']],
  ['Bengkulu', ['bengkulu']],
  ['Lampung', ['lampung', 'metro lampung']],
  ['DKI Jakarta', ['dki jakarta', 'daerah khusus ibukota jakarta', 'jakarta']],
  ['Jawa Barat', ['jawa barat', 'jabar', 'bandung', 'bogor', 'bekasi', 'depok', 'cimahi', 'cirebon', 'sukabumi', 'tasikmalaya', 'karawang', 'garut', 'cianjur', 'purwakarta', 'subang', 'indramayu', 'majalengka', 'kuningan', 'sumedang', 'ciamis']],
  ['Banten', ['banten', 'tangerang', 'tangerang selatan', 'serang', 'cilegon', 'pandeglang']],
  ['Jawa Tengah', ['jawa tengah', 'jateng', 'semarang', 'solo', 'surakarta', 'magelang', 'pekalongan', 'tegal', 'salatiga', 'kudus', 'klaten', 'sragen', 'boyolali', 'sukoharjo', 'karanganyar', 'wonogiri', 'purwokerto', 'banyumas', 'cilacap', 'kebumen', 'purworejo', 'jepara', 'demak', 'rembang', 'blora', 'grobogan', 'kendal', 'pemalang', 'brebes', 'wonosobo', 'temanggung', 'banjarnegara', 'purbalingga']],
  ['DI Yogyakarta', ['daerah istimewa yogyakarta', 'yogyakarta', 'jogjakarta', 'jogja', 'diy', 'sleman', 'bantul', 'gunungkidul', 'gunung kidul', 'kulon progo']],
  ['Jawa Timur', ['jawa timur', 'jatim', 'surabaya', 'malang', 'sidoarjo', 'gresik', 'kediri', 'madiun', 'blitar', 'mojokerto', 'pasuruan', 'probolinggo', 'jember', 'banyuwangi', 'lamongan', 'tuban', 'bojonegoro', 'jombang', 'nganjuk', 'ponorogo', 'tulungagung', 'lumajang', 'bondowoso', 'situbondo', 'madura', 'bangkalan', 'sampang', 'pamekasan', 'sumenep']],
  ['Bali', ['bali', 'denpasar', 'gianyar', 'tabanan', 'buleleng']],
  ['Nusa Tenggara Barat', ['nusa tenggara barat', 'ntb', 'mataram', 'lombok', 'sumbawa']],
  ['Nusa Tenggara Timur', ['nusa tenggara timur', 'ntt', 'kupang', 'flores', 'maumere']],
  ['Kalimantan Barat', ['kalimantan barat', 'kalbar', 'pontianak', 'singkawang']],
  ['Kalimantan Tengah', ['kalimantan tengah', 'kalteng', 'palangka raya', 'palangkaraya']],
  ['Kalimantan Selatan', ['kalimantan selatan', 'kalsel', 'banjarmasin', 'banjarbaru', 'martapura']],
  ['Kalimantan Timur', ['kalimantan timur', 'kaltim', 'samarinda', 'balikpapan', 'bontang']],
  ['Kalimantan Utara', ['kalimantan utara', 'kaltara', 'tarakan', 'tanjung selor']],
  ['Sulawesi Utara', ['sulawesi utara', 'sulut', 'manado', 'bitung', 'tomohon']],
  ['Gorontalo', ['gorontalo']],
  ['Sulawesi Tengah', ['sulawesi tengah', 'sulteng', 'palu']],
  ['Sulawesi Barat', ['sulawesi barat', 'sulbar', 'mamuju']],
  ['Sulawesi Selatan', ['sulawesi selatan', 'sulsel', 'makassar', 'gowa', 'maros', 'parepare']],
  ['Sulawesi Tenggara', ['sulawesi tenggara', 'sultra', 'kendari', 'baubau']],
  ['Maluku', ['maluku', 'ambon']],
  ['Maluku Utara', ['maluku utara', 'malut', 'ternate', 'sofifi']],
  ['Papua', ['papua', 'jayapura']],
  ['Papua Barat', ['papua barat', 'manokwari']],
  ['Papua Barat Daya', ['papua barat daya', 'sorong']],
  ['Papua Tengah', ['papua tengah', 'nabire', 'timika']],
  ['Papua Pegunungan', ['papua pegunungan', 'wamena']],
  ['Papua Selatan', ['papua selatan', 'merauke']],
];

export const PROVINCE_NAMES = PROVINCES.map(([name]) => name);
export const UNKNOWN_PROVINCE = 'Belum Terdeteksi';

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MATCHERS = PROVINCES.flatMap(([province, aliases]) =>
  aliases.map((alias) => ({ province, length: alias.length, regex: new RegExp(`(?<![a-z])${escape(alias)}(?![a-z])`, 'g') })),
);

// Alamat Indonesia biasanya diakhiri kota/provinsi, jadi kecocokan PALING BELAKANG yang dipakai
// ("Jl. Bandung No. 5, Surabaya" -> Jawa Timur). Posisi sama: alias terpanjang menang
// ("Papua Barat Daya" mengalahkan "Papua Barat" dan "Papua").
export const detectProvince = (address) => {
  const text = String(address || '').toLowerCase();
  let best = null;
  for (const matcher of MATCHERS) {
    for (const match of text.matchAll(matcher.regex)) {
      const end = match.index + matcher.length;
      if (!best || end > best.end || (end === best.end && matcher.length > best.length)) {
        best = { end, length: matcher.length, province: matcher.province };
      }
    }
  }
  return best?.province || UNKNOWN_PROVINCE;
};
