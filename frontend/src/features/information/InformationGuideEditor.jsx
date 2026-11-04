import React, { useCallback, useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from '@tiptap/react';
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

// ─── Resizable Image Node View ────────────────────────────────────────────────
// Custom React node view that renders a draggable-resizable image inside the
// Tiptap editor.  When the image is selected the user sees:
//   • 8 drag handles (corners + midpoints) for free-form resizing
//   • A floating panel with numeric W/H inputs for precise sizing
// In read-only mode the component renders a plain <img> without any handles.

function ResizableImageView({ node, updateAttributes, selected, editor }) {
  const { src, alt, width, height, guideImageId } = node.attrs;
  const isEditable = editor?.isEditable;

  const [widthInput, setWidthInput] = useState('');
  const [heightInput, setHeightInput] = useState('');

  // Keep numeric inputs in sync when node attributes change externally
  useEffect(() => {
    setWidthInput(width != null ? String(width) : '');
    setHeightInput(height != null ? String(height) : '');
  }, [width, height]);

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startW = useRef(0);
  const startH = useRef(0);
  const imgRef = useRef(null);

  const commitSize = useCallback(
    (w, h) => {
      const newWidth = w > 0 ? Math.round(w) : null;
      const newHeight = h > 0 ? Math.round(h) : null;
      updateAttributes({ width: newWidth, height: newHeight });
    },
    [updateAttributes],
  );

  const handleDragStart = useCallback(
    (e, corner) => {
      if (!isEditable) return;
      e.preventDefault();
      isResizing.current = true;
      startX.current = e.clientX;
      startY.current = e.clientY;
      const rect = imgRef.current?.getBoundingClientRect();
      startW.current = rect ? rect.width : (width || 300);
      startH.current = rect ? rect.height : (height || 200);

      const onMouseMove = (mv) => {
        if (!isResizing.current) return;
        const dx = mv.clientX - startX.current;
        const dy = mv.clientY - startY.current;
        let nw = startW.current;
        let nh = startH.current;
        if (corner === 'se' || corner === 'ne' || corner === 'e') nw = startW.current + dx;
        if (corner === 'sw' || corner === 'nw' || corner === 'w') nw = startW.current - dx;
        if (corner === 'se' || corner === 'sw' || corner === 's') nh = startH.current + dy;
        if (corner === 'ne' || corner === 'nw' || corner === 'n') nh = startH.current - dy;
        nw = Math.max(60, nw);
        nh = Math.max(40, nh);
        if (imgRef.current) {
          imgRef.current.style.width = `${nw}px`;
          imgRef.current.style.height = `${nh}px`;
        }
        setWidthInput(String(Math.round(nw)));
        setHeightInput(String(Math.round(nh)));
      };

      const onMouseUp = (up) => {
        if (!isResizing.current) return;
        isResizing.current = false;
        const dx = up.clientX - startX.current;
        const dy = up.clientY - startY.current;
        let nw = startW.current;
        let nh = startH.current;
        if (corner === 'se' || corner === 'ne' || corner === 'e') nw = startW.current + dx;
        if (corner === 'sw' || corner === 'nw' || corner === 'w') nw = startW.current - dx;
        if (corner === 'se' || corner === 'sw' || corner === 's') nh = startH.current + dy;
        if (corner === 'ne' || corner === 'nw' || corner === 'n') nh = startH.current - dy;
        commitSize(Math.max(60, nw), Math.max(40, nh));
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [isEditable, width, height, commitSize],
  );

  const applyInputSize = useCallback(() => {
    const w = parseInt(widthInput, 10);
    const h = parseInt(heightInput, 10);
    if (!Number.isNaN(w) && w >= 60 && !Number.isNaN(h) && h >= 40) {
      commitSize(w, h);
    }
  }, [widthInput, heightInput, commitSize]);

  const handleSizeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyInputSize();
    }
  };

  const imgStyle = {
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
    display: 'block',
    maxWidth: '100%',
    userSelect: 'none',
  };

  // ── Read-only render (halaman publik / preview) ──
  if (!isEditable) {
    return (
      <NodeViewWrapper as="span" style={{ display: 'inline-block' }}>
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          data-guide-image-id={guideImageId || undefined}
          style={imgStyle}
        />
      </NodeViewWrapper>
    );
  }

  const handles = [
    { id: 'nw', style: { top: -5, left: -5, cursor: 'nw-resize' } },
    { id: 'ne', style: { top: -5, right: -5, cursor: 'ne-resize' } },
    { id: 'sw', style: { bottom: -5, left: -5, cursor: 'sw-resize' } },
    { id: 'se', style: { bottom: -5, right: -5, cursor: 'se-resize' } },
    { id: 'n', style: { top: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
    { id: 's', style: { bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
    { id: 'w', style: { top: '50%', left: -5, transform: 'translateY(-50%)', cursor: 'w-resize' } },
    { id: 'e', style: { top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'e-resize' } },
  ];

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline-block' }}>
      <span
        style={{
          display: 'inline-block',
          position: 'relative',
          lineHeight: 0,
          outline: selected ? '2px solid #16a34a' : 'none',
          outlineOffset: '2px',
          borderRadius: 2,
        }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          data-guide-image-id={guideImageId || undefined}
          style={imgStyle}
          draggable={false}
        />

        {/* ── Drag handles (visible when image is selected) ── */}
        {selected &&
          handles.map(({ id, style }) => (
            <span
              key={id}
              onMouseDown={(e) => handleDragStart(e, id)}
              style={{
                position: 'absolute',
                width: 10,
                height: 10,
                background: '#16a34a',
                border: '2px solid #fff',
                borderRadius: '50%',
                zIndex: 10,
                ...style,
              }}
            />
          ))}

        {/* ── Size input panel (visible when image is selected) ── */}
        {selected && (
          <span
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'var(--surface, #fff)',
              border: '1px solid var(--line, #d1d5db)',
              borderRadius: 8,
              padding: '4px 8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
              zIndex: 20,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--ink-muted,#6b7280)', fontWeight: 600 }}>L</span>
            <input
              type="number"
              min={60}
              max={2000}
              value={widthInput}
              onChange={(e) => setWidthInput(e.target.value)}
              onBlur={applyInputSize}
              onKeyDown={handleSizeKeyDown}
              aria-label="Lebar gambar (px)"
              style={{
                width: 56,
                fontSize: 11,
                padding: '2px 4px',
                border: '1px solid var(--line,#d1d5db)',
                borderRadius: 4,
                outline: 'none',
                background: 'var(--surface,#fff)',
                color: 'var(--ink,#111)',
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--ink-muted,#6b7280)' }}>×</span>
            <span style={{ fontSize: 11, color: 'var(--ink-muted,#6b7280)', fontWeight: 600 }}>T</span>
            <input
              type="number"
              min={40}
              max={2000}
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
              onBlur={applyInputSize}
              onKeyDown={handleSizeKeyDown}
              aria-label="Tinggi gambar (px)"
              style={{
                width: 56,
                fontSize: 11,
                padding: '2px 4px',
                border: '1px solid var(--line,#d1d5db)',
                borderRadius: 4,
                outline: 'none',
                background: 'var(--surface,#fff)',
                color: 'var(--ink,#111)',
              }}
            />
            <span style={{ fontSize: 10, color: 'var(--ink-muted,#6b7280)' }}>px</span>
            <button
              type="button"
              onClick={applyInputSize}
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              OK
            </button>
          </span>
        )}
      </span>
    </NodeViewWrapper>
  );
}

// ─── GuideImage Extension ─────────────────────────────────────────────────────
// Extends the default Image extension with:
//   • guideImageId — links the image to the backend storage record
//   • width / height — persisted as HTML attributes + inline style so the
//     public page renders the correct size without any JS

const GuideImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      guideImageId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-guide-image-id'),
        renderHTML: (attributes) =>
          attributes.guideImageId ? { 'data-guide-image-id': attributes.guideImageId } : {},
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute('width') || element.style.width;
          if (!v) return null;
          const n = parseInt(v, 10);
          return Number.isNaN(n) ? null : n;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: String(attributes.width), style: `width:${attributes.width}px` };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute('height') || element.style.height;
          if (!v) return null;
          const n = parseInt(v, 10);
          return Number.isNaN(n) ? null : n;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: String(attributes.height), style: `height:${attributes.height}px` };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

// ─── Editor Extensions ────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blobFromHtml(html) {
  const parsed = new DOMParser().parseFromString(DOMPurify.sanitize(html || ''), 'text/html');
  return parsed;
}

async function hydrateEditorHtml(html, objectUrls, section) {
  const parsed = blobFromHtml(html);
  const images = [...parsed.querySelectorAll('img[src]')];
  await Promise.all(
    images.map(async (image) => {
      const imageId =
        image.getAttribute('data-guide-image-id') ||
        image.getAttribute('src')?.match(IMAGE_PATH)?.[1];
      if (!imageId) return;
      const blobUrl = await informationGuideApi.fetchImageBlobUrl(imageId, {
        admin: true,
        ...(section ? { section } : {}),
      });
      objectUrls.add(blobUrl);
      image.setAttribute('src', blobUrl);
      image.setAttribute('data-guide-image-id', imageId);
    }),
  );
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

// ─── Toolbar Button ───────────────────────────────────────────────────────────

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

// ─── Main Editor Component ────────────────────────────────────────────────────

export function InformationGuideEditor({ content = '', guideId, onChange, readOnly = false, section }) {
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
        class:
          'min-h-64 max-w-none px-4 py-3 text-sm leading-7 text-ink focus:outline-none [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-3 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-line [&_td]:p-2 [&_th]:border [&_th]:border-line [&_th]:bg-surface-subtle [&_th]:p-2 [&_ul]:list-disc [&_img]:max-w-full',
        'aria-label': `Konten ${section === 'SOP' ? 'SOP' : 'panduan'}`,
      },
    },
  });

  useEffect(() => {
    if (!editor || loadedContentRef.current === `${guideId || 'new'}:${content}`) return undefined;
    let active = true;
    const contentKey = `${section || 'GUIDE'}:${guideId || 'new'}:${content}`;
    hydrateEditorHtml(content, imageObjectUrls.current, section)
      .then((hydrated) => {
        if (active) {
          editor.commands.setContent(hydrated, { emitUpdate: false });
          loadedContentRef.current = contentKey;
        }
      })
      .catch((error) => {
        if (active) setImageError(error.message || 'Gambar di konten tidak dapat dimuat.');
      });
    return () => {
      active = false;
    };
    // The initial HTML is hydrated once; live edits must not reset editor selection or content.
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editor || readOnly) return undefined;
    const handleUpdate = () => onChangeRef.current?.(editor.getHTML());
    editor.on('update', handleUpdate);
    return () => editor.off('update', handleUpdate);
  }, [editor, readOnly]);

  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(
    () => () => {
      imageObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const handleImageSelected = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length || !editor || !guideId) return;
    setImageError('');
    setImageUploading(true);
    try {
      for (const file of files) {
        const response = section === 'SOP'
          ? await informationGuideApi.uploadImage(guideId, file, { section })
          : await informationGuideApi.uploadImage(guideId, file);
        const image = response.data;
        const blobUrl = await informationGuideApi.fetchImageBlobUrl(
          image.id,
          section === 'SOP' ? { admin: true, section } : { admin: true }
        );
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
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url.href, target: '_blank', rel: 'noopener noreferrer' })
        .run();
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
    { label: 'Tambah baris di atas', action: () => editor.chain().focus().addRowBefore().run() },
    { label: 'Tambah baris di bawah', action: () => editor.chain().focus().addRowAfter().run() },
    { label: 'Tambah kolom kiri', action: () => editor.chain().focus().addColumnBefore().run() },
    { label: 'Tambah kolom kanan', action: () => editor.chain().focus().addColumnAfter().run() },
    { label: 'Hapus baris', action: () => editor.chain().focus().deleteRow().run() },
    { label: 'Hapus kolom', action: () => editor.chain().focus().deleteColumn().run() },
    { label: 'Hapus tabel', action: () => editor.chain().focus().deleteTable().run() },
  ];

  if (!editor) return <div className="min-h-64 animate-pulse rounded-xl bg-surface-subtle" aria-busy="true" />;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      {!readOnly && (
        <div
          className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface-subtle p-2"
          role="toolbar"
          aria-label="Pemformatan panduan"
        >
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
                {label.includes('baris') ? (
                  <Rows3 className="h-4 w-4" />
                ) : label.includes('kolom') ? (
                  <Table2 className="h-4 w-4" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
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
            {guideId
              ? 'Pilih format PNG, JPEG, atau WebP (maks. 5 MB). Klik gambar untuk mengubah ukurannya secara bebas atau masukkan angka lebar/tinggi.'
              : 'Simpan draf editor terlebih dahulu untuk mengunggah gambar.'}
          </span>
        </div>
      )}
      {imageError && (
        <p className="border-b border-civic-dangerLine bg-civic-dangerSoft px-3 py-2 text-xs text-civic-danger" role="alert">
          {imageError}
        </p>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
