/* ============================================================
   directory.js — ทำเนียบติดต่อ: ค้นหาเพื่อนศิษย์ตามปีที่เริ่มเรียน จังหวัด ความถนัด เพื่อประสานงาน
   ข้อมูล: contacts/{sid} = { province, work, phone?, line?, email?, at }
     • จังหวัดและที่ทำงานแสดงเสมอ · เบอร์โทร LINE อีเมล มีเฉพาะเมื่อเจ้าตัวเลือก “เปิดเผยต่อเพื่อนศิษย์”
     • ศิษย์ทุกคนอ่านได้ (Rules) เขียนได้เฉพาะเจ้าตัวและแอดมิน — ข้อมูลเต็มอยู่ที่ privateInfo/{sid}
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP, C = M.C;
  const { $, esc } = M; const { ic, chip, avatar } = A;
  const DR = { q: '', era: '', prov: '', inst: '', by: 'gen' };
  const contacts = () => A.D.contacts || {};
  A.SUBS.push({ key: 'contacts', path: () => 'contacts' });
  A.NAVS.push({ id: 'dir', label: 'ทำเนียบติดต่อ', icon: 'phone', order: 44 });

  const lineURL = id => 'https://line.me/ti/p/~' + encodeURIComponent(String(id).replace(/^@/, ''));
  const telURL = p => 'tel:' + String(p).replace(/[^0-9+]/g, '');
  function contactBtns(c) {
    const b = [];
    if (c.phone) b.push('<a class="btn sm" href="' + esc(telURL(c.phone)) + '">' + ic('phone', 16) + esc(c.phone) + '</a>');
    if (c.line) b.push('<a class="btn sm ghost" href="' + esc(lineURL(c.line)) + '" target="_blank" rel="noopener">LINE ' + esc(c.line) + '</a>');
    if (c.email) b.push('<a class="btn sm ghost" href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>');
    return b.length ? '<div class="row wrap" style="gap:6px;margin-top:8px">' + b.join('') + '</div>' : '<div class="muted" style="margin-top:6px">ไม่ได้เปิดเผยช่องทางติดต่อ — ติดต่อผ่านเลขานุการ</div>';
  }
  function card(s) {
    const m = A.members()[s], c = contacts()[s] || {};
    return '<div class="dcard"><div class="row"><a href="#/m/' + esc(s) + '">' + avatar(m, 'lg') + '</a><div class="grow"><a href="#/m/' + esc(s) + '" class="dn"><b>' + esc(A.fullName(m) + A.nickTxt(m)) + '</b></a>' +
      '<div class="muted">' + esc([A.cls(m), A.insts(m).slice(0, 3).join(', ')].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="muted">' + (c.province ? ic('pin', 14) + esc(c.province) : '') + (c.work ? (c.province ? ' · ' : '') + esc(c.work) : '') + '</div></div>' + chip(A.roleName(A.roleOf(s)), 'plum') + '</div>' + contactBtns(c) + '</div>';
  }
  function filtered() {
    const ms = A.members(), q = DR.q.trim().toLowerCase();
    return A.activeSids().filter(s => {
      const m = ms[s], c = contacts()[s] || {};
      if (DR.era !== '' && A.eraOf(m) !== +DR.era) return false;
      if (DR.prov && c.province !== DR.prov) return false;
      if (DR.inst && !(m.inst || {})[DR.inst]) return false;
      if (q && !(A.fullName(m) + ' ' + (m.nick || '') + ' ' + (c.work || '') + ' ' + (c.province || '') + ' ' + A.insts(m).join(' ')).toLowerCase().includes(q)) return false;
      return true;
    }).sort(A.byClass);
  }
  function listHTML() {
    const l = filtered(), ms = A.members(); if (!l.length) return '<div class="empty">ไม่พบศิษย์ตามเงื่อนไข</div>';
    const groups = {}, label = s => DR.by === 'prov' ? ((contacts()[s] || {}).province || 'ไม่ระบุจังหวัด') : A.eraName(A.eraOf(ms[s]));
    l.forEach(s => { const k = label(s); (groups[k] = groups[k] || []).push(s); });
    const keys = Object.keys(groups); if (DR.by === 'prov') keys.sort((a, b) => groups[b].length - groups[a].length || a.localeCompare(b, 'th'));
    return keys.map(k => '<div class="mo-h">' + esc(k) + ' <span class="muted">(' + groups[k].length + ')</span></div><div class="dgrid">' + groups[k].map(card).join('') + '</div>').join('') + '<div class="muted" style="padding:10px 0 2px">แสดง ' + l.length + ' จาก ' + A.activeSids().length + ' คน</div>';
  }
  A.V.dir = function () {
    const act = A.activeSids(), provs = {}; act.forEach(s => { const p = (contacts()[s] || {}).province; if (p) provs[p] = (provs[p] || 0) + 1; });
    const insts = A.instList().filter(i => act.some(s => (A.members()[s].inst || {})[i]));
    const sel = (k, opts) => '<select class="in sm" data-dr="' + k + '" aria-label="' + esc(opts[0][1]) + '">' + opts.map(o => '<option value="' + esc(o[0]) + '"' + (String(DR[k]) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
    const me = A.sid() && A.members()[A.sid()], mine = me && contacts()[A.sid()];
    let b = '';
    if (me) b += '<section class="card' + (mine && (mine.phone || mine.line || mine.email) ? '' : ' hl') + '"><div class="row"><div class="grow"><b>ข้อมูลของฉันในทำเนียบ</b><div class="muted">' + (mine ? esc([mine.province, mine.work].filter(Boolean).join(' · ') || 'ยังไม่ระบุจังหวัดและที่ทำงาน') + (mine.phone || mine.line || mine.email ? ' · เปิดเผยช่องทางติดต่อ' : ' · ยังไม่เปิดเผยช่องทางติดต่อ') : 'ยังไม่มีข้อมูล — เพิ่มเพื่อให้เพื่อนศิษย์ติดต่อได้') + '</div></div><button class="btn sm" data-act="editSelf">แก้ไข</button></div></section>';
    b += '<section class="card"><div class="lb">ศิษย์อยู่ใน ' + Object.keys(provs).length + ' จังหวัด</div><div class="row wrap" style="gap:6px">' +
      Object.keys(provs).sort((a, c) => provs[c] - provs[a]).map(p => '<button class="pill' + (DR.prov === p ? ' on' : '') + '" data-act="drProv" data-p="' + esc(p) + '">' + esc(p) + '<i>' + provs[p] + ' คน</i></button>').join('') + (DR.prov ? '<button class="btn sm ghost" data-act="drProv" data-p="">ล้างตัวกรอง</button>' : '') + '</div></section>';
    b += '<section class="card"><div class="filters"><input id="dq" class="in" type="search" placeholder="ค้นหาชื่อ ชื่อเล่น ที่ทำงาน จังหวัด" value="' + esc(DR.q) + '" aria-label="ค้นหาในทำเนียบ">' +
      sel('era', [['', 'ทุกช่วงปีที่เริ่มเรียน']].concat(A.eraOpts(), [[0, 'ยังไม่ระบุปี']])) + sel('inst', [['', 'ทุกความถนัด']].concat(insts.map(i => [i, i]))) + sel('by', [['gen', 'จัดกลุ่มตามช่วงปีที่เริ่มเรียน'], ['prov', 'จัดกลุ่มตามจังหวัด']]) + '</div>' +
      (A.can.exp() ? '<div class="row wrap" style="margin-top:10px"><button class="btn ghost sm" data-act="drExport">' + ic('down', 16) + 'ส่งออกทำเนียบ (DOCX)</button></div>' : '') +
      '<div id="dlist">' + listHTML() + '</div></section>';
    b += '<div class="muted" style="padding:0 4px">ข้อมูลในทำเนียบใช้เพื่อประสานงานของเครือข่ายเท่านั้น ห้ามส่งต่อบุคคลภายนอก</div>';
    return { title: 'ทำเนียบติดต่อ', body: b };
  };
  document.addEventListener('input', e => { if (e.target.id === 'dq') { DR.q = e.target.value; const l = $('#dlist'); if (l) l.innerHTML = listHTML(); } });
  document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.dr; if (k) { DR[k] = e.target.value; const l = $('#dlist'); if (l) l.innerHTML = listHTML(); } });

  /* การ์ดติดต่อในหน้าประวัติศิษย์ */
  A.MHOOKS.push(sid => { const c = contacts()[sid]; if (!c || A.members()[sid].status !== 'active') return ''; return '<section class="card"><div class="lb">ติดต่อ</div>' + (c.province || c.work ? '<div class="muted">' + esc([c.province, c.work].filter(Boolean).join(' · ')) + '</div>' : '') + contactBtns(c) + '</section>'; });
  A.HOME.push({ order: 45, html: () => { const n = new Set(A.activeSids().map(s => (contacts()[s] || {}).province).filter(Boolean)).size; return n ? '<a class="card rowcard" href="#/dir">' + ic('pin', 28) + '<div class="grow"><div class="lb" style="margin:0">ทำเนียบติดต่อ</div><div class="muted">ศิษย์กระจายอยู่ ' + n + ' จังหวัด · ค้นหาเพื่อนศิษย์เพื่อประสานงาน</div></div>' + ic('right', 20) + '</a>' : ''; } });

  Object.assign(A.ACT, {
    drProv: d => { DR.prov = d.p || ''; A.rerender(); },
    drExport: async () => {
      if (!A.can.exp()) return; const l = filtered(), ms = A.members();
      const doc = M.docxTable({ title: 'ทำเนียบติดต่อ' + C.club.name, lines: [C.club.long + ' · ข้อมูล ณ ' + M.thNum(M.thDate(Date.now())), 'จำนวน ' + M.thNum(l.length) + ' คน (เฉพาะช่องทางที่เจ้าตัวเปิดเผย)'],
        head: ['ลำดับ', 'ชื่อ - สกุล', 'เริ่มเรียน', 'จังหวัด', 'ที่ทำงาน', 'โทร / LINE / อีเมล'], widths: [7, 26, 11, 13, 20, 23], align: ['center', 'left', 'center', 'left', 'left', 'left'],
        rows: l.map((s, i) => { const c = contacts()[s] || {}; return [M.thNum(i + 1), A.fullName(ms[s]) + A.nickTxt(ms[s]), ms[s].yearIn || '-', c.province || '-', c.work || '-', [c.phone, c.line && 'LINE ' + c.line, c.email].filter(Boolean).join(' · ') || '-']; }) });
      await M.saveBlob(doc, 'ทำเนียบติดต่อ-' + M.safeName(C.club.name) + '.docx'); A.log('export', '', 'directory');
    }
  });
})();
