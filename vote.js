/* ============================================================
   vote.js — ขั้นที่ 6: โหวตทั่วไป · หยั่งเสียงคณะกรรมการเครือข่าย · ร้องทุกข์ถึงแอดมิน (ข้อความลับ)
   ข้อมูล: polls/{pid} · ballots/{pid}/{sid} (เขียนได้ครั้งเดียว) · griev/{sid}/{gid}
   - โหวตลับ/หยั่งเสียง: ศิษย์อ่านบัตรของคนอื่นไม่ได้ แอดมินนับแล้วกด “ประกาศผล” (แอดมินเห็นรายบุคคล)
   - ร้องทุกข์: ส่งได้เฉพาะตอนออนไลน์ ไม่เก็บค้างในเครื่อง อ่านได้เฉพาะเจ้าตัวกับแอดมิน
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP;
  const { $, $$, esc, toast, modal } = M; const { ic, chip, fld, opt } = A;
  const KINDS = [['yesno', 'เห็นด้วย / ไม่เห็นด้วย'], ['single', 'เลือก 1 ข้อ'], ['multi', 'เลือกได้หลายข้อ'], ['score', 'ให้คะแนน 1–5 ทุกข้อ']];
  const WHO = [['all', 'ศิษย์ทุกคน'], ['notstart', 'ไม่รวมศิษย์ใหม่'], ['regular', 'เฉพาะประเภท “ศิษย์”']];
  const POS = { president: 'ประธานเครือข่ายศิษย์', vice: 'รองประธาน' };
  const MY = {}, ALL = {};   /* บัตรของฉัน / บัตรทั้งหมดของโพล (โหลดเมื่อใช้) */

  A.SUBS.push({ key: 'polls', path: () => 'polls' });
  A.NAVS.push({ id: 'vote', label: 'โหวต', icon: 'vote', order: 70, badge: () => A.teacher() ? 0 : polls().filter(p => p.status === 'open' && eligible(p, A.sid()) && MY[p.id] === false).length },
    { id: 'griev', label: 'ร้องทุกข์', icon: 'lock', order: 75, badge: () => A.teacher() ? gNew() : 0 });

  const polls = () => Object.keys(A.D.polls || {}).map(id => Object.assign({ id }, A.D.polls[id])).filter(p => p.title).sort((a, b) => b.createdAt - a.createdAt);
  const optsOf = p => p.kind === 'yesno' ? ['เห็นด้วย', 'ไม่เห็นด้วย', 'งดออกเสียง'] : (p.options || []);
  const eligible = (p, sid) => { const m = A.members()[sid]; return !!m && m.status === 'active' && (p.who === 'regular' ? m.type === 'regular' : p.who === 'notstart' ? m.type !== 'start' : true); };
  const voters = p => A.activeSids().filter(s => eligible(p, s));
  const canSeeAll = p => A.teacher() || (p.openBallot && !p.election);
  function loadMine(p) { const sid = A.sid(); if (!sid || MY[p.id] !== undefined) return; MY[p.id] = null; B.get('ballots/' + p.id + '/' + sid).then(v => { MY[p.id] = v || false; }).catch(() => { MY[p.id] = false; }).then(A.rerender); }
  function loadAll(p, force) { if (!canSeeAll(p) || (ALL[p.id] !== undefined && !force)) return; if (!force) ALL[p.id] = null; B.get('ballots/' + p.id).then(v => { ALL[p.id] = v || {}; }).catch(() => { ALL[p.id] = {}; }).then(A.rerender); }
  function tally(p, bal) {
    const o = optsOf(p), c = o.map(() => 0); let n = 0;
    Object.keys(bal || {}).forEach(s => { const v = bal[s].v; n++; if (p.kind === 'multi') (v || []).forEach(i => { if (c[i] !== undefined) c[i]++; }); else if (p.kind === 'score') o.forEach((_, i) => { c[i] += +((v || {})[i] || 0); }); else if (c[v] !== undefined) c[v]++; });
    return { counts: p.kind === 'score' ? c.map(x => n ? Math.round(x / n * 100) / 100 : 0) : c, n };
  }
  function resultHTML(p, r) {
    const o = optsOf(p), max = p.kind === 'score' ? 5 : Math.max(1, ...r.counts);
    return '<div class="res">' + o.map((t, i) => '<div class="res-r"><div class="row"><span class="grow">' + esc(t) + '</span><b>' + r.counts[i] + (p.kind === 'score' ? ' / 5' : ' เสียง') + '</b></div><div class="lvbar"><i style="width:' + (r.counts[i] / max * 100) + '%"></i></div></div>').join('') + '<div class="muted">ผู้ลงคะแนน ' + r.n + ' จาก ' + voters(p).length + ' คน</div></div>';
  }
  function ballotForm(p) {
    const o = optsOf(p); let h = '<form class="form vform" data-pid="' + esc(p.id) + '">';
    if (p.kind === 'score') h += o.map((t, i) => '<div class="fld"><span>' + esc(t) + '</span><div class="checks">' + [1, 2, 3, 4, 5].map(n => '<label class="ck"><input type="radio" name="s' + i + '" value="' + n + '"><span>' + n + '</span></label>').join('') + '</div></div>').join('');
    else h += '<div class="vopts">' + o.map((t, i) => '<label class="ck wide"><input type="' + (p.kind === 'multi' ? 'checkbox' : 'radio') + '" name="v" value="' + i + '"><span>' + esc(t) + '</span></label>').join('') + '</div>';
    return h + '<button class="btn block" style="margin-top:8px">ยืนยันการลงคะแนน</button><div class="muted" style="margin-top:6px">ลงคะแนนแล้วแก้ไขไม่ได้</div></form>';
  }
  function pollCard(p) {
    const T = A.teacher(), sid = A.sid(), open = p.status === 'open'; if (!T) loadMine(p); if (canSeeAll(p)) loadAll(p);
    let h = '<section class="card"><div class="row"><div class="lb grow" style="margin:0">' + (p.election ? 'หยั่งเสียงตำแหน่ง' + POS[p.election] : KINDS.find(k => k[0] === p.kind)[1]) + '</div>' + chip(open ? 'เปิดอยู่' : 'ปิดแล้ว', open ? 'gold' : 'line') + '</div>' +
      '<h3 style="margin:8px 0 4px">' + esc(p.title) + '</h3>' + (p.desc ? '<div class="muted" style="white-space:pre-line">' + esc(p.desc) + '</div>' : '') + '<div class="muted">ผู้มีสิทธิ์: ' + WHO.find(w => w[0] === (p.who || 'all'))[1] + ' · ' + (p.election || !p.openBallot ? 'ลงคะแนนลับ' : 'เปิดเผยชื่อผู้ลงคะแนน') + '</div>';
    if (p.election || !p.openBallot) h += '<div class="note warn">' + (p.election ? 'ศิษย์จะไม่เห็นว่าใครเลือกใคร แต่แอดมินเห็นผลรายบุคคล ผลหยั่งเสียงเป็นข้อมูลประกอบการพิจารณาแต่งตั้งของแอดมิน' : 'ศิษย์เห็นเฉพาะผลรวมเมื่อแอดมินประกาศผล แอดมินเห็นผลรายบุคคล') + '</div>';
    if (!T) {
      if (!eligible(p, sid)) h += '<div class="muted">คุณไม่อยู่ในกลุ่มผู้มีสิทธิ์ลงคะแนนของรายการนี้</div>';
      else if (MY[p.id] === null || MY[p.id] === undefined) h += '<div class="muted">กำลังโหลด…</div>';
      else if (MY[p.id]) h += '<div class="row" style="margin-top:8px">' + chip('คุณลงคะแนนแล้ว', 'ok') + '</div>';
      else if (open) h += ballotForm(p); else h += '<div class="muted">ปิดรับคะแนนแล้ว (คุณไม่ได้ลงคะแนน)</div>';
    }
    if (p.result) h += '<div class="lb" style="margin-top:12px">ผลที่ประกาศ</div>' + resultHTML(p, p.result);
    else if (canSeeAll(p) && ALL[p.id]) h += '<div class="lb" style="margin-top:12px">' + (T ? 'ผลขณะนี้ (ยังไม่ประกาศให้ศิษย์เห็น)' : 'ผลขณะนี้') + '</div>' + resultHTML(p, tally(p, ALL[p.id]));
    else if (!T && !open) h += '<div class="muted" style="margin-top:8px">รอแอดมินประกาศผล</div>';
    if (T) h += '<div class="row wrap" style="margin-top:12px"><button class="btn ghost sm" data-act="pollWho" data-id="' + esc(p.id) + '">ดูรายบุคคล</button><button class="btn ghost sm" data-act="pollReload" data-id="' + esc(p.id) + '">นับใหม่</button>' +
      (open ? '<button class="btn sm" data-act="pollClose" data-id="' + esc(p.id) + '">ปิดรับคะแนน</button>' : '<button class="btn ghost sm" data-act="pollReopen" data-id="' + esc(p.id) + '">เปิดอีกครั้ง</button>') + '<button class="btn gold sm" data-act="pollPublish" data-id="' + esc(p.id) + '">' + (p.result ? 'ประกาศผลใหม่' : 'ประกาศผล') + '</button><button class="btn ghost sm danger" data-act="pollDel" data-id="' + esc(p.id) + '">ลบ</button></div>';
    return h + '</section>';
  }
  A.V.vote = function () {
    const l = polls(), el = l.filter(p => p.election), ge = l.filter(p => !p.election);
    let b = A.teacher() ? '<div class="row wrap" style="margin-bottom:14px"><button class="btn" data-act="pollNew" data-m="general">' + ic('plus', 18) + 'เปิดโหวตทั่วไป</button><button class="btn gold" data-act="pollNew" data-m="election">' + ic('plus', 18) + 'เปิดหยั่งเสียงคณะกรรมการเครือข่าย</button></div>' : '';
    b += '<div class="mo-h">หยั่งเสียงคณะกรรมการเครือข่าย</div>' + (el.map(pollCard).join('') || '<section class="card"><div class="muted">ยังไม่มีการหยั่งเสียง</div></section>') + '<div class="mo-h">โหวตทั่วไป</div>' + (ge.map(pollCard).join('') || '<section class="card"><div class="muted">ยังไม่มีโหวต</div></section>');
    return { title: 'โหวตและหยั่งเสียง', body: b };
  };
  A.TODO.push(() => { if (A.teacher()) { const n = polls().filter(p => p.status === 'open').length; return n ? { n, label: 'โหวตที่เปิดรับคะแนนอยู่', sub: 'ปิดรับและประกาศผลได้ที่เมนูโหวต', href: '#/vote' } : null; }
    const l = polls().filter(p => p.status === 'open' && eligible(p, A.sid())); l.forEach(loadMine); return l.filter(p => MY[p.id] === false).map(p => ({ badge: 'โหวต', label: p.title, sub: p.election ? 'หยั่งเสียงคณะกรรมการเครือข่าย รอคุณลงคะแนน' : 'เปิดอยู่ รอคุณลงคะแนน', href: '#/vote', hot: true })); });

  function pollForm(mode) {
    const el = mode === 'election', ms = A.members();
    const w = modal('<h3>' + (el ? 'เปิดหยั่งเสียงคณะกรรมการเครือข่าย' : 'เปิดโหวตทั่วไป') + '</h3><form class="form">' +
      (el ? fld('ตำแหน่ง', '<select class="in" id="p-pos">' + opt([['president', 'ประธานเครือข่ายศิษย์'], ['vice', 'รองประธาน']]) + '</select>') + fld('หัวข้อ', '<input class="in" id="p-title" value="หยั่งเสียงตำแหน่งประธานเครือข่ายศิษย์ ปี ' + (+A.year() + 1) + '" required>')
        : fld('หัวข้อ', '<input class="in" id="p-title" required>') + fld('รูปแบบ', '<select class="in" id="p-kind">' + opt(KINDS) + '</select>')) +
      fld('คำอธิบาย', '<textarea class="in" id="p-desc" rows="2"></textarea>') +
      (el ? '<div class="fld"><span>ผู้ได้รับการเสนอชื่อ</span><div class="plist">' + A.activeSids().sort(A.byClass).map(s => '<label class="ck wide"><input type="checkbox" name="cd" value="' + esc(s) + '"><span>' + esc(A.fullName(ms[s])) + ' <small class="muted">' + esc(A.cls(ms[s]) + ' · ' + A.typeName(ms[s].type)) + '</small></span></label>').join('') + '</div></div>'
        : '<div id="p-ow" hidden>' + fld('ตัวเลือก (หนึ่งข้อต่อหนึ่งบรรทัด)', '<textarea class="in" id="p-opts" rows="4"></textarea>') + '</div><label class="ck wide"><input type="checkbox" id="p-open"><span>เปิดเผยชื่อผู้ลงคะแนน และให้ศิษย์เห็นผลสด</span></label>') +
      fld('ผู้มีสิทธิ์ลงคะแนน', '<select class="in" id="p-who">' + opt(WHO) + '</select>') + '<div class="note bad" id="p-err" hidden></div><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">เปิดรับคะแนน</button></div></form>', { sticky: true, wide: true });
    if (el) $('#p-pos', w).addEventListener('change', e => { $('#p-title', w).value = 'หยั่งเสียงตำแหน่ง' + POS[e.target.value] + ' ปี ' + (+A.year() + 1); });
    else $('#p-kind', w).addEventListener('change', e => { $('#p-ow', w).hidden = e.target.value === 'yesno'; });
    $('form', w).addEventListener('submit', e => {
      e.preventDefault(); const v = id => $(id, w).value.trim(), err = x => { const k = $('#p-err', w); k.textContent = x; k.hidden = false; };
      const rec = { title: v('#p-title'), desc: v('#p-desc') || null, who: v('#p-who'), status: 'open', createdAt: Date.now(), by: A.myName(), y: A.year() }; if (!rec.title) return err('กรอกหัวข้อ');
      if (el) { const cd = $$('input[name=cd]:checked', w).map(c => c.value); if (cd.length < 2) return err('เลือกผู้ได้รับการเสนอชื่ออย่างน้อย 2 คน'); rec.election = v('#p-pos'); rec.kind = 'single'; rec.openBallot = false; rec.options = cd.map(s => A.fullName(ms[s]) + ' · ' + A.cls(ms[s])).concat(['ไม่ประสงค์ลงคะแนน']); rec.optSids = cd; }
      else { rec.kind = v('#p-kind'); rec.openBallot = $('#p-open', w).checked; if (rec.kind !== 'yesno') { rec.options = Array.from(new Set(v('#p-opts').split(/\r?\n/).map(s => s.trim()).filter(Boolean))); if (rec.options.length < 2) return err('ใส่ตัวเลือกอย่างน้อย 2 ข้อ'); } }
      A.W(B.set('polls/' + B.uid(), JSON.parse(JSON.stringify(rec)))); A.log('poll.new', '', rec.title); window.PUSH && PUSH.notify('poll', { title: 'เปิดโหวต: ' + rec.title, body: 'เข้าแอปเพื่อลงคะแนน', url: '#/vote' }); w.remove(); toast('เปิดรับคะแนนแล้ว');
    });
  }
  document.addEventListener('submit', async e => {
    const f = e.target.closest('.vform'); if (!f) return; e.preventDefault(); const pid = f.dataset.pid, p = polls().find(x => x.id === pid), sid = A.sid(); if (!p || !sid || p.status !== 'open' || !eligible(p, sid)) return;
    let v; if (p.kind === 'score') { v = {}; const o = optsOf(p); for (let i = 0; i < o.length; i++) { const c = f.querySelector('input[name=s' + i + ']:checked'); if (!c) return toast('ให้คะแนนให้ครบทุกข้อ'); v[i] = +c.value; } }
    else if (p.kind === 'multi') { v = $$('input[name=v]:checked', f).map(c => +c.value); if (!v.length) return toast('เลือกอย่างน้อย 1 ข้อ'); }
    else { const c = f.querySelector('input[name=v]:checked'); if (!c) return toast('เลือก 1 ข้อ'); v = +c.value; }
    if (!(await M.confirmBox('ยืนยันการลงคะแนน', 'ลงคะแนนแล้วแก้ไขไม่ได้', 'ยืนยัน'))) return;
    const rec = { v, at: Date.now() }; try { await B.direct('set', 'ballots/' + pid + '/' + sid, rec); MY[pid] = rec; if (ALL[pid]) ALL[pid][sid] = rec; toast('ลงคะแนนแล้ว'); A.rerender(); } catch (er) { toast('ลงคะแนนไม่สำเร็จ — ตรวจอินเทอร์เน็ต หรือคุณอาจลงคะแนนไปแล้ว', 4500); delete MY[pid]; A.rerender(); }
  });

  /* ============ ร้องทุกข์ ============ */
  const TOPICS = ['การต่อเพลง / การเรียน', 'เพื่อนศิษย์', 'เครื่องดนตรี / อุปกรณ์', 'การเงิน', 'เรื่องส่วนตัว', 'อื่น ๆ'];
  const GST = { new: ['แอดมินยังไม่ได้เปิดอ่าน', 'gold'], doing: ['กำลังดำเนินการ', 'plum'], done: ['เสร็จสิ้น', 'ok'] };
  const G = { data: undefined };
  function gLoad(force) { if (G.data !== undefined && !force) return; if (!force) G.data = null; const sid = A.sid();
    B.get(A.teacher() ? 'griev' : 'griev/' + sid).then(v => { G.data = A.teacher() ? (v || {}) : { [sid]: v || {} }; }).catch(() => { G.data = {}; }).then(A.rerender); }
  const gList = () => { const o = []; Object.keys(G.data || {}).forEach(s => Object.keys(G.data[s] || {}).forEach(id => o.push(Object.assign({ sid: s, id }, G.data[s][id])))); return o.sort((a, b) => b.at - a.at); };
  const gNew = () => { if (G.data === undefined) gLoad(); return gList().filter(g => g.status === 'new').length; };
  let gSeen = 0;
  A.V.griev = function () {
    if (Date.now() - gSeen > 15000) { gSeen = Date.now(); gLoad(G.data !== undefined); } else gLoad(); const T = A.teacher(), l = gList();
    let b = '<section class="card"><div class="row">' + ic('lock', 28) + '<div class="grow"><b>ร้องทุกข์ถึงแอดมิน</b><div class="muted">ข้อความลับ อ่านได้เฉพาะผู้ส่งกับแอดมิน กรรมการเครือข่ายอ่านไม่ได้</div></div></div>' +
      (T ? '' : '<div class="note warn">เหตุเร่งด่วนหรืออันตราย ให้ติดต่อแอดมินโดยตรงทันที ระบบนี้ไม่มีการแจ้งเตือนถึงแอดมิน<br>หากเรื่องเกี่ยวกับแอดมินเอง ให้แจ้งแอดมินประจำชั้นหรือฝ่ายกิจการศิษย์ของโรงเรียน</div><button class="btn block" data-act="gNew">เขียนเรื่องร้องทุกข์</button>') +
      '<div class="row" style="margin-top:10px"><button class="btn ghost sm" data-act="gReload">โหลดล่าสุด</button></div></section>';
    b += '<section class="card"><div class="lb">' + (T ? 'เรื่องทั้งหมด (' + l.length + ')' : 'เรื่องของฉัน') + '</div>' + (G.data === null ? '<div class="muted">กำลังโหลด…</div>' : l.map(g => { const m = A.members()[g.sid] || {};
      return '<div class="li"><div class="row"><b class="grow">' + esc(g.topic) + (T ? ' · ' + esc(A.fullName(m)) + ' (' + esc(A.cls(m)) + ')' : '') + '</b>' + chip(GST[g.status][0], GST[g.status][1]) + '</div><div class="muted">' + esc(M.thDate(g.at)) + '</div><div style="white-space:pre-line;margin:6px 0">' + esc(g.text) + '</div>' +
        (g.reply ? '<div class="note"><b>แอดมินตอบ</b> (' + esc(M.thDate(g.replyAt)) + ')<br><span style="white-space:pre-line">' + esc(g.reply) + '</span></div>' : '') + (T ? '<button class="btn ghost sm" data-act="gReply" data-sid="' + esc(g.sid) + '" data-id="' + esc(g.id) + '">ตอบ / เปลี่ยนสถานะ</button>' : '') + '</div>'; }).join('') || '<div class="muted">ยังไม่มีเรื่อง</div>') + '</section>';
    return { title: 'ร้องทุกข์', body: b };
  };
  A.TODO.push(() => A.teacher() ? { n: gNew(), label: 'เรื่องร้องทุกข์ใหม่', href: '#/griev' } : null);

  Object.assign(A.ACT, {
    pollNew: d => { if (A.teacher()) pollForm(d.m); },
    pollReload: d => { const p = polls().find(x => x.id === d.id); if (p) { loadAll(p, true); toast('กำลังนับใหม่'); } },
    pollClose: d => { if (A.teacher()) A.W(B.update('polls/' + d.id, { status: 'closed', closedAt: Date.now() })); },
    pollReopen: d => { if (A.teacher()) A.W(B.update('polls/' + d.id, { status: 'open', closedAt: null })); },
    pollPublish: async d => { if (!A.teacher()) return; const p = polls().find(x => x.id === d.id); let bal; try { bal = (await B.get('ballots/' + d.id)) || {}; } catch (e) { return toast('อ่านบัตรไม่ได้'); } ALL[d.id] = bal; const r = tally(p, bal); r.at = Date.now();
      if (!(await M.confirmBox('ประกาศผล', 'ศิษย์ทุกคนจะเห็นผลรวม (ไม่เห็นว่าใครเลือกอะไร) ผู้ลงคะแนน ' + r.n + ' คน', 'ประกาศผล'))) return; A.W(B.update('polls/' + d.id, { result: r })); toast('ประกาศผลแล้ว'); },
    pollDel: async d => { if (!A.teacher()) return; if (!(await M.confirmBox('ลบโหวต', 'โหวตและบัตรลงคะแนนทั้งหมดจะถูกลบ', 'ลบ', true))) return; A.W(B.update('', { ['polls/' + d.id]: null, ['ballots/' + d.id]: null })); },
    pollWho: async d => {
      if (!A.teacher()) return; const p = polls().find(x => x.id === d.id), o = optsOf(p); let bal = {}; try { bal = (await B.get('ballots/' + d.id)) || {}; } catch (e) { /* ignore */ } ALL[d.id] = bal;
      const txt = v => p.kind === 'multi' ? (v || []).map(i => o[i]).join(', ') : p.kind === 'score' ? o.map((t, i) => t + ' ' + ((v || {})[i] || '-')).join(' · ') : o[v];
      const vs = voters(p), yes = vs.filter(s => bal[s]), no = vs.filter(s => !bal[s]);
      modal('<h3>ผลรายบุคคล</h3><div class="muted" style="margin-bottom:10px">' + esc(p.title) + ' · เห็นเฉพาะแอดมิน</div><div class="lb">ลงคะแนนแล้ว (' + yes.length + ')</div>' + (yes.sort(A.byClass).map(s => '<div class="kv"><span>' + esc(A.fullName(A.members()[s]) + ' ' + A.cls(A.members()[s])) + '</span><b>' + esc(txt(bal[s].v)) + '</b></div>').join('') || '<div class="muted">-</div>') +
        '<div class="lb" style="margin-top:14px">ยังไม่ลงคะแนน (' + no.length + ')</div><div class="muted">' + (no.sort(A.byClass).map(s => esc(A.fullName(A.members()[s]))).join(', ') || '-') + '</div><button class="btn ghost block" data-close style="margin-top:14px">ปิด</button>', { center: true, wide: true });
    },
    gReload: () => { gLoad(true); toast('กำลังโหลด'); },
    gNew: () => {
      const sid = A.sid(); if (!sid) return; if (A.STATUS.online === false) return toast('ต้องออนไลน์จึงจะส่งเรื่องได้', 3500);
      const w = modal('<h3>เขียนเรื่องร้องทุกข์</h3><form class="form">' + fld('เรื่องเกี่ยวกับ', '<select class="in" id="g-t">' + opt(TOPICS.map(x => [x, x])) + '</select>') + fld('รายละเอียด', '<textarea class="in" id="g-x" rows="6" required></textarea>', 'ส่งในชื่อของคุณ เพื่อให้แอดมินติดตามและตอบกลับได้') + '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">ส่งถึงแอดมิน</button></div></form>', { center: true, sticky: true });
      $('form', w).addEventListener('submit', async e => { e.preventDefault(); const x = $('#g-x', w).value.trim(); if (x.length < 5) return toast('กรอกรายละเอียด'); const id = B.uid(), rec = { topic: $('#g-t', w).value, text: x, at: Date.now(), status: 'new' };
        try { await B.direct('set', 'griev/' + sid + '/' + id, rec); window.PUSH && PUSH.notify('griev', { ref: id }); if (G.data) { G.data[sid] = G.data[sid] || {}; G.data[sid][id] = rec; } w.remove(); toast('ส่งถึงแอดมินแล้ว'); A.rerender(); } catch (er) { toast('ส่งไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่', 4000); } });
    },
    gReply: d => {
      if (!A.teacher()) return; const g = ((G.data || {})[d.sid] || {})[d.id]; if (!g) return;
      const w = modal('<h3>ตอบเรื่องร้องทุกข์</h3><form class="form">' + fld('สถานะ', '<select class="in" id="g-s">' + opt([['doing', 'กำลังดำเนินการ'], ['done', 'เสร็จสิ้น'], ['new', 'ยังไม่ได้เปิดอ่าน']], g.status === 'new' ? 'doing' : g.status) + '</select>') + fld('ข้อความถึงศิษย์', '<textarea class="in" id="g-r" rows="5">' + esc(g.reply || '') + '</textarea>') + '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true });
      $('form', w).addEventListener('submit', async e => { e.preventDefault(); const ch = { status: $('#g-s', w).value, reply: $('#g-r', w).value.trim() || null, replyAt: Date.now(), replyBy: A.myName() };
        try { await B.direct('update', 'griev/' + d.sid + '/' + d.id, ch); Object.assign(g, ch); w.remove(); toast('บันทึกแล้ว'); A.rerender(); } catch (er) { toast('บันทึกไม่สำเร็จ (ต้องออนไลน์)', 4000); } });
    }
  });
})();
