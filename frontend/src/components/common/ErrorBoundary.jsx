import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="grid min-h-screen place-items-center bg-canvas p-6 text-ink">
      <div role="alert" className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-lg">
        <h1 className="text-lg font-bold">Halaman mengalami kendala</h1>
        <p className="mt-3 text-sm text-ink-muted">Muat ulang halaman. Jika kendala berlanjut, hubungi pengelola layanan.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-brand-700">
          Muat ulang
        </button>
      </div>
    </main>;
  }
}
