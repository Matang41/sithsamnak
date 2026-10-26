/* ============================================================
   songs.js — ทะเบียนเพลงและทางเพลง · ใครต่อเพลงไหนแล้ว (ส่วนหนึ่งของคลังวิชา)
   ข้อมูล: songs/{gid} = { name, cat, desc, tang: { tid: { name, inst, from, desc } }, at, by }   ← ข้อมูลเพลง ศิษย์ทุกคนเห็น
           learned/{sid}/{gid} = { tang, inst, from, year, at, ok }  (ok = แอดมินยืนยันแล้ว)
           notes · notefiles · noteacc · notereq  ← คลังโน้ต จำกัดสิทธิ์รายเพลง (ดูส่วน “คลังโน้ต” ด้านล่าง)
   สิทธิ์: แอดมิน ประธาน รองประธาน เลขานุการ ผู้เก็บรวบรวมโน้ต เพิ่ม/แก้เพลงและทาง · โน้ต: แอดมินและผู้เก็บรวบรวมโน้ต · ให้สิทธิ์ดูโน้ต: แอดมินเท่านั้น
           ศิษย์บันทึก “เพลงที่ฉันต่อแล้ว” ของตนเอง (รอแอดมินยืนยัน) และขอสิทธิ์ดูโน้ตรายเพลง
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP, C = M.C;
  const { $, $$, esc, toast, modal } = M; const { ic, chip, fld, opt, avatar } = A;
  const SG = { q: '', cat: '' };
  const keeper = () => !!A.sid() && A.isKeeper(A.sid());   /* ผู้เก็บรวบรวมโน้ต */
  const canEdit = () => A.teacher() || A.is('secretary', 'president', 'vice') || keeper();
  const canNote = () => A.teacher() || keeper();
  const songs = () => A.D.songs || {};
  const learned = () => A.D.learned || {};
  const cats = () => { const l = A.cfg().songCats; return Array.isArray(l) && l.length ? l : (C.songCats || ['อื่น ๆ']); };
  const list = () => Object.keys(songs()).map(id => Object.assign({ id }, songs()[id])).filter(g => g.name).sort((a, b) => cats().indexOf(a.cat) - cats().indexOf(b.cat) || a.name.localeCompare(b.name, 'th'));
  const tangs = g => Object.keys(g.tang || {}).map(id => Object.assign({ id }, g.tang[id])).filter(t => t.name);
  /* ใครต่อเพลงนี้แล้ว: [{ sid, rec }] เฉพาะศิษย์ที่ยังอยู่ในทะเบียน */
  const whoKnows = gid => Object.keys(learned()).filter(s => (learned()[s] || {})[gid] && A.members()[s]).map(s => ({ sid: s, rec: learned()[s][gid] })).sort((a, b) => A.byClass(a.sid, b.sid));
  const pendingAll = () => { const o = []; Object.keys(learned()).forEach(s => Object.keys(learned()[s] || {}).forEach(g => { const r = learned()[s][g]; if (r && !r.ok && songs()[g] && A.members()[s]) o.push({ sid: s, gid: g, rec: r }); })); return o; };

  A.SUBS.push({ key: 'songs', path: () => 'songs' }, { key: 'learned', path: () => 'learned' });
  /* ============ คลังโน้ต: เปิดให้ดูเป็นรายเพลง ============
     notes/{gid}/{tid} = { text, url, file: { name, mime, size }, at, by } · notefiles/{gid}/{tid} = เนื้อไฟล์ (base64)
     noteacc/{sid}/{gid} = { at, by } — สิทธิ์ดูโน้ตของเพลงนั้น (แอดมินให้เท่านั้น) · notereq/{sid}/{gid} = { at, msg } — คำขอสิทธิ์
     Rules บังคับ: อ่าน notes/{gid} ได้เฉพาะแอดมิน และศิษย์ที่มี noteacc/{ตนเอง}/{gid} */
  const NT = {};   /* แคชโน้ตรายเพลง: undefined = ยังไม่โหลด · null = กำลังโหลด · { _err } = ไม่มีสิทธิ์ */
  const acc = () => A.D.noteacc || {};
  const reqs = () => A.D.notereq || {};
  const hasAcc = gid => canNote() || !!(A.sid() && (acc()[A.sid()] || {})[gid]);
  const myReq = gid => A.sid() && (reqs()[A.sid()] || {})[gid];
  const accSids = gid => Object.keys(acc()).filter(s => (acc()[s] || {})[gid] && A.members()[s]);
  const reqList = () => { const o = []; Object.keys(reqs()).forEach(s => Object.keys(reqs()[s] || {}).forEach(g => { if (songs()[g] && A.members()[s] && !(acc()[s] || {})[g]) o.push({ sid: s, gid: g, rec: reqs()[s][g] }); })); return o.sort((a, b) => (a.rec.at || 0) - (b.rec.at || 0)); };
  A.SUBS.push(
    { key: 'noteacc', path: () => A.teacher() ? 'noteacc' : (A.sid() ? 'noteacc/' + A.sid() : ''), norm: v => A.teacher() ? v : { [A.sid()]: v } },
    { key: 'notereq', path: () => A.teacher() ? 'notereq' : (A.sid() ? 'notereq/' + A.sid() : ''), norm: v => A.teacher() ? v : { [A.sid()]: v } });
  A.TODO.push(() => A.teacher() && reqList().length ? { n: reqList().length, label: 'คำขอสิทธิ์ดูโน้ตเพลง', sub: A.members()[reqList()[0].sid].first + ' · ' + songs()[reqList()[0].gid].name, href: '#/songs', hot: true } : null);
  function loadNotes(gid, force) {
    if (!force && NT[gid] !== undefined) return NT[gid]; if (!hasAcc(gid)) return null;
    NT[gid] = null; B.get('notes/' + gid).then(v => { NT[gid] = v || {}; }).catch(() => { NT[gid] = { _err: 1 }; }).then(() => A.rerender()); return null;
  }
  function notesHTML(g) {
    const gid = g.id, ts = tangs(g), n = accSids(gid).length;
    let h = '<section class="card"><div class="row" style="margin-bottom:6px"><div class="lb grow" style="margin:0">' + ic('lock', 16) + ' โน้ตเพลง</div>' + (A.teacher() ? '<button class="btn sm ghost" data-act="ntAcl" data-g="' + esc(gid) + '">' + ic('users', 16) + 'ผู้ได้รับอนุญาต (' + n + ')</button>' : '') + '</div>';
    if (!hasAcc(gid)) {
      const r = myReq(gid);
      return h + '<div class="lockbox">' + ic('lock', 26) + '<div class="grow"><b>โน้ตเพลงนี้เปิดเฉพาะผู้ได้รับอนุญาตจากแอดมิน</b><div class="muted">ตามธรรมเนียม ศิษย์จะได้รับโน้ตเมื่อครูอนุญาตให้ต่อเพลงนั้นแล้ว</div>' +
        (!A.sid() ? '' : r ? '<div class="row wrap" style="margin-top:8px">' + chip('ส่งคำขอแล้ว ' + M.thDate(r.at), 'gold') + '<button class="btn sm ghost" data-act="ntUnreq" data-g="' + esc(gid) + '">ยกเลิกคำขอ</button></div>' : '<button class="btn sm" style="margin-top:8px" data-act="ntReq" data-g="' + esc(gid) + '">ขอสิทธิ์ดูโน้ต</button>') + '</div></div></section>';
    }
    const N = loadNotes(gid);
    if (N === null) return h + '<div class="muted">กำลังโหลดโน้ต…</div></section>';
    if (N._err) return h + '<div class="muted">โหลดโน้ตไม่ได้ (สิทธิ์อาจถูกเปลี่ยน) — ลองเปิดหน้าใหม่</div></section>';
    h += ts.map(t => { const x = N[t.id] || {};
      return '<div class="li"><div class="row"><b class="grow">' + esc(t.name) + '</b>' + chip(t.inst, 'plum') + (canNote() ? '<button class="btn sm ghost" data-act="ntEdit" data-g="' + esc(gid) + '" data-t="' + esc(t.id) + '">' + ic('edit', 16) + (x.text || x.url || x.file ? 'แก้โน้ต' : 'ใส่โน้ต') + '</button>' : '') + '</div>' +
        (x.text ? '<div class="note-t">' + esc(x.text) + '</div>' : '') +
        '<div class="row wrap" style="margin-top:6px">' + (x.file ? '<button class="btn sm" data-act="ntFile" data-g="' + esc(gid) + '" data-t="' + esc(t.id) + '">' + ic('doc', 16) + 'เปิดไฟล์โน้ต' + (x.file.name ? ' · ' + esc(x.file.name) : '') + '</button>' : '') + (x.url ? '<a class="btn sm ghost" href="' + esc(x.url) + '" target="_blank" rel="noopener">เปิดลิงก์โน้ต / เสียง</a>' : '') +
        (!x.text && !x.file && !x.url ? '<span class="muted">ยังไม่มีโน้ตของทางนี้</span>' : '') + '</div></div>';
    }).join('') || '<div class="muted">บันทึกทางเพลงก่อน แล้วจึงใส่โน้ตของแต่ละทาง</div>';
    return h + '<div class="muted" style="margin-top:8px">โน้ตเป็นวิชาของสำนัก โปรดอย่าส่งต่อผู้ที่ไม่ได้รับอนุญาต</div></section>';
  }
  const MAXN = 700 * 1024;
  const readURL = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('อ่านไฟล์ไม่ได้')); r.readAsDataURL(f); });
  const toBlob = d => { const i = d.indexOf(','), mime = (d.slice(5, i).split(';')[0]) || 'application/octet-stream', bin = atob(d.slice(i + 1)), u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); return new Blob([u], { type: mime }); };
  function noteForm(gid, tid) {
    const g = songs()[gid], t = (g.tang || {})[tid] || {}, x = ((NT[gid] && !NT[gid]._err) ? NT[gid][tid] : null) || {};   /* แอดมินและผู้เก็บรวบรวมโน้ต */
    const w = modal('<h3>โน้ต: ' + esc(t.name || '') + '</h3><div class="muted" style="margin-bottom:10px">' + esc(g.name) + ' · เห็นเฉพาะแอดมิน ผู้เก็บรวบรวมโน้ต และผู้ได้รับอนุญาตเพลงนี้</div><form class="form">' +
      fld('โน้ต / บันทึกทาง (ข้อความ)', '<textarea class="in" id="n-x" rows="10" placeholder="พิมพ์โน้ตทีละบรรทัด เช่น  - - - ด  - ร - ม …">' + esc(x.text || '') + '</textarea>') +
      fld('ลิงก์โน้ต / เสียง / วิดีโอ (ไม่บังคับ)', '<input class="in" id="n-u" inputmode="url" value="' + esc(x.url || '') + '" placeholder="https://">', 'ถ้าใช้ Google Drive ให้แชร์เฉพาะบุคคล — ลิงก์แบบ “ทุกคนที่มีลิงก์” ส่งต่อได้') +
      fld('ไฟล์โน้ต PDF / ภาพ (ไม่บังคับ)', '<input class="in" type="file" id="n-f" accept="application/pdf,image/*">', (x.file ? 'มีไฟล์อยู่แล้ว: ' + esc(x.file.name || '') + ' — เลือกไฟล์ใหม่เพื่อแทนที่ · ' : '') + 'ไม่เกิน ~700 KB (ภาพย่อให้อัตโนมัติ) เก็บในฐานข้อมูลภายใต้สิทธิ์รายเพลง') +
      (x.file ? '<label class="ck wide"><input type="checkbox" id="n-rm"><span>ลบไฟล์เดิม</span></label>' : '') +
      '<div class="note bad" id="n-err" hidden></div><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึกโน้ต</button></div></form>', { sticky: true, wide: true });
    $('form', w).addEventListener('submit', async e => {
      e.preventDefault(); const err = s => { const el = $('#n-err', w); el.textContent = s; el.hidden = false; }, btn = $('button.grow:not(.ghost)', w), url = $('#n-u', w).value.trim();
      if (url && !/^https?:\/\//i.test(url)) return err('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
      const rec = { text: $('#n-x', w).value.replace(/\s+$/, '').slice(0, 20000) || null, url: url || null, file: x.file || null, at: Date.now(), by: A.myName() };
      const f = $('#n-f', w).files[0]; btn.disabled = true;
      try {
        if (f) { if (A.STATUS.online === false) throw new Error('ต้องออนไลน์จึงจะอัปโหลดไฟล์ได้'); let data; if (/^image\//.test(f.type)) data = await M.fileToImage(f, 1800, 0.82); else { if (f.size > MAXN) throw new Error('ไฟล์ใหญ่เกิน 700 KB'); data = await readURL(f); } if (data.length > 990000) throw new Error('ไฟล์ใหญ่เกินไป');
          await B.direct('set', 'notefiles/' + gid + '/' + tid, data); rec.file = { name: f.name, mime: data.slice(5, data.indexOf(';')), size: Math.round(data.length * 3 / 4) }; }
        else if ($('#n-rm', w) && $('#n-rm', w).checked) { await B.direct('remove', 'notefiles/' + gid + '/' + tid); rec.file = null; }
        await B.direct('set', 'notes/' + gid + '/' + tid, rec);
        A.log('note.save', '', g.name + ' · ' + (t.name || '')); w.remove(); toast('บันทึกโน้ตแล้ว'); loadNotes(gid, true);
      } catch (er) { btn.disabled = false; err('บันทึกไม่สำเร็จ: ' + (er.message || A.errTH(er))); }
    });
  }
  /* แอดมินกำหนดผู้ได้รับอนุญาตของเพลงหนึ่ง */
  function aclForm(gid) {
    const g = songs()[gid], ms = A.members(), cur = new Set(accSids(gid)), knows = new Set(whoKnows(gid).filter(x => x.rec.ok).map(x => x.sid)), rq = new Set(reqList().filter(r => r.gid === gid).map(r => r.sid));
    const w = modal('<h3>ผู้ได้รับอนุญาตดูโน้ต</h3><div class="muted" style="margin-bottom:10px">' + esc(g.name) + ' · แอดมินเห็นโน้ตทุกเพลงเสมอ</div><form class="form">' +
      '<div class="row wrap" style="margin-bottom:8px"><button type="button" class="btn ghost sm" data-q="know">ผู้ที่ต่อเพลงนี้แล้ว (' + knows.size + ')</button><button type="button" class="btn ghost sm" data-q="req">ผู้ที่ขอสิทธิ์ (' + rq.size + ')</button><select class="in sm" id="a-gen" aria-label="เลือกตามช่วงปีที่เริ่มเรียน"><option value="">+ ทั้งช่วงปี…</option>' + opt(A.eraOpts()) + '</select><button type="button" class="btn ghost sm" data-q="none">ล้าง</button><span class="muted" id="a-n"></span></div>' +
      '<div class="acl-grid">' + A.activeSids().sort(A.byClass).map(s => '<label class="ck wide"><input type="checkbox" name="ac" value="' + esc(s) + '" data-g="' + A.eraOf(ms[s]) + '"' + (cur.has(s) ? ' checked' : '') + '><span>' + esc(A.fullName(ms[s]) + A.nickTxt(ms[s])) + ' <small class="muted">' + esc(A.cls(ms[s])) + (knows.has(s) ? ' · ต่อแล้ว' : '') + '</small>' + (rq.has(s) ? ' ' + chip('ขอสิทธิ์', 'hot') : '') + '</span></label>').join('') + '</div>' +
      '<label class="ck wide" style="margin-top:8px"><input type="checkbox" id="a-push" checked><span>แจ้งเตือนผู้ที่ได้รับสิทธิ์ใหม่</span></label>' +
      '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึกสิทธิ์</button></div></form>', { sticky: true, wide: true });
    const cnt = () => { $('#a-n', w).textContent = 'เลือก ' + $$('input[name=ac]:checked', w).length + ' คน'; }; cnt();
    w.addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (!b) return; const q = b.dataset.q; $$('input[name=ac]', w).forEach(c => { if (q === 'none') c.checked = false; else if (q === 'know' && knows.has(c.value)) c.checked = true; else if (q === 'req' && rq.has(c.value)) c.checked = true; }); cnt(); });
    w.addEventListener('change', e => { if (e.target.id === 'a-gen' && e.target.value) { $$('input[name=ac]', w).forEach(c => { if (c.dataset.g === e.target.value) c.checked = true; }); e.target.value = ''; } cnt(); });
    $('form', w).addEventListener('submit', e => {
      e.preventDefault(); const sel = new Set($$('input[name=ac]:checked', w).map(c => c.value)), upd = {}, now = Date.now(), added = [];
      sel.forEach(s => { if (!cur.has(s)) { upd['noteacc/' + s + '/' + gid] = { at: now, by: A.myName() }; added.push(s); } if (rq.has(s)) upd['notereq/' + s + '/' + gid] = null; });
      cur.forEach(s => { if (!sel.has(s)) upd['noteacc/' + s + '/' + gid] = null; });
      if (Object.keys(upd).length) { A.W(B.update('', upd)); A.log('note.acl', '', g.name + ' +' + added.length + ' −' + [...cur].filter(s => !sel.has(s)).length); }
      if (added.length && $('#a-push', w).checked && window.PUSH) window.PUSH.notify('note', { to: added, title: 'ได้รับสิทธิ์ดูโน้ต: ' + g.name, body: 'เปิดดูได้ที่ คลังวิชา › เพลงและทางเพลง', url: '#/song/' + gid });
      w.remove(); toast('บันทึกสิทธิ์แล้ว');
    });
  }
  /* แอดมินกำหนดเพลงที่ศิษย์คนหนึ่งดูโน้ตได้ (จากหน้าประวัติศิษย์) */
  function memberAclForm(sid) {
    const m = A.members()[sid], mine = acc()[sid] || {}, kn = learned()[sid] || {};
    const w = modal('<h3>สิทธิ์ดูโน้ตรายเพลง</h3><div class="muted" style="margin-bottom:10px">' + esc(A.fullName(m)) + '</div><form class="form"><div class="row wrap" style="margin-bottom:8px"><button type="button" class="btn ghost sm" data-q="know">เพลงที่ต่อแล้ว</button><button type="button" class="btn ghost sm" data-q="none">ล้าง</button></div><div class="acl-grid">' +
      list().map(g => '<label class="ck wide"><input type="checkbox" name="mg" value="' + esc(g.id) + '"' + (mine[g.id] ? ' checked' : '') + '><span>' + esc(g.name) + ' <small class="muted">' + esc(g.cat || '') + (kn[g.id] ? ' · ต่อแล้ว' : '') + '</small></span></label>').join('') + '</div>' +
      '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึกสิทธิ์</button></div></form>', { sticky: true, wide: true });
    w.addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (!b) return; $$('input[name=mg]', w).forEach(c => { if (b.dataset.q === 'none') c.checked = false; else if (kn[c.value]) c.checked = true; }); });
    $('form', w).addEventListener('submit', e => {
      e.preventDefault(); const sel = new Set($$('input[name=mg]:checked', w).map(c => c.value)), upd = {}, now = Date.now();
      list().forEach(g => { if (sel.has(g.id) && !mine[g.id]) { upd['noteacc/' + sid + '/' + g.id] = { at: now, by: A.myName() }; upd['notereq/' + sid + '/' + g.id] = null; } if (!sel.has(g.id) && mine[g.id]) upd['noteacc/' + sid + '/' + g.id] = null; });
      if (Object.keys(upd).length) { A.W(B.update('', upd)); A.log('note.acl', sid, sel.size + ' เพลง'); }
      w.remove(); toast('บันทึกสิทธิ์แล้ว');
    });
  }
  A.MHOOKS.push(sid => {
    if (!A.teacher() && A.sid() !== sid) return '';
    const l = list().filter(g => (acc()[sid] || {})[g.id]);
    return '<section class="card"><div class="row"><div class="lb grow" style="margin:0 0 8px">' + ic('lock', 16) + ' เพลงที่ดูโน้ตได้ (' + l.length + ')</div>' + (A.teacher() ? '<button class="btn sm ghost" data-act="ntMember" data-sid="' + esc(sid) + '">กำหนดสิทธิ์</button>' : '') + '</div>' +
      (l.map(g => '<a class="pill" href="#/song/' + esc(g.id) + '">' + esc(g.name) + '</a>').join(' ') || '<div class="muted">ยังไม่ได้รับสิทธิ์ดูโน้ตเพลงใด</div>') + '</section>';
  });

  A.NAVS.push({ id: 'songs', label: 'เพลงและทางเพลง', icon: 'music', order: 21, match: ['song'], badge: () => A.teacher() ? pendingAll().length : 0 });
  A.TODO.push(() => A.teacher() && pendingAll().length ? { n: pendingAll().length, label: 'ทางเพลงที่ศิษย์บันทึก รอยืนยัน', href: '#/songs' } : null);

  function songCard(g) {
    const w = whoKnows(g.id), mine = A.sid() && (learned()[A.sid()] || {})[g.id];
    return '<a class="evc" href="#/song/' + esc(g.id) + '"><span class="evd sg">' + ic('music', 22) + '</span><span class="grow"><b>' + esc(g.name) + '</b><span class="muted">' + esc([g.cat, tangs(g).length ? tangs(g).length + ' ทาง' : 'ยังไม่บันทึกทาง'].filter(Boolean).join(' · ')) + '</span>' +
      '<span class="row wrap" style="gap:6px;margin-top:4px">' + (w.length ? chip('ต่อแล้ว ' + w.length + ' คน', 'line') : '') + (mine ? chip(mine.ok ? 'ฉันต่อแล้ว' : 'รอยืนยัน', mine.ok ? 'gold' : 'line') : '') + (A.teacher() ? chip('อนุญาตโน้ต ' + accSids(g.id).length + ' คน', 'line') : hasAcc(g.id) ? chip('ดูโน้ตได้', 'gold') : chip('โน้ตจำกัดสิทธิ์', 'line')) + '</span></span></a>';
  }
  function listHTML() {
    const q = SG.q.trim().toLowerCase(), all = list();
    const l = all.filter(g => (!SG.cat || g.cat === SG.cat) && (!q || (g.name + ' ' + (g.desc || '') + ' ' + tangs(g).map(t => t.name + ' ' + (t.inst || '') + ' ' + (t.from || '')).join(' ')).toLowerCase().includes(q)));
    return l.map(songCard).join('') || '<div class="empty">' + (all.length ? 'ไม่พบเพลงตามเงื่อนไข' : 'ยังไม่มีเพลงในทะเบียน' + (canEdit() ? ' — กด “เพิ่มเพลง”' : '')) + '</div>';
  }
  A.V.songs = function () {
    const used = cats().filter(c => list().some(g => g.cat === c));
    let b = '<div class="row wrap" style="margin-bottom:14px">' + (canEdit() ? '<button class="btn" data-act="sgNew">' + ic('plus', 18) + 'เพิ่มเพลง</button><button class="btn ghost" data-act="sgCats">ประเภทเพลง</button>' : '') + (A.sid() ? '<button class="btn ghost" data-act="sgMine">' + ic('check', 18) + 'บันทึกเพลงที่ฉันต่อแล้ว</button>' : '') + '</div>';
    const nrq = A.teacher() ? reqList() : [];
    if (nrq.length) b += '<section class="card hl"><div class="lb">' + ic('lock', 16) + ' คำขอสิทธิ์ดูโน้ต (' + nrq.length + ')</div>' + nrq.map(r => { const m = A.members()[r.sid]; return '<div class="li"><div class="row"><span class="grow"><b>' + esc(A.fullName(m)) + '</b> ขอดูโน้ต <b>' + esc(songs()[r.gid].name) + '</b><div class="muted">' + esc([A.cls(m), M.thDate(r.rec.at), r.rec.msg].filter(Boolean).join(' · ')) + '</div></span><button class="btn sm" data-act="ntGrant" data-sid="' + esc(r.sid) + '" data-g="' + esc(r.gid) + '">อนุญาต</button><button class="btn sm ghost danger" data-act="ntDeny" data-sid="' + esc(r.sid) + '" data-g="' + esc(r.gid) + '">ไม่อนุญาต</button></div></div>'; }).join('') + '</section>';
    const pend = A.teacher() ? pendingAll() : [];
    if (pend.length) b += '<section class="card hl"><div class="lb">รอยืนยัน (' + pend.length + ')</div>' + pend.map(p => { const m = A.members()[p.sid], g = songs()[p.gid], t = ((g.tang || {})[p.rec.tang] || {}); return '<div class="li"><div class="row"><span class="grow"><b>' + esc(A.fullName(m)) + '</b> ต่อเพลง <b>' + esc(g.name) + '</b><div class="muted">' + esc([t.name || p.rec.inst, 'จาก ' + (p.rec.from || '-'), p.rec.year ? 'ปี ' + p.rec.year : ''].filter(Boolean).join(' · ')) + '</div></span><button class="btn sm" data-act="sgOk" data-sid="' + esc(p.sid) + '" data-g="' + esc(p.gid) + '">ยืนยัน</button><button class="btn sm ghost danger" data-act="sgUnlearn" data-sid="' + esc(p.sid) + '" data-g="' + esc(p.gid) + '">ไม่ใช่</button></div></div>'; }).join('') + '</section>';
    b += '<div class="tabs" role="tablist"><button role="tab" aria-selected="' + !SG.cat + '" class="' + (!SG.cat ? 'on' : '') + '" data-act="sgCat" data-c="">ทั้งหมด (' + list().length + ')</button>' + used.map(c => '<button role="tab" aria-selected="' + (SG.cat === c) + '" class="' + (SG.cat === c ? 'on' : '') + '" data-act="sgCat" data-c="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
      '<section class="card"><input id="sgq" class="in" type="search" placeholder="ค้นหาชื่อเพลง ทาง เครื่องดนตรี ครูผู้ถ่ายทอด" value="' + esc(SG.q) + '" aria-label="ค้นหาเพลง" style="margin-bottom:10px"><div id="sglist">' + listHTML() + '</div></section>';
    return { title: 'เพลงและทางเพลง', body: b, back: '#/kb' };
  };
  document.addEventListener('input', e => { if (e.target.id === 'sgq') { SG.q = e.target.value; const l = $('#sglist'); if (l) l.innerHTML = listHTML(); } });

  A.V.song = function (gid) {
    const g0 = songs()[gid]; if (!g0) return { title: 'เพลง', body: '<div class="empty">กำลังโหลด หรือไม่พบเพลงนี้</div>', back: '#/songs' };
    const g = Object.assign({ id: gid }, g0), ts = tangs(g), w = whoKnows(gid), mine = A.sid() && (learned()[A.sid()] || {})[gid];
    let b = '<section class="card hero"><div class="hero-name">' + esc(g.name) + '</div><div class="hero-sub">' + esc(g.cat || '') + '</div>' + (g.desc ? '<div style="margin-top:10px;white-space:pre-line">' + esc(g.desc) + '</div>' : '') + '</section>';
    b += '<div class="row wrap" style="margin-bottom:14px">' + (A.sid() ? '<button class="btn" data-act="sgLearn" data-g="' + esc(gid) + '">' + ic('check', 18) + (mine ? 'แก้บันทึกของฉัน' : 'ฉันต่อเพลงนี้แล้ว') + '</button>' : '') +
      (canEdit() ? '<button class="btn ghost" data-act="sgTang" data-g="' + esc(gid) + '">' + ic('plus', 18) + 'เพิ่มทาง</button><button class="btn ghost" data-act="sgEdit" data-g="' + esc(gid) + '">' + ic('edit', 18) + 'แก้ไขเพลง</button>' : '') +
      (A.teacher() ? '<button class="btn ghost" data-act="sgRecord" data-g="' + esc(gid) + '">' + ic('users', 18) + 'บันทึกผู้ต่อเพลงหลายคน</button>' : '') + '</div>';
    b += '<section class="card"><div class="lb">ทางเพลง (' + ts.length + ')</div>' + (ts.map(t => {
      const n = w.filter(x => x.rec.tang === t.id).length;
      return '<div class="li"><div class="row"><b class="grow">' + esc(t.name) + '</b>' + chip(t.inst, 'plum') + (n ? chip(n + ' คน', 'line') : '') + '</div><div class="muted">ครูผู้ถ่ายทอด: ' + esc(t.from || '-') + '</div>' +
        (t.desc ? '<div style="white-space:pre-line;margin-top:4px">' + esc(t.desc) + '</div>' : '') +
        '<div class="row wrap" style="margin-top:6px">' + (canEdit() ? '<button class="btn sm ghost" data-act="sgTang" data-g="' + esc(gid) + '" data-t="' + esc(t.id) + '">แก้ไข</button>' : '') + '</div></div>';
    }).join('') || '<div class="muted">ยังไม่ได้บันทึกทางของเพลงนี้</div>') + '</section>';
    b += notesHTML(g);
    b += '<section class="card"><div class="lb">ศิษย์ที่ต่อเพลงนี้แล้ว (' + w.length + ')</div>' + (w.map(x => { const m = A.members()[x.sid], t = (g.tang || {})[x.rec.tang]; return '<div class="mrow"><a class="mrow-main" href="#/m/' + esc(x.sid) + '">' + avatar(m) + '<span class="grow"><b>' + esc(A.fullName(m) + A.nickTxt(m)) + '</b><span class="muted">' + esc([A.cls(m), t ? t.name : x.rec.inst, 'จาก ' + (x.rec.from || '-'), x.rec.year ? 'ปี ' + x.rec.year : ''].filter(Boolean).join(' · ')) + '</span></span></a><span class="mrow-tags">' + (x.rec.ok ? '' : chip('รอยืนยัน', 'line')) + '</span>' + (A.teacher() && !x.rec.ok ? '<span class="mrow-act"><button class="btn sm" data-act="sgOk" data-sid="' + esc(x.sid) + '" data-g="' + esc(gid) + '">ยืนยัน</button></span>' : '') + '</div>'; }).join('') || '<div class="muted">ยังไม่มีบันทึก</div>') + '</section>';
    return { title: g.name, body: b, back: '#/songs' };
  };

  /* หน้าประวัติศิษย์: เพลงที่ต่อแล้ว */
  A.MHOOKS.push(sid => {
    const l = Object.keys(learned()[sid] || {}).filter(g => songs()[g]).map(g => ({ g: Object.assign({ id: g }, songs()[g]), r: learned()[sid][g] })).sort((a, b) => a.g.name.localeCompare(b.g.name, 'th'));
    if (!l.length && A.sid() !== sid) return '';
    return '<section class="card"><div class="row"><div class="lb grow" style="margin:0 0 8px">เพลงที่ต่อแล้ว (' + l.length + ')</div>' + (A.sid() === sid ? '<button class="btn sm ghost" data-act="sgMine">เพิ่ม</button>' : '') + '</div>' +
      (l.map(x => '<a class="pill" href="#/song/' + esc(x.g.id) + '">' + esc(x.g.name) + '<i>' + esc((((x.g.tang || {})[x.r.tang] || {}).name || x.r.inst || '') + (x.r.ok ? '' : ' · รอยืนยัน')) + '</i></a>').join(' ') || '<div class="muted">ยังไม่มีบันทึก — กด “เพิ่ม” เพื่อบันทึกเพลงที่ต่อจากครูแล้ว</div>') + '</section>';
  });

  /* ---------- ฟอร์ม ---------- */
  function songForm(gid) {
    const g = gid ? songs()[gid] : { cat: cats()[0] };
    const w = modal('<h3>' + (gid ? 'แก้ไขเพลง' : 'เพิ่มเพลง') + '</h3><form class="form">' + fld('ชื่อเพลง', '<input class="in" id="g-n" value="' + esc(g.name || '') + '" required>') +
      fld('ประเภท', '<select class="in" id="g-c">' + opt(cats().map(c => [c, c]), g.cat) + '</select>') + fld('ประวัติ / ความเป็นมา / หมายเหตุ', '<textarea class="in" id="g-d" rows="4">' + esc(g.desc || '') + '</textarea>') +
      '<div class="note bad" id="g-err" hidden></div><div class="row" style="margin-top:14px">' + (gid ? '<button type="button" class="btn ghost danger" id="g-del">ลบเพลง</button>' : '') + '<button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true, wide: true });
    $('form', w).addEventListener('submit', e => {
      e.preventDefault(); const name = $('#g-n', w).value.trim(); if (!name) { const el = $('#g-err', w); el.textContent = 'กรอกชื่อเพลง'; el.hidden = false; return; }
      const dup = list().find(x => x.name === name && x.id !== gid); if (dup && !gid) { const el = $('#g-err', w); el.innerHTML = 'มีเพลง “' + esc(name) + '” ในทะเบียนแล้ว — <a href="#/song/' + esc(dup.id) + '">เปิดดู</a> แล้วเพิ่มทางในเพลงนั้นแทน'; el.hidden = false; return; }
      const rec = { name, cat: $('#g-c', w).value, desc: $('#g-d', w).value.trim() || null };
      if (gid) A.W(B.update('songs/' + gid, rec)); else { const id = 'g' + B.uid(); A.W(B.set('songs/' + id, Object.assign(rec, { at: Date.now(), by: A.myName() }))); location.hash = '#/song/' + id; }
      A.log('song.save', '', name); w.remove(); toast('บันทึกแล้ว');
    });
    const del = $('#g-del', w); if (del) del.addEventListener('click', async () => {
      const n = whoKnows(gid).length; if (!(await M.confirmBox('ลบเพลง', 'ลบ “' + esc(g.name) + '” และทางทั้งหมด' + (n ? ' (มีศิษย์บันทึกว่าต่อแล้ว ' + n + ' คน บันทึกเหล่านั้นจะไม่แสดง)' : ''), 'ลบ', true))) return;
      A.W(B.remove('songs/' + gid)); A.log('song.del', '', g.name); w.remove(); location.hash = '#/songs';
    });
  }
  function tangForm(gid, tid) {
    const g = songs()[gid], t = tid ? g.tang[tid] : { from: C.master.short };
    const w = modal('<h3>' + (tid ? 'แก้ไขทางเพลง' : 'เพิ่มทางเพลง') + '</h3><div class="muted" style="margin-bottom:10px">' + esc(g.name) + '</div><form class="form">' +
      fld('ชื่อทาง', '<input class="in" id="t-n" value="' + esc(t.name || '') + '" placeholder="เช่น ทางระนาดเอก (ทางสำนัก) / ทางเดี่ยว / ทางร้อง" required>') +
      '<div class="g3">' + fld('เครื่องดนตรี / ประเภท', '<select class="in" id="t-i">' + opt(A.instList().concat(t.inst && !A.instList().includes(t.inst) ? [t.inst] : []).map(i => [i, i]), t.inst) + '</select>') + fld('ครูผู้ถ่ายทอด', '<input class="in" id="t-f" value="' + esc(t.from || '') + '">') + '</div>' +
      fld('คำอธิบายทาง (ศิษย์ทุกคนเห็น)', '<textarea class="in" id="t-o" rows="3" placeholder="ลักษณะเด่น เงื่อนไขการต่อ — ห้ามใส่ตัวโน้ตที่นี่">' + esc(t.desc || '') + '</textarea>', 'ตัวโน้ต ลิงก์ และไฟล์โน้ต ให้ใส่ที่การ์ด “โน้ตเพลง” ซึ่งจำกัดสิทธิ์รายเพลง (แอดมินและผู้เก็บรวบรวมโน้ต)') +
      '<div class="note bad" id="t-err" hidden></div><div class="row" style="margin-top:14px">' + (tid ? '<button type="button" class="btn ghost danger" id="t-del">ลบทาง</button>' : '') + '<button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true, wide: true });
    $('form', w).addEventListener('submit', e => {
      e.preventDefault(); const v = k => $(k, w).value.trim(), err = s => { const el = $('#t-err', w); el.textContent = s; el.hidden = false; };
      if (!v('#t-n')) return err('กรอกชื่อทาง');
      const rec = { name: v('#t-n'), inst: v('#t-i'), from: v('#t-f') || null, desc: v('#t-o') || null };
      A.W(B.set('songs/' + gid + '/tang/' + (tid || 't' + B.uid()), rec)); A.log('song.tang', '', g.name + ' · ' + rec.name); w.remove(); toast('บันทึกแล้ว');
    });
    const del = $('#t-del', w); if (del) del.addEventListener('click', async () => { if (!(await M.confirmBox('ลบทางเพลง', esc(t.name), 'ลบ', true))) return; A.W(B.remove('songs/' + gid + '/tang/' + tid)); w.remove(); });
  }
  /* บันทึกเพลงที่ต่อแล้ว — ศิษย์บันทึกของตนเอง (รอยืนยัน) แอดมินบันทึกให้ใครก็ได้ (ยืนยันทันที) */
  function learnForm(gid, sid) {
    sid = sid || A.sid(); if (!sid) return; const all = list(); if (!all.length) return toast('ยังไม่มีเพลงในทะเบียน — แจ้งแอดมินให้เพิ่มเพลงก่อน', 4000);
    const cur = gid ? ((learned()[sid] || {})[gid] || {}) : {};
    const tOpts = id => { const g = songs()[id]; return [['', '— ทางอื่น / ไม่ระบุ —']].concat(g ? tangs(Object.assign({ id }, g)).map(t => [t.id, t.name + ' · ' + (t.inst || '')]) : []); };
    const w = modal('<h3>บันทึกเพลงที่ต่อแล้ว</h3><div class="muted" style="margin-bottom:10px">' + esc(A.fullName(A.members()[sid])) + (A.teacher() ? '' : ' · แอดมินจะตรวจและยืนยัน') + '</div><form class="form">' +
      fld('เพลง', '<select class="in" id="l-g">' + opt(all.map(g => [g.id, g.name + ' (' + (g.cat || '') + ')']), gid || all[0].id) + '</select>') +
      fld('ทาง', '<select class="in" id="l-t">' + opt(tOpts(gid || all[0].id), cur.tang || '') + '</select>') +
      '<div class="g3">' + fld('เครื่องดนตรี', '<select class="in" id="l-i">' + opt(A.instList().map(i => [i, i]), cur.inst || A.insts(A.members()[sid])[0] || '') + '</select>') + fld('ต่อจาก (ครูผู้ถ่ายทอด)', '<input class="in" id="l-f" value="' + esc(cur.from || A.masterName(A.members()[sid])) + '">') + fld('ปีที่ต่อ (พ.ศ.)', '<input class="in" id="l-y" inputmode="numeric" value="' + esc(cur.year || '') + '">') + '</div>' +
      '<div class="row" style="margin-top:14px">' + (cur.at ? '<button type="button" class="btn ghost danger" id="l-del">ลบบันทึก</button>' : '') + '<button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true, wide: true });
    $('#l-g', w).addEventListener('change', e => { $('#l-t', w).innerHTML = opt(tOpts(e.target.value), ''); const t = (songs()[e.target.value].tang || {}); const f = Object.values(t)[0]; if (f && f.inst) $('#l-i', w).value = f.inst; });
    $('#l-t', w).addEventListener('change', e => { const t = (songs()[$('#l-g', w).value].tang || {})[e.target.value]; if (t) { if (t.inst) $('#l-i', w).value = t.inst; } });
    $('form', w).addEventListener('submit', e => {
      e.preventDefault(); const g = $('#l-g', w).value, y = $('#l-y', w).value.trim(); if (y && !/^25[0-9]{2}$/.test(y)) return toast('ปีต้องเป็น พ.ศ. 4 หลัก');
      const rec = { tang: $('#l-t', w).value || null, inst: $('#l-i', w).value, from: $('#l-f', w).value.trim() || null, year: y || null, at: Date.now(), ok: A.teacher() };
      A.W(B.set('learned/' + sid + '/' + g, rec)); A.log('song.learned', sid, songs()[g].name);
      if (!A.teacher() && window.PUSH && window.PUSH.notify) try { window.PUSH.notify('sub', { ref: 'learned/' + sid + '/' + g }); } catch (er) { /* ignore */ }
      w.remove(); toast(A.teacher() ? 'บันทึกแล้ว' : 'บันทึกแล้ว รอแอดมินยืนยัน');
    });
    const del = $('#l-del', w); if (del) del.addEventListener('click', () => { A.W(B.remove('learned/' + sid + '/' + gid)); w.remove(); });
  }
  /* แอดมินบันทึกผู้ต่อเพลงหลายคนพร้อมกัน (เช่น หลังวันต่อเพลงหมู่) */
  function recordMany(gid) {
    const g = songs()[gid], ms = A.members(), has = new Set(whoKnows(gid).map(x => x.sid));
    const w = modal('<h3>บันทึกผู้ต่อเพลง “' + esc(g.name) + '”</h3><form class="form">' + fld('ทาง', '<select class="in" id="r-t">' + opt([['', '— ไม่ระบุ —']].concat(tangs(Object.assign({ id: gid }, g)).map(t => [t.id, t.name + ' · ' + (t.inst || '')]))) + '</select>') +
      '<div class="g3">' + fld('ต่อจาก', '<input class="in" id="r-f" value="' + esc(C.master.short) + '">') + fld('ปี (พ.ศ.)', '<input class="in" id="r-y" inputmode="numeric" value="' + esc(String(new Date().getFullYear() + 543)) + '">') + '</div>' +
      '<div class="fld"><span>ศิษย์</span><div class="plist">' + A.activeSids().sort(A.byClass).map(s => '<label class="ck wide"><input type="checkbox" name="rm" value="' + esc(s) + '"' + (has.has(s) ? ' disabled checked' : '') + '><span>' + esc(A.fullName(ms[s]) + A.nickTxt(ms[s])) + ' <small class="muted">' + esc(A.cls(ms[s])) + (has.has(s) ? ' · บันทึกไว้แล้ว' : '') + '</small></span></label>').join('') + '</div></div>' +
      '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { sticky: true, wide: true });
    $('form', w).addEventListener('submit', e => {
      e.preventDefault(); const tid = $('#r-t', w).value, t = (g.tang || {})[tid] || {}, upd = {}, now = Date.now();
      const sel = $$('input[name=rm]:checked:not([disabled])', w).map(c => c.value); if (!sel.length) return toast('เลือกศิษย์อย่างน้อย 1 คน');
      sel.forEach(s => { upd['learned/' + s + '/' + gid] = { tang: tid || null, inst: t.inst || A.insts(ms[s])[0] || '', from: $('#r-f', w).value.trim() || null, year: $('#r-y', w).value.trim() || null, at: now, ok: true }; });
      A.W(B.update('', upd)); A.log('song.learnedMany', '', g.name + ' ' + sel.length + ' คน'); w.remove(); toast('บันทึก ' + sel.length + ' คนแล้ว');
    });
  }

  Object.assign(A.ACT, {
    sgCat: d => { SG.cat = d.c || ''; A.rerender(); },
    ntAcl: d => { if (A.teacher()) aclForm(d.g); }, ntMember: d => { if (A.teacher()) memberAclForm(d.sid); },
    ntEdit: d => { if (canNote()) noteForm(d.g, d.t); },
    ntGrant: d => { if (!A.teacher()) return; const g = songs()[d.g]; A.W(B.update('', { ['noteacc/' + d.sid + '/' + d.g]: { at: Date.now(), by: A.myName() }, ['notereq/' + d.sid + '/' + d.g]: null })); A.log('note.grant', d.sid, g.name); if (window.PUSH) window.PUSH.notify('note', { to: [d.sid], title: 'ได้รับสิทธิ์ดูโน้ต: ' + g.name, body: 'เปิดดูได้ที่ คลังวิชา › เพลงและทางเพลง', url: '#/song/' + d.g }); toast('อนุญาตแล้ว'); },
    ntDeny: d => { if (A.teacher()) { A.W(B.remove('notereq/' + d.sid + '/' + d.g)); toast('ปฏิเสธคำขอแล้ว'); } },
    ntReq: d => {
      const sid = A.sid(); if (!sid) return; const g = songs()[d.g];
      const w = modal('<h3>ขอสิทธิ์ดูโน้ต</h3><div class="muted" style="margin-bottom:10px">' + esc(g.name) + '</div><form class="form">' + fld('ข้อความถึงแอดมิน (ไม่บังคับ)', '<input class="in" id="rq-m" maxlength="250" placeholder="เช่น ครูต่อเพลงนี้ให้แล้วเมื่อ…">') + '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">ส่งคำขอ</button></div></form>', { center: true, sticky: true });
      $('form', w).addEventListener('submit', e => { e.preventDefault(); A.W(B.set('notereq/' + sid + '/' + d.g, { at: Date.now(), msg: $('#rq-m', w).value.trim() || null })); if (window.PUSH) try { window.PUSH.notify('sub', { ref: 'notereq/' + sid + '/' + d.g }); } catch (er) { /* ignore */ } w.remove(); toast('ส่งคำขอแล้ว'); });
    },
    ntUnreq: d => { if (A.sid()) A.W(B.remove('notereq/' + A.sid() + '/' + d.g)); },
    ntFile: async d => {
      const x = ((NT[d.g] || {})[d.t] || {}), f = x.file || {}; let url = '';
      const w = modal('<h3>' + esc(f.name || 'ไฟล์โน้ต') + '</h3><div id="nv" class="muted">กำลังโหลด …</div><button class="btn ghost block" data-close style="margin-top:12px">ปิด</button>', { center: true, wide: true, onClose: () => { if (url) URL.revokeObjectURL(url); } });
      try { const data = await B.get('notefiles/' + d.g + '/' + d.t); if (!data) throw new Error('ไม่พบไฟล์'); const blob = toBlob(data); url = URL.createObjectURL(blob);
        $('#nv', w).innerHTML = (/^image\//.test(blob.type) ? '<img src="' + url + '" alt="โน้ต" style="max-width:100%;border-radius:10px">' : '<iframe src="' + url + '" title="โน้ต" style="width:100%;height:65vh;border:1px solid var(--line);border-radius:10px"></iframe>') + '<div class="row wrap" style="margin-top:10px"><a class="btn sm" href="' + url + '" target="_blank" rel="noopener">เปิดในแท็บใหม่</a></div>';
      } catch (er) { $('#nv', w).textContent = 'เปิดไฟล์ไม่ได้: ' + (er.message || A.errTH(er)); }
    },
    sgNew: () => { if (canEdit()) songForm(null); }, sgEdit: d => { if (canEdit()) songForm(d.g); },
    sgTang: d => { if (canEdit()) tangForm(d.g, d.t); },
    sgLearn: d => learnForm(d.g), sgMine: () => learnForm(null),
    sgRecord: d => { if (A.teacher()) recordMany(d.g); },
    sgOk: d => { if (A.teacher()) { A.W(B.set('learned/' + d.sid + '/' + d.g + '/ok', true)); toast('ยืนยันแล้ว'); } },
    sgUnlearn: async d => { if (!A.teacher()) return; if (!(await M.confirmBox('ไม่ยืนยัน', 'ลบบันทึกนี้ออก', 'ลบ', true))) return; A.W(B.remove('learned/' + d.sid + '/' + d.g)); },
    sgCats: () => {
      if (!canEdit()) return; const w = modal('<h3>ประเภทเพลง</h3><form class="form"><div class="muted" style="margin-bottom:8px">หนึ่งประเภทต่อหนึ่งบรรทัด ลำดับนี้ใช้เรียงเพลง</div><textarea class="in" id="sc" rows="10" aria-label="ประเภทเพลง">' + esc(cats().join('\n')) + '</textarea><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true });
      $('form', w).addEventListener('submit', e => { e.preventDefault(); const l = Array.from(new Set($('#sc', w).value.split(/\r?\n/).map(s => s.trim()).filter(Boolean))); if (!l.length) return toast('ต้องมีอย่างน้อยหนึ่งประเภท'); A.W(B.set('config/songCats', l)); w.remove(); toast('บันทึกแล้ว'); });
    }
  });
  A.songStats = () => ({ songs: list().length, tangs: list().reduce((n, g) => n + tangs(g).length, 0), learned: Object.keys(learned()).reduce((n, s) => n + Object.keys(learned()[s] || {}).length, 0) });
  A.songList = list;
})();
