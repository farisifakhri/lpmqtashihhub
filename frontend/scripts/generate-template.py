import zipfile
import os

content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

doc_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>[KOP SURAT RESMI PENERBIT / PEMOHON]</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Alamat Lengkap Perusahaan • No. Telepon / Fax • Email Resmi • Website</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>_________________________________________________________________________________</w:t></w:r></w:p>
    <w:p/>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/><w:sz w:val="24"/></w:rPr><w:t>SURAT PERMOHONAN PENTASHIHAN MUSHAF AL-QUR'AN</w:t></w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r><w:t>Nomor        : ........................................</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Lampiran   : 1 (satu) Berkas Master Naskah A4 Dijilid Per Juz &amp; Berkas Digital</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Perihal       : Permohonan Penerbitan Surat Tanda Tashih (STT) Mushaf Al-Qur'an</w:t></w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r><w:t>Kepada Yth.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Kepala Lajnah Pentashihan Mushaf Al-Qur'an (LPMQ)</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Badan Moderasi Beragama dan Pengembangan Sumber Daya Manusia</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Kementerian Agama Republik Indonesia</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Gedung Bayt Al-Qur'an &amp; Museum Istiqlal, Jl. Raya TMII Pintu I Jakarta Timur 13560</w:t></w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r><w:t>Assalamu'alaikum Warahmatullahi Wabarakatuh,</w:t></w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r><w:t>Dengan hormat, yang bertanda tangan di bawah ini:</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>  Nama Pemohon / Penanggung Jawab : ............................................................</w:t></w:r></w:p>
    <w:p><w:r><w:t>  Jabatan                                                        : ............................................................</w:t></w:r></w:p>
    <w:p><w:r><w:t>  Nama Perusahaan / Penerbit                   : ............................................................</w:t></w:r></w:p>
    <w:p><w:r><w:t>  Alamat Domisili Perusahaan                    : ............................................................</w:t></w:r></w:p>
    <w:p><w:r><w:t>  No. Telepon / WhatsApp                         : ............................................................</w:t></w:r></w:p>
    <w:p><w:r><w:t>  Alamat Email Resmi                                   : ............................................................</w:t></w:r></w:p>
    <w:p/>
    <w:p>
      <w:r><w:t>Dengan ini mengajukan permohonan pentashihan atas naskah mushaf Al-Qur'an dengan rincian data sebagai berikut:</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>  1. Judul Naskah Mushaf               : ............................................................</w:t></w:r></w:p>
    <w:p><w:r><w:t>  2. Kategori Layanan                     : [  ] Baru  [  ] Perpanjangan  [  ] Luar Negeri</w:t></w:r></w:p>
    <w:p><w:r><w:t>  3. Jenis Standar Mushaf              : [  ] Standar Usmani  [  ] Bahriyah  [  ] Braille  [  ] Isyarat</w:t></w:r></w:p>
    <w:p><w:r><w:t>  4. Kelengkapan Konten                : [  ] 30 Juz Lengkap  [  ] Juz 'Amma / Pilihan</w:t></w:r></w:p>
    <w:p><w:r><w:t>  5. Konten Tambahan (Add-On)     : [  ] Terjemah Kemenag  [  ] Tajwid Warna  [  ] Transliterasi  [  ] Lainnya: .......</w:t></w:r></w:p>
    <w:p/>
    <w:p>
      <w:r><w:t>Bersama surat ini, kami lampirkan berkas persyaratan administratif dan teknis meliputi:</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>  1. Berkas digital (Cover, Sampel Halaman Awal, Teks Naskah PDF).</w:t></w:r></w:p>
    <w:p><w:r><w:t>  2. Cetak master fisik naskah ukuran A4 dijilid rapi per juz (1 s.d. 30).</w:t></w:r></w:p>
    <w:p><w:r><w:t>  3. Bukti pendaftaran dan legalitas badan usaha penerbit.</w:t></w:r></w:p>
    <w:p/>
    <w:p>
      <w:r><w:t>Kami menyatakan dengan sungguh-sungguh bahwa data dan berkas yang kami sampaikan adalah benar, sah, dan dapat dipertanggungjawabkan sesuai ketentuan perundang-undangan serta Pedoman Pentashihan Mushaf Al-Qur'an Kementerian Agama RI.</w:t></w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r><w:t>Demikian surat permohonan ini kami sampaikan. Atas perhatian dan kerja sama Bapak Kepala LPMQ, kami ucapkan terima kasih.</w:t></w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:r><w:t>Wassalamu'alaikum Warahmatullahi Wabarakatuh.</w:t></w:r>
    </w:p>
    <w:p/>
    <w:p>
      <w:pPr><w:ind w:left="5670"/></w:pPr>
      <w:r><w:t>...................., .................... 20...</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:ind w:left="5670"/></w:pPr>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Hormat kami,</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:ind w:left="5670"/></w:pPr>
      <w:r><w:t>[Nama Penerbit / Instansi Pemohon]</w:t></w:r>
    </w:p>
    <w:p/>
    <w:p/>
    <w:p/>
    <w:p>
      <w:pPr><w:ind w:left="5670"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>( .................................................... )</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:ind w:left="5670"/></w:pPr>
      <w:r><w:t>Pimpinan / Penanggung Jawab</w:t></w:r>
    </w:p>
  </w:body>
</w:document>"""

out_dir = os.path.join("frontend", "public", "templates")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "template-surat-permohonan-tashih.docx")

with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", content_types)
    z.writestr("_rels/.rels", rels)
    z.writestr("word/document.xml", doc_xml)

print(f"Generated official template at: {out_path} ({os.path.getsize(out_path)} bytes)")
