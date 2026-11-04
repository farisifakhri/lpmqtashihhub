import * as informationGuideService from '../services/information-guide.service.js';

function safeHeaderFilename(fileName) {
  return (fileName || 'panduan').replace(/[\\/:*?"<>|\r\n]/g, '_');
}

function sendFileResponse(res, file, disposition) {
  const safeName = safeHeaderFilename(file.file_name);
  const encodedName = encodeURIComponent(safeName).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodedName}`);
  res.setHeader('Content-Length', file.file_size);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(200).send(file.bytes);
}

export async function listPublicInformationGuides(req, res, next) {
  try {
    const result = await informationGuideService.listPublicInformationGuides(req.query);
    return res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function getPublicInformationGuide(req, res, next) {
  try {
    const guide = await informationGuideService.getInformationGuide(req.params.id, true, req.query.section || 'GUIDE');
    return res.status(200).json({
      success: true,
      data: {
        id: guide.id,
        title: guide.title,
        content_type: guide.content_type,
        content_html: guide.content_type === 'EDITOR' ? guide.content_html : null,
        mime_type: guide.mime_type,
        created_at: guide.created_at,
        updated_at: guide.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublicInformationGuideFile(req, res, next) {
  try {
    const file = await informationGuideService.getInformationGuideFile(req.params.id, true, req.query.section || 'GUIDE');
    return sendFileResponse(res, file, file.mime_type === 'application/pdf' ? 'inline' : 'attachment');
  } catch (error) {
    next(error);
  }
}

export async function downloadPublicInformationGuideFile(req, res, next) {
  try {
    const file = await informationGuideService.getInformationGuideFile(req.params.id, true, req.query.section || 'GUIDE');
    return sendFileResponse(res, file, 'attachment');
  } catch (error) {
    next(error);
  }
}

export async function getPublicInformationGuideImage(req, res, next) {
  try {
    const image = await informationGuideService.getInformationGuideImage(
      req.params.imageId,
      true,
      req.query.section || 'GUIDE'
    );
    res.setHeader('Content-Type', image.mime_type);
    res.setHeader('Content-Length', image.file_size);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(image.bytes);
  } catch (error) {
    next(error);
  }
}

export async function listAdminInformationGuides(req, res, next) {
  try {
    const result = await informationGuideService.listAdminInformationGuides(req.query);
    return res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function getAdminInformationGuide(req, res, next) {
  try {
    const guide = await informationGuideService.getInformationGuide(req.params.id, false, req.query.section || 'GUIDE');
    const {
      id, title, content_type, content_html, file_name, file_size, mime_type,
      is_published, created_at, updated_at,
    } = guide;
    return res.status(200).json({
      success: true,
      data: { id, title, content_type, content_html, file_name, file_size, mime_type, is_published, created_at, updated_at },
    });
  } catch (error) {
    next(error);
  }
}

export async function createInformationGuide(req, res, next) {
  try {
    const guide = await informationGuideService.createInformationGuide({
      data: req.body,
      file: req.file,
      user: req.user,
      req,
    });
    return res.status(201).json({ success: true, message: 'Panduan berhasil disimpan.', data: guide });
  } catch (error) {
    next(error);
  }
}

export async function updateInformationGuide(req, res, next) {
  try {
    const guide = await informationGuideService.updateInformationGuide({
      id: req.params.id,
      data: req.body,
      file: req.file,
      user: req.user,
      req,
    });
    return res.status(200).json({ success: true, message: 'Panduan berhasil diperbarui.', data: guide });
  } catch (error) {
    next(error);
  }
}

export async function deleteInformationGuide(req, res, next) {
  try {
    await informationGuideService.deleteInformationGuide({
      id: req.params.id,
      section: req.query.section || 'GUIDE',
      user: req.user,
      req,
    });
    return res.status(200).json({ success: true, message: 'Panduan berhasil dihapus.' });
  } catch (error) {
    next(error);
  }
}

export async function addInformationGuideImage(req, res, next) {
  try {
    const image = await informationGuideService.addInformationGuideImage({
      id: req.params.id,
      section: req.query.section || 'GUIDE',
      file: req.file,
      user: req.user,
      req,
    });
    return res.status(201).json({ success: true, data: image });
  } catch (error) {
    next(error);
  }
}

export async function getAdminInformationGuideFile(req, res, next) {
  try {
    const file = await informationGuideService.getInformationGuideFile(req.params.id, false, req.query.section || 'GUIDE');
    return sendFileResponse(res, file, file.mime_type === 'application/pdf' ? 'inline' : 'attachment');
  } catch (error) {
    next(error);
  }
}

export async function downloadAdminInformationGuideFile(req, res, next) {
  try {
    const file = await informationGuideService.getInformationGuideFile(req.params.id, false, req.query.section || 'GUIDE');
    return sendFileResponse(res, file, 'attachment');
  } catch (error) {
    next(error);
  }
}

export async function getAdminInformationGuideImage(req, res, next) {
  try {
    const image = await informationGuideService.getInformationGuideImage(
      req.params.imageId,
      false,
      req.query.section || 'GUIDE'
    );
    res.setHeader('Content-Type', image.mime_type);
    res.setHeader('Content-Length', image.file_size);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(image.bytes);
  } catch (error) {
    next(error);
  }
}
