export function assertIsolatedTestDatabase(databaseUrl) {
  let target;
  try { target = new URL(databaseUrl); } catch { throw new Error('Integration tests require a dedicated MySQL DATABASE_URL.'); }
  const name = decodeURIComponent(target.pathname.slice(1));
  if (target.protocol !== 'mysql:' || !/^[a-z0-9_]+_test$/i.test(name)) {
    throw new Error('Integration tests refused: use a dedicated database ending in _test, not the application database. See docs/backend-fifo-cleanup.md.');
  }
  return name;
}
