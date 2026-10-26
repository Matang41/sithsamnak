/* ============================================================
   report.js — รุ่น 3.2: ส่งออกรายชื่อศิษย์ในเครือข่ายเป็น DOCX / PDF สำหรับงานของเครือข่าย
   เลือกขอบเขต (ทั้งหมด/กรรมการ/ผู้เก็บโน้ต/ช่วงปีที่เริ่มเรียน) คอลัมน์ หัวเรื่อง และบล็อกลงชื่อแอดมิน
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, B = window.B, A = window.APP, C = M.C;
  const { $, $$, esc, toast, modal } = M; const { fld, opt } = A;
  const SC0 = () => [['all', 'ศิษย์ทั้งหมด'], ['committee', 'เฉพาะคณะกรรมการ']].concat([['keepers', 'ผู้เก็บรวบรวมโน้ต']], A.eraOpts().map(g => ['e' + g[0], g[1]]));
  /* [id, หัวคอลัมน์, น้ำหนักความกว้าง, จัดชิด, เลือกตั้งต้น, ต้องมีสิทธิ์ดูข้อมูลติดต่อ] */
  const COLS = [['sid', 'รหัสศิษย์', 11, 'c', 1, 0], ['nick', 'ชื่อเล่น', 10, 'c', 1, 0], ['year', 'เริ่มเรียน (พ.ศ.)', 11, 'c', 1, 0], ['type', 'ประเภท', 11, 'c', 0, 0], ['role', 'ตำแหน่ง', 16, '', 1, 0], ['inst', 'ความถนัด', 22, '', 1, 0], ['master', 'ครูผู้ถ่ายทอด', 18, '', 0, 0], ['phone', 'เบอร์โทร', 14, 'c', 0, 1], ['line', 'LINE', 12, 'c', 0, 1]];
  const sidsOf = sc => {
    const ms = A.members(); let l = A.activeSids();
    if (sc === 'committee') l = l.filter(s => A.roleOf(s)); else if (sc === 'keepers') l = l.filter(A.isKeeper); else if (/^e[0-9]+$/.test(sc)) l = l.filter(s => A.eraOf(ms[s]) === +sc.slice(1));
    return sc === 'committee' ? l.sort((a, b) => A.ROLE_ORDER.indexOf(A.roleOf(a).role) - A.ROLE_ORDER.indexOf(A.roleOf(b).role) ) : l.sort(A.byClass);
  };
  async function privOf(sids) {
    const o = {};
    if (A.teacher()) { try { const all = (await B.get('privateInfo')) || {}; sids.forEach(s => { o[s] = all[s] || {}; }); return o; } catch (e) { /* ลองรายคน */ } }
    await Promise.all(sids.map(async s => { try { o[s] = (await B.get('privateInfo/' + s)) || {}; } catch (e) { o[s] = {}; } })); return o;
  }
  function form() {
    const S = A.school(), priv = A.can.edit();
    const w = modal('<h3>ส่งออกรายชื่อศิษย์ (DOCX / PDF)</h3><form class="form" onsubmit="return false">' + fld('หัวเรื่องเอกสาร', '<input class="in" id="r-t" value="รายชื่อศิษย์ในเครือข่าย' + esc(C.club.name) + '">') +
      fld('ข้อความใต้หัวเรื่อง (ไม่บังคับ)', '<input class="in" id="r-s" placeholder="เช่น เพื่อประกอบการขออนุญาต… / รายงานผู้บริหาร">') + fld('ขอบเขต', '<select class="in" id="r-sc">' + opt(SC0()) + '</select>') +
      '<div class="fld"><span>คอลัมน์ที่ต้องการ (ชื่อ - สกุล และลำดับมีเสมอ)</span><div class="checks">' + COLS.filter(c => !c[5] || priv).map(c => '<label class="ck"><input type="checkbox" name="rc" value="' + c[0] + '"' + (c[4] ? ' checked' : '') + '><span>' + esc(c[1]) + '</span></label>').join('') + '</div></div>' +
      '<label class="ck wide"><input type="checkbox" id="r-th"><span>ใช้เลขไทย</span></label><label class="ck wide"><input type="checkbox" id="r-sg" checked><span>มีช่องลงชื่อแอดมินท้ายเอกสาร</span></label>' + (A.mySigRec && A.mySigRec() ? '<label class="ck wide"><input type="checkbox" id="r-si" checked><span>ใส่ลายเซ็นแอดมิน (เฉพาะ PDF)</span></label>' : '') +
      '<div class="g3">' + fld('ชื่อผู้ลงนาม', '<input class="in" id="r-sn" value="' + esc(S.teacher || '') + '">') + fld('ตำแหน่ง', '<input class="in" id="r-sp" value="แอดมิน">') + '</div>' +
      '<div class="xlist" style="margin-top:12px"><button type="button" class="xbtn" data-x="pdf"><b>PDF</b><span>สำหรับพิมพ์ (คอลัมน์มาก ระบบจัดเป็นแนวนอนให้)</span></button><button type="button" class="xbtn" data-x="docx"><b>DOCX</b><span>เปิดแก้ต่อใน Word (ฟอนต์ TH SarabunPSK)</span></button></div><div class="muted" id="x-msg" style="margin-top:10px"></div><button type="button" class="btn ghost block" data-close style="margin-top:12px">ปิด</button></form>', { sticky: true, wide: true });
    w.addEventListener('click', async e => {
      const b = e.target.closest('[data-x]'); if (!b || w.dataset.busy) return; const v = id => $(id, w).value.trim(), msg = $('#x-msg', w); w.dataset.busy = '1'; msg.textContent = 'กำลังสร้างไฟล์ …';
      try {
        const sc = v('#r-sc'), sids = sidsOf(sc), ms = A.members(), cols = COLS.filter(c => $$('input[name=rc]:checked', w).some(x => x.value === c[0])), th = $('#r-th', w).checked, sign = $('#r-sg', w).checked;
        const P = cols.some(c => c[0] === 'line' || c[0] === 'phone') ? await privOf(sids) : {};
        const val = (c, s) => { const m = ms[s], p = P[s] || {};
          return c[0] === 'sid' ? s : c[0] === 'cls' ? A.cls(m) : c[0] === 'type' ? A.typeName(m.type) : c[0] === 'role' ? (A.roleName(A.roleOf(s)) || '-') : c[0] === 'inst' ? (A.insts(m).join(', ') || '-') : c[0] === 'nick' ? (m.nick || '-') : c[0] === 'year' ? (m.yearIn || '-') : c[0] === 'master' ? A.masterName(m) : c[0] === 'line' ? (p.line || '-') : (p.phone || '-'); };
        const tn = x => th ? M.thNum(x) : x, head = ['ลำดับ', 'ชื่อ - สกุล'].concat(cols.map(c => c[1])), rows = sids.map((s, i) => [tn(String(i + 1)), A.fullName(ms[s])].concat(cols.map(c => tn(String(val(c, s)))))), widths = [6, 26].concat(cols.map(c => c[2])), align = ['c', ''].concat(cols.map(c => c[3]));
        const title = v('#r-t') || 'รายชื่อศิษย์ในเครือข่าย' + C.club.name, scName = (SC0().find(x => x[0] === sc) || ['', ''])[1], sub = [C.club.full + ' ปี ' + tn(A.year()), v('#r-s'), scName + ' จำนวน ' + tn(String(sids.length)) + ' คน'].filter(Boolean);
        const sn = v('#r-sn'), sp = v('#r-sp') || 'แอดมิน', dateTxt = tn(M.thDate(Date.now())), name = 'รายชื่อศิษย์' + M.safeName(C.club.name) + '-' + M.safeName(scName) + '-' + A.year();
        if (b.dataset.x === 'docx') {
          const P_ = M.wPara, R = M.wRun, ws = widths.map(x => Math.round(9638 * x / widths.reduce((a, c) => a + c, 0))), sz = cols.length > 5 ? 24 : 28;
          const body = P_(R(title, { b: true, sz: 40 }), { jc: 'center' }) + sub.map((l, i) => P_(R(l, { sz: 30 }), { jc: 'center', after: i === sub.length - 1 ? 160 : 0 })).join('') + M.wTable([head].concat(rows), ws, { head: true, align: align.map(a => a === 'c' ? 'center' : 'left'), sz }) + P_('', {}) +
            (sign ? P_(R('ลงชื่อ ........................................................', { sz: 30 }), { jc: 'right' }) + P_(R('( ' + (sn || '........................................') + ' )', { sz: 30 }), { jc: 'right' }) + P_(R(sp, { sz: 30 }), { jc: 'right' }) : '') + P_(R('ข้อมูล ณ วันที่ ' + dateTxt, { sz: 26 }), { jc: 'right' });
          await M.saveBlob(M.docxDoc(body), name + '.docx');
        } else {
          const land = cols.length > 5, sg = A.mySigRec && A.mySigRec(), sigImg = (sg && $('#r-si', w) && $('#r-si', w).checked) ? '<div><img src="' + sg.img + '" style="height:54px" alt=""></div>' : '', after = sign ? '<div style="margin:22px 24px 0 auto;width:320px;text-align:center;font-size:16px;line-height:1.7">' + sigImg + 'ลงชื่อ ........................................<br>( ' + (sn ? esc(sn) : '........................................') + ' )<br>' + esc(sp) + '</div>' : '';
          const root = A.tablePages(title, sub.join(' · '), head, rows, { widths, align, per: land ? (sign ? 10 : 15) : (sign ? 19 : 25), after, foot: 'ข้อมูล ณ ' + dateTxt + ' ·' });
          if (land) Array.from(root.children).forEach(p => p.classList.add('land'));
          await M.exportPDF(root, name + '.pdf');
        }
        msg.textContent = 'เสร็จแล้ว'; A.log('export', '', 'roster ' + b.dataset.x + ' ' + sc);
      } catch (er) { console.error(er); msg.textContent = 'ส่งออกไม่สำเร็จ: ' + (er.message || er); }
      delete w.dataset.busy;
    });
  }
  A.ACT.rosterExport = () => { if (A.can.exp()) form(); };
  A.MANAGE.push(() => '<section class="card"><div class="lb">รายงานรายชื่อศิษย์</div><div class="muted" style="margin-bottom:10px">ส่งออกรายชื่อเป็น DOCX / PDF เลือกขอบเขตและคอลัมน์ได้ สำหรับรายงานหรือขออนุญาตทางโรงเรียน</div><button class="btn" data-act="rosterExport">ส่งออกรายชื่อศิษย์</button></section>');
})();
