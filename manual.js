/* ============================================================
   manual.js — เนื้อหาคู่มือการใช้แอปศิษย์สำนักที่ฝังมากับระบบ + ส่งออกเป็น PDF / ภาพ
   • แก้ข้อความคู่มือได้ที่ไฟล์นี้ (หรือเพิ่มหัวข้อของตัวเองในแอป เมนูคู่มือการใช้)
   • aud: all = ทุกคน · committee = คณะกรรมการและแอดมิน · teacher = แอดมินเท่านั้น
   ============================================================ */
(function () {
  'use strict';
  const M = window.MC, A = window.APP, C = M.C;
  const { $, esc, modal } = M;
  const BUILTIN = [
    { order: 1, aud: 'all', title: '1. สมัครสมาชิกและเข้าใช้งาน', body:
`• แตะ “ลิงก์สมัคร” ที่แอดมินส่งในกลุ่ม LINE
• ถ้าเปิดจาก LINE ให้แตะ ⋯ มุมขวาบน แล้วเลือก “เปิดในเบราว์เซอร์” (Safari / Chrome) ก่อน เพราะใน LINE เข้าสู่ระบบด้วย Google ไม่ได้
• แตะปุ่มทอง “สมัครด้วยบัญชี Google” แล้วเลือกบัญชี Gmail ของท่าน
• กรอก ชื่อ นามสกุล ชื่อเล่น ปีที่เริ่มเรียนกับอาจารย์ (จำได้ประมาณก็ได้) เพลงที่เรียน (เพลงเดี่ยว / เพลงวง และทางของครูถ้ามี) และเรียนที่ไหน แล้วแตะ “ส่งคำขอเข้าร่วม”
• ข้อมูลการเรียนแก้ไขเพิ่มเติมได้ภายหลังที่หน้าประวัติของตน › “แก้ไข / เพิ่มเติม”
• รอแอดมินอนุมัติ จากนั้นเปิดลิงก์เดิมอีกครั้ง ใช้งานได้ทันที (ครั้งต่อไปไม่ต้องกรอกอีก)` },
    { order: 2, aud: 'all', title: '2. ติดตั้งไว้บนหน้าจอมือถือ', body:
`• iPhone / iPad: เปิดด้วย Safari › ปุ่มแชร์ (สี่เหลี่ยมมีลูกศรขึ้น) › “เพิ่มไปยังหน้าจอโฮม”
• Android: เปิดด้วย Chrome › เมนู ⋮ › “ติดตั้งแอป” หรือ “เพิ่มลงในหน้าจอหลัก”
• ครั้งต่อไปแตะไอคอน “ศิษย์สำนัก” บนหน้าจอได้เลย
• เปิดการแจ้งเตือน: หน้าหลัก › การ์ด “การแจ้งเตือน” › เปิด แล้วกดอนุญาต` },
    { order: 3, aud: 'all', title: '3. เมนูหลัก 5 ปุ่มด้านล่าง', body:
`• หน้าหลัก: เรื่องที่ต้องทำ (แถบทอง) ประกาศ และกิจกรรมที่ใกล้ถึง
• คลังวิชา: เพลงและทางเพลง โน้ตเพลง สายการสืบทอด คำสอนและผลงานอาจารย์ เอกสาร
• กิจกรรม: นัดหมาย พิธีไหว้ครู การแสดง ปฏิทิน และประกาศ — อ่านแล้วแตะ “รับทราบ”
• ศิษย์: รายชื่อสมาชิก ค้นหาด้วยชื่อหรือชื่อเล่น
• เพิ่มเติม: ทำเนียบติดต่อ ธรรมเนียมสำนัก การเงิน โหวต คู่มือ และ “ฉัน” (แก้ข้อมูลของตนเอง)` },
    { order: 4, aud: 'all', title: '4. ข้อมูลของฉันและทำเนียบติดต่อ', body:
`• เมนู “ฉัน” › “แก้ข้อมูลของฉัน”: เปลี่ยนรูป ชื่อเล่น เบอร์โทร LINE จังหวัด ที่ทำงาน
• เลือกเองได้ว่าจะเปิดเผยเบอร์โทร LINE อีเมล ต่อเพื่อนศิษย์หรือไม่
• ทำเนียบติดต่อ: หาเพื่อนศิษย์ตามจังหวัด ความถนัด หรือปีที่เริ่มเรียน แตะเบอร์เพื่อโทรได้ทันที
• ระบบไม่มีการประเมินหรือจัดอันดับฝีมือ ทุกคนเป็นศิษย์ของอาจารย์เท่าเทียมกัน` },
    { order: 5, aud: 'all', title: '5. คลังวิชาและโน้ตเพลง', body:
`• เพลงและทางเพลง: ดูประวัติเพลง ทางของแต่ละเครื่อง และครูผู้ถ่ายทอด
• “ฉันต่อเพลงนี้แล้ว”: บันทึกเพลงที่ได้รับการต่อจากครู
• โน้ตเพลง: เปิดเฉพาะผู้ที่แอดมินอนุญาตเป็นรายเพลง ถ้ายังไม่มีสิทธิ์ แตะ “ขอสิทธิ์ดูโน้ต” — โปรดอย่าส่งต่อโน้ตให้ผู้อื่น
• คำสอนและผลงาน: ส่งคำสอน เรื่องเล่า ภาพเก่าของอาจารย์ได้ แอดมินตรวจแล้วจึงเผยแพร่` },
    { order: 6, aud: 'all', title: '6. ปัญหาที่พบบ่อย', body:
`• เข้าแล้วเจอแบบฟอร์มสมัครอีก ทั้งที่เคยสมัครแล้ว: อาจเลือก Gmail คนละบัญชี ให้แตะ “ออกจากระบบ” แล้วเลือกบัญชีเดิม
• เปิดใน LINE แล้วเข้าสู่ระบบไม่ได้: แตะ ⋯ › “เปิดในเบราว์เซอร์”
• ป้ายมุมขวาบน “รอส่ง”: ระบบจะส่งเองเมื่อมีสัญญาณ
• แอปไม่อัปเดต: แตะแถบ “มีรุ่นใหม่” หรือปิดแล้วเปิดแอปใหม่
• ติดปัญหาอื่น: ติดต่อเลขานุการหรือแอดมินในกลุ่ม LINE` },
    { order: 20, aud: 'committee', title: 'สำหรับคณะกรรมการ', body:
`• สิทธิ์ตามหน้าที่ รองจากแอดมิน (ตารางเต็มอยู่หน้า “แผนผัง”)
• ประธาน / รองประธาน / เลขานุการ: เพิ่ม/แก้ข้อมูลสมาชิก เพลงและทางเพลง สร้างกิจกรรม ดูบัญชี ส่งออกรายชื่อ
• กรรมการฝ่ายปฏิคม: สร้างกิจกรรมและนัดหมาย ดูแลรายชื่อผู้เข้าร่วม ประกาศ
• เหรัญญิก: บันทึกรายรับ-รายจ่าย (รอแอดมินอนุมัติ) ระบบออกเลขที่เอกสารให้
• ผู้เก็บรวบรวมโน้ต: หน้าเพลง › การ์ด “โน้ตเพลง” › “ใส่โน้ต” (พิมพ์โน้ต แนบลิงก์ หรือไฟล์ PDF/ภาพ) เห็นโน้ตทุกเพลง แต่การให้สิทธิ์ผู้อื่นเป็นของแอดมิน` },
    { order: 30, aud: 'teacher', title: 'สำหรับแอดมิน: งานประจำ', body:
`• ลิงก์สมัคร: หน้า “จัดการ” › การ์ด “ลิงก์สมัครสมาชิก” › คัดลอก / แชร์ไป LINE / QR Code / เปิด-ปิดรับสมัคร
• คำขอเข้าร่วม (เมนู “คำขอเข้าร่วม”): ตรวจว่าเป็นศิษย์จริง › “อนุมัติ” หรือ “ผูกกับศิษย์ที่มีชื่อแล้ว”
• ตั้งตำแหน่งและหน้าที่: หน้าประวัติสมาชิก › “กำหนดตำแหน่ง” (ติ๊กผู้เก็บรวบรวมโน้ตได้ซ้อนกับตำแหน่ง)
• สิทธิ์ดูโน้ต: หน้าเพลง › “ผู้ได้รับอนุญาต” หรือหน้าประวัติสมาชิก › “กำหนดสิทธิ์” · คำขอสิทธิ์ขึ้นที่แถบทอง
• ยืนยันทางเพลง ตรวจคำสอน บันทึกพิธีหลังงานไหว้ครู (คลังวิชา › สายการสืบทอด › บันทึกพิธี)` },
    { order: 31, aud: 'teacher', title: 'สำหรับแอดมิน: ดูแลระบบ', body:
`• ครั้งแรก: หน้า “จัดการ” › “บันทึกคณะกรรมการ” เพื่อตั้งคณะกรรมการตามโครงสร้างปัจจุบัน
• หน้า “จัดการ”: แอดมินและครูผู้ถ่ายทอด ความถนัด ปีปัจจุบัน ลายเซ็น สำรองข้อมูล ตารางสิทธิ์
• ออกรุ่นใหม่: รัน node tools/check.js ก่อนอัปขึ้น GitHub · ถ้าแก้สิทธิ์ ให้รัน python3 tools/build-rules.py แล้ว Publish Rules ใหม่` }
  ];
  C.manual = BUILTIN.concat(C.manual || []);
  C.credit = 'พัฒนาโดย นายนนทพัทธ์ วงค์มูล © 2026';

  /* ---------- ส่งออกคู่มือ ---------- */
  const AUDS = [['all', 'ศิษย์ (หัวข้อสำหรับทุกคน)'], ['committee', 'คณะกรรมการ (รวมหัวข้อของศิษย์)'], ['teacher', 'แอดมิน (ทุกหัวข้อ)']];
  const pick = aud => { const db = (A.cfg().manual) || {}; const all = C.manual.concat(Object.keys(db).map(k => db[k])).filter(s => s && s.title).sort((a, b) => (a.order || 0) - (b.order || 0));
    return all.filter(s => aud === 'teacher' ? true : aud === 'committee' ? s.aud !== 'teacher' : (!s.aud || s.aud === 'all')); };
  async function build(aud) {
    const secs = pick(aud), root = document.createElement('div'), st = document.createElement('div'); st.style.cssText = 'position:fixed;left:-30000px;top:0;'; st.appendChild(root); document.body.appendChild(st);
    const head = '<div class="rp-head"><img src="' + C.club.logoPrint + '" alt=""><div class="grow"><div class="rp-t">คู่มือการใช้แอป' + esc(C.club.name) + '</div><div class="rp-s">' + esc(C.club.full) + ' · รุ่น ' + esc(C.version) + '</div></div></div>';
    const pages = []; const newPage = () => { const pg = document.createElement('div'); pg.className = 'rp-page mn'; pg.innerHTML = head + '<div class="mn-b"></div><div class="rp-foot"></div>'; root.appendChild(pg); pages.push(pg); return pg; };
    const over = pg => $('.mn-b', pg).getBoundingClientRect().bottom > pg.getBoundingClientRect().bottom - 60;
    let pg = newPage(); if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* ignore */ } }
    secs.forEach(s => {
      const lines = String(s.body || '').split('\n');
      let box = document.createElement('div'); box.className = 'mn-s'; box.innerHTML = '<h4>' + esc(s.title) + '</h4>'; $('.mn-b', pg).appendChild(box);
      if (over(pg) && $('.mn-b', pg).children.length > 1) { box.remove(); pg = newPage(); $('.mn-b', pg).appendChild(box); }
      lines.forEach(ln => { const p = document.createElement(ln.trim() ? 'p' : 'div'); if (ln.trim()) { p.textContent = ln; if (/^\s*•/.test(ln)) p.className = 'b'; else if (/^\s{2,}/.test(ln)) p.className = 'i'; else p.className = 'h'; } else p.className = 'gap'; box.appendChild(p);
        if (over(pg)) { p.remove(); pg = newPage(); box = document.createElement('div'); box.className = 'mn-s'; box.innerHTML = '<h4>' + esc(s.title) + ' (ต่อ)</h4>'; $('.mn-b', pg).appendChild(box); box.appendChild(p); } });
    });
    pages.forEach((p, i) => { $('.rp-foot', p).textContent = C.credit + ' · หน้า ' + (i + 1) + ' / ' + pages.length; });
    st.remove(); return root;
  }
  A.ACT.manExport = () => {
    const T = A.teacher(), com = T || !!(A.ME && A.ME.role), auds = AUDS.filter(a => a[0] === 'all' || (a[0] === 'committee' && com) || (a[0] === 'teacher' && T));
    const w = modal('<h3>ส่งออกคู่มือ</h3>' + (auds.length > 1 ? A.fld('ฉบับสำหรับ', '<select class="in" id="mx-a">' + A.opt(auds) + '</select>') : '') +
      '<div class="xlist"><button class="xbtn" data-x="view"><b>ดูตัวอย่าง</b><span>ดูบนจอก่อน</span></button><button class="xbtn" data-x="pdf"><b>PDF</b><span>ไฟล์เดียว ส่งในแชตกลุ่มหรือพิมพ์</span></button><button class="xbtn" data-x="png"><b>ภาพ PNG</b><span>หน้าละหนึ่งภาพ ส่งใน LINE ได้เลย</span></button></div><div class="muted" id="mx-m" style="margin-top:10px"></div><button class="btn ghost block" data-close style="margin-top:12px">ปิด</button>', { center: true });
    w.addEventListener('click', async e => { const x = e.target.closest('[data-x]'); if (!x) return; const msg = $('#mx-m', w), aud = ($('#mx-a', w) || {}).value || 'all', name = 'คู่มือแอปเครือข่าย' + C.club.name + (aud === 'all' ? '' : aud === 'committee' ? '-กรรมการ' : '-แอดมิน');
      msg.textContent = 'กำลังจัดหน้า …';
      try { const root = await build(aud), n = root.children.length, prog = (i, t) => { msg.textContent = 'กำลังสร้างหน้า ' + i + ' / ' + t + ' …'; };
        if (x.dataset.x === 'view') { w.remove(); M.previewPages(root, 'คู่มือการใช้ (' + n + ' หน้า)'); return; }
        if (x.dataset.x === 'pdf') await M.exportPDF(root, name + '.pdf', prog, { scale: 2 }); else await M.exportPNGs(root, name, prog, { scale: 2 });
        msg.textContent = 'เสร็จแล้ว ' + n + ' หน้า'; }
      catch (er) { console.error(er); msg.textContent = 'ส่งออกไม่สำเร็จ: ' + (er.message || er) + ' (ต้องต่ออินเทอร์เน็ตในครั้งแรก)'; } });
  };
})();
