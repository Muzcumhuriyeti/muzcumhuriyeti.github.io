// Nüfus kütüğü: data/ulke.json (scripts/site.mjs üretir) → kimlik arama, harita, hikâye kartı.
import { drawFlag } from './flags.js';
const $ = s => document.querySelector(s);
const C = { ink: '#1B1340', ink2: '#2A1F5C', acc: '#FFD23F', acc2: '#2EC4B6', coral: '#FF6B4A', paper: '#FFF6D6', sea: '#2C8FD6' };
const DCOL = { 'Sahil Mahallesi': C.acc, 'Merkez Mahallesi': C.coral, 'Tepe Mahallesi': C.acc2 };
const fmt = n => Number(n).toLocaleString('tr-TR');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = s => String(s || '').trim().replace(/^@/, '').toLowerCase();
const pad = n => String(n).padStart(4, '0');
await document.fonts.load('900 40px Rubik').catch(() => {});
const D = await fetch('data/ulke.json?' + Date.now()).then(r => r.json());
const byU = new Map(D.citizens.map(c => [c.u.toLowerCase(), c]));

// üst kısım
$('#cname').textContent = D.country.name || 'İsimsiz ülke'; document.title = `${D.country.name} · Nüfus Kütüğü`;
$('#capital').textContent = D.country.capital || 'seçiliyor';
drawFlag($('#flag').getContext('2d'), 300, 200, D.country.flag);
$('#sVat').textContent = fmt(D.citizens.length); $('#sSahil').textContent = fmt(D.sahilLeft); $('#sFol').textContent = fmt(D.followers);
if (D.openPost) $('#igBtn').href = D.openPost;
$('#upd').textContent = 'Son güncelleme: ' + new Date(D.updatedAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });

// hedefler
const next = D.milestones.find(m => !m.done); const prevAt = [...D.milestones].reverse().find(m => m.done)?.at || 0;
$('#goal').innerHTML = next ? `<b>${fmt(next.at)} takipçide: ${esc(next.label)}</b><div class="bar"><i style="width:${Math.min(100, Math.round((D.followers - prevAt) / (next.at - prevAt) * 100))}%"></i></div><small>${fmt(Math.max(0, next.at - D.followers))} kişi kaldı. Kankanı getir, ülke büyüsün.</small>` : '<b>Bütün hedefler tamam!</b>';
$('#ms').innerHTML = D.milestones.map(m => `<li class="${m.done ? 'done' : ''}"><span>${m.done ? '✓' : '○'} ${esc(m.label)}</span><span>${fmt(m.at)}</span></li>`).join('');

// kabine
$('#cab').innerHTML = D.cabinet.length ? `<ul class="cab">${D.cabinet.map(b => `<li><b>${esc(b.value)}</b><span>@${esc(b.user)}</span></li>`).join('')}</ul>` : `<p>Kabine henüz kurulmadı. <b>Son videoya</b> hangi bakan olmak istediğini yaz; en çok beğeni alan 5 kişi bakan olur ve burada adıyla yazılır.</p>`;

// kararlar
$('#dec').innerHTML = D.decisions.map(d => `<li><small>KARAR #${d.no} · ${esc(d.label)}${d.total ? ` · ${fmt(d.total)} yorum` : ''}</small><b>${esc(d.value)}</b>${d.user ? ` <span>· öneren @${esc(d.user)}</span>` : ''}</li>`).join('')
  + `<li class="open"><small>KARAR #${D.decisions.length + 1} · açık</small>Oyunu son videoya yorum olarak yaz →</li>`;

// listeler
const li = c => `<li><a href="#@${esc(c.u)}">@${esc(c.u)}</a> <span>${c.floors} kat</span></li>`;
$('#top').innerHTML = [...D.citizens].sort((a, b) => b.floors - a.floors || a.no - b.no).slice(0, 10).map(li).join('') || '<li>Henüz kimse yok</li>';
$('#new').innerHTML = [...D.citizens].reverse().slice(0, 10).map(c => `<li><a href="#@${esc(c.u)}">@${esc(c.u)}</a> <span>#${pad(c.no)}</span></li>`).join('') || '<li>İlk sen ol</li>';

// harita: sabit tohumlu ada, mahalle başına parsel yuvaları
const MW = 900, R = 360, CX = 450, CY = 460;
const rI = th => R * (1 + .07 * Math.sin(3 * th + .6) + .05 * Math.cos(5 * th) + .03 * Math.sin(8 * th + 1));
const CAP = { x: CX + 40, y: CY + 10 }, MTN = { x: CX - 150, y: CY - 150 };
const GA = Math.PI * (3 - Math.sqrt(5));
function slot(c) {
  if (c.mahalle === 'Sahil Mahallesi') { const th = .25 * Math.PI + (c.parsel - 1) / 99 * 1.3 * Math.PI, r = rI(th) * .86 - ((c.parsel % 2) * 18); return { x: CX + Math.cos(th) * r, y: CY + Math.sin(th) * r }; }
  if (c.mahalle === 'Merkez Mahallesi') { const k = c.parsel + 30, rr = 8.6 * Math.sqrt(k); return { x: CAP.x + Math.cos(k * GA) * rr, y: CAP.y + Math.sin(k * GA) * rr * .85 }; }
  const k = (c.parsel - 1) % 900 + 60, lap = Math.floor((c.parsel - 1) / 900), rr = 4.6 * Math.sqrt(k) + lap * 3; return { x: MTN.x + Math.cos(k * GA + lap) * rr, y: MTN.y + 40 + Math.sin(k * GA + lap) * rr * .8 };
}
function drawMap(sel) {
  const cv = $('#map'), g = cv.getContext('2d'); g.clearRect(0, 0, MW, MW);
  g.fillStyle = C.sea; g.fillRect(0, 0, MW, MW);
  for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); const y = (i * 53) % MW; g.moveTo((i * 97) % MW, y); g.lineTo((i * 97) % MW + 40, y); g.stroke(); }
  const blob = (s, col) => { g.beginPath(); for (let i = 0; i <= 120; i++) { const th = i / 120 * Math.PI * 2, r = rI(th) * s; g[i ? 'lineTo' : 'moveTo'](CX + Math.cos(th) * r, CY + Math.sin(th) * r); } g.closePath(); g.fillStyle = col; g.fill(); };
  blob(1.04, '#F3E1A6'); blob(.97, '#6CC24A'); blob(.6, '#5DB13F');
  g.fillStyle = '#8A8F9C'; g.beginPath(); g.moveTo(MTN.x - 95, MTN.y + 55); g.lineTo(MTN.x, MTN.y - 85); g.lineTo(MTN.x + 95, MTN.y + 55); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(MTN.x - 30, MTN.y - 30); g.lineTo(MTN.x, MTN.y - 85); g.lineTo(MTN.x + 30, MTN.y - 30); g.fill();
  g.strokeStyle = '#4FB3F0'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(MTN.x + 20, MTN.y + 30); g.bezierCurveTo(CX - 40, CY + 60, CX - 120, CY + 180, CX - 60, CY + rI(1.9) * .98); g.stroke();
  g.fillStyle = '#E7DFC8'; g.beginPath(); g.arc(CAP.x, CAP.y, 46, 0, 7); g.fill(); g.fillStyle = C.acc2; g.beginPath(); g.arc(CAP.x, CAP.y - 4, 20, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; g.fillRect(CAP.x - 24, CAP.y - 4, 48, 18);
  for (const c of D.citizens) { const p = slot(c), h = 6 + c.floors * 3.2, w = 10; g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(p.x - w / 2 + 2, p.y - 2, w, 4); g.fillStyle = DCOL[c.mahalle]; g.fillRect(p.x - w / 2, p.y - h, w, h); g.fillStyle = 'rgba(27,19,64,.55)'; g.fillRect(p.x - w / 2, p.y - h, w, 3); }
  { g.font = '900 24px Rubik'; g.textAlign = 'center'; const t = (D.country.capital || 'Başkent').toLocaleUpperCase('tr-TR'), tw = g.measureText(t).width + 28; g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.roundRect(CAP.x - tw / 2, CAP.y + 52, tw, 36, 18); g.fill(); g.fillStyle = C.ink; g.fillText(t, CAP.x, CAP.y + 78); }
  if (sel) { const p = slot(sel); g.fillStyle = C.ink; g.beginPath(); g.arc(p.x, p.y - 40, 18, 0, 7); g.fill(); g.beginPath(); g.moveTo(p.x - 10, p.y - 30); g.lineTo(p.x, p.y - 8); g.lineTo(p.x + 10, p.y - 30); g.fill(); g.fillStyle = C.acc; g.beginPath(); g.arc(p.x, p.y - 40, 8, 0, 7); g.fill();
    g.font = '900 24px Rubik'; const t = '@' + sel.u, tw = g.measureText(t).width + 24; g.fillStyle = C.ink; g.beginPath(); g.roundRect(Math.min(MW - tw - 8, Math.max(8, p.x - tw / 2)), p.y - 98, tw, 38, 10); g.fill(); g.fillStyle = '#fff'; g.fillText(t, Math.min(MW - tw / 2 - 8, Math.max(8 + tw / 2, p.x)), p.y - 71); }
}
drawMap(null);
$('#map').addEventListener('click', e => { const cv = e.currentTarget, b = cv.getBoundingClientRect(), x = (e.clientX - b.left) * MW / b.width, y = (e.clientY - b.top) * MW / b.height; let best = null, bd = 26; for (const c of D.citizens) { const p = slot(c), d = Math.hypot(p.x - x, p.y - 6 - y); if (d < bd) { bd = d; best = c; } } if (best) location.hash = '@' + best.u; });

// kimlik kartı (1080×1920, hikâye boyutu)
function idCard(c) {
  const W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, C.ink); gr.addColorStop(1, '#2B1D6B'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.fillStyle = C.acc2; g.font = '800 44px Rubik'; g.fillText('RESMİ VATANDAŞLIK KİMLİĞİ', W / 2, 220);
  g.fillStyle = '#fff'; g.font = '900 96px Rubik'; g.fillText((D.country.name || '').toLocaleUpperCase('tr-TR'), W / 2, 330, W - 120);
  const x = 80, y = 430, w = W - 160, h = 900; g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 50; g.shadowOffsetY = 18; g.fillStyle = C.paper; g.beginPath(); g.roundRect(x, y, w, h, 44); g.fill(); g.restore();
  g.fillStyle = C.ink; g.beginPath(); g.roundRect(x, y, w, 130, [44, 44, 0, 0]); g.fill();
  g.textAlign = 'left'; g.fillStyle = C.acc; g.font = '900 52px Rubik'; g.fillText('VATANDAŞ #' + pad(c.no), x + 44, y + 86); g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '800 34px Rubik'; g.fillText(c.mahalle.split(' ')[0].toLocaleUpperCase('tr-TR'), x + w - 44, y + 84);
  const fc = document.createElement('canvas'); fc.width = 600; fc.height = 400; drawFlag(fc.getContext('2d'), 600, 400, D.country.flag); g.save(); g.beginPath(); g.roundRect(x + 44, y + 180, 300, 200, 16); g.clip(); g.drawImage(fc, x + 44, y + 180, 300, 200); g.restore();
  // bina çizimi: kat sayısı kadar
  const bx = x + 194, by = y + 800, fh = Math.min(34, 300 / c.floors); g.fillStyle = DCOL[c.mahalle]; g.fillRect(bx - 70, by - fh * c.floors, 140, fh * c.floors);
  g.fillStyle = 'rgba(27,19,64,.25)'; for (let k = 0; k < c.floors; k++) { g.fillRect(bx - 50, by - fh * (k + 1) + fh * .3, 30, fh * .4); g.fillRect(bx + 20, by - fh * (k + 1) + fh * .3, 30, fh * .4); }
  g.fillStyle = C.coral; g.beginPath(); g.moveTo(bx - 86, by - fh * c.floors); g.lineTo(bx, by - fh * c.floors - 70); g.lineTo(bx + 86, by - fh * c.floors); g.fill(); g.fillStyle = C.ink; g.fillRect(bx - 110, by, 220, 8);
  const rows = [['AD', '@' + c.u], ['ŞEHİR', D.country.capital || 'Başkent'], ['ARSA', `${c.mahalle.replace(' Mahallesi', '')} · Parsel ${c.parsel}`], ['BİNA', `${c.bina} · ${c.floors} kat`], ['GÖREV', c.roles.length ? c.roles.join(', ') : 'Vatandaş'], ['KAYIT', new Date(c.since).toLocaleDateString('tr-TR')]];
  g.textAlign = 'left'; rows.forEach(([a, b], i) => { const ry = y + 210 + i * 112; g.fillStyle = 'rgba(27,19,64,.5)'; g.font = '800 30px Rubik'; g.fillText(a, x + 390, ry); g.fillStyle = C.ink; let fs = 50; g.font = `900 ${fs}px Rubik`; while (g.measureText(b).width > w - 430 && fs > 26) { fs -= 2; g.font = `900 ${fs}px Rubik`; } g.fillText(b, x + 390, ry + 52); });
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '900 64px Rubik'; g.fillText('Sen de vatandaş ol', W / 2, 1500);
  g.fillStyle = C.acc; g.beginPath(); g.roundRect(W / 2 - 300, 1560, 600, 110, 55); g.fill(); g.fillStyle = C.ink; g.font = '900 56px Rubik'; g.fillText('@seninulken', W / 2, 1635);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '700 36px Rubik'; g.fillText('Son videoya yorum yaz, arsan seni bekliyor', W / 2, 1760);
  return cv;
}
async function share(cv, c) {
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')); const file = new File([blob], `kimlik-${c.u}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Vatandaşlık kimliğim' }); return; } catch { return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function show(u) {
  const box = $('#result'), c = byU.get(norm(u)); box.hidden = false;
  if (!c) { box.innerHTML = `<div class="miss"><b>@${esc(norm(u))}</b> henüz kütükte yok.<br>Son videoya yorum yaz, kısa süre içinde kimliğin burada çıkar. <a href="${esc(D.openPost || D.instagram)}" target="_blank" rel="noopener">Videoya git →</a></div>`; drawMap(null); return; }
  const cv = idCard(c); box.innerHTML = ''; box.append(cv);
  const row = document.createElement('div'); row.className = 'row'; const b1 = document.createElement('button'); b1.textContent = 'Hikâyende paylaş'; b1.onclick = () => share(cv, c);
  const b2 = document.createElement('button'); b2.className = 'alt'; b2.textContent = 'Haritada gör'; b2.onclick = () => $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' }); row.append(b1, b2); box.append(row);
  drawMap(c);
}
$('#f').addEventListener('submit', e => { e.preventDefault(); const u = norm($('#q').value); if (u) location.hash = '@' + u; });
const route = () => { const h = decodeURIComponent(location.hash.slice(1)); if (h.startsWith('@')) { $('#q').value = h.slice(1); show(h.slice(1)); $('.find').scrollIntoView({ behavior: 'smooth' }); } };
addEventListener('hashchange', route); route();
