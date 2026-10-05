import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getOfficialVerse } from '../services/lpmq-quran.service.js';

const router = Router();

router.get('/quran/verses/:surah/:ayah', authenticate, async (req, res, next) => {
  try {
    const surah = Number(req.params.surah);
    const ayah = Number(req.params.ayah);
    if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1 || ayah > 286) {
      return res.status(400).json({ success: false, message: 'Nomor surah atau ayat tidak valid.' });
    }
    const data = await getOfficialVerse(surah, ayah);
    res.set('Cache-Control', 'private, max-age=3600');
    return res.json({ success: true, data });
  } catch (error) { return next(error); }
});

export default router;
