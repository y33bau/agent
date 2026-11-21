/* Data protection: asks the browser to keep this app's data (navigator.storage.persist)
   and reminds about a fresh backup. Shared by agent and RPG-ADHD: keep both copies identical. */
const APP = document.documentElement.dataset.product === 'adhd' ? 'adhd' : 'agent';
const KEY = APP + '_storage_guard_v1';
const DAY = 86400000, REMIND_AFTER = 7 * DAY;

function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function write(next) { try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...next })); } catch {} }

let persisted = null;
async function check() {
  try { persisted = await navigator.storage?.persisted?.() ?? null; } catch { persisted = null; }
  render();
}
async function ask() {
  if (persisted || !navigator.storage?.persist) return;
  try { persisted = await navigator.storage.persist(); } catch {}
  render();
}

export function backupAge(info = read(), now = Date.now()) {
  return Number.isFinite(info.lastExport) ? now - info.lastExport : null;
}
export function needsBackup(info = read(), now = Date.now()) {
  const started = Number.isFinite(info.firstSeen) ? info.firstSeen : now;
  const age = backupAge(info, now);
  return age === null ? now - started > REMIND_AFTER : age > REMIND_AFTER;
}

function describeAge(age) {
  if (age === null) return 'Nie pobrano jeszcze kopii na tym urządzeniu.';
  const days = Math.floor(age / DAY);
  return days < 1 ? 'Ostatnia kopia: dzisiaj.' : days === 1 ? 'Ostatnia kopia: wczoraj.' : 'Ostatnia kopia: ' + days + ' dni temu.';
}

function render() {
  const form = document.getElementById('settings-form');
  if (!form) return;
  let box = document.getElementById('storage-guard');
  if (!box) {
    box = document.createElement('section');
    box.id = 'storage-guard';
    box.style.cssText = 'margin-top:20px;padding-top:20px;border-top:1px solid #ffffff25';
    const h = document.createElement('h3'); h.textContent = 'Ochrona danych';
    const p1 = document.createElement('p'); p1.dataset.guardState = ''; p1.className = 'subtitle subtext';
    const p2 = document.createElement('p'); p2.dataset.guardBackup = ''; p2.className = 'subtitle subtext';
    box.append(h, p1, p2);
    form.after(box);
  }
  const state = box.querySelector('[data-guard-state]'), backup = box.querySelector('[data-guard-backup]');
  state.textContent = persisted === true
    ? 'Przeglądarka nie usunie danych tej aplikacji samodzielnie.'
    : 'Przeglądarka może usunąć dane przy braku miejsca lub dłuższej nieobecności. Dodaj aplikację do ekranu początkowego i regularnie pobieraj kopię.';
  const info = read();
  backup.textContent = describeAge(backupAge(info)) + (needsBackup(info) ? ' Warto pobrać nową kopię poniżej.' : '');
}

function remind() {
  const info = read(), now = Date.now();
  if (!needsBackup(info, now) || (info.remindedAt && now - info.remindedAt < DAY)) return;
  const toast = document.getElementById('toast');
  if (!toast) return;
  write({ remindedAt: now });
  setTimeout(() => {
    toast.textContent = 'Minął tydzień od ostatniej kopii. Pobierzesz ją w Ustawieniach.';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4500);
  }, 4000);
}

if (!Number.isFinite(read().firstSeen)) write({ firstSeen: Date.now() });
document.addEventListener('click', e => {
  if (e.target.closest?.('[data-action="export"]')) { write({ lastExport: Date.now() }); setTimeout(render, 0); }
});
document.addEventListener('app-progress', ask, { once: true });
new MutationObserver(() => { if (document.getElementById('settings-form') && !document.getElementById('storage-guard')) render(); })
  .observe(document.body, { childList: true, subtree: true });
check();
remind();
