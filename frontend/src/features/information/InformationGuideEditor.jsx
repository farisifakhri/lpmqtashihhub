import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Eraser,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Rows3,
  Table2,
  Trash2,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { informationGuideApi } from '@/api/information-guide.api';

const IMAGE_PATH = /\/information-guides\/images\/([0-9a-f-]{36})/i;

const GuideImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      guideImageId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-guide-image-id'),
        renderHTML: (attributes) => attributes.guideImageId
          ? { 'data-guide-image-id': attributes.guideImageId }
          : {},
      },
    };
  },
});

const editorExtensions = [
  StarterKit,
  TextStyle,
  Color,
  Link.configure({
    openOnClick: false,
    protocols: ['http', 'https', 'mailto'],
    HTMLAttributes: { rel: 'noopener noreferrer', class: 'text-brand-700 underline underline-offset-2' },
  }),
  Underline,
  GuideImage.configure({ inline: false, allowBase64: false }),
  Table.configure({ resizable: true, HTMLAttributes: { class: 'table-fixed overflow-hidden rounded-lg border border-line' } }),
  TableRow,
  TableHeader,
  TableCell,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
];

function blobFromHtml(html) {
  const parsed = new DOMParser().parseFromString(DOMPurify.sanitize(html || ''), 'text/html');
  return parsed;
}

async function hydrateEditorHtml(html, objectUrls) {
  const parsed = blobFromHtml(html);
  const images = [...parsed.querySelectorAll('img[src]')];
  await Promise.all(images.map(async (image) => {
    const imageId = image.getAttribute('data-guide-image-id') || image.getAttribute('src')?.match(IMAGE_PATH)?.[1];
    if (!imageId) return;
    const blobUrl = await informationGuideApi.fetchImageBlobUrl(imageId, { admin: true });
    objectUrls.add(blobUrl);
    image.setAttribute('src', blobUrl);
    image.setAttribute('data-guide-image-id', imageId);
  }));
  return parsed.body.innerHTML;
}

export function prepareInformationGuideHtml(html) {
  const parsed = blobFromHtml(html);
  parsed.querySelectorAll('img').forEach((image) => {
    const imageId = image.getAttribute('data-guide-image-id');
    if (imageId) {
      image.setAttribute('src', `/api/v1/information-guides/images/${imageId}`);
      image.removeAttribute('data-guide-image-id');
      return;
    }
    if (image.getAttribute('src')?.startsWith('blob:')) {
      throw new Error('Gambar editor belum terhubung ke berkas panduan. Unggah kembali gambar tersebut.');
    }
  });
  return DOMPurify.sanitize(parsed.body.innerHTML);
}

function ToolbarButton({ label, active, onClick, children, disabled = false, title }) {
  return (
    <button
      type="button"
      title={title || label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-ink transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-line bg-surface hover:bg-surface-subtle'
      }`}
    >
      {children}
    </button>
  );
}

function sanitizeHexColor(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  return '';
}

export function InformationGuideEditor({ content = '', guideId, onChange, readOnly = false }) {
  const [imageError, setImageError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef(null);
  const loadedContentRef = useRef(null);
  const imageObjectUrls = useRef(new Set());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: editorExtensions,
    content: '',
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'min-h-64 max-w-none px-4 py-3 text-sm leading-7 text-ink focus:outline-none [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-3 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-line [&_td]:p-2 [&_th]:border [&_th]:border-line [&_th]:bg-surface-subtle [&_th]:p-2 [&_ul]:list-disc [&_img]:max-w-full',
        'aria-label': 'Konten panduan',
      },
    },
  });

  useEffect(() => {
    if (!editor || loadedContentRef.current === `${guideId || 'new'}:${content}`) return undefined;
    let active = true;
    const contentKey = `${guideId || 'new'}:${content}`;
    hydrateEditorHtml(content, imageObjectUrls.current)
      .then((hydrated) => {
        if (active) {
          editor.commands.setContent(hydrated, { emitUpdate: false });
          loadedContentRef.current = contentKey;
        }
      })
      .catch((error) => {
        if (active) setImageError(error.message || 'Gambar di konten tidak dapat dimuat.');
      });
    return () => { active = false; };
  // The initial HTML is hydrated once; live edits must not reset editor selection or content.
  }, [editor]);

  useEffect(() => {
    if (!editor || readOnly) return undefined;
    const handleUpdate = () => onChangeRef.current?.(editor.getHTML());
    editor.on('update', handleUpdate);
    return () => editor.off('update', handleUpdate);
  }, [editor, readOnly]);

  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => () => {
    imageObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const handleImageSelected = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length || !editor || !guideId) return;
    setImageError('');
    setImageUploading(true);
    try {
      for (const file of files) {
        const response = await informationGuideApi.uploadImage(guideId, file);
        const image = response.data;
        const blobUrl = await informationGuideApi.fetchImageBlobUrl(image.id, { admin: true });
        imageObjectUrls.current.add(blobUrl);
        editor.chain().focus().setImage({
          src: blobUrl,
          alt: file.name,
          guideImageId: image.id,
        }).run();
      }
    } catch (error) {
      setImageError(error.message || 'Gambar tidak dapat diunggah.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleLink = () => {
    if (!editor) return;
    const existing = editor.getAttributes('link')?.href || '';
    const value = window.prompt('Masukkan alamat tautan (https://, http://, atau mailto:)', existing);
    if (value === null) return;
    const normalized = value.trim();
    if (!normalized) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    try {
      const url = new URL(normalized);
      if (!['https:', 'http:', 'mailto:'].includes(url.protocol)) throw new Error();
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.href, target: '_blank', rel: 'noopener noreferrer' }).run();
    } catch {
      setImageError('Alamat tautan harus menggunakan HTTPS, HTTP, atau mailto.');
    }
  };

  const handleTextColor = (color) => {
    if (!editor) return;
    const normalized = sanitizeHexColor(color);
    if (!normalized) {
      editor.chain().focus().setColor('').unsetColor().run();
      return;
    }
    editor.chain().focus().setColor(normalized).run();
  };

  const tableActions = [
    {
      label: 'Tambah baris di atas',
      action: () => editor.chain().focus().addRowBefore().run(),
    },
    {
      label: 'Tambah baris di bawah',
      action: () => editor.chain().focus().addRowAfter().run(),
    },
    {
      label: 'Tambah kolom kiri',
      action: () => editor.chain().focus().addColumnBefore().run(),
    },
    {
      label: 'Tambah kolom kanan',
      action: () => editor.chain().focus().addColumnAfter().run(),
    },
    {
      label: 'Hapus baris',
      action: () => editor.chain().focus().deleteRow().run(),
    },
    {
      label: 'Hapus kolom',
      action: () => editor.chain().focus().deleteColumn().run(),
    },
    {
      label: 'Hapus tabel',
      action: () => editor.chain().focus().deleteTable().run(),
    },
  ];

  if (!editor) return <div className="min-h-64 animate-pulse rounded-xl bg-surface-subtle" aria-busy="true" />;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface-subtle p-2" role="toolbar" aria-label="Pemformatan panduan">
          <ToolbarButton label="Tebal" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Miring" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Garis bawah" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <span className="mx-1 h-5 border-l border-line" aria-hidden="true" />
          <ToolbarButton label="Judul bagian" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Subjudul" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Daftar berpoin" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Daftar bernomor" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Rata kiri" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Rata tengah" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Sisipkan tautan" active={editor.isActive('link')} onClick={handleLink}>
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Warna teks" active={Boolean(editor.getAttributes('textStyle').color)} onClick={() => handleTextColor('#2563eb')}>
            <span className="h-4 w-4 rounded-sm border border-line bg-brand-600" aria-hidden="true" />
          </ToolbarButton>
          <input
            type="color"
            aria-label="Pilih warna teks"
            value={editor.getAttributes('textStyle').color || '#2563eb'}
            onChange={(event) => handleTextColor(event.target.value)}
            className="h-8 w-8 cursor-pointer rounded-md border border-line bg-surface p-1"
          />
          <ToolbarButton label="Bersihkan warna teks" onClick={() => handleTextColor('')}>
            <Eraser className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Sisipkan tabel 3 × 3"
            active={editor.isActive('table')}
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <Table2 className="h-4 w-4" />
          </ToolbarButton>
          <div className="flex flex-wrap items-center gap-1.5">
            {tableActions.map(({ label, action }) => (
              <ToolbarButton key={label} label={label} onClick={action}>
                {label.includes('baris') ? <Rows3 className="h-4 w-4" /> : label.includes('kolom') ? <Table2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              </ToolbarButton>
            ))}
          </div>
          <ToolbarButton
            label={imageUploading ? 'Mengunggah gambar' : 'Sisipkan gambar'}
            disabled={!guideId || imageUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Pilih gambar"
            multiple
            onChange={handleImageSelected}
          />
          <span className="basis-full text-[11px] text-ink-muted">
            {guideId ? 'Pilih format PNG, JPEG, atau WebP (maks. 5 MB). Beberapa gambar dapat diunggah sekaligus.' : 'Simpan draf editor terlebih dahulu untuk mengunggah gambar.'}
          </span>
        </div>
      )}
      {imageError && <p className="border-b border-civic-dangerLine bg-civic-dangerSoft px-3 py-2 text-xs text-civic-danger" role="alert">{imageError}</p>}
      <EditorContent editor={editor} />
    </div>
  );
}
