/* ============================================================
   lineage.js — สายการสืบทอด (ผังศิษย์) และพิธีตามจารีต (ส่วนหนึ่งของคลังวิชา)
   ข้อมูล: lineage/{id} = { name, role, years, note, parent, toMaster, order }  — สายครูก่อนถึงอาจารย์ (บรมครู → … → ครูของอาจารย์)
             parent = id ของครูชั้นก่อนหน้า · toMaster = true เมื่อท่านนี้เป็นครูของอาจารย์โดยตรง
           members/{sid}/master = รหัสศิษย์ของครูผู้ถ่ายทอดโดยตรง ('' = อาจารย์) → ผังศิษย์ต่อลงไปหลายชั้น
           rites/{sid}/{rid} = { kind, date, place, by, note, at }  — ไหว้ครู ครอบครู รับมอบ ฯลฯ
           config/bio, config/masterPhoto — ประวัติย่อและรูปของอาจารย์ (แก้ในหน้าคำสอนและผลงาน)
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP, C = M.C;
  const { $, $$, esc, toast, modal } = M; const { ic, chip, fld, opt, avatar } = A;
  const LN = { open: {} };
  const T = () => A.teacher();
  const nodes = () => A.D.lineage || {};
  const rites = () => A.D.rites || {};
  const kinds = () => { const l = A.cfg().riteKinds; return Array.isArray(l) && l.length ? l : (C.riteKinds || ['ไหว้ครู']); };
  A.SUBS.push({ key: 'lineage', path: () => 'lineage' }, { key: 'rites', path: () => 'rites' });
  A.NAVS.push({ id: 'lineage', label: 'สายการสืบทอด', icon: 'tree', order: 22 });

  /* สายครูขึ้นไปจากท่านที่สอนอาจารย์ (กันวนซ้ำด้วยตัวนับ) */
  function chainUp(id) { const out = []; let cur = id, g = 0; while (cur && nodes()[cur] && g++ < 30) { out.unshift(Object.assign({ id: cur }, nodes()[cur])); cur = nodes()[cur].parent; } return out; }
  const tops = () => Object.keys(nodes()).filter(k => nodes()[k] && nodes()[k].toMaster).sort((a, b) => (nodes()[a].order || 99) - (nodes()[b].order || 99));
  const nodeCard = (n, cls) => '<div class="ln-n ' + (cls || '') + '"><b>' + esc(n.name) + '</b>' + (n.role ? '<span>' + esc(n.role) + '</span>' : '') + (n.years ? '<small>' + esc(n.years) + '</small>' : '') + (T() ? '<button class="icb sm" data-act="lnEdit" data-id="' + esc(n.id) + '" aria-label="แก้ไข ' + esc(n.name) + '">' + ic('edit', 16) + '</button>' : '') + '</div>';
  /* ศิษย์ที่ต่อวิชาจาก sid ('' = อาจารย์) */
  const kidsOf = sid => A.activeSids().concat(Object.keys(A.members()).filter(s => A.members()[s].status === 'alumni')).filter(s => (A.members()[s].master || '') === sid && s !== sid).sort(A.byClass);
  function branch(sid, depth) {
    const m = A.members()[sid], kids = depth < 8 ? kidsOf(sid) : [], gone = m.status !== 'active';
    const rs = Object.values(rites()[sid] || {}).filter(r => r && r.kind);
    return '<li><a class="ln-p' + (gone ? ' gone' : '') + '" href="#/m/' + esc(sid) + '">' + avatar(m) + '<span class="ln-t"><b>' + esc(A.fullName(m) + A.nickTxt(m)) + '</b><small>' + esc([A.cls(m), A.insts(m).slice(0, 2).join(', '), gone ? 'ล่วงลับ' : ''].filter(Boolean).join(' · ')) + '</small>' +
      (rs.length ? '<i>' + esc(rs.map(r => r.kind.replace(/\s*\(.*\)/, '')).filter((x, i, a) => a.indexOf(x) === i).join(' · ')) + '</i>' : '') + '</span>' + (kids.length ? '<em>' + kids.length + ' ศิษย์</em>' : '') + '</a>' +
      (kids.length ? '<ul>' + kids.map(k => branch(k, depth + 1)).join('') + '</ul>' : '') + '</li>';
  }
  function treeHTML() {
    const direct = kidsOf(''), byGen = {};
    direct.forEach(s => { const g = A.eraOf(A.members()[s]); (byGen[g] = byGen[g] || []).push(s); });
    const order = Object.keys(byGen).map(Number).filter(Boolean).sort((a, b) => a - b).concat(byGen[0] ? [0] : []);
    return order.map(g => '<details class="ln-gen" ' + (LN.open[g] === false ? '' : 'open') + ' data-g="' + g + '"><summary>' + esc(A.eraName(g)) + ' <span class="muted">(' + byGen[g].length + ' คน)</span></summary><ul class="ln-tree">' + byGen[g].map(s => branch(s, 0)).join('') + '</ul></details>').join('') || '<div class="muted">ยังไม่มีศิษย์ในทะเบียน</div>';
  }
  function upHTML() {
    const t = tops();
    if (!t.length) return '<div class="muted">ยังไม่ได้บันทึกสายครูของอาจารย์' + (T() ? ' — กด “เพิ่มครูในสาย”' : '') + '</div>';
    return '<div class="ln-up">' + t.map(id => '<div class="ln-col">' + chainUp(id).map((n, i, a) => nodeCard(n, i === a.length - 1 ? 'near' : '') + (i < a.length - 1 ? '<div class="ln-stem"></div>' : '')).join('') + '</div>').join('') + '</div>';
  }
  function masterHTML() {
    const ph = A.cfg().masterPhoto;
    return '<div class="ln-stem big"></div><div class="ln-master">' + (ph ? '<img class="av xl ring" src="' + esc(ph) + '" alt="">' : '<span class="av xl ring">' + esc(C.master.short.replace(/^อาจารย์/, '').charAt(0) || 'อ') + '</span>') +
      '<div><b>' + esc(C.master.name) + '</b><span>' + esc(C.master.title || 'ครูผู้ถ่ายทอด') + '</span></div></div><div class="ln-stem big"></div>';
  }
  function riteList(n) {
    const l = []; Object.keys(rites()).forEach(s => { if (!A.members()[s]) return; Object.keys(rites()[s] || {}).forEach(r => { const x = rites()[s][r]; if (x && x.kind) l.push(Object.assign({ sid: s, rid: r }, x)); }); });
    return l.sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, n || 999);
  }
  const dateTH = d => !d ? '' : /^\d{4}-\d{2}-\d{2}$/.test(d) ? A.dTH(d, 'full') : String(d);
  A.V.lineage = function () {
    let b = '';
    if (T()) b += '<div class="row wrap" style="margin-bottom:14px"><button class="btn" data-act="lnRite">' + ic('plus', 18) + 'บันทึกพิธี (หลายคนพร้อมกัน)</button><button class="btn ghost" data-act="lnNew">' + ic('plus', 18) + 'เพิ่มครูในสาย</button><button class="btn ghost" data-act="lnKinds">ชนิดพิธี</button><button class="btn ghost" data-act="lnExport">' + ic('down', 18) + 'ส่งออกผัง (PNG/PDF)</button></div>';
    b += '<section class="card ln-card"><div class="lb">สายครู</div>' + upHTML() + masterHTML() + '<div class="lb" style="text-align:center">ศิษย์ในสาย (' + kidsOf('').length + ' ท่านต่อวิชาจากอาจารย์โดยตรง)</div>' + treeHTML() + '</section>';
    const rl = riteList(30);
    b += '<section class="card"><div class="lb">บันทึกพิธีล่าสุด</div>' + (rl.map(r => { const m = A.members()[r.sid]; return '<div class="li"><div class="row"><b class="grow"><a href="#/m/' + esc(r.sid) + '">' + esc(A.fullName(m)) + '</a></b>' + chip(r.kind, 'gold') + '</div><div class="muted">' + esc([dateTH(r.date), r.place, r.by ? 'ผู้ประกอบพิธี ' + r.by : ''].filter(Boolean).join(' · ')) + '</div></div>'; }).join('') || '<div class="muted">ยังไม่มีบันทึกพิธี</div>') + '</section>';
    b += '<div class="muted" style="padding:0 4px">ผังศิษย์สร้างจากช่อง “ครูผู้ถ่ายทอดโดยตรง” ในข้อมูลศิษย์แต่ละคน · ศิษย์ที่ต่อวิชาจากศิษย์รุ่นพี่จะแสดงเป็นกิ่งย่อยใต้ครูของตน</div>';
    return { title: 'สายการสืบทอด', body: b, back: '#/kb' };
  };
  document.addEventListener('toggle', e => { const d = e.target; if (d && d.classList && d.classList.contains('ln-gen')) LN.open[d.dataset.g] = d.open; }, true);

  /* หน้าประวัติศิษย์: พิธีและการรับมอบ */
  A.MHOOKS.push(sid => {
    const l = Object.keys(rites()[sid] || {}).map(r => Object.assign({ rid: r }, rites()[sid][r])).filter(r => r.kind).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    if (!l.length && !T()) return '';
    return '<section class="card"><div class="row"><div class="lb grow" style="margin:0 0 8px">พิธีและการรับมอบตามจารีต</div>' + (T() ? '<button class="btn sm ghost" data-act="lnRiteOne" data-sid="' + esc(sid) + '">เพิ่ม</button>' : '') + '</div>' +
      (l.map(r => '<div class="li"><div class="row"><b class="grow">' + esc(r.kind) + '</b><span class="muted">' + esc(dateTH(r.date)) + '</span>' + (T() ? '<button class="icb sm" data-act="lnRiteOne" data-sid="' + esc(sid) + '" data-r="' + esc(r.rid) + '" aria-label="แก้ไข">' + ic('edit', 16) + '</button>' : '') + '</div><div class="muted">' + esc([r.place, r.by ? 'ผู้ประกอบพิธี ' + r.by : '', r.note].filter(Boolean).join(' · ')) + '</div></div>').join('') || '<div class="muted">ยังไม่มีบันทึก</div>') + '</section>';
  });

  /* ---------- ฟอร์ม ---------- */
  function nodeForm(id) {
    const n = id ? nodes()[id] : { toMaster: true }, others = Object.keys(nodes()).filter(k => k !== id);
    const w = modal('<h3>' + (id ? 'แก้ไขครูในสาย' : 'เพิ่มครูในสาย') + '</h3><form class="form">' + fld('ชื่อ (พร้อมคำนำหน้า/บรรดาศักดิ์)', '<input class="in" id="n-n" value="' + esc(n.name || '') + '" required>') +
      '<div class="g3">' + fld('บทบาท / ความเชี่ยวชาญ', '<input class="in" id="n-r" value="' + esc(n.role || '') + '" placeholder="เช่น ครูปี่พาทย์ / ครูขับร้อง">') + fld('ช่วงชีวิต / ปีที่สอน', '<input class="in" id="n-y" value="' + esc(n.years || '') + '" placeholder="เช่น 2430–2510">') + '</div>' +
      fld('เป็นศิษย์ของ (ครูชั้นก่อนหน้า)', '<select class="in" id="n-p">' + opt([['', '— ต้นสาย / ไม่ระบุ —']].concat(others.map(k => [k, nodes()[k].name])), n.parent || '') + '</select>') +
      '<label class="ck wide"><input type="checkbox" id="n-m"' + (n.toMaster ? ' checked' : '') + '><span>ท่านนี้เป็นครูของ' + esc(C.master.short) + 'โดยตรง</span></label>' +
      fld('ลำดับการแสดง (ซ้าย → ขวา)', '<input class="in" id="n-o" inputmode="numeric" value="' + esc(n.order || '') + '">') + fld('บันทึก / แหล่งอ้างอิง', '<textarea class="in" id="n-t" rows="3">' + esc(n.note || '') + '</textarea>') +
      '<div class="row" style="margin-top:14px">' + (id ? '<button type="button" class="btn ghost danger" id="n-del">ลบ</button>' : '') + '<button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true, wide: true });
    $('form', w).addEventListener('submit', e => {
      e.preventDefault(); const v = k => $(k, w).value.trim(); if (!v('#n-n')) return toast('กรอกชื่อ');
      let p = v('#n-p'); if (id && p) { let c = p, g = 0; while (c && g++ < 40) { if (c === id) { p = ''; toast('เลือกครูก่อนหน้าเป็นศิษย์ของตนเองไม่ได้', 3500); break; } c = (nodes()[c] || {}).parent; } }
      const rec = { name: v('#n-n'), role: v('#n-r') || null, years: v('#n-y') || null, parent: p || null, toMaster: $('#n-m', w).checked || null, order: +v('#n-o') || null, note: v('#n-t') || null };
      A.W(B.set('lineage/' + (id || 'n' + B.uid()), rec)); A.log('lineage.save', '', rec.name); w.remove(); toast('บันทึกแล้ว');
    });
    const del = $('#n-del', w); if (del) del.addEventListener('click', async () => {
      if (!(await M.confirmBox('ลบออกจากสายครู', esc(n.name) + (others.some(k => nodes()[k].parent === id) ? ' — ครูที่เป็นศิษย์ของท่านนี้จะกลายเป็นต้นสาย' : ''), 'ลบ', true))) return;
      const upd = { ['lineage/' + id]: null }; others.filter(k => nodes()[k].parent === id).forEach(k => { upd['lineage/' + k + '/parent'] = n.parent || null; }); A.W(B.update('', upd)); w.remove();
    });
  }
  function riteForm(sids, rid) {
    const one = sids && sids.length === 1 ? sids[0] : '', r = one && rid ? ((rites()[one] || {})[rid] || {}) : { kind: kinds()[0], by: C.master.short };
    const ms = A.members();
    const w = modal('<h3>' + (rid ? 'แก้ไขบันทึกพิธี' : 'บันทึกพิธี') + '</h3>' + (one ? '<div class="muted" style="margin-bottom:10px">' + esc(A.fullName(ms[one])) + '</div>' : '') + '<form class="form">' +
      '<div class="g3">' + fld('พิธี', '<select class="in" id="r-k">' + opt(kinds().concat(r.kind && !kinds().includes(r.kind) ? [r.kind] : []).map(k => [k, k]), r.kind) + '</select>') + fld('วันที่', '<input class="in" type="date" id="r-d" value="' + esc(/^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? r.date : '') + '">', 'ถ้าจำได้แค่ปี เว้นว่างแล้วใส่ปีในหมายเหตุ') + '</div>' +
      '<div class="g3">' + fld('สถานที่', '<input class="in" id="r-p" value="' + esc(r.place || '') + '">') + fld('ผู้ประกอบพิธี', '<input class="in" id="r-b" value="' + esc(r.by || '') + '">') + '</div>' + fld('หมายเหตุ', '<input class="in" id="r-n" value="' + esc(r.note || '') + '">') +
      (one ? '' : '<div class="fld"><span>ศิษย์ที่ผ่านพิธี</span><div class="plist">' + A.activeSids().sort(A.byClass).map(s => '<label class="ck wide"><input type="checkbox" name="rs" value="' + esc(s) + '"><span>' + esc(A.fullName(ms[s]) + A.nickTxt(ms[s])) + ' <small class="muted">' + esc(A.cls(ms[s])) + '</small></span></label>').join('') + '</div></div>') +
      '<div class="row" style="margin-top:14px">' + (rid ? '<button type="button" class="btn ghost danger" id="r-del">ลบ</button>' : '') + '<button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { sticky: true, wide: true, center: !!one });
    $('form', w).addEventListener('submit', e => {
      e.preventDefault(); const v = k => $(k, w).value.trim(); const who = one ? [one] : $$('input[name=rs]:checked', w).map(c => c.value); if (!who.length) return toast('เลือกศิษย์อย่างน้อย 1 คน');
      const rec = { kind: v('#r-k'), date: v('#r-d') || (r.date && !/^\d{4}-/.test(r.date) ? r.date : null), place: v('#r-p') || null, by: v('#r-b') || null, note: v('#r-n') || null, at: Date.now() };
      const upd = {}; who.forEach(s => { upd['rites/' + s + '/' + (rid || 'r' + B.uid())] = rec; }); A.W(B.update('', upd)); A.log('rite.save', one, rec.kind + ' ' + who.length + ' คน'); w.remove(); toast('บันทึก ' + who.length + ' คนแล้ว');
    });
    const del = $('#r-del', w); if (del) del.addEventListener('click', () => { A.W(B.remove('rites/' + one + '/' + rid)); w.remove(); });
  }
  /* ส่งออกผังเป็นภาพ/PDF: ใช้ HTML ชุดเดียวกับหน้าจอ วางบนหน้า A4 แนวตั้ง แล้วขยายจนเนื้อหาพอดี */
  async function exportTree(fmt) {
    const pg = document.createElement('div'); pg.className = 'rp-page ln-print';
    pg.innerHTML = A.pageHead('สายการสืบทอด', C.club.long + ' · ข้อมูล ณ ' + M.thDate(Date.now())) + '<div class="ln-card">' + upHTML() + masterHTML() + treeHTML().replace(/<details class="ln-gen"[^>]*>/g, '<details class="ln-gen" open>') + '</div>';
    $$('.icb', pg).forEach(x => x.remove());
    const st = document.createElement('div'); st.style.cssText = 'position:fixed;left:-30000px;top:0'; st.appendChild(pg); document.body.appendChild(st);
    let W = 794; for (; W < 4000; W += 40) { pg.style.width = W + 'px'; pg.style.height = 'auto'; if (pg.scrollHeight <= W * Math.SQRT2) break; }
    pg.style.height = Math.round(W * Math.SQRT2) + 'px'; pg.dataset.w = W; pg.dataset.h = Math.round(W * Math.SQRT2); st.remove();
    const root = document.createElement('div'); root.appendChild(pg);
    const scale = Math.max(2, Math.min(6, 5000 / Math.round(W * Math.SQRT2)));
    if (fmt === 'view') return M.previewPages(root, 'ตัวอย่างผังสายการสืบทอด');
    if (fmt === 'png') await M.exportPNGs(root, 'สายการสืบทอด-' + M.safeName(C.club.name), null, { scale }); else await M.exportPDF(root, 'สายการสืบทอด-' + M.safeName(C.club.name) + '.pdf', null, { scale: Math.min(scale, 3.5), format: 'a3' });
  }

  Object.assign(A.ACT, {
    lnNew: () => { if (T()) nodeForm(null); }, lnEdit: d => { if (T()) nodeForm(d.id); },
    lnRite: () => { if (T()) riteForm(null); },
    lnRiteOne: d => { if (T()) riteForm([d.sid], d.r); },
    lnKinds: () => {
      if (!T()) return; const w = modal('<h3>ชนิดพิธีและการรับมอบ</h3><form class="form"><div class="muted" style="margin-bottom:8px">หนึ่งรายการต่อหนึ่งบรรทัด</div><textarea class="in" id="rk" rows="8" aria-label="ชนิดพิธี">' + esc(kinds().join('\n')) + '</textarea><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true });
      $('form', w).addEventListener('submit', e => { e.preventDefault(); const l = Array.from(new Set($('#rk', w).value.split(/\r?\n/).map(s => s.trim()).filter(Boolean))); if (!l.length) return toast('ต้องมีอย่างน้อยหนึ่งรายการ'); A.W(B.set('config/riteKinds', l)); w.remove(); toast('บันทึกแล้ว'); });
    },
    lnExport: () => {
      const w = modal('<h3>ส่งออกผังสายการสืบทอด</h3><div class="xlist"><button class="xbtn" data-x="view"><b>ดูตัวอย่าง</b><span>ตรวจการจัดวางก่อน</span></button><button class="xbtn" data-x="png"><b>รูปภาพ PNG</b><span>สำหรับโพสต์หรือพิมพ์</span></button><button class="xbtn" data-x="pdf"><b>PDF</b><span>หน้าเดียว ขยายพิมพ์ได้</span></button></div><div class="muted" id="lx" style="margin-top:10px"></div><button class="btn ghost block" data-close style="margin-top:12px">ปิด</button>', { center: true });
      w.addEventListener('click', async e => { const b = e.target.closest('[data-x]'); if (!b || w.dataset.busy) return; w.dataset.busy = '1'; $('#lx', w).textContent = 'กำลังสร้าง …';
        try { if (b.dataset.x === 'view') w.remove(); await exportTree(b.dataset.x); $('#lx', w).textContent = 'เสร็จแล้ว'; } catch (er) { console.error(er); $('#lx', w).textContent = 'ไม่สำเร็จ: ' + (er.message || er); } delete w.dataset.busy; });
    }
  });
  A.lineageStats = () => ({ up: Object.keys(nodes()).length, rites: riteList().length });
})();
