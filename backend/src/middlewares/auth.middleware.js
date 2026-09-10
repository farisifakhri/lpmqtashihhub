import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { prisma } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Anda belum masuk ke aplikasi. Silakan masuk terlebih dahulu untuk melanjutkan.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        roles: {
          include: { role: true },
        },
        publisher: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'Akun tidak tersedia atau sudah tidak aktif. Hubungi administrator untuk memeriksa akses akun Anda.',
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      nip: user.nip,
      status: user.status,
      roles: user.roles.map((ur) => ur.role.code),
      publisherId: user.publisher ? user.publisher.id : null,
      publisher: user.publisher || null,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.',
      });
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        message: 'Sesi masuk Anda tidak valid. Silakan masuk kembali untuk melanjutkan.',
      });
    }
    // Gangguan database tidak berarti kredensial pengguna salah.
    next(error);
  }
};

export default authenticate;
