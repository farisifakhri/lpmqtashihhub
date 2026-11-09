import { useState } from 'react';

// Seret baris daftar untuk menyusun ulang. onMove(dariIndex, keIndex) yang menyimpan urutannya.
// Tombol naik/turun tetap disediakan pemanggil karena seret tidak dapat dipakai lewat keyboard.
export function useRowDrag(onMove) {
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);

  return {
    isOver: (index) => over === index && dragging !== index,
    gripProps: (index) => ({
      draggable: true,
      'aria-hidden': true,
      title: 'Seret untuk memindahkan',
      onDragStart: () => setDragging(index),
      onDragEnd: () => { setDragging(null); setOver(null); },
    }),
    rowProps: (index) => ({
      onDragOver: (e) => { if (dragging !== null) { e.preventDefault(); setOver(index); } },
      onDragLeave: () => setOver((v) => (v === index ? null : v)),
      onDrop: (e) => {
        e.preventDefault();
        if (dragging !== null && dragging !== index) onMove(dragging, index);
        setDragging(null);
        setOver(null);
      },
    }),
  };
}

// Daftar baru hasil memindahkan satu baris; di luar rentang berarti tidak berubah.
export const moveItem = (list, from, to) => {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
};
