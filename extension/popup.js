const SERVER = 'http://127.0.0.1:3001';

async function checkServer() {
  try {
    const res = await fetch(`${SERVER}/health`);
    const data = await res.json();
    if (data.ok) {
      document.getElementById('server-status').innerHTML = '<span class="dot"></span>Connected';
      const bm = await fetch(`${SERVER}/bookmarks/count`);
      const bmData = await bm.json();
      document.getElementById('count').textContent = bmData.count ?? '—';
    }
  } catch {
    document.getElementById('server-status').innerHTML = '<span class="dot off"></span>Offline — start server';
  }
}

checkServer();
