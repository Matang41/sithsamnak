/* ============================================================
   honor.js — รุ่น 3.1: ระบบรางวัล
   • ประกาศยกย่อง + เกียรติยศบนหน้าหลัก        awards/{id}
   • ประเมินคุณลักษณะอันพึงประสงค์ 8 ประการ     y/{ปี}/traits/{sid} = { s:{t1:0-3…}, note, at, by }
     (ไม่จัดอันดับระหว่างสมาชิก · เดิมดึงข้อมูลประกอบจากการซ้อม · พฤติกรรมรายสัปดาห์ · กิจกรรม)
   • ออกเกียรติบัตรในนามเครือข่ายศิษย์ (เลือกรายการหรือพิมพ์เอง)  certs/{id} (แอดมินเท่านั้น) · certidx/{sid}/{id} (สำเนาให้เจ้าตัว)
   • ทะเบียนเกียรติบัตร (แอดมิน)                    เลขที่รันต่อปีที่ y/{ปี}/certno
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP, C = M.C;
  const { $, $$, esc, toast, modal } = M; const { ic, chip, fld, opt, avatar } = A;
  Object.assign(A.ICON, {
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.8 4M16 6h2.5a2.5 2.5 0 0 1-2.8 4M12 13v4M9 20h6M10 17h4"/>',
    cert: '<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M7 8h10M7 11h6"/><path d="M15 17l-1 4 2-1 2 1-1-4"/>'
  });
  const Y = () => 'y/' + A.year(), T = () => A.teacher();
  const PRESETS = () => C.awardPresets || [];

  A.SUBS.push(
    { key: 'awards', path: () => 'awards' },
    { key: 'certs', path: () => A.teacher() ? 'certs' : null },
    { key: 'certidx', path: () => A.sid() ? 'certidx/' + A.sid() : null, norm: v => ({ [A.sid()]: v }) }
  );
  A.NAVS.push({ id: 'honor', label: 'เกียรติยศและรางวัล', icon: 'trophy', order: 27 },
    { id: 'certs', label: 'ทะเบียนเกียรติบัตร', icon: 'cert', order: 29, show: () => A.teacher() });

  /* ---------- ข้อมูล ---------- */
  const awards = () => Object.keys(A.D.awards || {}).map(id => Object.assign({ id }, A.D.awards[id])).filter(a => a.title).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.at - a.at);
  const rcp = a => Object.keys(a.rcp || {}).map(s => ({ sid: s, name: a.rcp[s] })).concat((a.ext || []).map(n => ({ name: n })));
  const certList = () => Object.keys(A.D.certs || {}).map(id => Object.assign({ id }, A.D.certs[id])).filter(c => c.no).sort((a, b) => b.at - a.at);
  const myCerts = () => { const o = (A.D.certidx || {})[A.sid()] || {}; return Object.keys(o).map(id => Object.assign({ id }, o[id])).filter(c => c.no && c.status !== 'void').sort((a, b) => b.at - a.at); };
  const findCert = id => ((A.D.certs || {})[id] && Object.assign({ id }, A.D.certs[id])) || (((A.D.certidx || {})[A.sid()] || {})[id] && Object.assign({ id }, A.D.certidx[A.sid()][id])) || null;
  function ranking() { const c = {}; awards().filter(a => a.y === A.year()).forEach(a => Object.keys(a.rcp || {}).forEach(s => { if (A.members()[s]) c[s] = (c[s] || 0) + 1; })); return Object.keys(c).map(s => ({ sid: s, n: c[s] })).sort((x, y) => y.n - x.n); }

  /* ============ การ์ดประกาศยกย่อง + หน้าหลัก ============ */
  function awardCard(a, mini) {
    const ms = A.members(), r = rcp(a), mine = A.sid() && (a.rcp || {})[A.sid()], shown = mini ? r.slice(0, 4) : r;
    return '<div class="aw' + (a.pinned ? ' pin' : '') + (mine ? ' mine' : '') + '"><div class="row"><span class="aw-ic">' + ic('trophy', 22) + '</span><div class="grow"><b>' + esc(a.title) + '</b><div class="muted">' + esc(M.thDate(a.at) + (a.by ? ' · โดย ' + a.by : '')) + '</div></div>' + (a.pinned ? chip('ปักหมุด', 'gold') : '') + '</div>' +
      (a.body ? '<div class="aw-b">' + esc(a.body) + '</div>' : '') +
      '<div class="aw-r">' + shown.map(p => '<span class="aw-p">' + avatar(ms[p.sid] || { first: p.name }) + '<span>' + esc(ms[p.sid] ? A.fullName(ms[p.sid]) : p.name) + '</span></span>').join('') + (mini && r.length > 4 ? '<span class="muted">และอีก ' + (r.length - 4) + ' คน</span>' : '') + '</div>' +
      (!mini && T() ? '<div class="row wrap" style="margin-top:10px"><button class="btn ghost sm" data-act="awPin" data-id="' + esc(a.id) + '">' + (a.pinned ? 'เลิกปักหมุด' : 'ปักหมุด') + '</button><button class="btn ghost sm danger" data-act="awDel" data-id="' + esc(a.id) + '">ลบประกาศ</button></div>' : '') + '</div>';
  }
  A.HOME.push({ order: 18, html: () => {
    const l = awards(), sid = A.sid(), mine = sid ? l.filter(a => (a.rcp || {})[sid]) : [];
    if (!l.length) return T() ? '<section class="card"><div class="lb">ประกาศยกย่อง</div><div class="muted">ยังไม่มีประกาศยกย่อง</div><div class="row wrap" style="margin-top:10px"><a class="btn gold sm" href="#/honor">ให้รางวัล / ออกเกียรติบัตร</a></div></section>' : '';
    const top = [], m2 = mine.slice(0, 2), recent = l.filter(a => !m2.includes(a)).slice(0, 3), ms = A.members(); let h = '';
    if (m2.length) h += '<section class="card hl"><div class="lb">ยินดีด้วย คุณได้รับการยกย่อง (' + mine.length + ')</div>' + m2.map(a => awardCard(a, true)).join('') + '</section>';
    if (recent.length || top.length) h += '<section class="card"><div class="row"><div class="lb grow" style="margin:0 0 8px">ประกาศยกย่อง</div><a href="#/honor" class="muted">ดูทั้งหมด</a></div>' + recent.map(a => awardCard(a, true)).join('') +
      (top.length ? '<div class="lb" style="margin-top:12px">เกียรติยศประจำปี ' + esc(A.year()) + '</div><div class="hof">' + top.map((t, i) => '<a class="hof-i" href="#/m/' + esc(t.sid) + '"><span class="rk">' + (i + 1) + '</span>' + avatar(ms[t.sid]) + '<span class="grow"><b>' + esc(ms[t.sid].first) + '</b><span class="muted">' + t.n + ' รางวัล</span></span></a>').join('') + '</div>' : '') + '</section>';
    return h;
  } });

  /* ============ หน้า เกียรติยศและรางวัล ============ */
  A.V.honor = function () {
    const sid = A.sid(), ms = A.members(); let b = '';
    if (T()) b += '<div class="row wrap" style="margin-bottom:14px"><button class="btn gold" data-act="awNew">' + ic('trophy', 18) + 'ให้รางวัล / ออกเกียรติบัตร</button><a class="btn ghost" href="#/certs">ทะเบียนเกียรติบัตร</a><a class="btn ghost" href="#/behave">ประเมินพฤติกรรม / คุณลักษณะ</a></div>';
    if (sid) {
      const mc = myCerts();
      b += '<section class="card"><div class="lb">เกียรติบัตรของฉัน (' + mc.length + ')</div>' + (mc.map(c => '<div class="li"><div class="row"><div class="grow"><b>' + esc(c.title) + '</b><div class="muted">' + esc('เลขที่ ' + c.no + ' · ' + A.dTH(c.date, 'short')) + '</div></div><button class="btn sm" data-act="certOpen" data-id="' + esc(c.id) + '">ดู / บันทึก PDF</button></div></div>').join('') || '<div class="muted">ยังไม่มีเกียรติบัตร</div>') + '</section>';
    }
    /* ไม่แสดงอันดับจำนวนรางวัล — หลีกเลี่ยงการเปรียบเทียบระหว่างสมาชิก */
    const l = awards();
    b += '<section class="card"><div class="lb">ประกาศยกย่องทั้งหมด (' + l.length + ')</div>' + (l.map(a => awardCard(a, false)).join('') || '<div class="muted">ยังไม่มีประกาศ</div>') + '</section>';
    return { title: 'เกียรติยศและรางวัล', body: b };
  };

  /* ============ เกียรติบัตร ============ */
  function certPage(c) {
    const club = C.clubs.find(x => x.id === c.club) || C.club, pg = document.createElement('div'); pg.className = 'rp-page land cert';
    const sg = (c.signers || []).map(s => '<div class="ct-sg"><div class="ct-sl">' + ((A.D.sigs || {})[s.sk] && A.D.sigs[s.sk].img ? '<img src="' + A.D.sigs[s.sk].img + '" alt="">' : '') + '</div>( ' + (s.name ? esc(s.name) : '&nbsp;'.repeat(30)) + ' )<br>' + esc(s.pos || '') + '</div>').join('');
    pg.innerHTML = '<div class="ct-fr"><div class="ct-fr2"><div class="ct-top"><img class="ct-logo' + (club.round ? ' rd' : '') + '" src="' + esc(club.logo) + '" alt=""><div class="ct-h">เกียรติบัตร</div><div class="ct-club">' + esc(club.long || club.full) + '</div></div>' +
      '<div class="ct-l">ขอมอบเกียรติบัตรฉบับนี้ให้แก่</div><div class="ct-n">' + esc(c.name) + '</div>' + (c.cls && c.cls !== '-' ? '<div class="ct-cls">ศิษย์' + esc(c.cls) + '</div>' : '') +
      '<div class="ct-l">ได้รับการยกย่อง</div><div class="ct-title">' + esc(c.title) + '</div>' + (c.detail ? '<div class="ct-d">' + esc(c.detail) + '</div>' : '') +
      '<div class="ct-date">ให้ไว้ ณ วันที่ ' + esc(A.dTH(c.date, 'full')) + '</div>' + (sg ? '<div class="ct-sgs">' + sg + '</div>' : '') + '<div class="ct-no">เลขที่ ' + esc(c.no) + '</div></div></div>' + (c.status === 'void' ? '<div class="fn-wm">ยกเลิก</div>' : '');
    return pg;
  }
  function openCerts(list) {
    const one = list.length === 1, c0 = list[0], mk = () => { const r = document.createElement('div'); list.forEach(c => r.appendChild(certPage(c))); return r; };
    const w = M.previewPages(mk(), one ? 'เกียรติบัตร ' + c0.no : 'เกียรติบัตร ' + list.length + ' ใบ', '<div class="row wrap" style="margin-bottom:10px">' + (one ? chip(c0.status === 'void' ? 'ยกเลิกแล้ว' : 'ใช้ได้', c0.status === 'void' ? 'bad' : 'ok') : '') + '<button class="btn sm" id="c-pdf">บันทึกเป็น PDF</button><button class="btn ghost sm" id="c-png">บันทึกเป็นรูป PNG</button>' +
      (one && T() && c0.status !== 'void' ? '<button class="btn ghost sm danger" id="c-void">ยกเลิกเกียรติบัตร</button>' : '') + '<span class="muted" id="c-msg"></span></div>');
    const name = 'เกียรติบัตร-' + (one ? M.safeName(c0.name) + '-' + M.safeName(c0.no) : M.safeName(c0.title) + '-' + list.length + 'ใบ');
    const run = async kind => { const msg = $('#c-msg', w), pr = (i, n) => { msg.textContent = 'กำลังสร้างหน้า ' + i + ' / ' + n + ' …'; }; msg.textContent = 'กำลังสร้าง …';
      try { if (kind === 'pdf') await M.exportPDF(mk(), name + '.pdf', pr); else await M.exportPNGs(mk(), name, pr); msg.textContent = 'เสร็จแล้ว'; } catch (er) { msg.textContent = 'สร้างไม่สำเร็จ: ' + (er.message || er) + ' (ต้องต่ออินเทอร์เน็ตครั้งแรกเพื่อโหลดตัวสร้างไฟล์)'; } };
    $('#c-pdf', w).addEventListener('click', () => run('pdf')); $('#c-png', w).addEventListener('click', () => run('png'));
    const vd = $('#c-void', w);
    if (vd) vd.addEventListener('click', () => {
      const m = modal('<h3>ยกเลิก ' + esc(c0.no) + '</h3><form class="form">' + fld('เหตุผล (จำเป็น)', '<input class="in" id="v-r" required>') + '<div class="muted">เกียรติบัตรยังอยู่ในทะเบียนพร้อมสถานะ “ยกเลิก” และจะไม่แสดงให้ศิษย์</div><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ไม่ยกเลิก</button><button class="btn danger grow">ยกเลิกเกียรติบัตร</button></div></form>', { center: true, sticky: true });
      $('form', m).addEventListener('submit', e => { e.preventDefault(); const r = $('#v-r', m).value.trim(); if (!r) return; const upd = {}, ch = { status: 'void', voidReason: r, voidBy: A.myName(), voidAt: Date.now() };
        Object.keys(ch).forEach(k => { upd['certs/' + c0.id + '/' + k] = ch[k]; if (c0.sid) upd['certidx/' + c0.sid + '/' + c0.id + '/' + k] = ch[k]; });
        A.W(B.update('', upd)); A.log('cert.void', c0.sid || '', c0.no + ' ' + r); m.remove(); w.remove(); toast('ยกเลิกเกียรติบัตรแล้ว'); });
    });
  }

  /* ---------- ฟอร์มให้รางวัล / ออกเกียรติบัตร ---------- */
  function awForm(pre) {
    const ms = A.members(), sids = A.activeSids().sort(A.byClass), S = A.school();
    const w = modal('<h3>ให้รางวัล / ออกเกียรติบัตร</h3><form class="form"><div class="fld"><span>ผู้รับ (ศิษย์ในเครือข่าย)</span><div class="row wrap" style="margin-bottom:8px"><button type="button" class="btn ghost sm" data-pk="all">เลือกทั้งหมด</button><button type="button" class="btn ghost sm" data-pk="none">ล้าง</button><span class="muted" id="ar-n"></span></div><div class="plist">' +
      sids.map(s => '<label class="ck wide"><input type="checkbox" name="ar" value="' + esc(s) + '"' + (pre === s ? ' checked' : '') + '><span>' + esc(A.fullName(ms[s])) + ' <small class="muted">' + esc(A.cls(ms[s])) + '</small></span></label>').join('') + '</div></div>' +
      fld('ผู้รับอื่นนอกรายชื่อ เช่น ศิษย์เก่า วิทยากร (หนึ่งชื่อต่อบรรทัด)', '<textarea class="in" id="ar-ext" rows="2"></textarea>') +
      fld('เลือกรายการที่ให้', '<select class="in" id="ar-pre">' + opt([['', '— พิมพ์เอง —']].concat(PRESETS().map(p => [p.id, p.title]))) + '</select>') +
      fld('ชื่อรายการ / สิ่งที่ยกย่อง', '<input class="in" id="ar-t" required>') + fld('รายละเอียด (ข้อความใต้ชื่อรายการ ใช้ทั้งในประกาศและเกียรติบัตร)', '<textarea class="in" id="ar-d" rows="3"></textarea>') +
      '<div class="g3">' + fld('วันที่', '<input class="in" type="date" id="ar-date" value="' + A.todayISO() + '">') + '</div>' +
      '<div class="lb" style="margin-top:6px">ผู้ลงนามในเกียรติบัตร (เว้นชื่อว่างไว้เพื่อเซ็นด้วยปากกา)</div><div class="g3">' + fld('ผู้ลงนาม 1', '<input class="in" id="s1n" value="' + esc(A.myName()) + '">') + fld('ตำแหน่ง', '<input class="in" id="s1p" value="แอดมิน">') + '</div>' + (A.mySigRec && A.mySigRec() ? '<label class="ck wide"><input type="checkbox" id="s1s" checked><span>ใส่ลายเซ็นของฉันเป็นผู้ลงนาม 1</span></label>' : '<div class="muted">ยังไม่ได้เพิ่มลายเซ็น (ตั้งค่าที่ จัดการ › ลายเซ็นแอดมิน)</div>') + '<div class="g3">' + fld('ผู้ลงนาม 2', '<input class="in" id="s2n" value="' + esc(S.director || '') + '">') + fld('ตำแหน่ง', '<input class="in" id="s2p" value="ผู้อำนวยการโรงเรียนสรรพวิทยาคม">') + '</div>' +
      '<label class="ck wide"><input type="checkbox" id="ar-ann" checked><span>ประกาศยกย่องที่หน้าหลัก</span></label><label class="ck wide"><input type="checkbox" id="ar-pin"><span>ปักหมุดประกาศไว้บนสุด</span></label><label class="ck wide"><input type="checkbox" id="ar-cert" checked><span>ออกเกียรติบัตรในนามเครือข่ายศิษย์' + esc(C.club.name) + ' (ออกเลขที่อัตโนมัติ ต้องออนไลน์)</span></label>' +
      '<div class="note bad" id="ar-err" hidden></div><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { sticky: true, wide: true });
    const cnt = () => { $('#ar-n', w).textContent = 'เลือก ' + $$('input[name=ar]:checked', w).length + ' คน'; }; cnt();
    w.addEventListener('change', e => { if (e.target.name === 'ar') cnt(); });
    w.addEventListener('click', e => { const b = e.target.closest('[data-pk]'); if (!b) return; $$('input[name=ar]', w).forEach(c => { c.checked = b.dataset.pk === 'all'; }); cnt(); });
    $('#ar-pre', w).addEventListener('change', e => { const p = PRESETS().find(x => x.id === e.target.value); if (p) { $('#ar-t', w).value = p.title; $('#ar-d', w).value = p.detail || ''; } });
    $('form', w).addEventListener('submit', async e => {
      e.preventDefault(); const v = id => $(id, w).value.trim(), err = x => { const el = $('#ar-err', w); el.textContent = x; el.hidden = false; };
      const sel = $$('input[name=ar]:checked', w).map(c => c.value), ext = v('#ar-ext').split(/\r?\n/).map(s => s.trim()).filter(Boolean), title = v('#ar-t'), cert = $('#ar-cert', w).checked, ann = $('#ar-ann', w).checked;
      if (!title) return err('กรอกชื่อรายการ'); if (!sel.length && !ext.length) return err('เลือกผู้รับอย่างน้อย 1 คน'); if (!cert && !ann) return err('เลือกอย่างน้อยหนึ่งอย่าง: ประกาศ หรือ เกียรติบัตร');
      const rcps = sel.map(s => ({ sid: s, name: A.fullName(ms[s]), cls: A.cls(ms[s]) })).concat(ext.map(n => ({ name: n }))), now = Date.now(), date = v('#ar-date') || A.todayISO(), detail = v('#ar-d') || null, upd = {}, list = [], btn = $('button.grow:not(.ghost)', w);
      const signers = [{ name: v('#s1n'), pos: v('#s1p'), sk: ($('#s1s', w) && $('#s1s', w).checked) ? A.mySigKey() : null }, { name: v('#s2n'), pos: v('#s2p') }].filter(s => s.name || s.pos);
      let first = 0;
      if (cert) {
        if (A.STATUS.online === false) return err('ต้องออนไลน์จึงจะออกเลขที่เกียรติบัตรได้ (เพื่อไม่ให้เลขที่ซ้ำ)');
        btn.disabled = true;
        try { const last = await B.tx(Y() + '/certno', c => (c || 0) + rcps.length); first = last - rcps.length + 1; } catch (er) { btn.disabled = false; return err('ออกเลขที่ไม่สำเร็จ: ' + A.errTH(er)); }
      }
      const awId = B.uid();
      if (ann) { const r = {}; sel.forEach(s => { r[s] = A.fullName(ms[s]); }); upd['awards/' + awId] = { title, body: detail, rcp: sel.length ? r : null, ext: ext.length ? ext : null, pinned: $('#ar-pin', w).checked || null, at: now, by: A.myName(), y: A.year(), cert: cert || null }; }
      if (cert) rcps.forEach((p, i) => { const id = B.uid() + i, rec = { no: 'ก.' + String(first + i).padStart(3, '0') + '/' + A.year(), name: p.name, cls: p.cls || null, sid: p.sid || null, title, detail, date, signers, club: C.club.id, y: A.year(), status: 'ok', at: now, by: A.myName(), awardId: ann ? awId : null };
        upd['certs/' + id] = rec; if (p.sid) upd['certidx/' + p.sid + '/' + id] = rec; list.push(Object.assign({ id }, rec)); });
      A.W(B.update('', JSON.parse(JSON.stringify(upd)))); { const to = rcps.map(p => p.sid).filter(Boolean); if (to.length) window.PUSH && PUSH.notify('cert', { to, title: cert ? 'คุณได้รับเกียรติบัตร' : 'คุณได้รับการยกย่อง', body: title, url: '#/honor' }); } A.log('award.give', '', title + ' · ' + rcps.length + ' คน'); w.remove(); toast('บันทึกแล้ว' + (cert ? ' ออกเกียรติบัตร ' + list.length + ' ใบ' : ''));
      if (cert) openCerts(list);
    });
  }

  /* ============ ทะเบียนเกียรติบัตร (แอดมิน) ============ */
  const CR = { q: '', y: 'cur', st: '' };
  const crFiltered = () => { const q = CR.q.trim().toLowerCase(); return certList().filter(c => (CR.y === 'all' || c.y === (CR.y === 'cur' ? A.year() : CR.y)) && (!CR.st || (CR.st === 'void') === (c.status === 'void')) && (!q || (c.name + ' ' + c.no + ' ' + c.title + ' ' + (c.cls || '')).toLowerCase().includes(q))); };
  const crList = () => { const l = crFiltered(); return (l.map(c => '<button class="txr" data-act="certOpen" data-id="' + esc(c.id) + '"><span class="grow"><b>' + esc(c.name) + (c.cls ? ' (' + esc(c.cls) + ')' : '') + '</b><span class="muted">' + esc(c.title + ' · เลขที่ ' + c.no + ' · ' + A.dTH(c.date, 'short')) + '</span></span>' + chip(c.status === 'void' ? 'ยกเลิก' : 'ใช้ได้', c.status === 'void' ? 'bad' : 'ok') + '</button>').join('') || '<div class="empty">ไม่พบเกียรติบัตร</div>') + '<div class="muted" style="padding:10px 0 2px">แสดง ' + l.length + ' จาก ' + certList().length + ' ใบ</div>'; };
  A.V.certs = function () {
    if (!T()) { location.hash = '#/home'; return null; }
    const all = certList(), yrs = Array.from(new Set(all.map(c => c.y).concat([A.year()]))).sort().reverse(), cy = all.filter(c => c.y === A.year());
    let b = '<section class="card"><div class="lb">ทะเบียนเกียรติบัตร' + esc(C.club.name) + '</div><div class="stat4"><div><b>' + cy.filter(c => c.status !== 'void').length + '</b><span>ใช้ได้ ปีนี้</span></div><div><b class="bad">' + cy.filter(c => c.status === 'void').length + '</b><span>ยกเลิก ปีนี้</span></div><div><b>' + all.length + '</b><span>ทั้งหมด</span></div><div><b>' + new Set(all.map(c => c.sid || c.name)).size + '</b><span>ผู้รับ</span></div></div>' +
      '<div class="row wrap" style="margin-top:12px"><button class="btn gold" data-act="awNew">' + ic('plus', 18) + 'ออกเกียรติบัตรใหม่</button><button class="btn ghost" data-act="certExport">' + ic('down', 18) + 'ส่งออกทะเบียน</button></div></section>' +
      '<section class="card"><div class="filters"><input id="cq" class="in" type="search" placeholder="ค้นหาชื่อ เลขที่ รายการ" value="' + esc(CR.q) + '" aria-label="ค้นหาเกียรติบัตร"><select class="in sm" data-cr="y" aria-label="ปี">' + opt([['cur', 'ปี ' + A.year()], ['all', 'ทุกปี']].concat(yrs.filter(y => y !== A.year()).map(y => [y, 'ปี ' + y])), CR.y) + '</select><select class="in sm" data-cr="st" aria-label="สถานะ">' + opt([['', 'ทุกสถานะ'], ['ok', 'ใช้ได้'], ['void', 'ยกเลิก']], CR.st) + '</select></div><div id="clist">' + crList() + '</div></section>';
    return { title: 'ทะเบียนเกียรติบัตร', body: b };
  };
  document.addEventListener('input', e => { if (e.target.id === 'cq') { CR.q = e.target.value; const l = $('#clist'); if (l) l.innerHTML = crList(); } });
  document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.cr; if (k) { CR[k] = e.target.value; const l = $('#clist'); if (l) l.innerHTML = crList(); } });

  /* ============ การทำงานของปุ่ม ============ */
  Object.assign(A.ACT, {
    awNew: d => { if (T()) awForm(d && d.sid); },
    awPin: d => { if (T()) A.W(B.update('awards/' + d.id, { pinned: (A.D.awards[d.id] || {}).pinned ? null : true })); },
    awDel: async d => { if (!T()) return; if (!(await M.confirmBox('ลบประกาศยกย่อง', 'ประกาศจะหายจากหน้าหลัก เกียรติบัตรที่ออกแล้วยังอยู่ในทะเบียน', 'ลบ', true))) return; A.W(B.remove('awards/' + d.id)); },
    certOpen: d => { const c = findCert(d.id); if (c) openCerts([c]); },
    certExport: () => {
      const l = crFiltered().slice().reverse(), head = ['เลขที่', 'วันที่', 'ผู้รับ', 'รายการ', 'ผู้บันทึก', 'สถานะ'], rows = l.map(c => [c.no, A.dTH(c.date, 'short'), c.name + (c.cls ? ' (' + c.cls + ')' : ''), c.title, c.by || '', c.status === 'void' ? 'ยกเลิก' : 'ใช้ได้']);
      const sub = C.club.full + ' · ' + (CR.y === 'all' ? 'ทุกปี' : 'ปี ' + (CR.y === 'cur' ? A.year() : CR.y)), name = 'ทะเบียนเกียรติบัตร-' + M.safeName(C.club.name) + '-' + (CR.y === 'cur' ? A.year() : CR.y);
      const w = modal('<h3>ส่งออกทะเบียนเกียรติบัตร</h3><div class="xlist"><button class="xbtn" data-x="pdf"><b>PDF</b><span>สำหรับพิมพ์หรือรายงาน</span></button><button class="xbtn" data-x="docx"><b>DOCX</b><span>เปิดแก้ต่อใน Word</span></button></div><div class="muted" id="x-msg" style="margin-top:10px"></div><button class="btn ghost block" data-close style="margin-top:12px">ปิด</button>', { center: true });
      w.addEventListener('click', async e => { const b = e.target.closest('[data-x]'); if (!b) return; const msg = $('#x-msg', w); msg.textContent = 'กำลังสร้างไฟล์ …';
        try { if (b.dataset.x === 'docx') await M.saveBlob(M.docxTable({ title: 'ทะเบียนเกียรติบัตร ' + C.club.name, lines: [sub.replace(/ · /g, ' ')], head, rows, widths: [14, 11, 24, 29, 12, 10], align: ['center', 'center', 'left', 'left', 'left', 'center'], footer: ['', 'ข้อมูล ณ วันที่ ' + M.thDate(Date.now())] }), name + '.docx');
          else await M.exportPDF(A.tablePages('ทะเบียนเกียรติบัตร', sub, head, rows, { widths: [14, 11, 24, 29, 12, 10], align: ['c', 'c', '', '', '', 'c'], foot: 'ข้อมูล ณ ' + M.thDate(Date.now()) + ' ·' }), name + '.pdf'); msg.textContent = 'เสร็จแล้ว'; } catch (er) { msg.textContent = 'ส่งออกไม่สำเร็จ: ' + (er.message || er); } });
    }
  });
})();
