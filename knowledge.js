/* ============================================================
   knowledge.js — หน้ารวม “คลังวิชา”: ทางเข้าสู่ เพลงและทางเพลง · สายการสืบทอด · คำสอนและผลงาน · คลังเอกสาร
   พร้อมช่องค้นหารวมทุกหมวด (ค้นจากข้อมูลที่โหลดไว้แล้วในเครื่อง)
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, A = window.APP, C = M.C;
  const { $, esc } = M; const { ic, chip } = A;
  const KB = { q: '' };
  A.NAVS.push({ id: 'kb', label: 'คลังวิชา', icon: 'archive', tab: 1, order: 20, match: ['songs', 'song', 'lineage', 'teach', 'library'] });

  function results() {
    const q = KB.q.trim().toLowerCase(); if (q.length < 2) return '';
    const hit = s => String(s || '').toLowerCase().includes(q), out = [];
    Object.keys(A.D.songs || {}).forEach(id => { const g = A.D.songs[id]; if (!g || !g.name) return; const ts = Object.values(g.tang || {}); if (hit(g.name) || hit(g.desc) || ts.some(t => hit(t.name) || hit(t.from) || hit(t.inst))) out.push(['#/song/' + id, 'music', g.name, 'เพลง · ' + (g.cat || '')]); });
    Object.keys(A.D.teach || {}).forEach(id => { const x = A.D.teach[id]; if (!x || !x.title || (x.status !== 'ok' && !A.teacher())) return; if (hit(x.title) || hit(x.body) || hit(x.src)) out.push(['#/teach', 'quote', x.title, 'คำสอนและผลงาน']); });
    Object.keys(A.D.library || {}).forEach(id => { const x = A.D.library[id]; if (x && x.title && (hit(x.title) || hit(x.desc) || hit(x.cat))) out.push(['#/library', 'lib', x.title, 'เอกสาร · ' + (x.cat || '')]); });
    Object.keys(A.D.lineage || {}).forEach(id => { const x = A.D.lineage[id]; if (x && x.name && (hit(x.name) || hit(x.role) || hit(x.note))) out.push(['#/lineage', 'tree', x.name, 'สายครู · ' + (x.role || '')]); });
    A.activeSids().forEach(s => { const m = A.members()[s]; if (hit(A.fullName(m)) || hit(m.nick)) out.push(['#/m/' + s, 'me', A.fullName(m) + A.nickTxt(m), 'ศิษย์ · ' + A.cls(m)]); });
    return '<section class="card"><div class="lb">ผลการค้นหา (' + out.length + ')</div>' + (out.slice(0, 60).map(r => '<a class="evc" href="' + r[0] + '"><span class="evd sg">' + ic(r[1], 20) + '</span><span class="grow"><b>' + esc(r[2]) + '</b><span class="muted">' + esc(r[3]) + '</span></span></a>').join('') || '<div class="muted">ไม่พบ</div>') + '</section>';
  }
  A.V.kb = function () {
    const sg = A.songStats ? A.songStats() : {}, ln = A.lineageStats ? A.lineageStats() : {}, tc = A.teachStats ? A.teachStats() : {}, lib = Object.keys(A.D.library || {}).length;
    const tile = (href, icon, title, sub, badge) => '<a class="kb-t" href="' + href + '">' + ic(icon, 30) + '<b>' + esc(title) + '</b><span>' + esc(sub) + '</span>' + (badge ? chip(badge, 'hot') : '') + '</a>';
    let b = '<section class="card hero"><div class="hero-name">คลังวิชาของสำนัก</div><div class="hero-sub">ทางเพลง สายครู คำสอน และเอกสาร ที่ศิษย์ทุกท่านช่วยกันบันทึก เพื่อสืบทอดวิชาของ' + esc(C.master.short) + '</div>' +
      '<input id="kbq" class="in" type="search" placeholder="ค้นหาทุกหมวด: ชื่อเพลง ทาง ครู คำสอน เอกสาร ศิษย์" value="' + esc(KB.q) + '" aria-label="ค้นหาในคลังวิชา" style="margin-top:12px"></section>';
    b += '<div id="kbres">' + results() + '</div>';
    b += '<div class="kb-grid">' +
      tile('#/songs', 'music', 'เพลงและทางเพลง', (sg.songs || 0) + ' เพลง · ' + (sg.tangs || 0) + ' ทาง · บันทึกการต่อเพลง ' + (sg.learned || 0) + ' รายการ') +
      tile('#/lineage', 'tree', 'สายการสืบทอด', 'สายครู ' + (ln.up || 0) + ' ท่าน · ผังศิษย์ · บันทึกพิธี ' + (ln.rites || 0) + ' รายการ') +
      tile('#/teach', 'quote', 'คำสอนและผลงาน', (tc.n || 0) + ' บันทึก · ประวัติ' + C.master.short, A.teacher() && tc.pend ? 'รอตรวจ ' + tc.pend : '') +
      tile('#/library', 'lib', 'คลังเอกสาร', lib + ' รายการ · บทความ โน้ต เสียง วิดีโอ') + '</div>';
    return { title: 'คลังวิชา', body: b };
  };
  document.addEventListener('input', e => { if (e.target.id === 'kbq') { KB.q = e.target.value; const r = $('#kbres'); if (r) r.innerHTML = results(); } });
})();
