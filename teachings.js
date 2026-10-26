/* ============================================================
   teachings.js — บันทึกคำสอนและผลงานอาจารย์ (ส่วนหนึ่งของคลังวิชา)
   ข้อมูล: teach/{id} = { kind, title, body, date, src, url, img, status ('ok' | 'pending'), by, at }
           teachfiles/{id} = ภาพประกอบ (base64 ย่อแล้ว โหลดเมื่อเปิดดู) · config/bio · config/masterPhoto
   สิทธิ์: ศิษย์ทุกคนส่งบันทึกได้ (สถานะรอตรวจ) · แอดมินตรวจ แก้ เผยแพร่ ลบ · ศิษย์เห็นเฉพาะที่เผยแพร่แล้วและของตนเอง
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP, C = M.C;
  const { $, esc, toast, modal } = M; const { ic, chip, fld, opt } = A;
  const TC = { kind: '', q: '' };
  const T = () => A.teacher();
  const KINDS = () => C.teachKinds || [['saying', 'คำสอน']];
  const kindName = k => (KINDS().find(x => x[0] === k) || ['', 'อื่น ๆ'])[1];
  const all = () => Object.keys(A.D.teach || {}).map(id => Object.assign({ id }, A.D.teach[id])).filter(x => x.title);
  const visible = () => all().filter(x => x.status === 'ok' || T() || (x.by && x.by.id === A.sid()));
  const pending = () => all().filter(x => x.status !== 'ok');
  A.SUBS.push({ key: 'teach', path: () => 'teach' });
  A.NAVS.push({ id: 'teach', label: 'คำสอนและผลงาน', icon: 'quote', order: 23, badge: () => T() ? pending().length : 0 });
  A.TODO.push(() => T() && pending().length ? { n: pending().length, label: 'บันทึกคำสอน/ผลงานที่ศิษย์ส่ง รอตรวจ', href: '#/teach' } : null);

  const sortKey = x => String(x.date || '') + String(x.at || 0).padStart(15, '0');
  function card(x) {
    const mine = x.by && x.by.id === A.sid(), pend = x.status !== 'ok';
    const body = x.kind === 'saying' ? '<blockquote class="tq">' + esc(x.body || '') + '</blockquote>' : (x.body ? '<div class="tb">' + esc(x.body) + '</div>' : '');
    return '<div class="tcard' + (pend ? ' pend' : '') + '"><div class="row"><b class="grow">' + esc(x.title) + '</b>' + chip(kindName(x.kind), 'plum') + (pend ? chip('รอตรวจ', 'line') : '') + '</div>' + body +
      '<div class="muted">' + esc([x.date ? 'ปี / ช่วงเวลา: ' + x.date : '', x.src ? 'ที่มา: ' + x.src : '', 'บันทึกโดย ' + ((x.by || {}).name || '-')].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="row wrap" style="margin-top:8px">' + (x.img ? '<button class="btn sm ghost" data-act="tcImg" data-id="' + esc(x.id) + '">' + ic('cam', 16) + 'ดูภาพ</button>' : '') + (x.url ? '<a class="btn sm ghost" href="' + esc(x.url) + '" target="_blank" rel="noopener">เปิดลิงก์</a>' : '') +
      (T() && pend ? '<button class="btn sm" data-act="tcOk" data-id="' + esc(x.id) + '">เผยแพร่</button>' : '') + (T() || (mine && pend) ? '<button class="btn sm ghost" data-act="tcEdit" data-id="' + esc(x.id) + '">แก้ไข</button><button class="btn sm ghost danger" data-act="tcDel" data-id="' + esc(x.id) + '">ลบ</button>' : '') + '</div></div>';
  }
  function listHTML() {
    const q = TC.q.trim().toLowerCase(), l = visible().filter(x => (!TC.kind || x.kind === TC.kind) && (!q || (x.title + ' ' + (x.body || '') + ' ' + (x.src || '') + ' ' + (x.date || '')).toLowerCase().includes(q)))
      .sort((a, b) => (a.status === 'ok' ? 1 : 0) - (b.status === 'ok' ? 1 : 0) || sortKey(b).localeCompare(sortKey(a)));
    return l.map(card).join('') || '<div class="empty">' + (visible().length ? 'ไม่พบบันทึกตามเงื่อนไข' : 'ยังไม่มีบันทึก — ศิษย์ทุกคนช่วยกันบันทึกคำสอนและผลงานของอาจารย์ได้') + '</div>';
  }
  A.V.teach = function () {
    const ph = A.cfg().masterPhoto, bio = A.cfg().bio || '';
    let b = '<section class="card hero"><div class="row">' + (ph ? '<img class="av xl ring" src="' + esc(ph) + '" alt="">' : '<span class="av xl ring">' + esc(C.master.short.replace(/^อาจารย์/, '').charAt(0) || 'อ') + '</span>') + '<div class="grow"><div class="hero-name">' + esc(C.master.name) + '</div><div class="hero-sub">' + esc(C.master.title || '') + '</div></div></div>' +
      (bio ? '<div class="tb" style="margin-top:12px">' + esc(bio) + '</div>' : '') + (T() ? '<div class="row wrap" style="margin-top:10px"><button class="btn sm gold" data-act="tcBio">' + ic('edit', 16) + 'แก้ประวัติและรูป</button></div>' : '') + '</section>';
    b += '<div class="row wrap" style="margin-bottom:14px">' + (A.sid() || T() ? '<button class="btn" data-act="tcNew">' + ic('plus', 18) + (T() ? 'เพิ่มบันทึก' : 'ส่งบันทึกคำสอน / ผลงาน') + '</button>' : '') + '</div>';
    const ks = KINDS().filter(k => visible().some(x => x.kind === k[0]));
    b += '<div class="tabs" role="tablist"><button role="tab" aria-selected="' + !TC.kind + '" class="' + (!TC.kind ? 'on' : '') + '" data-act="tcKind" data-k="">ทั้งหมด (' + visible().length + ')</button>' + ks.map(k => '<button role="tab" aria-selected="' + (TC.kind === k[0]) + '" class="' + (TC.kind === k[0] ? 'on' : '') + '" data-act="tcKind" data-k="' + k[0] + '">' + esc(k[1]) + '</button>').join('') + '</div>' +
      '<section class="card"><input id="tcq" class="in" type="search" placeholder="ค้นหาคำสอน ผลงาน ที่มา" value="' + esc(TC.q) + '" aria-label="ค้นหาบันทึก" style="margin-bottom:10px"><div id="tclist">' + listHTML() + '</div></section>';
    return { title: 'คำสอนและผลงาน', body: b, back: '#/kb' };
  };
  document.addEventListener('input', e => { if (e.target.id === 'tcq') { TC.q = e.target.value; const l = $('#tclist'); if (l) l.innerHTML = listHTML(); } });
  /* คำสอนสุ่มหนึ่งข้อบนหน้าหลัก (เปลี่ยนวันละครั้ง) */
  A.HOME.push({ order: 15, html: () => {
    const l = all().filter(x => x.status === 'ok' && x.kind === 'saying'); if (!l.length) return '';
    const d = new Date(), x = l.sort((a, b) => a.id.localeCompare(b.id))[(d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % l.length];
    return '<a class="card quote-card" href="#/teach"><div class="lb">คำสอนวันนี้</div><blockquote class="tq">' + esc((x.body || x.title).slice(0, 280)) + '</blockquote><div class="muted">— ' + esc(C.master.short) + (x.src ? ' · ' + esc(x.src) : '') + '</div></a>';
  } });

  function form(id) {
    const x = id ? A.D.teach[id] : { kind: 'saying' }; let img;
    const w = modal('<h3>' + (id ? 'แก้ไขบันทึก' : T() ? 'เพิ่มบันทึก' : 'ส่งบันทึกคำสอน / ผลงาน') + '</h3><form class="form">' +
      '<div class="g3">' + fld('หมวด', '<select class="in" id="c-k">' + opt(KINDS(), x.kind) + '</select>') + fld('ปี / ช่วงเวลา', '<input class="in" id="c-d" value="' + esc(x.date || '') + '" placeholder="เช่น 2550 หรือ ราว 2540">') + '</div>' +
      fld('หัวเรื่อง', '<input class="in" id="c-t" value="' + esc(x.title || '') + '" required>') + fld('เนื้อหา', '<textarea class="in" id="c-b" rows="6" placeholder="คำสอนตามที่จำได้ เรื่องเล่า รายละเอียดผลงาน">' + esc(x.body || '') + '</textarea>') +
      '<div class="g3">' + fld('ที่มา / ผู้เล่า / โอกาส', '<input class="in" id="c-s" value="' + esc(x.src || '') + '">') + fld('ลิงก์ (ไม่บังคับ)', '<input class="in" id="c-u" inputmode="url" value="' + esc(x.url || '') + '" placeholder="https://">') + '</div>' +
      fld('ภาพประกอบ (ไม่บังคับ)', '<input class="in" type="file" accept="image/*" id="c-i">', 'ระบบย่อภาพให้อัตโนมัติ · ภาพเก่า/จดหมายเหตุให้ถ่ายตรง ๆ แสงพอ') +
      (T() ? '' : '<div class="muted">บันทึกจะแสดงต่อเพื่อนศิษย์เมื่อแอดมินตรวจและกดเผยแพร่แล้ว</div>') +
      '<div class="note bad" id="c-err" hidden></div><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { sticky: true, wide: true });
    $('#c-i', w).addEventListener('change', async e => { const f = e.target.files[0]; if (f) try { img = await M.fileToImage(f, 1400, 0.78); } catch (er) { toast(er.message); } });
    $('form', w).addEventListener('submit', async e => {
      e.preventDefault(); const v = k => $(k, w).value.trim(), err = s => { const el = $('#c-err', w); el.textContent = s; el.hidden = false; };
      if (!v('#c-t')) return err('กรอกหัวเรื่อง'); if (v('#c-u') && !/^https?:\/\//i.test(v('#c-u'))) return err('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
      const nid = id || 'c' + B.uid(), btn = $('button.grow:not(.ghost)', w);
      const rec = { kind: v('#c-k'), title: v('#c-t'), body: v('#c-b').slice(0, 4900) || null, date: v('#c-d') || null, src: v('#c-s') || null, url: v('#c-u') || null };
      if (img) { if (A.STATUS.online === false) return err('ต้องออนไลน์จึงจะอัปโหลดภาพได้'); btn.disabled = true; try { await B.direct('set', 'teachfiles/' + nid, img); rec.img = true; } catch (er) { btn.disabled = false; return err('อัปโหลดภาพไม่สำเร็จ: ' + A.errTH(er)); } }
      if (id) A.W(B.update('teach/' + id, rec));
      else { A.W(B.set('teach/' + nid, Object.assign(rec, { status: T() ? 'ok' : 'pending', by: A.by(), at: Date.now() }))); if (!T() && window.PUSH && window.PUSH.notify) try { window.PUSH.notify('sub', { ref: 'teach/' + nid }); } catch (er) { /* ignore */ } }
      A.log('teach.save', '', rec.title); w.remove(); toast(T() || id ? 'บันทึกแล้ว' : 'ส่งแล้ว รอแอดมินตรวจ');
    });
  }
  Object.assign(A.ACT, {
    tcKind: d => { TC.kind = d.k || ''; A.rerender(); },
    tcNew: () => form(null),
    tcEdit: d => { const x = (A.D.teach || {})[d.id]; if (x && (T() || (x.by && x.by.id === A.sid() && x.status !== 'ok'))) form(d.id); },
    tcOk: d => { if (T()) { A.W(B.update('teach/' + d.id, { status: 'ok', okBy: A.myName(), okAt: Date.now() })); toast('เผยแพร่แล้ว'); } },
    tcDel: async d => { const x = (A.D.teach || {})[d.id]; if (!x || !(T() || (x.by && x.by.id === A.sid() && x.status !== 'ok'))) return; if (!(await M.confirmBox('ลบบันทึก', esc(x.title), 'ลบ', true))) return; A.W(B.update('', { ['teach/' + d.id]: null, ['teachfiles/' + d.id]: null })); },
    tcImg: async d => {
      const x = (A.D.teach || {})[d.id]; if (!x) return; const w = modal('<h3>' + esc(x.title) + '</h3><div id="tv" class="muted">กำลังโหลดภาพ …</div><button class="btn ghost block" data-close style="margin-top:12px">ปิด</button>', { center: true, wide: true });
      try { const src = await B.get('teachfiles/' + d.id); if (!src) throw new Error('ไม่พบภาพ'); $('#tv', w).innerHTML = '<img src="' + esc(src) + '" alt="' + esc(x.title) + '" style="max-width:100%;border-radius:10px">'; } catch (er) { $('#tv', w).textContent = 'เปิดภาพไม่ได้: ' + (er.message || A.errTH(er)); }
    },
    tcBio: () => {
      if (!T()) return; let photo;
      const w = modal('<h3>ประวัติและรูปของอาจารย์</h3><form class="form">' + fld('ประวัติย่อ', '<textarea class="in" id="bi" rows="10">' + esc(A.cfg().bio || '') + '</textarea>') + fld('รูป (ไม่บังคับ)', '<input class="in" type="file" accept="image/*" id="bp">', 'ครอปเป็นสี่เหลี่ยมจัตุรัสอัตโนมัติ') +
        '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึก</button></div></form>', { center: true, sticky: true, wide: true });
      $('#bp', w).addEventListener('change', async e => { const f = e.target.files[0]; if (f) try { photo = await M.fileToSquare(f, 320, 0.84); } catch (er) { toast(er.message); } });
      $('form', w).addEventListener('submit', e => { e.preventDefault(); const upd = { 'config/bio': $('#bi', w).value.trim().slice(0, 4900) || null }; if (photo) upd['config/masterPhoto'] = photo; A.W(B.update('', upd)); w.remove(); toast('บันทึกแล้ว'); });
    }
  });
  A.teachStats = () => ({ n: all().filter(x => x.status === 'ok').length, pend: pending().length });
})();
