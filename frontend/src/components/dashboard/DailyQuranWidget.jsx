import React, { useState, useEffect } from 'react';
import { BookOpen, RefreshCw, ChevronDown, ChevronUp, Quote } from 'lucide-react';

const QURAN_HADITH_COLLECTION = [
  {
    id: 1,
    arabic: 'إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ',
    translation: 'Sesungguhnya Kamilah yang menurunkan Al-Qur\'an, dan sesungguhnya Kami benar-benar memeliharanya.',
    source: 'QS. Al-Hijr [15]: 9',
    category: 'Pemeliharaan Mushaf',
  },
  {
    id: 2,
    arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
    translation: 'Sebaik-baik kalian adalah orang yang mempelajari Al-Qur\'an dan mengajarkannya.',
    source: 'HR. Bukhari No. 5027',
    category: 'Keutamaan Al-Qur\'an',
  },
  {
    id: 3,
    arabic: 'إِنَّ عَلَيْنَا جَمْعَهُ وَقُرْآنَهُ ۝ فَإِذَا قَرَأْنَاهُ فَاتَّبِعْ قُرْآنَهُ',
    translation: 'Sesungguhnya atas tanggungan Kamilah mengumpulkannya (di dadamu) dan membacakannya. Apabila Kami telah selesai membacakannya maka ikutilah bacaannya itu.',
    source: 'QS. Al-Qiyamah [75]: 17-18',
    category: 'Kodifikasi & Bacaan',
  },
  {
    id: 4,
    arabic: 'اقْرَءُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ',
    translation: 'Bacalah Al-Qur\'an, sesungguhnya ia akan datang pada hari kiamat sebagai pemberi syafaat bagi para pembacanya.',
    source: 'HR. Muslim No. 798',
    category: 'Syafaat Al-Qur\'an',
  },
  {
    id: 5,
    arabic: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِلْمُتَّقِينَ',
    translation: 'Kitab (Al-Qur\'an) ini tidak ada keraguan padanya; petunjuk bagi mereka yang bertakwa.',
    source: 'QS. Al-Baqarah [2]: 2',
    category: 'Keotentikan Wahyu',
  },
  {
    id: 6,
    arabic: 'مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ، وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا',
    translation: 'Barangsiapa membaca satu huruf dari Kitabullah, maka baginya satu kebaikan, dan satu kebaikan dilipatgandakan sepuluh kali lipat semisalnya.',
    source: 'HR. At-Tirmidzi No. 2910',
    category: 'Pahala Huruf Mushaf',
  },
  {
    id: 7,
    arabic: 'لَا يَأْتِيهِ الْبَاطِلُ مِنْ بَيْنِ يَدَيْهِ وَلَا مِنْ خَلْفِهِ ۖ تَنْزِيلٌ مِنْ حَكِيمٍ حَمِيدٍ',
    translation: '(Yang) tidak akan didatangi oleh kebatilan baik dari depan maupun dari belakangnya, diturunkan dari Tuhan Yang Mahabijaksana lagi Maha Terpuji.',
    source: 'QS. Fushshilat [41]: 42',
    category: 'Kemurnian Al-Qur\'an',
  },
];

export const DailyQuranWidget = () => {
  const [currentIndex, setCurrentIndex] = useState(() => Math.floor(Math.random() * QURAN_HADITH_COLLECTION.length));
  const [countdown, setCountdown] = useState(60);
  const [isFading, setIsFading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const nextQuote = () => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % QURAN_HADITH_COLLECTION.length);
      setCountdown(60);
      setIsFading(false);
    }, 300);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          nextQuote();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const currentItem = QURAN_HADITH_COLLECTION[currentIndex];

  return (
    <div className="bg-gradient-to-br from-white via-amber-50/25 to-white rounded-xl border border-amber-200/80 shadow-sm p-5 sm:p-6 transition-all hover:shadow-md">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-100/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center gap-1.5">
              <span>Kutipan Harian Al-Qur'an & Hadis</span>
              <span className="hidden sm:inline-block text-[11px] font-medium text-primary-700 bg-primary-50 border border-primary-200/60 px-2 py-0.5 rounded-md">
                {currentItem.category}
              </span>
            </h3>
            <p className="text-[11px] text-neutral-500">Inspirasi integritas & pemeliharaan kalam Ilahi</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="text-[11px] text-neutral-400 hidden xs:inline">
            Konten berikutnya dalam <span className="font-mono font-bold text-primary-700">{countdown}</span>s
          </span>
          <button
            type="button"
            onClick={nextQuote}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 active:scale-95 rounded-lg border border-primary-200 transition-all cursor-pointer"
            title="Segarkan kutipan sekarang"
          >
            <RefreshCw className={`w-3 h-3 ${isFading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Ganti</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`mt-4 transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        {/* Source Badge */}
        <div className="mb-2">
          <span className="inline-block px-3 py-0.5 text-xs font-bold rounded-md bg-primary-800 text-white shadow-2xs">
            {currentItem.source}
          </span>
        </div>

        {/* Arabic Text */}
        <div className="py-2">
          <p
            dir="rtl"
            className="text-lg sm:text-2xl font-serif text-neutral-900 leading-[2.2] sm:leading-[2.4] tracking-wide text-right font-medium"
            style={{ fontFamily: "'Traditional Arabic', 'Amiri', 'Scheherazade New', serif" }}
          >
            {currentItem.arabic}
          </p>
        </div>

        {/* Indonesian Translation */}
        <div className="mt-2 text-xs sm:text-sm text-neutral-700 leading-relaxed italic border-l-3 border-gold-500 pl-3.5 bg-neutral-50/90 py-2.5 rounded-r-lg">
          "{currentItem.translation}"
        </div>
      </div>
    </div>
  );
};

export default DailyQuranWidget;

