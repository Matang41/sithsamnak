/* ============================================================
   clubinfo.js — รุ่น 3.2: ธรรมเนียมสำนัก · ข้อตกลง กฎระเบียบ MOU บทลงโทษ · การกดยอมรับ
   ข้อมูล: public/info/{id} = { title, body, kind, order } (อ่านได้สาธารณะ เพื่อแสดงในใบสมัคร) · public/infoVer = รหัสรุ่นของข้อตกลง
           y/{ปี}/acks/{sid}/rules-{รุ่น} = เวลาที่ศิษย์กดยอมรับในแอป · members/{sid}/accept = ยอมรับตอนสมัครผ่านลิงก์
   เนื้อหาตั้งต้นอยู่ที่ config.js › clubInfo[รหัสเครือข่าย] (แอดมินเพิ่ม/แก้เพิ่มได้ในแอป)
   รูปแบบเนื้อหา: หนึ่งบรรทัด = หนึ่งข้อ · **ข้อความ** = เน้นสีแดง · ลิงก์ https:// กดได้
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP, C = M.C;
  const { $, esc, toast, modal } = M; const { ic, chip, fld, opt } = A;
  Object.assign(A.ICON, { rule: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>' });
  const T = () => A.teacher(), Y = () => 'y/' + A.year();
  const FILE = () => (C.clubInfo || {})[C.club.id] || {};
  const KINDS = [['rule', 'กฎระเบียบ'], ['penalty', 'บทลงโทษ'], ['mou', 'บันทึกข้อตกลง (MOU)'], ['info', 'ข้อมูลทั่วไป']];
  const rich = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b class="hot">$1</b>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  const ver = () => String((A.D.pub || {}).infoVer || FILE().ver || '1');
  function sections(db) {
    const f = (FILE().sections || []).map((s, i) => Object.assign({ id: 'f' + i, file: true }, s)), d = db || {};
    return f.concat(Object.keys(d).map(id => Object.assign({ id }, d[id]))).filter(s => s.title).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  const secs = () => sections((A.D.pub || {}).info);
  function secHTML(s) {
    const lines = String(s.body || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    return '<div class="ci ci-' + esc(s.kind || 'rule') + '"><div class="ci-t">' + esc(s.title) + '</div>' + (lines.length ? '<ul class="cl">' + lines.map(l => '<li>' + rich(l) + '</li>').join('') + '</ul>' : '') + '</div>';
  }
  /* ใช้ร่วมกับหน้าใบสมัครและหน้าผู้ปกครอง */
  A.clubInfoHTML = (list, poster) => list.map(secHTML).join('') + (poster ? '<a href="' + esc(poster) + '" target="_blank" rel="noopener" class="btn ghost sm" style="margin-top:6px">ดูประกาศฉบับเต็ม (ภาพ)</a>' : '');
  A.clubInfoLoad = async () => { let info = null, v = null; try { info = await B.get('public/info'); } catch (e) { /* ignore */ } try { v = await B.get('public/infoVer'); } catch (e) { /* ignore */ } return { secs: sections(info), ver: String(v || FILE().ver || '1'), poster: FILE().poster || '' }; };

  const accepted = sid => { const m = A.members()[sid] || {}, v = ver(); return (m.accept && String(m.accept.ver) === v) || !!(((A.D.acks || {})[sid] || {})['rules-' + v]); };
  const meStart = () => { const m = A.sid() && A.members()[A.sid()]; return !!m && m.type === 'start'; };
  const needAccept = () => !!A.sid() && !T() && secs().length > 0 && !accepted(A.sid());

  A.NAVS.push({ id: 'club', label: 'ธรรมเนียมสำนัก', icon: 'rule', order: 12, get tab() { return meStart() ? 1 : 0; } });
  A.TODO.push(() => needAccept() ? { badge: 'ธรรมเนียม', label: 'อ่านและกดยอมรับธรรมเนียมของสำนัก', href: '#/club', hot: true } : null);
  A.HOME.push({ order: 3, html: () => {
    if (!A.sid() || T()) return '';
    if (needAccept()) return '<section class="card hl"><div class="lb">กรุณาอ่านและยอมรับธรรมเนียมสำนัก</div><div class="muted" style="margin-bottom:10px">ข้อตกลง กฎระเบียบ และบทลงโทษของเครือข่าย ศิษย์ทุกคนต้องอ่านและกดยอมรับ</div><a class="btn gold" href="#/club">อ่านและยอมรับ</a></section>';
    return meStart() && secs().length ? '<a class="card rowcard" href="#/club">' + ic('rule', 28) + '<div class="grow"><div class="lb" style="margin:0">ธรรมเนียมสำนัก · ข้อตกลงและกฎระเบียบ</div><div class="muted">ศิษย์ใหม่ควรอ่านทบทวนอยู่เสมอ</div></div>' + ic('right', 20) + '</a>' : '';
  } });

  A.V.club = function () {
    const l = secs(), sid = A.sid(), F = FILE(); let b = '';
    if (T()) b += '<div class="row wrap" style="margin-bottom:14px"><button class="btn gold" data-act="clNewMou">' + ic('plus', 18) + 'เพิ่ม MOU</button><button class="btn" data-act="clNew">' + ic('plus', 18) + 'เพิ่มหัวข้อกฎระเบียบ</button><button class="btn ghost" data-act="clReask">ให้ศิษย์กดยอมรับใหม่</button></div>';
    b += '<section class="card hero"><div class="hero-name">ธรรมเนียมและข้อปฏิบัติของศิษย์' + esc(C.club.name) + '</div><div class="hero-sub">' + esc(F.intro || C.club.full) + '</div></section>';
    if (sid && !T()) b += needAccept() ? '<section class="card hl"><div class="lb">ยืนยันการยอมรับ</div><div class="muted" style="margin-bottom:10px">อ่านข้อตกลงด้านล่างให้ครบ แล้วกดยอมรับ ระบบบันทึกวัน-เวลาไว้เป็นหลักฐาน</div><button class="btn gold block" data-act="clAccept">ข้าพเจ้าได้อ่านและยอมรับข้อตกลง กฎระเบียบ และบทลงโทษของเครือข่าย</button></section>' : (l.length ? '<div class="row" style="margin-bottom:12px">' + chip('คุณยอมรับข้อตกลงแล้ว', 'ok') + '</div>' : '');
    b += l.length ? '<section class="card">' + l.map(s => secHTML(s) + (T() && !s.file ? '<div class="row wrap" style="margin:-4px 0 12px"><button class="btn ghost sm" data-act="clEdit" data-id="' + esc(s.id) + '">แก้ไข</button><button class="btn ghost sm danger" data-act="clDel" data-id="' + esc(s.id) + '">ลบ</button></div>' : s.file && T() ? '<div class="muted" style="margin:-4px 0 12px">หัวข้อนี้อยู่ใน config.js — แก้ที่ไฟล์</div>' : '')).join('') + (F.poster ? '<a href="' + esc(F.poster) + '" target="_blank" rel="noopener"><img class="poster-i" src="' + esc(F.poster) + '" alt="ประกาศกติกาห้องซ้อมฉบับเต็ม"></a>' : '') + '</section>' : '<section class="card"><div class="empty">ยังไม่มีธรรมเนียมของสำนัก' + (T() ? ' — กด “เพิ่มหัวข้อ” เพื่อใส่ MOU หรือกฎระเบียบ' : '') + '</div></section>';
    if (T() && l.length) { const act = A.activeSids().sort(A.byClass), no = act.filter(s => !accepted(s));
      b += '<section class="card"><div class="lb">สถานะการยอมรับ (รุ่นข้อตกลง ' + esc(ver()) + ')</div><div class="stat4" style="grid-template-columns:repeat(2,1fr)"><div><b class="ok">' + (act.length - no.length) + '</b><span>ยอมรับแล้ว</span></div><div><b class="bad">' + no.length + '</b><span>ยังไม่ยอมรับ</span></div></div>' +
        (no.length ? '<details class="yr"><summary>รายชื่อที่ยังไม่ยอมรับ</summary><div class="muted">' + no.map(s => esc(A.fullName(A.members()[s]) + ' ' + A.cls(A.members()[s]))).join('<br>') + '</div></details>' : '') + '</section>'; }
    return { title: 'ธรรมเนียมสำนัก', body: b };
  };

  function form(id, kind) {
    const s = id ? A.D.pub.info[id] : { kind: kind || 'rule', order: secs().length + 1, title: kind === 'mou' ? 'บันทึกข้อตกลงร่วมกัน (MOU) ปี ' + A.year() : '' };
    const w = modal('<h3>' + (id ? 'แก้ไขหัวข้อ' : 'เพิ่มหัวข้อ') + '</h3><form class="form">' + fld('หัวข้อ', '<input class="in" id="c-t" value="' + esc(s.title || '') + '" required>') +
      '<div class="g3">' + fld('ประเภท', '<select class="in" id="c-k">' + opt(KINDS, s.kind || 'rule') + '</select>') + fld('ลำดับ (เลขน้อยขึ้นก่อน)', '<input class="in" id="c-o" inputmode="numeric" value="' + esc(s.order || '') + '">') + '</div>' +
      fld('เนื้อหา', '<textarea class="in" id="c-b" rows="9">' + esc(s.body || '') + '</textarea>', 'หนึ่งบรรทัดต่อหนึ่งข้อ · ใส่ **คำ** เพื่อเน้นสีแดง · วางลิงก์ https:// ได้') + '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { sticky: true, wide: true });
    $('form', w).addEventListener('submit', e => { e.preventDefault(); const t = $('#c-t', w).value.trim(); if (!t) return;
      A.W(B.set('public/info/' + (id || 'i' + B.uid()), { title: t, kind: $('#c-k', w).value, order: +$('#c-o', w).value || 0, body: $('#c-b', w).value.trim() || null })); w.remove(); toast('บันทึกแล้ว'); });
  }
  Object.assign(A.ACT, {
    clNew: () => { if (T()) form(null); }, clNewMou: () => { if (T()) form(null, 'mou'); }, clEdit: d => { if (T()) form(d.id); },
    clDel: async d => { if (!T()) return; const s = ((A.D.pub || {}).info || {})[d.id]; if (!s || !(await M.confirmBox('ลบหัวข้อ', esc(s.title), 'ลบ', true))) return; A.W(B.remove('public/info/' + d.id)); },
    clAccept: () => { const sid = A.sid(); if (!sid || T()) return; A.W(B.set(Y() + '/acks/' + sid + '/rules-' + ver(), Date.now())); toast('บันทึกการยอมรับแล้ว'); },
    clReask: async () => { if (!T()) return; if (!(await M.confirmBox('ให้ศิษย์กดยอมรับใหม่', 'ศิษย์ทุกคนจะเห็นคำเตือนให้อ่านและกดยอมรับข้อตกลงอีกครั้ง ใช้เมื่อแก้ข้อตกลงสำคัญ', 'ตกลง'))) return; A.W(B.set('public/infoVer', String(Date.now()))); toast('ส่งคำขอให้ยอมรับใหม่แล้ว'); }
  });
  A.MANAGE.push(() => '<section class="card"><div class="lb">ธรรมเนียมสำนัก · MOU · กฎระเบียบ</div><div class="muted" style="margin-bottom:10px">ใส่บันทึกข้อตกลง (MOU) กฎระเบียบ และบทลงโทษ ให้ศิษย์อ่านและกดยอมรับ</div><div class="row wrap"><button class="btn gold" data-act="clNewMou">เพิ่ม MOU</button><a class="btn ghost" href="#/club">เปิดหน้าธรรมเนียมสำนัก</a></div></section>');
})();
