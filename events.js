/* ============================================================
   events.js — กิจกรรม/นัดหมาย · ปฏิทิน · ประกาศ (รับทราบรายคน) · ระบบจัดวง (ยกจากระบบเครือข่ายรุ่น 3.5 ตัดแบบ วก.12 ออก)
   ข้อมูล: y/{ปี}/events · announce · acks/{sid}/{aid} · bands · config/school (ผู้ลงนามเอกสาร)
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP;
  const { $, $$, esc, toast, modal, thNum } = M; const { ic, chip, fld, opt, avatar } = A;
  const Y = () => 'y/' + A.year();
  const KINDS = [['rite', 'พิธีไหว้ครู / ครอบครู'], ['perform', 'บรรเลง / แสดง'], ['activity', 'กิจกรรม / โครงการ'], ['class', 'ต่อเพลง / อบรม'], ['meet', 'ประชุม'], ['appoint', 'นัดหมาย / นัดซ้อม']];
  const kindName = k => (KINDS.find(x => x[0] === k) || ['', ''])[1];
  const canEvent = () => A.teacher() || A.is('president', 'vice', 'secretary', 'host');
  const canPost = () => A.teacher() || !!A.ME.role;
  const canForm = () => false;
  const EV = { tab: 'up', month: A.todayISO().slice(0, 7) };
  A.EVHOOKS = [];
  let F12SIG = false; const sigTag = () => { const g = A.mySigRec && A.mySigRec(); return g && F12SIG ? '<img class="f-sig" src="' + g.img + '" alt="">' : ''; };   /* โมดูลอื่นเพิ่มการ์ดในหน้ากิจกรรม (เช่น ใบขออนุญาตผู้ปกครอง) */

  A.SUBS.push(
    { key: 'events', path: y => 'y/' + y + '/events' },
    { key: 'announce', path: y => 'y/' + y + '/announce' },
    { key: 'bands', path: y => 'y/' + y + '/bands' },
    { key: 'acks', path: y => canPost() ? 'y/' + y + '/acks' : 'y/' + y + '/acks/' + A.sid(), norm: v => canPost() ? v : { [A.sid()]: v } }
  );
  A.NAVS.push({ id: 'events', label: 'กิจกรรม', icon: 'cal', tab: 1, order: 30, match: ['ev'], badge: () => unacked().length },
    { id: 'bands', label: 'จัดวง', icon: 'band', order: 35, match: ['band'] });

  const events = () => A.D.events || {};
  const evList = () => Object.keys(events()).map(id => Object.assign({ id }, events()[id])).filter(e => e.title).sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
  const evEnd = e => e.dateEnd && e.dateEnd > e.date ? e.dateEnd : e.date;
  const upcoming = () => evList().filter(e => e.status !== 'cancelled' && evEnd(e) >= A.todayISO());
  const people = e => Object.keys(e.people || {}).filter(s => A.members()[s]).sort(A.byClass);
  const timeTxt = e => e.start ? e.start.replace(':', '.') + (e.end ? '–' + e.end.replace(':', '.') : '') + ' น.' : '';
  const dateTxt = (e, mode) => A.dTH(e.date, mode || 'short') + (e.dateEnd && e.dateEnd > e.date ? ' – ' + A.dTH(e.dateEnd, mode || 'short') : '');
  function evCard(e) {
    const p = e.date.split('-'), mine = A.sid() && (e.people || {})[A.sid()], past = evEnd(e) < A.todayISO();
    return '<a class="evc' + (past ? ' past' : '') + '" href="#/ev/' + esc(e.id) + '"><span class="evd"><b>' + (+p[2]) + '</b><i>' + M.MONTHS[+p[1] - 1] + '</i></span><span class="grow"><b>' + esc(e.title) + '</b><span class="muted">' + esc([dateTxt(e), timeTxt(e), e.place].filter(Boolean).join(' · ')) + '</span>' +
      '<span class="row wrap" style="gap:6px;margin-top:4px">' + chip(kindName(e.kind), 'plum') + (e.status === 'cancelled' ? chip('ยกเลิก', 'bad') : '') + (mine ? chip('คุณเข้าร่วม', 'gold') : '') + (!past && e.status !== 'cancelled' && Math.round((new Date(e.date + 'T00:00:00') - new Date(A.todayISO() + 'T00:00:00')) / 864e5) <= 3 ? chip(Math.round((new Date(e.date + 'T00:00:00') - new Date(A.todayISO() + 'T00:00:00')) / 864e5) <= 0 ? 'วันนี้' : 'ใกล้ถึงแล้ว', 'hot') : '') + (people(e).length ? chip(people(e).length + ' คน', 'line') : '') + '</span></span></a>';
  }

  /* ---------- ประกาศ ---------- */
  const annList = () => Object.keys(A.D.announce || {}).map(id => Object.assign({ id }, A.D.announce[id])).filter(a => a.title).sort((a, b) => b.at - a.at);
  const annForMe = a => A.teacher() || !a.grade || +a.grade === +(A.members()[A.sid()] || {}).grade || (a.by && a.by.id === A.sid());
  const acked = (aid, sid) => !!((A.D.acks || {})[sid] || {})[aid];
  const unacked = () => A.teacher() ? [] : annList().filter(a => annForMe(a) && !acked(a.id, A.sid()) && (a.by || {}).id !== A.sid());
  const annTargets = a => A.activeSids().filter(s => !a.grade || +A.members()[s].grade === +a.grade);
  function annCard(a) {
    const mine = A.teacher() || (a.by || {}).id === A.sid(); const t = annTargets(a), n = t.filter(s => acked(a.id, s)).length;
    return '<div class="li"><div class="row"><b class="grow">' + esc(a.title) + '</b>' + '' + '</div>' + (a.body ? '<div style="white-space:pre-line;margin:4px 0">' + esc(a.body) + '</div>' : '') +
      '<div class="muted">' + esc((a.by || {}).name || '') + ' · ' + esc(M.thDate(a.at)) + '</div><div class="row wrap" style="margin-top:8px">' +
      (!A.teacher() && (a.by || {}).id !== A.sid() ? (acked(a.id, A.sid()) ? chip('รับทราบแล้ว', 'ok') : '<button class="btn sm" data-act="annAck" data-id="' + esc(a.id) + '">รับทราบ</button>') : '') +
      (canPost() ? '<button class="btn ghost sm" data-act="annWho" data-id="' + esc(a.id) + '">รับทราบ ' + n + '/' + t.length + '</button>' : '') +
      (mine ? '<button class="btn ghost sm danger" data-act="annDel" data-id="' + esc(a.id) + '">ลบ</button>' : '') + '</div></div>';
  }

  /* ============ หน้า กิจกรรม ============ */
  function calHTML() {
    const [yy, mm] = EV.month.split('-').map(Number); const first = new Date(yy, mm - 1, 1), days = new Date(yy, mm, 0).getDate(), pad = first.getDay(), t = A.todayISO();
    const by = {}; evList().filter(e => e.status !== 'cancelled').forEach(e => { let d = e.date; const end = evEnd(e); let g = 0; while (d <= end && g++ < 40) { (by[d] = by[d] || []).push(e); const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + 1); d = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); } });
    let h = '<div class="row" style="margin-bottom:10px"><button class="icb" data-act="calNav" data-d="-1" aria-label="เดือนก่อนหน้า">' + ic('left') + '</button><b class="grow" style="text-align:center">' + A.MONTHS_F[mm - 1] + ' ' + (yy + 543) + '</b><button class="icb" data-act="calNav" data-d="1" aria-label="เดือนถัดไป">' + ic('right') + '</button></div><div class="cal">' + ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => '<div class="cal-h">' + d + '</div>').join('');
    for (let i = 0; i < pad; i++) h += '<div></div>';
    for (let d = 1; d <= days; d++) { const iso = EV.month + '-' + String(d).padStart(2, '0'); const l = by[iso] || []; h += '<div class="cal-d' + (iso === t ? ' today' : '') + (l.length ? ' has' : '') + '"><span>' + d + '</span>' + (l.length ? '<i aria-label="' + l.length + ' กิจกรรม">' + l.length + '</i>' : '') + '</div>'; }
    const inMonth = evList().filter(e => e.date.slice(0, 7) <= EV.month && evEnd(e).slice(0, 7) >= EV.month);
    return h + '</div><div style="margin-top:12px">' + (inMonth.map(evCard).join('') || '<div class="empty">ไม่มีกิจกรรมในเดือนนี้</div>') + '</div>';
  }
  A.V.events = function () {
    const tabs = [['up', 'กำลังจะมาถึง'], ['cal', 'ปฏิทิน'], ['year', 'ทั้งปี'], ['news', 'ประกาศ' + (unacked().length ? ' (' + unacked().length + ')' : '')]];
    let b = '<div class="row wrap" style="margin-bottom:14px">' + (canEvent() ? '<button class="btn" data-act="evNew">' + ic('plus', 18) + 'สร้างกิจกรรม / นัดหมาย</button>' : '') + (canPost() ? '<button class="btn ghost" data-act="annNew">' + ic('plus', 18) + 'ประกาศงาน</button>' : '') + '</div>' +
      '<div class="tabs" role="tablist">' + tabs.map(t => '<button role="tab" aria-selected="' + (EV.tab === t[0]) + '" class="' + (EV.tab === t[0] ? 'on' : '') + '" data-act="evTab" data-t="' + t[0] + '">' + esc(t[1]) + '</button>').join('') + '</div><section class="card">';
    if (EV.tab === 'up') b += upcoming().map(evCard).join('') || '<div class="empty">ยังไม่มีกิจกรรมที่กำลังจะมาถึง</div>';
    else if (EV.tab === 'cal') b += calHTML();
    else if (EV.tab === 'year') { const l = evList(); let cur = ''; b += '<div class="lb">กิจกรรมและโครงการในปี ' + esc(A.year()) + ' (' + l.length + ' รายการ)</div>' + (l.map(e => { const mo = e.date.slice(0, 7); const hd = mo !== cur ? '<div class="mo-h">' + A.MONTHS_F[+mo.slice(5) - 1] + ' ' + (+mo.slice(0, 4) + 543) + '</div>' : ''; cur = mo; return hd + evCard(e); }).join('') || '<div class="empty">ยังไม่มีกิจกรรม</div>'); }
    else b += annList().filter(annForMe).map(annCard).join('') || '<div class="empty">ยังไม่มีประกาศ</div>';
    return { title: 'กิจกรรมและปฏิทิน', body: b + '</section>' };
  };
  A.V.ev = function (eid) {
    const e0 = events()[eid]; if (!e0) return { title: 'กิจกรรม', body: '<div class="empty">กำลังโหลด หรือไม่พบกิจกรรมนี้</div>', back: '#/events' }; const e = Object.assign({ id: eid }, e0); const ps = people(e);
    const kv = (k, v) => v ? '<div class="kv"><span>' + k + '</span><b>' + esc(v) + '</b></div>' : '';
    let b = '<section class="card hero"><div class="hero-name">' + esc(e.title) + '</div><div class="hero-sub">' + esc([dateTxt(e, 'dow'), timeTxt(e)].filter(Boolean).join(' · ')) + '</div><div class="row wrap" style="margin-top:10px;gap:8px">' + chip(kindName(e.kind), 'gold') + (e.status === 'cancelled' ? chip('ยกเลิกแล้ว', 'bad') : '') + '</div></section>';
    if (canEvent()) b += '<div class="row wrap" style="margin-bottom:14px"><button class="btn" data-act="evEdit" data-id="' + esc(eid) + '">' + ic('edit', 18) + 'แก้ไข</button>' + 
      (A.teacher() ? '<button class="btn ghost" data-act="bandNew" data-eid="' + esc(eid) + '">' + ic('band', 18) + 'จัดวงสำหรับงานนี้</button>' : '') + '<button class="btn ghost danger" data-act="evCancel" data-id="' + esc(eid) + '">' + (e.status === 'cancelled' ? 'เปิดกิจกรรมอีกครั้ง' : 'ยกเลิกกิจกรรม') + '</button></div>';
    b += '<section class="card"><div class="lb">รายละเอียด</div>' + kv('สถานที่', e.place) + kv('วัตถุประสงค์ / เพื่อ', e.purpose) + kv('หมายเหตุ', e.note) + kv('ผู้สร้าง', (e.createdBy || {}).name) + '</section>';
    const bands = Object.keys(A.D.bands || {}).filter(k => A.D.bands[k].eid === eid);
    if (bands.length) b += '<section class="card"><div class="lb">ผังวงของงานนี้</div>' + bands.map(k => '<a class="evc" href="#/band/' + esc(k) + '">' + ic('band', 26) + '<span class="grow"><b>' + esc(A.D.bands[k].name) + '</b><span class="muted">' + Object.keys(A.D.bands[k].seats || {}).length + ' ตำแหน่ง</span></span></a>').join('') + '</section>';
    A.EVHOOKS.forEach(f => { try { b += f(e, ps) || ''; } catch (er) { console.error(er); } });
    b += '<section class="card"><div class="lb">ผู้เข้าร่วม ' + ps.length + ' คน</div>' + (ps.map(s => { const m = A.members()[s]; return '<div class="mrow"><a class="mrow-main" href="#/m/' + esc(s) + '">' + avatar(m) + '<span class="grow"><b>' + esc(A.fullName(m)) + '</b><span class="muted">' + esc(A.cls(m) + (A.insts(m).length ? ' · ' + A.insts(m).join(', ') : '')) + '</span></span></a></div>'; }).join('') || '<div class="muted">ยังไม่ได้เลือกผู้เข้าร่วม</div>') + '</section>';
    return { title: 'กิจกรรม', body: b, back: '#/events' };
  };
  const dayDiff = iso => Math.round((new Date(iso + 'T00:00:00') - new Date(A.todayISO() + 'T00:00:00')) / 864e5);
  const soonTxt = n => n <= 0 ? 'วันนี้' : n === 1 ? 'พรุ่งนี้' : 'อีก ' + n + ' วัน';
  A.TODO.push(() => {
    const o = [], sid = A.sid(), un = unacked();
    if (un.length) o.push({ n: un.length, label: 'ประกาศที่ยังไม่ได้กดรับทราบ', sub: un[0].title, href: '#/events', hot: true });
    upcoming().filter(e => dayDiff(e.date) <= 3 && (!sid || !e.people || e.people[sid])).slice(0, 4).forEach(e => { const n = dayDiff(e.date); o.push({ badge: soonTxt(n), label: e.title, sub: [timeTxt(e), e.place].filter(Boolean).join(' · '), href: '#/ev/' + e.id, hot: n <= 1 }); });
    return o;
  });
  A.HOME.push({ order: 30, html: () => {
    const up = upcoming().slice(0, 2), un = unacked();
    return (un.length ? '<section class="card hl"><div class="lb">ประกาศที่ยังไม่ได้รับทราบ (' + un.length + ')</div>' + un.slice(0, 3).map(annCard).join('') + '</section>' : '') +
      '<section class="card"><div class="row"><div class="lb grow" style="margin:0 0 8px">กำลังจะมาถึง</div><a href="#/events" class="muted">ดูทั้งหมด</a></div>' + (up.map(evCard).join('') || '<div class="muted">ยังไม่มีกิจกรรมที่กำลังจะมาถึง</div>') + '</section>';
  } });

  /* ---------- ฟอร์มกิจกรรม ---------- */
  function pickPeople(sel) {
    const ms = A.members();
    return '<div class="fld"><span>ผู้เข้าร่วม</span><div class="row wrap" style="margin-bottom:8px">' + [['all', 'ทั้งหมด'], ['none', 'ล้าง']].map(x => '<button type="button" class="btn ghost sm" data-pick="' + x[0] + '">' + x[1] + '</button>').join('') + '<span class="muted" id="p-n"></span></div><div class="plist">' +
      A.activeSids().sort(A.byClass).map(s => '<label class="ck wide"><input type="checkbox" name="pp" value="' + esc(s) + '"' + (sel[s] ? ' checked' : '') + '><span>' + esc(A.fullName(ms[s])) + ' <small class="muted">' + esc(A.cls(ms[s]) + (A.insts(ms[s]).length ? ' · ' + A.insts(ms[s]).join(', ') : '')) + '</small></span></label>').join('') + '</div></div>';
  }
  function wirePick(w) {
    const cnt = () => { const n = $('#p-n', w); if (n) n.textContent = 'เลือก ' + $$('input[name=pp]:checked', w).length + ' คน'; }; cnt();
    w.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b) return; const k = b.dataset.pick; $$('input[name=pp]', w).forEach(c => { c.checked = k === 'all'; }); cnt(); });
    w.addEventListener('change', e => { if (e.target.name === 'pp') cnt(); });
  }
  function evForm(eid) {
    const e = eid ? events()[eid] : { kind: 'perform', date: A.todayISO(), people: {} };
    const w = modal('<h3>' + (eid ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรม / นัดหมาย') + '</h3><form class="form">' + fld('ชื่อกิจกรรม', '<input class="in" id="e-title" value="' + esc(e.title || '') + '" required>') +
      '<div class="g3">' + fld('ประเภท', '<select class="in" id="e-kind">' + opt(KINDS, e.kind) + '</select>') + fld('วันที่', '<input class="in" type="date" id="e-date" value="' + esc(e.date || '') + '" required>') + fld('ถึงวันที่ (ถ้าหลายวัน)', '<input class="in" type="date" id="e-end" value="' + esc(e.dateEnd || '') + '">') + '</div>' +
      '<div class="g3">' + fld('เวลาเริ่ม', '<input class="in" type="time" id="e-start" value="' + esc(e.start || '') + '">') + fld('เวลาสิ้นสุด', '<input class="in" type="time" id="e-stop" value="' + esc(e.end || '') + '">') + '</div>' +
      fld('สถานที่', '<input class="in" id="e-place" value="' + esc(e.place || '') + '">') + fld('วัตถุประสงค์', '<input class="in" id="e-purpose" value="' + esc(e.purpose || '') + '" placeholder="เช่น ศิษย์ทุกท่านร่วมพิธีไหว้ครูประจำปี">') + fld('หมายเหตุ', '<textarea class="in" id="e-note" rows="2">' + esc(e.note || '') + '</textarea>') +
      pickPeople(e.people || {}) + '<div class="note bad" id="e-err" hidden></div><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { sticky: true, wide: true });
    wirePick(w);
    $('form', w).addEventListener('submit', x => {
      x.preventDefault(); const v = id => $(id, w).value.trim(); const err = t => { const el = $('#e-err', w); el.textContent = t; el.hidden = false; };
      if (!v('#e-title') || !v('#e-date')) return err('กรอกชื่อกิจกรรมและวันที่'); if (v('#e-end') && v('#e-end') < v('#e-date')) return err('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');
      const pp = {}; $$('input[name=pp]:checked', w).forEach(c => pp[c.value] = true);
      const rec = { title: v('#e-title'), kind: v('#e-kind'), date: v('#e-date'), dateEnd: v('#e-end') || null, start: v('#e-start') || null, end: v('#e-stop') || null, place: v('#e-place') || null, purpose: v('#e-purpose') || null, note: v('#e-note') || null, people: Object.keys(pp).length ? pp : null, updatedAt: Date.now(), updatedBy: A.by() };
      if (eid) A.W(B.update(Y() + '/events/' + eid, rec)); else { const id = B.uid(); A.W(B.set(Y() + '/events/' + id, Object.assign({ status: 'on', createdAt: Date.now(), createdBy: A.by() }, JSON.parse(JSON.stringify(rec))))); window.PUSH && PUSH.notify('ev', { title: 'กิจกรรมใหม่: ' + rec.title, body: A.dTH(rec.date, 'short') + (rec.start ? ' เวลา ' + rec.start : '') + (rec.place ? ' ณ ' + rec.place : ''), url: '#/ev/' + id, to: rec.people ? Object.keys(rec.people) : null }); location.hash = '#/ev/' + id; }
      A.log(eid ? 'event.edit' : 'event.add', '', rec.title); w.remove(); toast('บันทึกแล้ว');
    });
  }

  /* ============ ผู้ลงนามเอกสาร (ใช้ในเกียรติบัตร/รายงาน) ============ */
  const school = () => Object.assign({ teacher: (A.advisors().find(a => a.kind === 'teacher') || {}).name || '', position: 'ครูผู้ถ่ายทอด', dept: '', deputy: '', director: '' }, A.cfg().school || {});
  /* ============ ระบบจัดวง ============ */
  const BTYPES = ['วงปี่พาทย์', 'วงเครื่องสาย', 'วงมโหรี', 'วงกลองหลวง / พื้นเมือง', 'วงผสม / อื่น ๆ'];
  const ROWN = ['', 'แถวหน้า', 'แถวที่ 2', 'แถวที่ 3', 'แถวที่ 4', 'แถวหลัง'];
  /* แถวเริ่มต้นตามชนิดเครื่อง — เป็นค่าเบื้องต้นให้แอดมินปรับตามรูปแบบวงจริง */
  const guessRow = i => /ซอ|จะเข้|ขิม|ขับร้อง|ขลุ่ย/.test(i) ? 1 : /ระนาด|ปี่/.test(i) ? 2 : /ฆ้อง/.test(i) ? 3 : 4;
  const bands = () => A.D.bands || {};
  const seatsOf = b => Object.keys(b.seats || {}).map(id => Object.assign({ id }, b.seats[id])).sort((x, y) => x.row - y.row || x.ord - y.ord);
  const seatName = s => s.sid && A.members()[s.sid] ? A.members()[s.sid].first : (s.name || '');
  function plotHTML(b, big) {
    const st = seatsOf(b); let h = '<div class="plot' + (big ? ' big' : '') + '"><div class="plot-lab">ด้านหลังเวที</div>';
    for (let r = 5; r >= 1; r--) { const l = st.filter(s => s.row === r); if (!l.length) continue; h += '<div class="plot-row">' + l.map(s => '<div class="seat"><b>' + esc(s.inst) + '</b><span>' + esc(seatName(s)) + '</span></div>').join('') + '</div>'; }
    return h + (st.length ? '' : '<div class="empty">ยังไม่มีผู้บรรเลง</div>') + '<div class="plot-lab front">ผู้ชม / ด้านหน้าเวที</div></div>';
  }
  const bandInfo = b => [b.title, b.place, b.date ? A.dTH(b.date, 'dow') : '', b.time ? 'เวลา ' + b.time : ''].filter(Boolean).join(' · ');
  A.V.bands = function () {
    const l = Object.keys(bands()).map(id => Object.assign({ id }, bands()[id])).filter(b => b.name).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.updatedAt - a.updatedAt);
    let b = A.teacher() ? '<div class="row wrap" style="margin-bottom:14px"><button class="btn" data-act="bandNew">' + ic('plus', 18) + 'จัดวงใหม่</button></div>' : '';
    b += '<section class="card"><div class="lb">ผังวงที่จัดไว้ (' + l.length + ')</div>' + (l.map(x => { const mine = A.sid() && seatsOf(x).some(s => s.sid === A.sid());
      return '<a class="evc" href="#/band/' + esc(x.id) + '">' + ic('band', 28) + '<span class="grow"><b>' + esc(x.name) + '</b><span class="muted">' + esc([x.type, bandInfo(x)].filter(Boolean).join(' · ')) + '</span><span class="row wrap" style="gap:6px;margin-top:4px">' + chip(seatsOf(x).length + ' ตำแหน่ง', 'line') + (mine ? chip('คุณอยู่ในวงนี้', 'gold') : '') + '</span></span></a>'; }).join('') || '<div class="empty">ยังไม่มีผังวง' + (A.teacher() ? ' — กด “จัดวงใหม่” เพื่อเริ่ม' : '') + '</div>') + '</section>';
    return { title: 'จัดวง', body: b };
  };
  /* ---------- หน้าผังวง: แอดมินแตะที่นั่งเพื่อเลือก แล้วแตะที่นั่งอื่นเพื่อสลับ หรือแตะปุ่มท้ายแถวเพื่อย้าย/เพิ่ม ---------- */
  const BS = { bid: '', seat: '' };
  const seatWho = s => s.sid && A.members()[s.sid] ? A.fullName(A.members()[s.sid]) : (s.name || '');
  function editPlot(bid, b) {
    const st = seatsOf(b), sel = BS.bid === bid ? BS.seat : ''; let h = '<div class="plot edit"><div class="plot-lab">ด้านหลังเวที</div>';
    for (let r = 5; r >= 1; r--) h += '<div class="plot-row"><span class="plot-rn">' + ROWN[r] + '</span>' + st.filter(s => s.row === r).map(s => '<button class="seat' + (sel === s.id ? ' sel' : '') + '" data-act="seatTap" data-id="' + esc(bid) + '" data-s="' + esc(s.id) + '" aria-pressed="' + (sel === s.id) + '"><b>' + esc(s.inst) + '</b><span>' + esc(seatName(s)) + '</span></button>').join('') +
      '<button class="seat add" data-act="rowTap" data-id="' + esc(bid) + '" data-r="' + r + '">' + (sel ? 'ย้ายมา' + ROWN[r] : '+ เพิ่ม') + '</button></div>';
    return h + '<div class="plot-lab front">ผู้ชม / ด้านหน้าเวที</div></div>';
  }
  A.V.band = function (bid) {
    const b = bands()[bid]; if (!b) return { title: 'ผังวง', body: '<div class="empty">กำลังโหลด หรือไม่พบผังวงนี้</div>', back: '#/bands' }; const st = seatsOf(b), T = A.teacher();
    const sel = T && BS.bid === bid ? st.find(s => s.id === BS.seat) : null;
    let h = '<section class="card hero"><div class="hero-name">' + esc(b.name) + '</div><div class="hero-sub">' + esc([b.type, bandInfo(b)].filter(Boolean).join(' · ')) + '</div>' + (b.note ? '<div class="hero-sub" style="margin-top:6px">' + esc(b.note) + '</div>' : '') + '</section>' +
      '<div class="row wrap" style="margin-bottom:14px">' + (T ? '<button class="btn" data-act="seatAdd" data-id="' + esc(bid) + '">' + ic('plus', 18) + 'เพิ่มผู้บรรเลง</button><button class="btn ghost" data-act="bandEdit" data-id="' + esc(bid) + '">' + ic('edit', 18) + 'รายละเอียดงาน</button>' : '') +
      '<button class="btn ghost" data-act="bandExport" data-id="' + esc(bid) + '">' + ic('down', 18) + 'ส่งออกเป็นภาพ</button>' + (T ? '<button class="btn ghost danger" data-act="bandDel" data-id="' + esc(bid) + '">ลบผังวง</button>' : '') + '</div>';
    if (T) {
      h += '<section class="card"><div class="lb">ผังวง — แตะที่นั่งเพื่อเลือก แล้วแตะที่นั่งอื่นเพื่อสลับที่ หรือแตะปุ่มท้ายแถวเพื่อย้าย</div>' + editPlot(bid, b);
      if (sel) h += '<div class="selbar"><div class="grow"><b>' + esc(sel.inst) + '</b> · ' + esc(seatWho(sel)) + '<div class="muted">' + ROWN[sel.row] + '</div></div><select class="in sm" data-seatinst="' + esc(sel.id) + '" data-id="' + esc(bid) + '" aria-label="เปลี่ยนเครื่องดนตรี">' + opt((A.instList().includes(sel.inst) ? [] : [[sel.inst, sel.inst]]).concat(A.instList().map(i => [i, i])), sel.inst) + '</select>' +
        '<button class="btn ghost sm danger" data-act="seatDel" data-id="' + esc(bid) + '" data-s="' + esc(sel.id) + '">นำออกจากวง</button><button class="btn ghost sm" data-act="seatCancel">ยกเลิกการเลือก</button></div>';
      h += '</section>';
    } else h += '<section class="card"><div class="lb">ผังวง</div>' + plotHTML(b) + '</section>';
    h += '<section class="card"><div class="lb">รายชื่อผู้บรรเลง (' + st.length + ')</div>' + (st.map(s => '<div class="kv"><span>' + esc(s.inst) + '</span><b>' + esc(seatWho(s)) + '</b></div>').join('') || '<div class="muted">ยังไม่มีผู้บรรเลง' + (T ? ' — กด “เพิ่มผู้บรรเลง”' : '') + '</div>') + '</section>';
    return { title: 'ผังวง', body: h, back: '#/bands' };
  };
  function bandForm(bid, eid) {
    const ev = eid ? events()[eid] : null; const b = bid ? bands()[bid] : { name: ev ? 'วงสำหรับ' + ev.title : '', type: BTYPES[0], eid: eid || '', title: ev ? ev.title : '', place: ev ? ev.place : '', date: ev ? ev.date : '', time: ev ? timeTxt(Object.assign({}, ev)) : '' };
    const w = modal('<h3>' + (bid ? 'รายละเอียดงาน' : 'จัดวงใหม่') + '</h3><form class="form">' + fld('ชื่อวง / ชุดการบรรเลง', '<input class="in" id="b-name" value="' + esc(b.name || '') + '" required>') +
      '<div class="g3">' + fld('รูปแบบวง', '<select class="in" id="b-type">' + opt(BTYPES.map(x => [x, x]), b.type) + '</select>') + fld('ผูกกับกิจกรรม', '<select class="in" id="b-eid">' + opt([['', '— ไม่ผูก —']].concat(evList().filter(e => e.status !== 'cancelled').map(e => [e.id, A.dTH(e.date, 'short') + ' ' + e.title])), b.eid || '') + '</select>', 'เลือกแล้วระบบเติมรายละเอียดด้านล่างให้') + '</div>' +
      fld('กิจกรรม / งาน', '<input class="in" id="b-title" value="' + esc(b.title || '') + '">') + fld('สถานที่', '<input class="in" id="b-place" value="' + esc(b.place || '') + '">') +
      '<div class="g3">' + fld('วันที่', '<input class="in" type="date" id="b-date" value="' + esc(b.date || '') + '">') + fld('เวลา', '<input class="in" id="b-time" value="' + esc(b.time || '') + '" placeholder="เช่น 08.30–10.00 น.">') + '</div>' + fld('หมายเหตุ (เพลง การแต่งกาย จุดนัดพบ)', '<textarea class="in" id="b-note" rows="2">' + esc(b.note || '') + '</textarea>') +
      (!bid && ev && people(Object.assign({}, ev)).length ? '<label class="ck wide"><input type="checkbox" id="b-fill" checked><span>ใส่ผู้เข้าร่วมกิจกรรมทั้ง ' + people(ev).length + ' คนลงผังให้เลย (ตามเครื่องดนตรีแรกของแต่ละคน)</span></label>' : '') +
      '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { sticky: true, wide: true });
    $('#b-eid', w).addEventListener('change', x => { const e = events()[x.target.value]; if (!e) return; $('#b-title', w).value = e.title || ''; $('#b-place', w).value = e.place || ''; $('#b-date', w).value = e.date || ''; $('#b-time', w).value = timeTxt(e); });
    $('form', w).addEventListener('submit', x => {
      x.preventDefault(); const v = id => $(id, w).value.trim(); if (!v('#b-name')) return;
      const rec = { name: v('#b-name'), type: v('#b-type'), eid: v('#b-eid') || null, title: v('#b-title') || null, place: v('#b-place') || null, date: v('#b-date') || null, time: v('#b-time') || null, note: v('#b-note') || null, updatedAt: Date.now() };
      if (bid) A.W(B.update(Y() + '/bands/' + bid, rec));
      else { const id = B.uid(); const fill = $('#b-fill', w); if (fill && fill.checked) { const seats = {}, cnt = {}; people(ev).forEach(s => { const inst = A.insts(A.members()[s])[0] || 'ยังไม่ระบุ', r = guessRow(inst); cnt[r] = (cnt[r] || 0) + 1; seats['s' + B.uid() + cnt[r]] = { sid: s, inst, row: r, ord: cnt[r] }; }); rec.seats = seats; }
        A.W(B.set(Y() + '/bands/' + id, JSON.parse(JSON.stringify(rec)))); location.hash = '#/band/' + id; }
      w.remove(); toast('บันทึกแล้ว');
    });
  }
  function seatForm(bid, row) {
    const b = bands()[bid], used = new Set(seatsOf(b).map(s => s.sid).filter(Boolean)), ms = A.members(), list = A.activeSids().filter(s => !used.has(s)).sort(A.byClass);
    const instOpt = own => opt(own.map(i => [i, i]).concat(A.instList().filter(i => !own.includes(i)).map(i => [i, i])));
    const w = modal('<h3>เพิ่มผู้บรรเลง' + (row ? ' · ' + ROWN[row] : '') + '</h3><form class="form"><div class="muted" style="margin-bottom:8px">ติ๊กเลือกได้หลายคน เครื่องดนตรีเลือกจากที่แต่ละคนเล่นได้ก่อน เปลี่ยนได้</div>' +
      (list.length ? '<div class="plist tall">' + list.map(s => '<div class="pick"><label class="ck"><input type="checkbox" name="ad" value="' + esc(s) + '"><span>' + esc(A.fullName(ms[s])) + ' <small class="muted">' + esc(A.cls(ms[s])) + '</small></span></label><select class="in sm" data-for="' + esc(s) + '" aria-label="เครื่องดนตรีของ ' + esc(ms[s].first) + '">' + instOpt(A.insts(ms[s])) + '</select></div>').join('') + '</div>'
        : '<div class="note">' + (A.activeSids().length ? 'ศิษย์ทุกคนอยู่ในวงนี้แล้ว' : 'ยังไม่มีศิษย์ในทะเบียน — เพิ่มศิษย์ก่อน หรือพิมพ์ชื่อด้านล่าง') + '</div>') +
      '<div class="lb" style="margin-top:14px">บุคคลอื่น (แอดมิน วิทยากร นักร้องรับเชิญ)</div><div class="g3">' + fld('ชื่อ', '<input class="in" id="s-name">') + fld('เครื่องดนตรี', '<select class="in" id="s-inst">' + instOpt([]) + '</select>') + '</div>' +
      fld('วางที่แถว', '<select class="in" id="s-row">' + opt([[0, 'อัตโนมัติตามชนิดเครื่อง']].concat([1, 2, 3, 4, 5].map(r => [r, ROWN[r]])), row || 0) + '</select>') +
      '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">เพิ่มลงผัง</button></div></form>', { sticky: true, wide: true });
    w.addEventListener('change', e => { const f = e.target.dataset && e.target.dataset.for; if (f) { const c = w.querySelector('input[name=ad][value="' + f + '"]'); if (c) c.checked = true; } });
    $('form', w).addEventListener('submit', x => {
      x.preventDefault(); const fix = +$('#s-row', w).value, cnt = {}, upd = {}; seatsOf(bands()[bid]).forEach(s => { cnt[s.row] = Math.max(cnt[s.row] || 0, s.ord || 0); });
      const add = rec => { const r = fix || guessRow(rec.inst); cnt[r] = (cnt[r] || 0) + 1; rec.row = r; rec.ord = cnt[r]; upd['s' + B.uid() + Object.keys(upd).length] = rec; };
      $$('input[name=ad]:checked', w).forEach(c => add({ sid: c.value, inst: w.querySelector('select[data-for="' + c.value + '"]').value }));
      const name = $('#s-name', w).value.trim(); if (name) add({ name, inst: $('#s-inst', w).value });
      const n = Object.keys(upd).length; if (!n) return toast('ติ๊กเลือกศิษย์ หรือพิมพ์ชื่อ');
      A.W(B.update(Y() + '/bands/' + bid + '/seats', upd)); w.remove(); toast('เพิ่ม ' + n + ' คนลงผังแล้ว');
    });
  }
  function bandPage(b) {
    const st = seatsOf(b), root = document.createElement('div'), pg = document.createElement('div'); pg.className = 'rp-page land';
    pg.innerHTML = A.pageHead('ผังวง: ' + b.name, [b.type, bandInfo(b)].filter(Boolean).join(' · ')) + plotHTML(b, true) +
      '<div class="rp-roster">' + st.map(s => '<span><b>' + esc(s.inst) + '</b> ' + esc(s.sid && A.members()[s.sid] ? A.fullName(A.members()[s.sid]) : s.name || '') + '</span>').join('') + '</div>' + (b.note ? '<div class="rp-s" style="margin-top:8px">หมายเหตุ: ' + esc(b.note) + '</div>' : '') +
      '<div class="rp-foot">' + M.C.club.long + ' · ผู้บรรเลง ' + st.length + ' คน</div>';
    root.appendChild(pg); return root;
  }

  /* ============ การทำงาน ============ */
  Object.assign(A.ACT, {
    evTab: d => { EV.tab = d.t; A.rerender(); },
    calNav: d => { const [y, m] = EV.month.split('-').map(Number); const x = new Date(y, m - 1 + (+d.d), 1); EV.month = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); A.rerender(); },
    evNew: () => { if (canEvent()) evForm(null); },
    evEdit: d => { if (canEvent()) evForm(d.id); },
    evCancel: async d => { if (!canEvent()) return; const e = events()[d.id]; const on = e.status === 'cancelled'; if (!on && !(await M.confirmBox('ยกเลิกกิจกรรม', esc(e.title) + ' จะแสดงว่ายกเลิก แต่ข้อมูลยังอยู่', 'ยกเลิกกิจกรรม', true))) return; A.W(B.update(Y() + '/events/' + d.id, { status: on ? 'on' : 'cancelled' })); A.log('event.status', '', e.title); },
    annNew: () => {
      if (!canPost()) return; const rep = false;
      const w = modal('<h3>ประกาศงาน</h3><form class="form">' + fld('หัวข้อ', '<input class="in" id="n-t" required>') + fld('รายละเอียด', '<textarea class="in" id="n-b" rows="4"></textarea>') +
        '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">ประกาศ</button></div></form>', { center: true, sticky: true });
      $('form', w).addEventListener('submit', x => { x.preventDefault(); const t = $('#n-t', w).value.trim(); if (!t) return; A.W(B.set(Y() + '/announce/' + B.uid(), { title: t, body: $('#n-b', w).value.trim() || null, at: Date.now(), by: A.by() })); window.PUSH && PUSH.notify('ann', { title: 'ประกาศ: ' + t, body: $('#n-b', w).value.trim(), url: '#/events' }); w.remove(); toast('ประกาศแล้ว'); EV.tab = 'news'; });
    },
    annAck: d => { if (A.sid()) A.W(B.set(Y() + '/acks/' + A.sid() + '/' + d.id, Date.now())); },
    annWho: d => { const a = (A.D.announce || {})[d.id]; if (!a) return; const t = annTargets(a), yes = t.filter(s => acked(d.id, s)), no = t.filter(s => !acked(d.id, s)); const nm = l => l.sort(A.byClass).map(s => esc(A.fullName(A.members()[s]) + ' (' + A.cls(A.members()[s]) + ')')).join('<br>') || '-';
      modal('<h3>การรับทราบ</h3><div class="muted" style="margin-bottom:10px">' + esc(a.title) + '</div><div class="lb">ยังไม่รับทราบ (' + no.length + ')</div><div style="margin-bottom:14px">' + nm(no) + '</div><div class="lb">รับทราบแล้ว (' + yes.length + ')</div><div>' + nm(yes) + '</div><button class="btn ghost block" data-close style="margin-top:14px">ปิด</button>', { center: true }); },
    annDel: async d => { if (!(await M.confirmBox('ลบประกาศ', 'ประกาศนี้จะหายไปสำหรับทุกคน', 'ลบ', true))) return; A.W(B.remove(Y() + '/announce/' + d.id)); },
    bandNew: d => { if (A.teacher()) bandForm(null, d.eid || ''); },
    bandEdit: d => { if (A.teacher()) bandForm(d.id); },
    bandDel: async d => { if (!A.teacher()) return; if (!(await M.confirmBox('ลบผังวง', esc(bands()[d.id].name), 'ลบ', true))) return; A.W(B.remove(Y() + '/bands/' + d.id)); location.hash = '#/bands'; },
    seatAdd: d => { if (A.teacher()) seatForm(d.id, 0); },
    seatCancel: () => { BS.seat = ''; A.rerender(); },
    seatDel: d => { if (!A.teacher()) return; A.W(B.remove(Y() + '/bands/' + d.id + '/seats/' + d.s)); BS.seat = ''; A.rerender(); },
    seatTap: d => {
      if (!A.teacher()) return; const st = seatsOf(bands()[d.id]);
      if (BS.bid !== d.id || !BS.seat || !st.some(x => x.id === BS.seat)) { BS.bid = d.id; BS.seat = d.s; return A.rerender(); }
      if (BS.seat === d.s) { BS.seat = ''; return A.rerender(); }
      const a = st.find(x => x.id === BS.seat), c = st.find(x => x.id === d.s), base = Y() + '/bands/' + d.id + '/seats/', upd = {};   /* สลับที่กัน */
      upd[base + a.id + '/row'] = c.row; upd[base + a.id + '/ord'] = c.ord; upd[base + c.id + '/row'] = a.row; upd[base + c.id + '/ord'] = a.ord;
      BS.seat = ''; A.W(B.update('', upd)); A.rerender();
    },
    rowTap: d => {
      if (!A.teacher()) return; const st = seatsOf(bands()[d.id]), r = +d.r, s = BS.bid === d.id ? st.find(x => x.id === BS.seat) : null;
      if (!s) return seatForm(d.id, r);
      const upd = { row: r, ord: Math.max(0, ...st.filter(x => x.row === r && x.id !== s.id).map(x => x.ord || 0)) + 1 };
      BS.seat = ''; A.W(B.update(Y() + '/bands/' + d.id + '/seats/' + s.id, upd)); A.rerender();
    },
    bandExport: d => {
      const b = bands()[d.id], name = 'ผังวง-' + M.safeName(b.name);
      const w = modal('<h3>ส่งออกผังวง</h3><div class="xlist"><button class="xbtn" data-x="png"><b>รูปภาพ PNG</b><span>A4 แนวนอน ส่งต่อใน LINE หรือพิมพ์ได้</span></button><button class="xbtn" data-x="pdf"><b>PDF</b><span>สำหรับพิมพ์</span></button><button class="xbtn" data-x="view"><b>ดูตัวอย่าง</b><span>แสดงบนหน้าจอ</span></button></div><div class="muted" id="x-msg" style="margin-top:10px"></div><button class="btn ghost block" data-close style="margin-top:12px">ปิด</button>', { center: true });
      w.addEventListener('click', async e => { const x = e.target.closest('[data-x]'); if (!x) return; const msg = $('#x-msg', w); msg.textContent = 'กำลังสร้าง …';
        try { if (x.dataset.x === 'view') { w.remove(); M.previewPages(bandPage(b), 'ตัวอย่างผังวง'); return; } if (x.dataset.x === 'png') await M.exportPNGs(bandPage(b), name); else await M.exportPDF(bandPage(b), name + '.pdf'); msg.textContent = 'เสร็จแล้ว'; }
        catch (er) { console.error(er); msg.textContent = 'ส่งออกไม่สำเร็จ: ' + (er.message || er) + ' (ต้องต่ออินเทอร์เน็ตครั้งแรกเพื่อโหลดตัวสร้างไฟล์)'; } });
    }
  });
  document.addEventListener('change', e => { const sid = e.target.dataset && e.target.dataset.seatinst; if (sid && A.teacher()) A.W(B.update(Y() + '/bands/' + e.target.dataset.id + '/seats/' + sid, { inst: e.target.value })); });
  A.evList = evList; A.evPeople = people; A.evDate = dateTxt; A.evTime = timeTxt; A.school = school;
})();
