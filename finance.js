/* ============================================================
   finance.js — ขั้นที่ 5: บัญชีรายรับรายจ่าย · ใบรับเงิน · ใบเบิกเงิน · ยอดคงเหลือ
   หลัก: สมุดบัญชีเพิ่มอย่างเดียว (แก้ไม่ได้ ผิดให้ยกเลิกแล้วออกใหม่) · เลขที่ใบออกด้วย transaction ตอนออนไลน์
        เหรัญญิกสร้าง → แอดมินอนุมัติ · ยอดคงเหลือคำนวณจากรายการที่อนุมัติแล้ว
   ข้อมูล: y/{ปี}/ledger/{id} · y/{ปี}/counters/{in|out} · y/{ปี}/finsum (สรุปให้ศิษย์ทั่วไปอ่าน)
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP;
  const { $, esc, toast, modal, money } = M; const { ic, chip, fld, opt } = A;
  const Y = () => 'y/' + A.year();
  const seeAll = () => A.teacher() || A.is('president', 'vice', 'treasurer', 'secretary');
  const canMake = () => A.teacher() || A.is('treasurer');
  const CATS = { in: ['ค่าบรรเลง', 'เงินบริจาค', 'กิจกรรม / โครงการ', 'ยอดยกมา', 'อื่น ๆ'], out: ['อุปกรณ์ / เครื่องดนตรี', 'ซ่อมบำรุง', 'อาหาร / เครื่องดื่ม', 'ค่าเดินทาง', 'กิจกรรม / โครงการ', 'อื่น ๆ'] };
  const KN = { in: 'ใบรับเงิน', out: 'ใบเบิกเงิน' };
  const STT = { pending: ['รอแอดมินอนุมัติ', 'gold'], approved: ['แอดมินอนุมัติแล้ว', 'ok'], void: ['ยกเลิก', 'bad'] };
  const FI = { tab: 'all' };

  A.SUBS.push({ key: 'finsum', path: y => 'y/' + y + '/finsum' }, { key: 'ledger', path: y => seeAll() ? 'y/' + y + '/ledger' : null });
  const pend = () => txs().filter(t => t.status === 'pending');
  A.NAVS.push({ id: 'finance', label: 'การเงิน', icon: 'wallet', order: 60, badge: () => A.teacher() ? pend().length : 0 });

  const txs = () => Object.keys(A.D.ledger || {}).map(id => Object.assign({ id }, A.D.ledger[id])).filter(t => t.no).sort((a, b) => (b.date + b.at).localeCompare(a.date + a.at));
  function summarize(list) {
    const s = { bal: 0, inSum: 0, outSum: 0, months: {}, n: 0, at: Date.now() };
    list.filter(t => t.status === 'approved').forEach(t => { const k = t.date.slice(0, 7), a = +t.amount || 0; s.months[k] = s.months[k] || { in: 0, out: 0 }; if (t.kind === 'in') { s.inSum += a; s.months[k].in += a; } else { s.outSum += a; s.months[k].out += a; } s.n++; });
    ['inSum', 'outSum'].forEach(k => s[k] = Math.round(s[k] * 100) / 100); s.bal = Math.round((s.inSum - s.outSum) * 100) / 100; return s;
  }
  const sum = () => seeAll() ? summarize(txs()) : Object.assign({ bal: 0, inSum: 0, outSum: 0, months: {} }, A.D.finsum || {});
  /* แอดมินเขียนสรุปให้ศิษย์อ่าน ทุกครั้งที่สถานะรายการเปลี่ยน */
  function publish(changed) { const list = txs().map(t => changed && t.id === changed.id ? Object.assign({}, t, changed) : t); if (changed && !list.some(t => t.id === changed.id)) list.push(changed); A.W(B.set(Y() + '/finsum', summarize(list))); }
  const moTH = k => A.MONTHS_F[+k.slice(5) - 1] + ' ' + (+k.slice(0, 4) + 543);

  function txRow(t) {
    return '<button class="txr" data-act="txOpen" data-id="' + esc(t.id) + '"><span class="grow"><b>' + esc(t.title) + '</b><span class="muted">' + esc(KN[t.kind] + ' เลขที่ ' + t.no + ' · ' + A.dTH(t.date, 'short') + (t.party ? ' · ' + t.party : '')) + '</span><span>' + chip(STT[t.status][0], STT[t.status][1]) + '</span></span>' +
      '<span class="amt ' + (t.status === 'void' ? 'void' : t.kind) + '">' + (t.kind === 'in' ? '+ ' : '− ') + money(t.amount) + '</span></button>';
  }
  A.V.finance = function () {
    const s = sum(), mo = A.todayISO().slice(0, 7), m = s.months[mo] || { in: 0, out: 0 };
    let b = '<section class="card hero"><div class="hero-sub">ยอดเงินคงเหลือ · ปี ' + esc(A.year()) + '</div><div class="bal">' + money(s.bal) + '</div><div class="hero-sub">บาท · คำนวณจากรายการที่แอดมินอนุมัติแล้ว</div>' +
      '<div class="row" style="margin-top:12px;border-top:1px solid #5E3650;padding-top:10px"><div class="grow"><div class="hero-sub">รายรับเดือนนี้</div><b>+ ' + money(m.in) + '</b></div><div class="grow"><div class="hero-sub">รายจ่ายเดือนนี้</div><b>− ' + money(m.out) + '</b></div></div></section>';
    if (canMake()) b += '<div class="row wrap" style="margin-bottom:14px"><button class="btn gold" data-act="txNew" data-k="in">ออกใบรับเงิน</button><button class="btn" data-act="txNew" data-k="out">ออกใบเบิกเงิน</button>' + (seeAll() ? '<button class="btn ghost" data-act="finExport">' + ic('down', 18) + 'ส่งออกบัญชี</button>' : '') + '</div>';
    if (A.teacher() && pend().length) b += '<section class="card"><div class="lb">รอแอดมินอนุมัติ (' + pend().length + ')</div>' + pend().map(txRow).join('') + '</section>';
    const ks = Object.keys(s.months).sort().reverse();
    b += '<section class="card"><div class="lb">สรุปรายเดือน</div><div class="tw"><table class="tb"><thead><tr><th>เดือน</th><th>รายรับ</th><th>รายจ่าย</th><th>คงเหลือสุทธิ</th></tr></thead><tbody>' + ks.map(k => '<tr><td><b>' + moTH(k) + '</b></td><td>' + money(s.months[k].in) + '</td><td>' + money(s.months[k].out) + '</td><td>' + money(s.months[k].in - s.months[k].out) + '</td></tr>').join('') +
      '<tr><td><b>รวมทั้งปี</b></td><td><b>' + money(s.inSum) + '</b></td><td><b>' + money(s.outSum) + '</b></td><td><b>' + money(s.bal) + '</b></td></tr></tbody></table></div></section>';
    if (seeAll()) { const l = txs().filter(t => FI.tab === 'all' || t.kind === FI.tab);
      b += '<div class="tabs" role="tablist">' + [['all', 'ทั้งหมด'], ['in', 'รายรับ'], ['out', 'รายจ่าย']].map(t => '<button role="tab" aria-selected="' + (FI.tab === t[0]) + '" class="' + (FI.tab === t[0] ? 'on' : '') + '" data-act="finTab" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div><section class="card">' + (l.map(txRow).join('') || '<div class="empty">ยังไม่มีรายการ</div>') +
        '<div class="muted" style="margin-top:10px">รายการที่บันทึกแล้วแก้ไขไม่ได้ หากผิดให้แอดมินยกเลิกแล้วออกใบใหม่</div></section>'; }
    else b += '<div class="muted">ศิษย์ทั่วไปเห็นยอดคงเหลือและสรุปรายเดือน รายการย่อยดูได้เฉพาะคณะกรรมการบริหารและแอดมิน</div>';
    return { title: 'การเงินกองกลาง', body: b };
  };
  A.TODO.push(() => A.teacher() ? { n: pend().length, label: 'รายการเงินรออนุมัติ', href: '#/finance' } : null);
  A.HOME.push({ order: 60, html: () => '<a class="card rowcard" href="#/finance"><div class="grow"><div class="lb" style="margin:0">ยอดเงินกองกลางคงเหลือ</div><div class="num">' + money(sum().bal) + ' บาท</div></div>' + (A.teacher() && pend().length ? chip('รออนุมัติ ' + pend().length, 'gold') : '<span class="muted">ดูสรุป</span>') + '</a>' });

  /* ---------- เอกสาร A4 ---------- */
  function docPage(t) {
    const root = document.createElement('div'), pg = document.createElement('div'); pg.className = 'rp-page fin';
    const line = (k, v) => '<div class="fn-l"><span>' + k + '</span><b>' + esc(v || '-') + '</b></div>', sg = (n, r, sig) => '<div class="fn-sg"><div class="fn-line">ลงชื่อ' + (sig ? '<img class="fn-sig" src="' + sig + '" alt="">' : '') + '</div>( ' + (n ? esc(n) : '&nbsp;'.repeat(36)) + ' )<br>' + r + '</div>';
    const apSig = t.status === 'approved' && A.sigByName ? A.sigByName(t.approvedBy) : ''; pg.innerHTML = A.pageHead(KN[t.kind], '' + M.C.club.long + '') + (t.status !== 'approved' ? '<div class="fn-wm">' + (t.status === 'void' ? 'ยกเลิก' : 'รออนุมัติ') + '</div>' : '') +
      '<div class="fn-top"><div>เลขที่ <b>' + esc(t.no) + '</b></div><div>วันที่ <b>' + esc(A.dTH(t.date, 'full')) + '</b></div></div>' +
      (t.kind === 'in' ? line('ได้รับเงินจาก', t.party) + line('รายการ', t.title) : line('ผู้ขอเบิก / จ่ายให้', t.party) + line('เพื่อเป็นค่า', t.title)) + line('หมวด', t.cat) + (t.note ? line('หมายเหตุ', t.note) : '') +
      '<div class="fn-amt"><span>จำนวนเงิน</span><b>' + money(t.amount) + ' บาท</b></div><div class="fn-txt">( ' + esc(M.bahtText(t.amount)) + ' )</div>' +
      '<div class="fn-sgs">' + (t.kind === 'in' ? sg((t.by || {}).name, 'ผู้รับเงิน / ผู้บันทึก') + sg(t.approvedBy, 'แอดมิน ผู้อนุมัติ', apSig) : sg(t.party, 'ผู้ขอเบิก / ผู้รับเงิน') + sg((t.by || {}).name, 'ผู้จ่ายเงิน / ผู้บันทึก') + sg(t.approvedBy, 'แอดมิน ผู้อนุมัติ', apSig)) + '</div>' +
      '<div class="rp-foot">บันทึกในระบบเมื่อ ' + esc(M.thDate(t.at)) + (t.approvedAt ? ' · อนุมัติเมื่อ ' + esc(M.thDate(t.approvedAt)) : '') + (t.status === 'void' ? ' · ยกเลิก: ' + esc(t.voidReason || '') : '') + '</div>';
    root.appendChild(pg); return root;
  }

  Object.assign(A.ACT, {
    finTab: d => { FI.tab = d.t; A.rerender(); },
    txNew: d => {
      if (!canMake()) return; const k = d.k;
      if (A.STATUS.online === false) return toast('ต้องออนไลน์จึงจะออก' + KN[k] + 'ได้ (เพื่อไม่ให้เลขที่ซ้ำ)', 4000);
      const w = modal('<h3>ออก' + KN[k] + '</h3><form class="form"><div class="g3">' + fld('วันที่', '<input class="in" type="date" id="t-date" value="' + A.todayISO() + '" max="' + A.todayISO() + '" required>') + fld('จำนวนเงิน (บาท)', '<input class="in" id="t-amt" inputmode="decimal" placeholder="0.00" required>') + fld('หมวด', '<select class="in" id="t-cat">' + opt(CATS[k].map(x => [x, x])) + '</select>') + '</div>' +
        fld(k === 'in' ? 'ได้รับเงินจาก' : 'ผู้ขอเบิก / จ่ายให้', '<input class="in" id="t-party" required>') + fld(k === 'in' ? 'รายการ' : 'เพื่อเป็นค่า', '<input class="in" id="t-title" required>') + fld('หมายเหตุ', '<input class="in" id="t-note">') +
        '<div class="muted" id="t-txt"></div><div class="note warn">บันทึกแล้วแก้ไขไม่ได้ ตรวจจำนวนเงินให้ถูกต้อง' + (A.teacher() ? '' : ' รายการจะรอแอดมินอนุมัติก่อนนับเข้ายอดคงเหลือ') + '</div><div class="note bad" id="t-err" hidden></div><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ยกเลิก</button><button class="btn grow">บันทึกและออกเลขที่</button></div></form>', { sticky: true, wide: true });
      const amt = () => { const v = $('#t-amt', w).value.replace(/,/g, '').trim(); return /^[0-9]+(\.[0-9]{1,2})?$/.test(v) ? +v : NaN; };
      $('#t-amt', w).addEventListener('input', () => { const a = amt(); $('#t-txt', w).textContent = a > 0 ? '( ' + M.bahtText(a) + ' )' : ''; });
      $('form', w).addEventListener('submit', async e => {
        e.preventDefault(); const v = id => $(id, w).value.trim(), err = x => { const el = $('#t-err', w); el.textContent = x; el.hidden = false; }, a = amt();
        if (!(a > 0)) return err('จำนวนเงินต้องเป็นตัวเลขมากกว่า 0 ทศนิยมไม่เกิน 2 ตำแหน่ง'); if (!v('#t-party') || !v('#t-title')) return err('กรอกข้อมูลให้ครบ');
        const btn = $('button.grow:not(.ghost)', w); btn.disabled = true;
        try {
          const n = await B.tx(Y() + '/counters/' + k, c => (c || 0) + 1), id = B.uid(), T = A.teacher();
          const rec = { kind: k, no: (k === 'in' ? 'ร.' : 'บ.') + String(n).padStart(3, '0') + '/' + A.year(), date: v('#t-date'), amount: a, party: v('#t-party'), title: v('#t-title'), cat: v('#t-cat'), at: Date.now(), by: A.by(), status: T ? 'approved' : 'pending' };
          if (v('#t-note')) rec.note = v('#t-note'); if (T) { rec.approvedBy = A.myName(); rec.approvedAt = Date.now(); }
          await B.direct('set', Y() + '/ledger/' + id, rec); if (T) publish(Object.assign({ id }, rec)); else window.PUSH && PUSH.notify('tx', { ref: rec.no });
          A.log('fin.new', '', rec.no + ' ' + money(a)); w.remove(); toast('ออก' + KN[k] + ' เลขที่ ' + rec.no + ' แล้ว'); A.ACT.txOpen({ id }, null, Object.assign({ id }, rec));
        } catch (er) { console.error(er); btn.disabled = false; err('บันทึกไม่สำเร็จ: ' + ((er && (er.code || er.message)) || er)); }
      });
    },
    txOpen: (d, el, given) => {
      const t = given || txs().find(x => x.id === d.id); if (!t) return;
      const w = M.previewPages(docPage(t), KN[t.kind] + ' ' + t.no, '<div class="row wrap" style="margin-bottom:10px">' + chip(STT[t.status][0], STT[t.status][1]) + '<button class="btn sm" id="d-pdf">บันทึกเป็น PDF</button>' +
        (A.teacher() && t.status === 'pending' ? '<button class="btn gold sm" id="d-ok">อนุมัติ</button>' : '') + (A.teacher() && t.status !== 'void' ? '<button class="btn ghost sm danger" id="d-void">ยกเลิกรายการ</button>' : '') + '<span class="muted" id="d-msg"></span></div>');
      $('#d-pdf', w).addEventListener('click', async () => { const msg = $('#d-msg', w); msg.textContent = 'กำลังสร้าง …'; try { await M.exportPDF(docPage(t), KN[t.kind] + '-' + M.safeName(t.no) + '.pdf'); msg.textContent = 'เสร็จแล้ว'; } catch (er) { msg.textContent = 'สร้างไม่สำเร็จ: ' + (er.message || er); } });
      const ok = $('#d-ok', w); if (ok) ok.addEventListener('click', async () => { const ch = { status: 'approved', approvedBy: A.myName(), approvedAt: Date.now() }; try { await B.direct('update', Y() + '/ledger/' + t.id, ch); publish(Object.assign({}, t, ch)); A.log('fin.approve', '', t.no); w.remove(); toast('อนุมัติแล้ว'); } catch (er) { toast('อนุมัติไม่สำเร็จ (ต้องออนไลน์)', 4000); } });
      const vd = $('#d-void', w); if (vd) vd.addEventListener('click', () => {
        const m = modal('<h3>ยกเลิก ' + esc(t.no) + '</h3><form class="form">' + fld('เหตุผล (จำเป็น)', '<input class="in" id="v-r" required>') + '<div class="muted">รายการยังอยู่ในบัญชีพร้อมสถานะ “ยกเลิก” และไม่นับเข้ายอดคงเหลือ</div><div class="row" style="margin-top:14px"><button type="button" class="btn ghost grow" data-close>ไม่ยกเลิก</button><button class="btn danger grow">ยกเลิกรายการ</button></div></form>', { center: true, sticky: true });
        $('form', m).addEventListener('submit', async e => { e.preventDefault(); const r = $('#v-r', m).value.trim(); if (!r) return; const ch = { status: 'void', voidReason: r, voidBy: A.myName(), voidAt: Date.now() }; try { await B.direct('update', Y() + '/ledger/' + t.id, ch); publish(Object.assign({}, t, ch)); A.log('fin.void', '', t.no + ' ' + r); m.remove(); w.remove(); toast('ยกเลิกรายการแล้ว'); } catch (er) { toast('ยกเลิกไม่สำเร็จ (ต้องออนไลน์)', 4000); } });
      });
    },
    finExport: () => {
      const l = txs().slice().reverse(), s = summarize(l), head = ['วันที่', 'เลขที่', 'รายการ', 'รายรับ', 'รายจ่าย', 'สถานะ'];
      const rows = l.map(t => [A.dTH(t.date, 'short'), t.no, t.title + (t.party ? ' (' + t.party + ')' : ''), t.kind === 'in' ? money(t.amount) : '', t.kind === 'out' ? money(t.amount) : '', STT[t.status][0]]).concat([['', '', 'รวมรายการที่อนุมัติแล้ว', money(s.inSum), money(s.outSum), 'คงเหลือ ' + money(s.bal)]]);
      const sub = '' + M.C.club.full + ' · ปี ' + A.year(), name = 'บัญชีรายรับรายจ่าย-' + M.C.club.name + '-' + A.year();
      const w = modal('<h3>ส่งออกบัญชีรายรับรายจ่าย</h3><div class="xlist"><button class="xbtn" data-x="pdf"><b>PDF</b><span>สำหรับพิมพ์หรือรายงาน</span></button><button class="xbtn" data-x="docx"><b>DOCX</b><span>เปิดแก้ต่อใน Word</span></button></div><div class="muted" id="x-msg" style="margin-top:10px"></div><button class="btn ghost block" data-close style="margin-top:12px">ปิด</button>', { center: true });
      w.addEventListener('click', async e => { const b = e.target.closest('[data-x]'); if (!b) return; const msg = $('#x-msg', w); msg.textContent = 'กำลังสร้างไฟล์ …';
        try { if (b.dataset.x === 'docx') await M.saveBlob(M.docxTable({ title: 'บัญชีรายรับรายจ่าย ' + M.C.club.name + '', lines: [sub.replace(/ · /g, ' ')], head, rows, widths: [12, 14, 34, 13, 13, 14], align: ['center', 'center', 'left', 'right', 'right', 'center'], footer: ['', 'ข้อมูล ณ วันที่ ' + M.thDate(Date.now())] }), name + '.docx');
          else await M.exportPDF(A.tablePages('บัญชีรายรับรายจ่าย', sub, head, rows, { widths: [12, 15, 33, 13, 13, 14], align: ['c', 'c', '', 'r', 'r', 'c'], foot: 'ข้อมูล ณ ' + M.thDate(Date.now()) + ' ·' }), name + '.pdf'); msg.textContent = 'เสร็จแล้ว'; }
        catch (er) { msg.textContent = 'ส่งออกไม่สำเร็จ: ' + (er.message || er); } });
    }
  });
  A.finSummarize = () => summarize(txs());
})();
