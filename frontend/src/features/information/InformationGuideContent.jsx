import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { informationGuideApi } from '@/api/information-guide.api';

const IMAGE_PATH = /\/information-guides\/images\/([0-9a-f-]{36})/i;

export function InformationGuideContent({ html = '', admin = false }) {
  const [renderedHtml, setRenderedHtml] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const objectUrls = [];
    async function renderContent() {
      setError('');
      setRenderedHtml('');
      const cleanHtml = DOMPurify.sanitize(html || '');
      const parsed = new DOMParser().parseFromString(cleanHtml, 'text/html');
      const images = [...parsed.querySelectorAll('img[src]')];
      await Promise.all(images.map(async (image) => {
        const imageId = image.getAttribute('src')?.match(IMAGE_PATH)?.[1];
        if (!imageId) return;
        const url = await informationGuideApi.fetchImageBlobUrl(imageId, { admin });
        objectUrls.push(url);
        image.setAttribute('src', url);
      }));
      if (active) setRenderedHtml(parsed.body.innerHTML);
    }
    renderContent().catch((renderError) => {
      if (active) setError(renderError.message || 'Pratinjau konten tidak dapat dimuat.');
    });
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [html, admin]);

  if (error) return <p className="rounded-lg border border-civic-dangerLine bg-civic-dangerSoft p-3 text-sm text-civic-danger" role="alert">{error}</p>;
  return (
    <div
      className="guide-rich-content min-w-0 break-words text-sm leading-7 text-ink [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-3 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-line [&_td]:p-2 [&_th]:border [&_th]:border-line [&_th]:bg-surface-subtle [&_th]:p-2 [&_ul]:list-disc [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full"
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
