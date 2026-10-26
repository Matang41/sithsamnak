#!/usr/bin/env python3
"""
tools/build-rules.py — สร้าง database.rules.json ของแอปศิษย์สำนักจากนิพจน์พื้นฐาน
ใช้:  python3 tools/build-rules.py        (รันจากโฟลเดอร์เว็บ) → เขียนทับ database.rules.json
แล้วคัดลอกไปวางที่ Firebase Console › Realtime Database › Rules › Publish

แก้ที่ไฟล์นี้แทนการแก้ JSON ตรง ๆ:
  • BOOT   = อีเมลแอดมินคนแรก (ต้องตรงกับ config.js › teacherEmails)
  • UNITS  = รหัสหน่วย (สำนัก/สาขา) ต้องตรงกับ config.js › clubs[].id
  • RULES_V = เลขรุ่น Rules ต้องตรงกับ RULES_V ใน app.js (เพิ่มทั้งสองที่ทุกครั้งที่แก้สิทธิ์)

หลักการ: ค่าเริ่มต้นปิดทั้งหมด แล้วเปิดทีละจุด · สิทธิ์จริงอยู่ที่นี่ ปุ่มในแอปแค่ซ่อน/แสดง
ลำดับสิทธิ์: แอดมิน (T = ทำได้ทุกอย่างในหน่วย) › ประธานกรรมการ › รองประธานกรรมการ › เหรัญญิก / ปฏิคม / เลขานุการ (ตามหน้าที่) · ผู้เก็บรวบรวมโน้ต (KEEP) · สมาชิก
  • ทะเบียนสมาชิก ข้อมูลติดต่อ: แอดมิน ประธาน รองประธาน เลขานุการ (REG) · เพลงและทาง: REG + ผู้เก็บรวบรวมโน้ต
  • กิจกรรม: REG + ปฏิคม · ดูบัญชี: REG + เหรัญญิก · บันทึกบัญชี: เหรัญญิกเท่านั้น (ตามหน้าที่) · ประกาศ: ทุกตำแหน่ง
  • คลังโน้ต: อ่าน = แอดมิน ผู้เก็บรวบรวมโน้ต และผู้ที่มี noteacc/{รหัสตน}/{เพลง} · เขียนโน้ต = แอดมิน ผู้เก็บรวบรวมโน้ต · ให้สิทธิ์ = แอดมินเท่านั้น
  • สมัครสมาชิก: เขียนคำขอได้เมื่อ public/join/open ไม่ใช่ false (แอดมินเปิด/ปิดรับสมัครได้)
ศิษย์ล็อกอินด้วยอีเมล Google ใดก็ได้ → รหัสศิษย์มาจาก accounts/{อีเมลแทน . ด้วย ,} ซึ่งแอดมินเป็นผู้ผูกตอนอนุมัติ
"""
import json, os

BOOT = ['ntpwm2541@gmail.com']
UNITS = ['ss']
RULES_V = 4

# ---------- นิพจน์พื้นฐาน ----------
V = "(auth != null && auth.token.email_verified == true)"
EMAIL = "auth.token.email.toLowerCase()"
EK = EMAIL + ".replace('.', ',')"                         # คีย์อีเมล (replace ใน Rules แทนทุกตำแหน่ง)
BOOT_X = '(' + ' || '.join(f"{EMAIL} == '{e.lower()}'" for e in BOOT) + ')'
HAS_ACC = f"root.child('accounts').child({EK}).exists()"
SID = f"root.child('accounts').child({EK}).val()"
TANY = f"({V} && ({BOOT_X} || root.child('teachers').child({EK}).exists()))"
TALL = f"({V} && ({BOOT_X} || root.child('teachers').child({EK}).val() == true))"

def T(cid):        # แอดมินของหน่วยนั้น
    return f"({V} && ({BOOT_X} || root.child('teachers').child({EK}).val() == true || root.child('teachers').child({EK}).child({cid}).val() == true))"
def MEM(cid):      # ศิษย์ที่ผูกบัญชีแล้วและสถานะใช้งาน
    return f"({V} && {HAS_ACC} && root.child('c').child({cid}).child('members').child({SID}).child('status').val() == 'active')"
def ROLE(cid, *roles):
    r = ' || '.join(f"root.child('c').child({cid}).child('roles').child({SID}).child('role').val() == '{x}'" for x in roles)
    return f"({MEM(cid)} && ({r}))"
def ANYROLE(cid):
    return f"({MEM(cid)} && root.child('c').child({cid}).child('roles').child({SID}).exists())"
def OWN(var):      # เจ้าของข้อมูล ($sid == รหัสศิษย์ของบัญชีนี้)
    return f"({V} && {HAS_ACC} && {SID} == {var})"
def OR(*xs): return '(' + ' || '.join(xs) + ')'
def AND(*xs): return '(' + ' && '.join(xs) + ')'
def STR(field, n): return f"(!newData.child('{field}').exists() || (newData.child('{field}').isString() && newData.child('{field}').val().length <= {n}))"

C = "$cid"
TC, MC = T(C), MEM(C)
SEC = ROLE(C, 'secretary', 'vice', 'president')             # REG: งานทะเบียน (ประธาน รองประธาน เลขานุการ)
KEEP = f"({MC} && root.child('c').child($cid).child('duties').child({SID}).child('notes').val() == true)"   # ผู้เก็บรวบรวมโน้ต
UNIT_LIT = lambda u: f"'{u}'"
MEM_ANY = OR(*[MEM(UNIT_LIT(u)) for u in UNITS])
SEC_ANY = OR(*[ROLE(UNIT_LIT(u), 'secretary', 'vice', 'president') for u in UNITS])
SEC_OF = lambda var: OR(*[AND(ROLE(UNIT_LIT(u), 'secretary', 'vice', 'president'), f"root.child('c').child('{u}').child('members').child({var}).exists()") for u in UNITS])
SAME_UNIT = lambda var: OR(*[AND(MEM(UNIT_LIT(u)), f"root.child('c').child('{u}').child('members').child({var}).exists()") for u in UNITS])

SIDPAT = "$sid.matches(/^[0-9]{4,8}$/)"
R_MEM = {'.read': OR(TC, MC)}

unit = {
    '.read': TC, '.write': TC,
    'config': {'.read': OR(TC, MC),
               'gens': {'.read': V},                                         # ให้ผู้ขอเข้าร่วมเห็นรายชื่อรุ่น
               'lastSid': {'.write': SEC, '.validate': "newData.isNumber() && (!data.exists() || newData.val() > data.val())"}},
    'members': {'.read': OR(TC, MC),
                '$sid': {'.write': AND(SEC, "newData.exists()", "newData.child('status').val() == 'active'", "(!data.exists() || data.child('status').val() == 'active')"),
                         '.validate': SIDPAT,
                         'nick': {'.write': AND(OWN('$sid'), MC), '.validate': "newData.isString() && newData.val().length <= 60"},
                         # บันทึกการเรียนกับอาจารย์: เจ้าตัวแก้เพิ่มเติมได้เสมอ (REG และแอดมินแก้ได้จากสิทธิ์ระดับ $sid)
                         'studyNote': {'.write': AND(OWN('$sid'), MC), '.validate': "newData.isString() && newData.val().length <= 2000"},
                         'studied': {'.write': AND(OWN('$sid'), MC)},
                         'studyAt': {'.write': AND(OWN('$sid'), MC), '.validate': "newData.isNumber()"},
                         'studyBy': {'.write': AND(OWN('$sid'), MC), '.validate': OR(TC, f"newData.child('id').val() == {SID}")},
                         'photo': {'.write': AND(OWN('$sid'), MC), '.validate': "newData.isString() && newData.val().length < 40000"},
                         'updatedAt': {'.write': AND(OWN('$sid'), MC)}, 'updatedBy': {'.write': AND(OWN('$sid'), MC)}}},
    'roles': dict(R_MEM), 'duties': dict(R_MEM),
    'history': {'$hid': {'.write': AND(MC, "!data.exists()", "newData.exists()")}},
    # คำขอเข้าร่วม: เจ้าของบัญชีเขียน/แก้/ยกเลิกของตนเองได้จนกว่าจะได้รหัสศิษย์ · กำหนดสถานะไม่ได้
    'requests': {'$k': {'.read': AND(V, f"$k == {EK}"),
                        '.write': AND(V, f"$k == {EK}", f"!{HAS_ACC}", "(!newData.exists() || !newData.child('status').exists())", "root.child('c').child($cid).child('public').child('join').child('open').val() != false"),
                        '.validate': AND("newData.child('first').isString()", "newData.child('first').val().length <= 100", STR('last', 100), STR('note', 1100), STR('work', 200), STR('phone', 40), "(!newData.child('studied').exists() || newData.child('studied').hasChildren())",
                                         f"(!newData.child('email').exists() || newData.child('email').val() == {EMAIL} || data.child('email').val() == newData.child('email').val())")}},
    # ทำเนียบติดต่อ: ศิษย์ทุกคนอ่านได้ · เจ้าตัวหรือเลขานุการเขียน
    'contacts': {'.read': OR(TC, MC),
                 '$sid': {'.write': OR(AND(OWN('$sid'), MC), SEC), '.validate': AND(SIDPAT, STR('phone', 40), STR('line', 80), STR('email', 120), STR('province', 60), STR('work', 200))}},
    # คลังวิชา
    'songs': {'.read': OR(TC, MC), '.write': OR(SEC, KEEP)},
    'learned': {'.read': OR(TC, MC),
                '$sid': {'$gid': {'.write': AND(OWN('$sid'), MC, "(!newData.exists() || newData.child('ok').val() == false)"),
                                  '.validate': AND(STR('from', 120), STR('inst', 80))}}},
    # คลังโน้ต: จำกัดสิทธิ์รายเพลง
    'notes': {'.read': OR(TC, KEEP), '.write': KEEP, '$gid': {'.read': AND(MC, f"root.child('c').child($cid).child('noteacc').child({SID}).child($gid).exists()")}},
    'notefiles': {'.read': OR(TC, KEEP), '.write': KEEP, '$gid': {'.read': AND(MC, f"root.child('c').child($cid).child('noteacc').child({SID}).child($gid).exists()"),
                                        '$tid': {'.validate': "newData.isString() && newData.val().length < 1000000"}}},
    'noteacc': {'.read': TC, '$sid': {'.read': AND(OWN('$sid'), MC)}},
    'notereq': {'.read': TC, '$sid': {'.read': AND(OWN('$sid'), MC),
                                      '$gid': {'.write': AND(OWN('$sid'), MC, f"(!newData.exists() || !root.child('c').child($cid).child('noteacc').child($sid).child($gid).exists())"),
                                               '.validate': AND("newData.child('at').isNumber()", STR('msg', 300))}}},
    'lineage': dict(R_MEM), 'rites': dict(R_MEM),
    'teach': {'.read': OR(TC, MC),
              '$id': {'.write': AND(MC, OR(
                          AND("newData.exists()", f"newData.child('by').child('id').val() == {SID}", "newData.child('status').val() == 'pending'",
                              f"(!data.exists() || (data.child('by').child('id').val() == {SID} && data.child('status').val() == 'pending'))"),
                          AND("!newData.exists()", f"data.child('by').child('id').val() == {SID}", "data.child('status').val() == 'pending'"))),
                      '.validate': AND("newData.child('title').isString()", "newData.child('title').val().length <= 300", STR('body', 5000), STR('src', 300), STR('url', 500))}},
    'teachfiles': {'.read': OR(TC, MC),
                   '$id': {'.write': AND(MC, OR("!data.exists()", f"root.child('c').child($cid).child('teach').child($id).child('by').child('id').val() == {SID}")),
                           '.validate': "newData.isString() && newData.val().length < 1000000"}},
    'library': dict(R_MEM),
    'libfiles': {'.read': OR(TC, MC), '$id': {'.validate': "newData.isString() && newData.val().length < 1000000"}},
    # กิจกรรม ประกาศ การเงิน (รายปี)
    'y': {'$y': {
        'events': {'.read': OR(TC, MC), '.write': ROLE(C, 'president', 'vice', 'secretary', 'host')},
        'announce': {'.read': OR(TC, MC), '$aid': {'.write': ANYROLE(C)}},
        'acks': {'.read': ANYROLE(C), '$sid': {'.read': AND(OWN('$sid'), MC), '.write': AND(OWN('$sid'), MC)}},
        'bands': dict(R_MEM),
        'ledger': {'.read': ROLE(C, 'president', 'vice', 'treasurer', 'secretary'),
                   '$tx': {'.write': AND(ROLE(C, 'treasurer'), "!data.exists()", "newData.child('status').val() == 'pending'", f"newData.child('by').child('id').val() == {SID}"),
                           '.validate': "newData.child('amount').isNumber() && newData.child('amount').val() > 0"}},
        'counters': {'.read': ROLE(C, 'treasurer'), '.write': ROLE(C, 'treasurer'),
                     '$k': {'.validate': "newData.isNumber() && (!data.exists() || newData.val() == data.val() + 1 || newData.val() == 1)"}},
        'finsum': dict(R_MEM)}},
    # โหวตและร้องทุกข์
    'polls': dict(R_MEM),
    'ballots': {'$pid': {'.read': AND(MC, "root.child('c').child($cid).child('polls').child($pid).child('openBallot').val() == true", "!root.child('c').child($cid).child('polls').child($pid).child('election').exists()"),
                         '$sid': {'.read': AND(OWN('$sid'), MC),
                                  '.write': AND(OWN('$sid'), MC, "!data.exists()", "newData.exists()", "root.child('c').child($cid).child('polls').child($pid).child('status').val() == 'open'")}}},
    'griev': {'$sid': {'.read': AND(OWN('$sid'), MC),
                       '$gid': {'.write': AND(OWN('$sid'), MC, "!data.exists()", "newData.child('status').val() == 'new'"),
                                '.validate': "newData.child('text').isString() && newData.child('text').val().length < 5000"}}},
    'public': {'.read': V},
    'awards': dict(R_MEM),
    'certidx': {'$sid': {'.read': AND(OWN('$sid'), MC)}},
    'sigs': {'.read': OR(TC, MC), '$k': {'.validate': "newData.hasChild('img') && newData.child('img').isString() && newData.child('img').val().length < 80000"}},
    # คิวแจ้งเตือน: ศิษย์ส่งได้เฉพาะชนิดที่กำหนด · ผู้ขอเข้าร่วมส่งได้หนึ่งคำขอต่อบัญชีเมื่อมีคำขอจริง
    'pushq': {'$id': {'.write': AND("!data.exists()", "newData.exists()", OR(
                          TC,
                          AND(MC, f"newData.child('by').val() == {SID}", "(newData.child('k').val() == 'griev' || newData.child('k').val() == 'sub')"),
                          AND(ANYROLE(C), f"newData.child('by').val() == {SID}", "(newData.child('k').val() == 'tx' || newData.child('k').val() == 'ann' || newData.child('k').val() == 'ev')"),
                          AND(V, "newData.child('k').val() == 'join'", f"$id == 'join-' + {EK}", f"newData.child('ref').val() == {EK}", f"root.child('c').child($cid).child('requests').child({EK}).exists()"))),
                      '.validate': AND("newData.hasChildren(['k', 'at'])", "newData.child('k').isString()", "newData.child('k').val().length < 12", "newData.child('at').isNumber()",
                                       STR('title', 120), STR('body', 400), STR('ref', 120), STR('to', 4000))}},
}

rules = {
    'c': {'$cid': unit},
    'teachers': {'.read': TANY, '.write': TALL, '$key': {'.read': AND(V, f"{EK} == $key")}},
    'accounts': {'.read': TANY, '.write': TANY,
                 '$k': {'.read': AND(V, f"{EK} == $k"), '.validate': "newData.isString() && newData.val().matches(/^[0-9]{4,8}$/)"}},
    'people': {'.read': TANY, '.write': TANY,
               '$sid': {'.read': OWN('$sid'), '.write': SEC_ANY, '.validate': SIDPAT,
                        'nick': {'.write': AND(OWN('$sid'), MEM_ANY)},
                        'photo': {'.write': AND(OWN('$sid'), MEM_ANY), '.validate': "newData.isString() && newData.val().length < 40000"},
                        'fcm': {'.write': OWN('$sid'), '$k': {'.validate': "newData.hasChild('t') && newData.child('t').isString() && newData.child('t').val().length < 400"}},
                        'poff': {'.write': OWN('$sid')}}},
    'privateInfo': {'.read': TANY, '.write': TANY,
                    '$sid': {'.read': OR(OWN('$sid'), SEC_OF('$sid')), '.write': OR(AND(OWN('$sid'), MEM_ANY), SEC_OF('$sid')),
                             '.validate': AND(STR('address', 400), STR('emergency', 200), STR('phone', 40), STR('line', 80), STR('email', 120))}},
    'photos': {'.read': TANY, '.write': TANY,
               '$sid': {'.read': OR(OWN('$sid'), SAME_UNIT('$sid')), '.write': OR(AND(OWN('$sid'), MEM_ANY), SEC_OF('$sid')),
                        '.validate': "newData.isString() && newData.val().length < 300000"}},
    'tpush': {'$key': {'.read': AND(V, f"{EK} == $key"), '.write': AND(V, f"{EK} == $key", TANY)}},
    'inbox': {'$sid': {'.read': OWN('$sid'), '.write': OWN('$sid')}},
    'tinbox': {'$key': {'.read': AND(V, f"{EK} == $key"), '.write': AND(V, f"{EK} == $key")}},
    'backup': {'.read': TANY},
    'rulesProbe': {f'v{RULES_V}': {'.read': True}},
}

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'database.rules.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump({'rules': rules}, f, ensure_ascii=False, indent=2)
print('เขียน', os.path.normpath(out), '·', os.path.getsize(out) // 1024, 'KB · Rules v' + str(RULES_V))
