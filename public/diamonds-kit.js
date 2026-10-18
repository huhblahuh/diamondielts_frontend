/* =====================================================================
   DIAMONDS-KIT v3 . Bo giao dien chung cua cac web Diamonds IELTS
   Lay tu Cong Bai Tap. KHONG sua tay trong khoi nay. Cap nhat thi thay
   ca khoi tu dong "DIAMONDS-KIT START" toi "DIAMONDS-KIT END".
   Cach dung: xem DIAMONDS-UI.md
   ===================================================================== */
(function(){
"use strict";
const VERSION = "3";
const PORTAL = "https://diamonds-ielts.netlify.app/";
const CSS = ".dk-sky{position:absolute; inset:0; transition:opacity 1.6s ease}\n.dk-sky-b{opacity:0}\n.dk-stars{position:absolute; inset:0 0 40% 0; opacity:var(--stars); transition:opacity 1.6s ease}\n.dk-star{position:absolute; border-radius:50%; background:#fff; animation:dk-tw 3.4s ease-in-out infinite}\n@keyframes dk-tw{0%,100%{opacity:.25}50%{opacity:1}}\n.dk-orb{position:absolute; border-radius:50%; transform:translate(-50%,-50%); cursor:pointer;\n  transition:left 1.6s ease, top 1.6s ease, opacity 1.6s ease, width .5s ease, height .5s ease, filter .5s ease}\n.dk-sun{width:100px; height:100px; background:radial-gradient(circle,#fffbe8 0 34%,#ffe39a 52%,rgba(255,214,120,0) 72%);\n  filter:drop-shadow(0 0 40px rgba(255,214,120,.6))}\n.dk-sun.dk-flare{width:140px; height:140px; filter:drop-shadow(0 0 80px rgba(255,220,130,.95)) brightness(1.15)}\n.dk-moon{width:58px; height:58px; background:radial-gradient(circle at 38% 38%,#fffdf3,#e7e3d2 60%,#cfcab4); box-shadow:0 0 50px 12px rgba(255,250,225,.18)}\n.dk-moon::after{content:\"\"; position:absolute; inset:0; border-radius:50%;\n  background:radial-gradient(circle at 66% 34%,rgba(0,0,0,.08) 0 6px,transparent 7px),radial-gradient(circle at 36% 66%,rgba(0,0,0,.07) 0 4px,transparent 5px)}\n.dk-cloud{position:absolute; fill:var(--cloud); opacity:.85; filter:blur(1px); overflow:visible; cursor:pointer;\n  transition:fill 1.6s ease; animation:dk-drift linear infinite}\n.dk-cloud path{transform-origin:100px 40px; transition:transform .35s cubic-bezier(.3,1.6,.5,1)}\n.dk-cloud.dk-puff path{transform:scale(1.18)}\n@keyframes dk-drift{from{transform:translateX(-25vw)}to{transform:translateX(125vw)}}\n.dk-land{position:absolute; inset:0; width:100%; height:100%; pointer-events:none}\n.dk-land *{transition:fill 1.6s ease, stop-color 1.6s ease, opacity 1.6s ease}\n.dk-f-far{fill:var(--far)} .dk-f-mid{fill:var(--mid)} .dk-f-near{fill:var(--near)}\n.dk-f-g1{fill:var(--g1)} .dk-f-g2{fill:var(--g2)} .dk-f-g3{fill:var(--g3)}\n.dk-f-w2{fill:var(--w2)} .dk-f-snow{fill:var(--snow)} .dk-f-cloud{fill:var(--cloud)}\n.dk-f-sand{fill:var(--sand,#e8c47c)} .dk-f-sand2{fill:var(--sand2,#d2a862)}\n.dk-spoke{stroke:var(--mid)}\n.dk-spin{animation:dk-spin 80s linear infinite} @keyframes dk-spin{to{transform:rotate(360deg)}}\n.dk-bus{animation:dk-bus 22s linear infinite} @keyframes dk-bus{from{transform:translateX(0)}to{transform:translateX(1000px)}}\n.dk-tram{animation:dk-tram 26s linear infinite} @keyframes dk-tram{from{transform:translateX(-260px)}to{transform:translateX(1700px)}}\n.dk-caravan{animation:dk-caravan 120s linear infinite} @keyframes dk-caravan{from{transform:translateX(-400px)}to{transform:translateX(1700px)}}\n.dk-lan{opacity:calc(.55 + var(--win) * .45); filter:drop-shadow(0 0 6px rgba(255,190,90,.6))}\n.dk-fall{animation:dk-fall 10s linear infinite} @keyframes dk-fall{from{transform:translate(0,-40px) rotate(0)}to{transform:translate(80px,980px) rotate(300deg)}}\n.dk-aurora{opacity:var(--stars); mix-blend-mode:screen; filter:blur(18px)}\n.dk-aur{opacity:.55; animation:dk-aur 9s ease-in-out infinite alternate} @keyframes dk-aur{from{transform:translateX(-40px) scaleY(.9)}to{transform:translateX(40px) scaleY(1.15)}}\n.dk-graze{animation:dk-bob 4s ease-in-out infinite}\n.dk-pinkish{filter:brightness(calc(1 - var(--win) * .65))}\n.dk-petalc{opacity:calc(1 - var(--win) * .6)}\n.dk-bfly{opacity:calc(1 - var(--win)); animation:dk-bfly 12s ease-in-out infinite} @keyframes dk-bfly{0%,100%{transform:translate(0,0)}25%{transform:translate(120px,-40px)}50%{transform:translate(240px,10px)}75%{transform:translate(110px,30px)}}\n.dk-bfly path{transform-box:fill-box; transform-origin:center; animation:dk-wing .25s ease-in-out infinite alternate} @keyframes dk-wing{to{transform:scaleX(.3)}}\n.dk-flag{animation:dk-flag 2.4s ease-in-out infinite} @keyframes dk-flag{0%,100%{transform:skewY(0) scaleX(1)}50%{transform:skewY(-5deg) scaleX(.94)}}\n.dk-fire{transform-box:fill-box; transform-origin:right center; animation:dk-fire .5s ease-in-out infinite alternate} @keyframes dk-fire{from{transform:scaleX(.8);opacity:.8}to{transform:scaleX(1.1);opacity:1}}\n.dk-skylan{animation:dk-skylan 22s linear infinite} @keyframes dk-skylan{from{transform:translate(0,40px)}to{transform:translate(60px,-760px)}}\n.dk-win{fill:#ffd88a; opacity:var(--win); pointer-events:auto; cursor:pointer}\n.dk-win.dk-off{opacity:0 !important; transition:opacity .2s}\n.dk-glowlite{opacity:var(--win)}\n.dk-wave{animation:dk-wave 7s linear infinite}\n.dk-wave.dk-s2{animation-duration:11s; animation-direction:reverse}\n@keyframes dk-wave{from{transform:translateX(0)}to{transform:translateX(-200px)}}\n.dk-beam{transform-origin:0 0; animation:dk-beam 6s linear infinite}\n@keyframes dk-beam{0%{transform:rotate(-40deg)}50%{transform:rotate(40deg)}100%{transform:rotate(-40deg)}}\n.dk-boat{animation:dk-boat 60s linear infinite}\n@keyframes dk-boat{from{transform:translateX(-500px)}to{transform:translateX(700px)}}\n.dk-bob{animation:dk-bob 3s ease-in-out infinite}\n@keyframes dk-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(4px)}}\n.dk-smoke{animation:dk-smoke 5s ease-out infinite; opacity:0}\n@keyframes dk-smoke{0%{transform:translate(0,0) scale(.4);opacity:0}20%{opacity:.6}100%{transform:translate(30px,-90px) scale(1.6);opacity:0}}\n.dk-mist{animation:dk-mist 40s linear infinite}\n.dk-mist.dk-s2{animation-duration:55s; animation-direction:reverse}\n@keyframes dk-mist{from{transform:translateX(-300px)}to{transform:translateX(300px)}}\n.dk-fly{fill:#fff2a0; opacity:var(--win); filter:drop-shadow(0 0 4px #ffe066); animation:dk-ffly 6s ease-in-out infinite}\n@keyframes dk-ffly{0%,100%{transform:translate(0,0)}25%{transform:translate(14px,-10px)}50%{transform:translate(-6px,-18px)}75%{transform:translate(-14px,-4px)}}\n.dk-blink{animation:dk-blinkr 1.4s steps(1) infinite}\n@keyframes dk-blinkr{0%{opacity:1}50%{opacity:.15}}\n.dk-shade{position:absolute; inset:0; background:radial-gradient(ellipse at 50% 55%,rgba(5,9,35,0) 30%,rgba(5,9,35,.35) 100%); pointer-events:none}\n.dk-fx{position:absolute; inset:0; pointer-events:none}\n.dk-bird{position:absolute; left:0; top:0; width:30px; height:18px; cursor:pointer; pointer-events:auto; z-index:3}\n.dk-bird svg{width:100%; height:100%; overflow:visible}\n.dk-bird .dk-w{fill:var(--birdc); transform-origin:17px 11px; animation:dk-flap .42s ease-in-out infinite alternate}\n.dk-bird .dk-w2{animation-name:dk-flap2}\n.dk-bird.dk-scared .dk-w{animation-duration:.12s}\n@keyframes dk-flap{from{transform:scaleY(1)}to{transform:scaleY(-.55)}}\n@keyframes dk-flap2{from{transform:scaleX(-1) scaleY(1)}to{transform:scaleX(-1) scaleY(-.55)}}\n.dk-feather{position:absolute; width:11px; height:5px; border-radius:50%; background:var(--birdc); pointer-events:none; z-index:3}\n.dk-shoot{position:absolute; width:140px; height:2px; border-radius:2px; pointer-events:none;\n  background:linear-gradient(90deg,rgba(255,255,255,0),#fff 80%,#fffbe0); filter:drop-shadow(0 0 6px #fff)}\n.dk-plane{position:absolute; width:6px; height:6px; border-radius:50%; background:#ff6b6b; box-shadow:0 0 8px 2px rgba(255,107,107,.8); pointer-events:none}\n\n@media(prefers-reduced-motion:reduce){ .dk-scene *{animation-duration:0s!important; animation-iteration-count:1!important} }\n\n/* ---------- giao dien chung ---------- */\nbody.dk{margin:0; font-family:\"Be Vietnam Pro\",-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif; position:relative; min-height:100svh;\n  --dk-navy:#101d54; --dk-gold:#e0b762; --dk-gold-hi:#fff0a5; --dk-ok:#1a7f4b; --dk-warn:#b45309; --dk-bad:#b42318;\n  -webkit-tap-highlight-color:transparent}\nbody.dk-mode-scene{background:#0b1340; color:#fff; color-scheme:dark;\n  --dk-text:#fff; --dk-mute:rgba(255,255,255,.72); --dk-line:rgba(255,255,255,.22);\n  --dk-surface:linear-gradient(160deg,rgba(255,255,255,.18),rgba(255,255,255,.05)), rgba(12,20,62,.42);\n  --dk-field:rgba(255,255,255,.10); --dk-field-line:rgba(255,255,255,.30); --dk-focus:var(--dk-gold-hi);\n  --dk-ok-t:#7ee2a8; --dk-warn-t:#ffd37a; --dk-bad-t:#ffb0a3}\nbody.dk-mode-plain{background:#f4f5fa; color:#1a1f36; color-scheme:light;\n  --dk-text:#1a1f36; --dk-mute:#6b7288; --dk-line:#e2e5ef;\n  --dk-surface:#fff; --dk-field:#fff; --dk-field-line:#d5d9e6; --dk-focus:var(--dk-navy);\n  --dk-ok-t:#1a7f4b; --dk-warn-t:#b45309; --dk-bad-t:#b42318}\nbody.dk .dk-page, body.dk .dk-card, body.dk .dk-item, body.dk .dk-seg, body.dk .dk-btn, body.dk .dk-top, body.dk .dk-pill{box-sizing:border-box}\nbody.dk button, body.dk input, body.dk select, body.dk textarea{font-family:inherit}\n\n/* nen phong canh (man co canh) */\n.dk-scene{position:fixed; top:0; left:0; right:0; z-index:0; overflow:hidden; height:100vh; height:100lvh; background:#0b1340}\nbody.dk-mode-plain .dk-scene{display:none}\n/* dai troi mong (man nen tron) */\n.dk-band{display:none; position:relative; height:112px; overflow:hidden; background:#2c7ad4}\nbody.dk-mode-plain .dk-band{display:block}\n@media(min-width:760px){ .dk-band{height:140px} }\n.dk-band .dk-land{position:absolute; inset:0; width:100%; height:100%}\n.dk-band::after{content:\"\"; position:absolute; inset:0; background:linear-gradient(180deg,rgba(5,9,35,.15),rgba(5,9,35,0) 40%,rgba(5,9,35,.25))}\n.dk-still *{animation:none !important}\n\n/* thanh tren cung */\n.dk-top{position:absolute; z-index:5; left:0; right:0; top:max(14px,env(safe-area-inset-top)); display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:8px;\n  padding:0 max(14px,env(safe-area-inset-right,0px)) 0 max(14px,env(safe-area-inset-left,0px)); pointer-events:none}\n.dk-top > *{pointer-events:auto}\n.dk-top-l{justify-self:start} .dk-top-r{justify-self:end; display:flex; gap:8px; align-items:center} .dk-top-slot{display:contents}\n.dk-logo{display:flex; align-items:center; gap:8px; padding:8px 16px; border-radius:999px; background:rgba(255,255,255,.88);\n  -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); border:1px solid rgba(240,214,150,.7); box-shadow:0 6px 20px rgba(4,8,30,.25); text-decoration:none}\n.dk-logo img{height:24px; width:auto; display:block}\n.dk-logo .dk-wm{font-weight:800; font-size:15px; line-height:1; white-space:nowrap}\n.dk-logo .dk-wm b{font-weight:800; background:linear-gradient(180deg,#c8902e 0%,#f6d77a 48%,#b9832c 100%); -webkit-background-clip:text; background-clip:text; color:transparent}\n.dk-logo .dk-wm i{font-style:normal; color:#101d54}\n.dk-logo .dk-app{font-weight:700; font-size:13px; color:#6b7288; padding-left:8px; margin-left:2px; border-left:1px solid #d9dce6}\n.dk-pill{display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 14px; border-radius:999px; color:#fff; text-decoration:none; font-weight:700; font-size:13.5px; cursor:pointer;\n  background:linear-gradient(160deg,rgba(255,255,255,.22),rgba(255,255,255,.06)), rgba(12,20,62,.35); -webkit-backdrop-filter:blur(14px) saturate(1.4); backdrop-filter:blur(14px) saturate(1.4);\n  border:1px solid rgba(240,214,150,.5); box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}\n.dk-pill svg{width:16px; height:16px}\n.dk-pill[hidden]{display:none}\n@media(max-width:520px){\n  .dk-top{grid-template-columns:auto minmax(0,1fr) auto; gap:6px}\n  .dk-logo{justify-self:center; padding:7px 12px; gap:6px} .dk-logo img{height:20px} .dk-logo .dk-wm{font-size:13.5px} .dk-logo .dk-app{display:none}\n  .dk-top-r{gap:6px} .dk-pill{padding:0 11px; height:36px} .dk-themebtn{width:36px; padding:0}\n}\n\n/* trang noi dung */\n.dk-page{position:relative; z-index:1; width:min(560px,100%); margin:0 auto; padding:calc(max(14px,env(safe-area-inset-top)) + 72px) 16px 40px}\nbody.dk-mode-plain .dk-page{padding-top:18px}\n.dk-page.wide{width:min(900px,100%)}\n\n/* khung */\n.dk-card{position:relative; background:var(--dk-surface); border-radius:22px; padding:20px; color:var(--dk-text)}\nbody.dk-mode-scene .dk-card{-webkit-backdrop-filter:blur(16px) saturate(1.5); backdrop-filter:blur(16px) saturate(1.5);\n  border:1px solid rgba(240,214,150,.45); box-shadow:inset 0 1px 0 rgba(255,255,255,.4), 0 12px 32px rgba(4,8,30,.3)}\nbody.dk-mode-plain .dk-card{border:1px solid var(--dk-line); box-shadow:0 2px 10px rgba(16,29,84,.06)}\n.dk-card + .dk-card{margin-top:14px}\n.dk-title{margin:0 0 4px; font-size:22px; font-weight:800; letter-spacing:.005em}\n.dk-sub{margin:0; font-size:13.5px; color:var(--dk-mute); font-weight:600}\n.dk-label{display:block; margin:16px 0 6px; font-size:12px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--dk-mute)}\n\n/* nut */\n.dk-btn{display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:48px; padding:0 20px; border:0; border-radius:14px; cursor:pointer;\n  font-size:15.5px; font-weight:800; color:#101d54; text-decoration:none; background:linear-gradient(180deg,#f8dd85,#e2b55a); box-shadow:inset 0 1px 0 rgba(255,255,255,.6), 0 6px 16px rgba(160,110,20,.28);\n  transition:transform .12s, filter .12s}\n.dk-btn:active{transform:scale(.97)} .dk-btn:hover{filter:brightness(1.04)}\n.dk-btn[disabled]{opacity:.5; cursor:default; transform:none}\n.dk-btn.block{display:flex; width:100%}\n.dk-btn.alt{color:var(--dk-text); background:transparent; border:1.5px solid var(--dk-field-line); box-shadow:none}\nbody.dk-mode-plain .dk-btn.alt{color:#101d54; background:#fff}\n.dk-btn.sm{min-height:36px; padding:0 14px; font-size:13.5px; border-radius:11px}\n\n/* o nhap */\n.dk-input, .dk-select, .dk-textarea{display:block; width:100%; box-sizing:border-box; min-height:48px; padding:12px 14px; border-radius:13px; font-size:16px; font-weight:600;\n  color:var(--dk-text); background:var(--dk-field); border:1.5px solid var(--dk-field-line); outline:none; transition:border-color .15s, box-shadow .15s}\n.dk-input::placeholder, .dk-textarea::placeholder{color:var(--dk-mute); opacity:.8}\n.dk-input:focus, .dk-select:focus, .dk-textarea:focus{border-color:var(--dk-focus); box-shadow:0 0 0 3px color-mix(in srgb, var(--dk-focus) 25%, transparent)}\n.dk-select{appearance:none; -webkit-appearance:none; padding-right:40px; cursor:pointer;\n  background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e0b762' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\");\n  background-repeat:no-repeat; background-position:right 12px center; background-size:18px}\nbody.dk-mode-scene .dk-select option{color:#1a1f36; background:#fff}\n.dk-textarea{min-height:260px; line-height:1.65; font-weight:500; resize:vertical}\n.dk-pin{text-align:center; font-size:26px; font-weight:800; letter-spacing:.6em; padding-left:calc(14px + .6em); font-variant-numeric:tabular-nums}\n.dk-msg{min-height:20px; margin:10px 0 0; font-size:13.5px; font-weight:700; color:var(--dk-bad-t)}\n\n/* danh sach */\n.dk-list{display:flex; flex-direction:column; gap:10px; margin:0; padding:0; list-style:none}\n.dk-item{display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:16px; background:var(--dk-surface); color:var(--dk-text); text-decoration:none; cursor:pointer; transition:transform .12s}\nbody.dk-mode-scene .dk-item{-webkit-backdrop-filter:blur(14px) saturate(1.4); backdrop-filter:blur(14px) saturate(1.4); border:1px solid rgba(240,214,150,.32)}\nbody.dk-mode-plain .dk-item{border:1px solid var(--dk-line)}\n.dk-item:active{transform:scale(.985)}\n.dk-item-b{flex:1; min-width:0}\n.dk-item-t{display:block; font-weight:800; font-size:15.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}\n.dk-item-s{display:block; margin-top:3px; font-size:12.5px; font-weight:600; color:var(--dk-mute)}\n.dk-tag{flex:none; display:inline-flex; align-items:center; height:24px; padding:0 10px; border-radius:999px; font-size:12px; font-weight:800; white-space:nowrap;\n  color:var(--dk-mute); background:color-mix(in srgb, currentColor 14%, transparent)}\n.dk-tag.ok{color:var(--dk-ok-t)} .dk-tag.warn{color:var(--dk-warn-t)} .dk-tag.bad{color:var(--dk-bad-t)}\n.dk-tag.new{color:#101d54; background:linear-gradient(180deg,#f8dd85,#e2b55a)}\n\n/* chuyen tab nho */\n.dk-seg{display:flex; gap:4px; padding:4px; border-radius:14px; background:var(--dk-field); border:1px solid var(--dk-line); margin:0 0 14px}\n.dk-seg button{flex:1; min-height:38px; border:0; border-radius:10px; background:transparent; color:var(--dk-mute); font-size:14px; font-weight:800; cursor:pointer}\n.dk-seg button.on{background:linear-gradient(180deg,#f8dd85,#e2b55a); color:#101d54}\n\n/* so diem */\n.dk-score{font-size:56px; line-height:1; font-weight:800; letter-spacing:-.02em; background:linear-gradient(180deg,#fff6c8,#f2c95c 60%,#c9902e); -webkit-background-clip:text; background-clip:text; color:transparent}\nbody.dk-mode-plain .dk-score{background:linear-gradient(180deg,#d6a23c,#a8741e); -webkit-background-clip:text; background-clip:text}\n.dk-row{display:flex; align-items:center; gap:10px; flex-wrap:wrap}\n.dk-row.between{justify-content:space-between}\n.dk-gap{height:14px}\n\n/* nut doi chu de va bang chon */\n.dk-themebtn{width:38px; padding:0; justify-content:center; color:var(--dk-gold-hi)}\n.dk-themebtn svg{width:19px; height:19px}\nbody.dk-mode-plain .dk-themebtn{display:none}\nbody.dk-plain-pref .dk-themebtn{display:inline-flex}\n.dk-sheet{position:fixed; z-index:50; inset:0; display:grid; place-items:end center; padding:16px; padding-bottom:calc(16px + env(safe-area-inset-bottom,0px)); background:rgba(4,8,30,.25); box-sizing:border-box}\n.dk-sheet[hidden]{display:none}\n.dk-panel{width:min(480px,100%); box-sizing:border-box; border-radius:26px; padding:16px; color:#fff; animation:dk-up .3s cubic-bezier(.2,1,.3,1);\n  background:linear-gradient(160deg,rgba(255,255,255,.20),rgba(255,255,255,.06)), rgba(12,20,62,.45); -webkit-backdrop-filter:blur(16px) saturate(1.5); backdrop-filter:blur(16px) saturate(1.5);\n  border:1px solid rgba(240,214,150,.45); box-shadow:inset 0 1px 0 rgba(255,255,255,.42), 0 12px 32px rgba(4,8,30,.28)}\n@keyframes dk-up{from{transform:translateY(30px);opacity:0}}\n.dk-panel h2{margin:2px 4px 12px; font-size:15px; font-weight:800; color:var(--dk-gold-hi); letter-spacing:.02em}\n.dk-tiles{max-height:min(66vh,560px); overflow-y:auto; margin:0 -6px; padding:0 6px 4px; overscroll-behavior:contain}\n.dk-tiles .dk-grid{display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px}\n.dk-tiles h3{margin:16px 2px 8px; font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:rgba(255,240,200,.8)}\n.dk-tile{display:flex; flex-direction:column; align-items:center; gap:6px; padding:0; background:none; border:0; color:#fff; cursor:pointer}\n.dk-tile .dk-th{display:block; width:100%; aspect-ratio:1; border-radius:16px; border:2px solid rgba(255,255,255,.25); overflow:hidden}\n.dk-tile .dk-th svg{width:100%; height:100%; display:block}\n.dk-tile .dk-th *{animation:none !important}\n.dk-tile.dk-on .dk-th{border-color:var(--dk-gold-hi); box-shadow:0 0 0 2px rgba(224,183,98,.4)}\n.dk-tile > span:last-child{font-size:11px; line-height:1.2; text-align:center; font-weight:700; color:rgba(255,255,255,.9)}\n.dk-tile:focus-visible, .dk-pill:focus-visible{outline:2px solid var(--dk-gold-hi); outline-offset:3px}\n\n/* Nền trơn: ô trong bảng chọn và chỉnh cho dễ nhìn hơn */\n.dk-tile .dk-th-plain{position:relative; background:linear-gradient(180deg,#2c7ad4 0 26%,#f4f5fa 26%)}\n.dk-th-plain i{position:absolute; left:16%; right:16%; height:12%; border-radius:4px; background:#fff; border:1px solid #d3d8e6}\n.dk-th-plain i:nth-child(1){top:36%} .dk-th-plain i:nth-child(2){top:54%} .dk-th-plain i:nth-child(3){top:72%; right:40%; background:#f2cd6a; border-color:#e2b55a}\nbody.dk-plain-pref{--dk-mute:#4a5168; --dk-line:#d3d8e6; --dk-field-line:#c3c9da}\nbody.dk-plain-pref .dk-card, body.dk-plain-pref .dk-item{border-width:1.5px}\nbody.dk-plain-pref .dk-sub{font-size:14.5px} body.dk-plain-pref .dk-item-s{font-size:13.5px} body.dk-plain-pref .dk-label{font-size:12.5px}\n";
const LOGO = "data:image/png;base64,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";
const FAVICON = "data:image/png;base64,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";
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const PHASES = [
  { key:"dawn", from:5, sky:["#3f4b92","#c58cb4","#ffd2a1"], far:"#9a8bb8", mid:"#6b5f98", near:"#2f2b62",
    g1:"#8f9aa0", g2:"#5f7a6e", g3:"#33504a", w2:"#5a5a96", sand:"#c9a092", sand2:"#a77f86", snow:"#ffe6e0", cloud:"#ffe2d2", bird:"#2a2860",
    sun:[14,56], moon:null, stars:.15, win:.35 },
  { key:"day", from:9, sky:["#2c7ad4","#79b9ef","#d3ecff"], far:"#a6bce2", mid:"#6f89c6", near:"#2a3c7e",
    g1:"#a3d48c", g2:"#6db06a", g3:"#3f8a4e", w2:"#2f77c0", sand:"#e8c47c", sand2:"#d2a862", snow:"#ffffff", cloud:"#ffffff", bird:"#1b2556",
    sun:[24,18], moon:null, stars:0, win:0 },
  { key:"noon", from:11, sky:["#1d6cd8","#5aaef5","#c4e7ff"], far:"#b0c6ea", mid:"#7893cf", near:"#2e4288",
    g1:"#ace08c", g2:"#74bd66", g3:"#43944c", w2:"#2272c6", sand:"#efcf86", sand2:"#dab26a", snow:"#ffffff", cloud:"#ffffff", bird:"#1b2556",
    sun:[55,9], moon:null, stars:0, win:0 },
  { key:"afternoon", from:14, sky:["#3477cc","#8fbfe8","#f6ddb0"], far:"#aeb3d2", mid:"#737bb2", near:"#2c3570",
    g1:"#bdd288", g2:"#88ae62", g3:"#538045", w2:"#3a6cae", sand:"#e6b86c", sand2:"#cc9a56", snow:"#fff4e0", cloud:"#fff6e8", bird:"#1e2858",
    sun:[78,22], moon:null, stars:0, win:0 },
  { key:"evening", from:16, sky:["#3a3888","#b05a8e","#ff9d5c"], far:"#8e6a94", mid:"#5a4580", near:"#251d52",
    g1:"#937c74", g2:"#62575e", g3:"#35304a", w2:"#4a3a78", sand:"#bd7c6c", sand2:"#8e5a62", snow:"#ffd0c0", cloud:"#ffc6a8", bird:"#1f1a4a",
    sun:[84,56], moon:null, stars:.2, win:.7 },
  { key:"night", from:18, sky:["#060a28","#121c55","#25377c"], far:"#23316f", mid:"#17215b", near:"#0b1036",
    g1:"#1e3150", g2:"#15253f", g3:"#0b1628", w2:"#0e1a4a", sand:"#2e3260", sand2:"#22264e", snow:"#a9b6e0", cloud:"#2a3a80", bird:"#0b1036",
    sun:null, moon:[80,13], stars:1, win:1 }
];

const GROUPS = [
  { name:"Việt Nam", items:[["saigon","Sài Gòn"],["hoian","Hội An"],["halong","Vịnh Hạ Long"],["hanoi","Hà Nội"],["danang","Đà Nẵng"],["hagiang","Hà Giang"],["mekong","Chợ nổi"],["country","Đồng quê"]] },
  { name:"Du học", items:[["london","London"],["sydney","Sydney"],["canada","Canada"],["newyork","New York"],["newzealand","New Zealand"],["melbourne","Melbourne"],["korea","Hàn Quốc"],["taiwan","Đài Loan"]] },
  { name:"Thế giới", items:[["tokyo","Tokyo"],["paris","Paris"],["egypt","Ai Cập"],["venice","Venice"],["city","Thành phố"]] },
  { name:"Thiên nhiên", items:[["sea","Biển"],["mountain","Núi"],["forest","Rừng thông"],["aurora","Cực quang"],["winter","Mùa đông"],["tropical","Đảo nhiệt đới"],["desert","Sa mạc"],["flowers","Đồng hoa"]] }
];
const THEMES = GROUPS.flatMap(g => g.items.map(([key, name]) => ({ key, name })));
const DRAW = (() => {
  const W = 1700;
  const P = (cls, d, extra = "") => `<path class="${cls}" d="${d}" ${extra}/>`;
  const box = (x, y, w, h) => `M${x},${y + h} V${y} H${x + w} V${y + h} Z `;
  function ridge(r, base, amp, step, jag){
    let d = `M-50,900 L-50,${base}`;
    for (let x = -50; x <= 1650; x += step){
      const y = base - amp * (.4 + .6 * r()) * (jag ? 1 : Math.abs(Math.sin(x / 260 + r())));
      d += ` L${x},${y.toFixed(1)}`;
    }
    return d + " L1650,900 Z";
  }
  function hills(base, amp, freq, phase, bottom = 900){
    let d = `M-50,${bottom} L-50,${base}`;
    for (let x = -50; x <= 1650; x += 20) d += ` L${x},${(base - amp * Math.sin(x / freq + phase)).toFixed(1)}`;
    return d + ` L1650,${bottom} Z`;
  }
  function windowsIn(r, x, y, w, h, p, wx = 16, wy = 22){
    let s = "";
    for (let yy = y + 14; yy < y + h - 12; yy += wy)
      for (let xx = x + 8; xx < x + w - 10; xx += wx)
        if (r() < p) s += `<rect class="win" x="${xx.toFixed(0)}" y="${yy.toFixed(0)}" width="7" height="10" rx="1"/>`;
    return s;
  }
  function skyline(r, base, minH, maxH, minW, maxW, skipFrom = 9999, skipTo = -1, winP = 0){
    let d = "", wins = "", x = -40;
    while (x < 1660){
      const w = minW + r() * (maxW - minW), h = minH + r() * (maxH - minH);
      if (x + w < skipFrom || x > skipTo){ d += box(x, base - h, w, h); if (winP) wins += windowsIn(r, x, base - h, w, h, winP); }
      x += w + 2;
    }
    return { d, wins };
  }
  function water(y, h = 900){
    return `<rect class="f-w2" x="-50" y="${y}" width="${W}" height="${h}"/><rect x="-50" y="${y}" width="${W}" height="26" fill="rgba(255,255,255,.10)"/>`;
  }
  function waves(y0, n, gap, a = .14, len = 50){
    let s = "";
    for (let i = 0; i < n; i++){
      let d = `M-200,${y0 + i * gap}`;
      for (let x = -200; x <= 1900; x += len) d += ` q${len / 2},${-4 - i * .6} ${len},0`;
      s += `<path class="wave ${i % 2 ? "s2" : ""}" d="${d}" fill="none" stroke="rgba(255,255,255,${(a + i * .02).toFixed(2)})" stroke-width="2"/>`;
    }
    return s;
  }
  function pine(x, base, h, cls, snow){
    const w = h * .42; let d = "", sn = "";
    for (let i = 0; i < 3; i++){
      const t = base - h * (i * .28), ww = w * (1 - i * .22), top = t - h * .5;
      d += `M${x - ww},${t} L${x},${top} L${x + ww},${t} Z `;
      if (snow) sn += `M${x - ww * .45},${top + h * .22} L${x},${top} L${x + ww * .45},${top + h * .22} L${x},${top + h * .16} Z `;
    }
    return P(cls, d + `M${x - 4},${base} V${base + 14} H${x + 4} V${base} Z`) + (sn ? P("f-snow", sn) : "");
  }
  function tree(cx, cy, rr, leaf = "f-g3", extra = ""){
    return P("f-near", `M${cx - 3},${cy} V${cy + rr * 1.3} H${cx + 3} V${cy} Z`) + `<circle class="${leaf}" cx="${cx}" cy="${cy - rr * .5}" r="${rr}" ${extra}/>`;
  }
  function palm(x, base, h, lean){
    const tx = x + lean, ty = base - h;
    let s = `<path class="f-near" d="M${x - 6},${base} Q${x + lean * .3},${base - h * .6} ${tx - 3},${ty} L${tx + 3},${ty} Q${x + lean * .3 + 8},${base - h * .6} ${x + 6},${base} Z"/>`;
    [[-1, -.2], [-1, .35], [1, -.2], [1, .35], [-.2, -1], [.3, -.9]].forEach(([dx, dy]) => {
      s += `<path class="f-g3" d="M${tx},${ty} q${dx * 40},${dy * 30 - 20} ${dx * 85},${dy * 50 + 10} q${-dx * 40},${-dy * 10 - 14} ${-dx * 85},${-dy * 50 - 10} Z" style="filter:brightness(.85)"/>`;
    });
    return s;
  }
  function boat(x, y, cls = "f-near", sail = "f-snow"){
    return `<g class="boat"><g class="bob"><path class="${cls}" d="M${x},${y} H${x + 80} L${x + 66},${y + 14} H${x + 14} Z"/>${sail ? `<path class="${sail}" d="M${x + 38},${y - 4} V${y - 62} L${x + 76},${y - 6} Z"/>` : ""}</g></g>`;
  }
  function falling(cls, n, r, color, w, h, dur){
    let s = "";
    for (let i = 0; i < n; i++)
      s += `<ellipse class="fall ${cls}" cx="${(r() * 1600).toFixed(0)}" cy="-20" rx="${w}" ry="${h}" fill="${color}" style="animation-duration:${(dur + r() * dur).toFixed(1)}s;animation-delay:${(-r() * dur * 2).toFixed(1)}s"/>`;
    return s;
  }
  function moonFace(){ return ""; }

  return {
    /* ---------- Viet Nam ---------- */
    saigon(){
      const r = rng(21); let s = "";
      s += P("f-far", skyline(r, 760, 90, 260, 40, 110).d);
      s += P("f-mid", "M640,760 L652,430 Q662,388 676,372 Q690,388 700,430 L712,760 Z M676,500 h70 a8,6 0 0 1 0,12 h-70 Z");
      s += P("f-mid", "M780,760 V420 H794 V330 H806 V250 H816 V185 L826,120 L836,185 V250 H846 V330 H858 V420 H872 V760 Z");
      const sk = skyline(r, 760, 120, 280, 60, 140, 620, 890);
      s += P("f-mid", sk.d);
      for (let y = 440; y < 750; y += 22) s += `<rect class="win" x="${806 + (y % 44 ? 0 : 18)}" y="${y}" width="6" height="10"/><rect class="win" x="${840 - (y % 44 ? 0 : 14)}" y="${y + 6}" width="6" height="10"/>`;
      for (let y = 560; y < 750; y += 26) s += `<rect class="win" x="672" y="${y}" width="6" height="10"/>`;
      s += `<rect class="win blink" x="823" y="112" width="6" height="6" rx="3" style="fill:#ff6b6b"/>`;
      s += water(760) + waves(790, 5, 22) + `<path class="glowlite" d="M800,770 h52 l-8,120 h-36 Z" fill="rgba(255,216,138,.18)"/>`;
      s += `<g class="boat" style="animation-duration:80s"><path class="f-near" d="M520,812 H600 L590,824 H530 Z M545,812 V800 H575 V812 Z"/></g>`;
      s += P("f-near", "M-50,900 V880 Q400,862 800,872 T1650,876 V900 Z");
      return s;
    },
    hoian(){
      const r = rng(31); let s = "";
      s += P("f-far", ridge(r, 600, 60, 90, false));
      let walls = "", roofs = "", wins = "", x = -40;
      while (x < 1660){
        const w = 90 + r() * 60, h = 90 + r() * 50, y = 730 - h;
        if (x + w < 560 || x > 1040){
          walls += box(x, y, w, h);
          roofs += `M${x - 10},${y + 4} Q${x + w / 2},${y - 34} ${x + w + 10},${y + 4} Z `;
          wins += `<rect class="win" x="${x + w * .3}" y="${y + 24}" width="${w * .4}" height="22" rx="3"/>`;
        }
        x += w + 4;
      }
      s += P("f-mid", walls) + P("f-near", roofs) + wins;
      s += water(740) + waves(770, 6, 24);
      // Chua Cau: vom da bac qua kenh, hanh lang go mai ngoi cong, mieu o giua cao hon
      s += `<g transform="translate(800,790) scale(1.45) translate(-800,-790)">`;
      s += P("f-mid", "M580,780 Q800,700 1020,780 L1020,800 Q800,724 580,800 Z");
      s += P("f-mid", "M630,744 H970 V692 H630 Z");
      for (let i = 0; i < 7; i++) s += `<rect class="win" x="${650 + i * 46}" y="704" width="26" height="26" rx="13"/>`;
      s += P("f-near", "M600,700 Q612,684 636,680 H964 Q988,684 1000,700 L1012,690 Q996,664 966,660 H634 Q604,664 588,690 Z");
      s += P("f-mid", "M736,662 H864 V628 H736 Z");
      s += P("f-near", "M712,634 Q724,616 748,612 H852 Q876,616 888,634 L900,624 Q884,598 856,594 H744 Q716,598 700,624 Z");
      s += P("f-near", "M790,594 L800,574 L810,594 Z M586,690 l-14,-12 l18,4 Z M1014,690 l14,-12 l-18,4 Z M698,624 l-14,-12 l18,4 Z M902,624 l14,-12 l-18,4 Z");
      s += `<rect class="win" x="784" y="636" width="32" height="18" rx="3"/>`;
      s += `</g>`;
      s += `<path class="glowlite" d="M630,800 h340 l-30,90 h-280 Z" fill="rgba(255,216,138,.14)"/>`;
      const cols = ["#ff5a4a", "#ffb03a", "#ffd85a", "#ff7ab0", "#7ad3ff"];
      let lan = `<path d="M-50,618 Q300,650 560,620" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/><path d="M1040,620 Q1300,650 1650,618" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>`;
      for (let i = 0; i < 26; i++){
        const lx = -20 + i * 66; if (lx > 540 && lx < 1060) continue;
        const ly = 626 + 18 * Math.sin(i / 3);
        lan += `<ellipse class="lan" cx="${lx}" cy="${ly + 14}" rx="9" ry="12" fill="${cols[i % cols.length]}"/>`;
      }
      [[650,684],[730,684],[870,684],[950,684]].forEach(([lx, ly], i) => lan += `<ellipse class="lan" cx="${lx}" cy="${ly + 12}" rx="8" ry="11" fill="${cols[i]}"/>`);
      s += lan;
      let floats = "";
      for (let i = 0; i < 14; i++) floats += `<circle class="lan bob" cx="${(r() * 1600).toFixed(0)}" cy="${(810 + r() * 80).toFixed(0)}" r="5" fill="${cols[i % cols.length]}" style="animation-delay:${-r() * 3}s"/>`;
      return s + floats + boat(1080, 820, "f-near", "");
    },
    halong(){
      const r = rng(41); let s = "";
      const karst = (x, w, h, base) => `M${x},${base} C${x},${base - h * .7} ${x + w * .15},${base - h} ${x + w * .45},${base - h} C${x + w * .8},${base - h} ${x + w},${base - h * .6} ${x + w},${base} Z `;
      let far = "", mid = "", near = "";
      for (let i = 0; i < 9; i++) far += karst(-60 + i * 200 + r() * 60, 120 + r() * 80, 140 + r() * 120, 640);
      for (let i = 0; i < 6; i++) mid += karst(-40 + i * 300 + r() * 80, 140 + r() * 90, 200 + r() * 140, 660);
      near += karst(-80, 300, 420, 720) + karst(1300, 360, 460, 720);
      s += water(630) + P("f-far", far) + P("f-mid", mid) + waves(680, 7, 30) + P("f-near", near);
      s += `<g class="boat" style="animation-duration:90s"><g class="bob"><path class="f-near" d="M600,760 H720 L700,780 H620 Z"/><path d="M640,756 V680 Q676,700 700,756 Z M612,756 V700 Q630,712 638,756 Z" fill="#a1502c"/></g></g>`;
      return s;
    },
    hanoi(){
      const r = rng(51); let s = "";
      s += P("f-far", skyline(r, 640, 60, 160, 50, 120).d);
      let trees = "";
      for (let x = -40; x < 1660; x += 50 + r() * 30) trees += `<circle class="f-g3" cx="${x.toFixed(0)}" cy="${(632 - r() * 20).toFixed(0)}" r="${(30 + r() * 20).toFixed(0)}" style="filter:brightness(.8)"/>`;
      s += trees + P("f-g3", "M-50,640 H1650 V680 H-50 Z", 'style="filter:brightness(.8)"');
      s += water(670) + waves(720, 6, 28);
      s += `<g transform="translate(0,716) scale(1.35) translate(0,-716)">`;
      // bo ho ben trai co cong, cau The Huc noi bo voi dao Ngoc Son
      s += P("f-g3", "M-50,900 V706 Q60,694 170,708 L180,730 Q90,744 -50,748 Z", 'style="filter:brightness(.75)"');
      s += P("f-near", "M70,708 V650 H86 V708 Z M140,708 V650 H156 V708 Z M60,652 H166 V640 H60 Z M78,640 L113,620 L148,640 Z");
      s += P("f-g3", "M360,716 Q470,690 600,712 L590,724 H372 Z", 'style="filter:brightness(.75)"');
      s += tree(380, 690, 22, "f-g3", 'style="filter:brightness(.7)"') + tree(590, 690, 20, "f-g3", 'style="filter:brightness(.7)"');
      s += P("f-near", "M430,712 V676 H540 V712 Z M418,680 Q485,652 552,680 L560,672 Q485,640 410,672 Z") + `<rect class="win" x="470" y="686" width="30" height="18" rx="2"/>`;
      // cau do cong
      s += `<path d="M170,716 Q265,650 370,712" fill="none" stroke="#c8322a" stroke-width="9" stroke-linecap="round"/>`;
      s += `<path d="M170,700 Q265,634 370,696" fill="none" stroke="#c8322a" stroke-width="4" stroke-linecap="round"/>`;
      for (let i = 1; i < 10; i++){ const t = i / 10, x = 170 + 200 * t, y0 = 716 - 4 * 62 * t * (1 - t); s += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 - 16}" stroke="#c8322a" stroke-width="3"/>`; }
      s += `<path d="M170,716 Q265,650 370,712" fill="none" stroke="rgba(200,50,42,.35)" stroke-width="9" transform="translate(0,30) scale(1,.6)" style="transform-origin:0 716px"/>`;
      s += `</g>`;
      s += `<g transform="translate(260,0)">`;
      // Thap Rua giua ho
      s += P("f-g3", "M720,712 Q800,690 880,712 L870,720 H730 Z");
      s += P("f-near", "M760,712 V640 H840 V712 Z M770,640 V600 H830 V640 Z M782,600 V572 H818 V600 Z M752,640 H848 L840,632 H760 Z M764,600 H836 L828,594 H772 Z M776,572 H824 L800,552 Z");
      s += `<rect class="win" x="790" y="660" width="20" height="30" rx="10"/><rect class="win" x="792" y="612" width="16" height="18" rx="8"/>`;
      s += `</g>`;
      return s;
    },
    hagiang(){
      const r = rng(71); let s = "";
      const cone = (x, w, h, base) => `M${x},${base} C${x + w * .2},${base - h * .6} ${x + w * .32},${base - h} ${x + w * .5},${base - h} C${x + w * .68},${base - h} ${x + w * .8},${base - h * .6} ${x + w},${base} Z `;
      let far = "";
      for (let i = 0; i < 12; i++) far += cone(-80 + i * 150 + r() * 40, 200 + r() * 80, 160 + r() * 140, 600);
      s += P("f-far", far);
      s += `<path d="M560,900 L610,640 Q800,600 990,630 L1040,900 Z" style="fill:var(--far);filter:brightness(.82)"/>`;
      s += `<path d="M690,900 C700,820 740,780 770,740 C790,710 770,680 790,650 C800,636 812,630 820,626 L828,630 C820,640 812,656 806,672 C796,700 818,730 806,760 C792,800 840,850 880,900 Z" fill="#3fae9a" class="pinkish"/>`;
      s += `<path d="M720,890 C735,830 770,790 792,756 M760,880 C780,840 800,810 806,780" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2" stroke-dasharray="10 16" class="wave"/>`;
      // hai vach nui va hem Nho Que o giua
      s += P("f-mid", "M-50,900 V520 Q150,470 330,500 Q480,520 600,600 Q680,660 720,900 Z");
      s += P("f-mid", "M880,900 Q920,640 1010,560 Q1100,420 1180,400 Q1400,430 1650,500 V900 Z");
      // duong deo uon luon tren vach nui
      s += `<path d="M60,880 Q260,860 220,800 Q180,740 360,720 Q520,700 430,640 Q350,590 520,580" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="4"/>`;
      // cot co Lung Cu tren dinh
      s += P("f-near", "M1166,404 V318 H1194 V404 Z M1160,320 H1200 V308 H1160 Z M1178,308 V200 H1182 V308 Z");
      s += `<rect class="win" x="1174" y="340" width="12" height="16" rx="2"/>`;
      s += `<g class="flag" style="transform-origin:1182px 214px"><rect x="1182" y="202" width="64" height="42" fill="#da251d"/><path d="M1214,212 l3.5,10.5 h11 l-9,6.5 l3.5,10.5 l-9,-6.5 l-9,6.5 l3.5,-10.5 l-9,-6.5 h11 Z" fill="#ffde00"/></g>`;
      // dong hoa tam giac mach
      s += `<path d="${hills(800, 26, 260, 1.4)}" fill="#e790b8" class="pinkish"/>`;
      s += `<path d="${hills(860, 20, 300, 3)}" fill="#d9709f" class="pinkish"/>`;
      let dots = "";
      for (let i = 0; i < 160; i++) dots += `<circle cx="${(r() * 1600).toFixed(0)}" cy="${(800 + r() * 100).toFixed(0)}" r="${(1.5 + r() * 2.5).toFixed(1)}" fill="#fff0f6" class="petalc"/>`;
      s += dots;
      return s;
    },
    mekong(){
      const r = rng(81); let s = "";
      s += water(620) + waves(650, 9, 28);
      s += P("f-g3", "M-50,630 H1650 V600 Q1200,590 800,604 T-50,598 Z", 'style="filter:brightness(.8)"');
      let palms = "";
      for (let x = -20; x < 1660; x += 70 + r() * 60) palms += palm(x, 610, 60 + r() * 50, (r() - .5) * 30);
      s += palms;
      const cols = ["#ffb03a", "#ff6b4a", "#7ccf5a", "#ffd85a"];
      [[380,700,1],[700,740,-1],[1000,690,1],[560,800,1],[1200,780,-1]].forEach(([x, y, f], i) => {
        let goods = "";
        for (let k = 0; k < 5; k++) goods += `<circle cx="${x + 22 + k * 9}" cy="${y - 5}" r="5" fill="${cols[(i + k) % 4]}"/>`;
        s += `<g class="bob" style="animation-delay:-${i * .7}s"><path class="f-near" d="M${x},${y} Q${x + 50},${y + 16} ${x + 100},${y} L${x + 92},${y + 10} H${x + 8} Z"/>${goods}<path class="f-near" d="M${x + 84},${y - 2} L${x + 98},${y - 30} L${x + 112},${y - 2} Z" style="opacity:.9"/></g>`;
      });
      s += palm(80, 900, 260, 40) + palm(1520, 900, 280, -50);
      return s;
    },
    country(){
      const r = rng(5); let s = "";
      s += P("f-far", ridge(r, 600, 120, 60, false)) + P("f-g1", hills(650, 40, 220, 1));
      let rows = ""; for (let i = 0; i < 6; i++) rows += `<path d="${hills(712 + i * 16, 18, 240, 2.2)}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="3"/>`;
      s += P("f-g2", hills(705, 30, 240, 2.2)) + rows + P("f-g3", hills(790, 26, 300, .4));
      s += `<g>${P("f-near", "M730,778 V730 L770,700 L810,730 V778 Z M790,712 V690 H800 V720 Z")}<rect class="win" x="760" y="742" width="16" height="16" rx="2"/>
            <circle class="smoke f-cloud" cx="796" cy="684" r="8"/><circle class="smoke f-cloud" cx="796" cy="684" r="8" style="animation-delay:-1.7s"/><circle class="smoke f-cloud" cx="796" cy="684" r="8" style="animation-delay:-3.4s"/></g>`;
      [[620,770,26],[660,776,18],[900,780,24],[940,786,16],[1180,792,28],[420,796,22]].forEach(([cx, cy, rr]) => s += tree(cx, cy, rr, "f-g3", 'style="filter:brightness(.82)"'));
      return s;
    },

    /* ---------- Du hoc ---------- */
    london(){
      const r = rng(91); let s = "";
      s += P("f-far", skyline(r, 760, 80, 220, 50, 120).d);
      // London Eye
      let eye = `<circle cx="1120" cy="560" r="130" fill="none" class="spoke" stroke-width="6"/>`;
      for (let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2; eye += `<line x1="1120" y1="560" x2="${1120 + 130 * Math.cos(a)}" y2="${560 + 130 * Math.sin(a)}" class="spoke" stroke-width="2"/><circle class="f-mid" cx="${1120 + 130 * Math.cos(a)}" cy="${560 + 130 * Math.sin(a)}" r="7"/>`; }
      s += `<g class="spin" style="transform-origin:1120px 560px">${eye}</g>` + P("f-mid", "M1120,560 L1060,760 H1074 L1120,600 L1166,760 H1180 Z");
      // Toa Quoc hoi va thap Big Ben
      let parl = box(740, 650, 300, 110);
      for (let i = 0; i < 9; i++) parl += `M${752 + i * 33},650 V626 L${758 + i * 33},612 L${764 + i * 33},626 V650 Z `;
      s += P("f-mid", parl);
      s += P("f-near", "M680,760 V380 H740 V760 Z M674,380 H746 V362 H674 Z M684,362 L710,250 L736,362 Z");
      s += `<circle class="f-snow" cx="710" cy="420" r="20"/><path d="M710,420 V406 M710,420 L720,426" stroke="#20284f" stroke-width="3" stroke-linecap="round"/><circle class="win" cx="710" cy="420" r="20" style="opacity:calc(var(--win) * .7)"/>`;
      s += windowsIn(r, 740, 650, 300, 110, .5, 20, 26);
      s += water(760) + waves(790, 5, 22);
      s += P("f-near", "M380,770 H1300 V786 H380 Z M420,786 V860 H440 V786 Z M620,786 V860 H640 V786 Z M820,786 V860 H840 V786 Z M1020,786 V860 H1040 V786 Z M1220,786 V860 H1240 V786 Z");
      s += `<g class="bus"><rect x="300" y="742" width="70" height="28" rx="5" fill="#d8282b"/><rect x="306" y="748" width="58" height="8" fill="#ffe7b0" opacity=".85"/><circle cx="316" cy="772" r="5" fill="#111"/><circle cx="356" cy="772" r="5" fill="#111"/></g>`;
      return s;
    },
    sydney(){
      const r = rng(101); let s = "";
      s += P("f-far", skyline(r, 700, 80, 260, 40, 100, 9999, -1).d);
      s += water(700) + waves(730, 7, 26);
      // Cau cang
      s += `<path d="M1000,690 Q1250,470 1500,690" fill="none" class="spoke" stroke-width="14"/><path d="M1000,690 Q1250,520 1500,690" fill="none" class="spoke" stroke-width="5"/>`;
      for (let i = 1; i < 10; i++){ const t = i / 10, x = 1000 + 500 * t, y = 690 - 4 * 220 * t * (1 - t) * 1.0; s += `<line x1="${x}" y1="${y}" x2="${x}" y2="650" class="spoke" stroke-width="3"/>`; }
      s += P("f-mid", "M960,650 H1540 V662 H960 Z M970,600 V700 H1010 V600 Z M1490,600 V700 H1530 V600 Z");
      // Nha hat Con So
      s += P("f-near", "M560,720 H960 V700 H560 Z");
      s += P("f-snow", "M600,700 Q610,600 690,560 Q660,640 690,700 Z M680,700 Q700,590 790,540 Q750,630 790,700 Z M770,700 Q800,600 880,580 Q850,650 870,700 Z M860,700 Q880,640 930,630 Q910,670 925,700 Z");
      s += P("f-mid", "M640,700 Q650,640 690,600 L690,700 Z M730,700 Q745,620 790,580 L790,700 Z", 'style="opacity:.45"');
      s += boat(300, 790);
      return s;
    },
    canada(){
      const r = rng(111); let s = "";
      const peaks = [[220,330],[560,250],[900,300],[1220,230],[1500,320]];
      let far = "M-50,900 L-50,560", snow = "";
      peaks.forEach(([x, y]) => { far += ` L${x - 150},${y + 210} L${x},${y}`; snow += `M${x - 44},${y + 56} L${x},${y} L${x + 44},${y + 56} L${x + 18},${y + 44} L${x},${y + 64} L${x - 18},${y + 44} Z `; });
      far += " L1650,560 L1650,900 Z";
      s += P("f-far", far) + P("f-snow", snow) + P("f-mid", ridge(r, 660, 90, 60, true));
      s += water(660) + `<g transform="translate(0,1320) scale(1,-1)" opacity=".22">${P("f-far", far)}</g>` + waves(690, 7, 26, .1);
      let pines = "";
      for (let x = -60; x < 560; x += 50 + r() * 30) pines += pine(x, 900 - r() * 40, 220 + r() * 120, "f-g3");
      for (let x = 1060; x < 1680; x += 50 + r() * 30) pines += pine(x, 900 - r() * 40, 220 + r() * 120, "f-g3");
      s += pines;
      s += `<g class="boat" style="animation-duration:100s"><path class="f-near" d="M700,780 Q760,796 820,780 L812,788 Q760,800 708,788 Z"/></g>`;
      s += falling("leaf", 14, r, "#e2563a", 7, 4, 9);
      return s;
    },
    newyork(){
      const r = rng(121); let s = "";
      s += P("f-far", skyline(r, 780, 160, 360, 40, 90).d);
      // Empire State
      s += P("f-mid", "M720,780 V420 H740 V360 H752 V300 H764 V230 L770,150 L776,230 V300 H788 V360 H800 V420 H820 V780 Z");
      const sk = skyline(r, 780, 140, 320, 60, 120, 700, 840, .4);
      s += P("f-mid", sk.d) + sk.wins + windowsIn(r, 720, 420, 100, 360, .5);
      s += `<rect class="win blink" x="767" y="146" width="6" height="6" rx="3" style="fill:#ff6b6b"/>`;
      s += water(780) + waves(805, 4, 22);
      // Tuong Nu than Tu do
      // Tuong Nu than Tu do tren dao, mau dong xanh
      s += P("f-g3", "M1080,820 Q1170,796 1270,820 Z", 'style="filter:brightness(.75)"');
      s += P("f-near", "M1110,812 L1130,792 H1210 L1230,812 Z M1140,792 V700 H1200 V792 Z M1134,704 H1206 V692 H1134 Z");
      s += `<g fill="#6fae98" class="pinkish">
        <path d="M1152,692 L1158,600 Q1170,586 1182,600 L1188,692 Z"/>
        <path d="M1160,640 L1146,644 L1140,628 L1156,618 Z"/>
        <path d="M1176,604 L1188,560 L1200,512 L1208,514 L1198,562 L1186,608 Z"/>
        <circle cx="1170" cy="584" r="11"/>
        <path d="M1170,566 l-3,-14 l6,0 Z M1158,570 l-10,-10 l5,-4 Z M1182,570 l10,-10 l-5,-4 Z M1152,580 l-14,-3 l2,-6 Z M1188,580 l14,-3 l-2,-6 Z"/>
        <path d="M1196,512 h16 l-3,-10 h-10 Z"/>
      </g>`;
      s += `<path d="M1204,502 q-7,-10 0,-20 q7,10 0,20 Z" fill="#ffc94d"/><circle class="win" cx="1204" cy="494" r="9"/>`;
      s += boat(420, 830, "f-near", "");
      return s;
    },
    newzealand(){
      const r = rng(131); let s = "";
      const peaks = [[300,360],[700,300],[1100,340],[1450,380]];
      let far = "M-50,900 L-50,600", snow = "";
      peaks.forEach(([x, y]) => { far += ` L${x - 170},${y + 220} L${x},${y}`; snow += `M${x - 50},${y + 60} L${x},${y} L${x + 50},${y + 60} L${x + 20},${y + 48} L${x},${y + 66} L${x - 20},${y + 46} Z `; });
      far += " L1650,600 L1650,900 Z";
      s += P("f-far", far) + P("f-snow", snow) + P("f-g1", hills(640, 50, 230, .3)) + P("f-g2", hills(730, 40, 260, 2)) + P("f-g3", hills(820, 30, 300, 4));
      let sheep = "";
      [[620,720],[680,730],[760,722],[860,736],[930,728],[560,800],[820,810],[1000,812],[700,818]].forEach(([x, y]) => {
        sheep += `<g class="graze" style="animation-delay:-${(x % 7) * .4}s"><ellipse class="f-snow" cx="${x}" cy="${y}" rx="15" ry="10"/><circle class="f-near" cx="${x + 14}" cy="${y - 4}" r="5"/><path class="f-near" d="M${x - 8},${y + 8} v8 M${x + 6},${y + 8} v8" style="stroke:var(--near)" stroke-width="3"/></g>`;
      });
      s += sheep + tree(450, 800, 30) + tree(1180, 820, 34);
      return s;
    },

    /* ---------- The gioi ---------- */
    tokyo(){
      const r = rng(151); let s = "";
      s += P("f-far", "M300,700 L700,330 Q800,290 900,330 L1300,700 Z") + P("f-snow", "M700,330 Q800,290 900,330 L940,370 L900,360 L870,384 L840,358 L800,386 L760,358 L730,384 L700,360 L660,370 Z");
      s += P("f-mid", ridge(r, 700, 50, 80, false));
      // chua 5 tang
      let pag = "";
      for (let i = 0; i < 5; i++){ const y = 760 - i * 52, w = 120 - i * 14; pag += box(520 - w / 2 + 14, y - 34, w - 28, 34) + `M${520 - w / 2 - 14},${y - 34} Q520,${y - 56} ${520 + w / 2 + 14},${y - 34} L${520 + w / 2},${y - 26} H${520 - w / 2} Z `; }
      s += P("f-near", pag + "M517,500 V470 H523 V500 Z") ;
      for (let i = 0; i < 5; i++) s += `<rect class="win" x="512" y="${736 - i * 52}" width="16" height="12"/>`;
      s += P("f-g3", hills(780, 20, 280, 1));
      let blossoms = "";
      [[200,700,70],[320,730,50],[1040,700,80],[1180,720,60],[1320,690,70]].forEach(([x, y, rr]) => {
        blossoms += P("f-near", `M${x - 6},${y} V${y + 120} H${x + 6} V${y} Z`);
        for (let k = 0; k < 5; k++) blossoms += `<circle cx="${x + (r() - .5) * rr}" cy="${y - r() * rr * .6}" r="${rr * .55}" fill="#f6b6c8" class="pinkish"/>`;
      });
      s += blossoms + falling("petal", 22, r, "#ffc8d8", 5, 3, 10);
      return s;
    },
    paris(){
      const r = rng(161); let s = "";
      s += P("f-far", skyline(r, 760, 60, 160, 50, 110).d);
      // thap Eiffel
      s += P("f-near", "M640,770 Q720,600 760,420 L772,250 L776,170 L784,170 L788,250 L800,420 Q840,600 920,770 L880,770 Q840,690 800,660 L760,660 Q720,690 680,770 Z M738,520 H822 V532 H738 Z M760,420 H800 V432 H760 Z");
      s += P("f-near", "M700,660 Q780,600 860,660 L850,668 Q780,616 710,668 Z");
      let sp = "";
      for (let i = 0; i < 26; i++){ const t = r(), y = 200 + t * 540, half = 8 + t * t * 120; sp += `<circle class="win blink" cx="${(780 + (r() - .5) * half * 1.4).toFixed(0)}" cy="${y.toFixed(0)}" r="2.4" style="fill:#fff6c8;animation-delay:-${(r() * 1.4).toFixed(2)}s"/>`; }
      s += sp + `<rect class="win" x="776" y="166" width="8" height="8" rx="4"/>`;
      // nha Haussmann mai xam
      let hb = "", mans = "";
      for (let x = -40; x < 1660; x += 110 + r() * 30){
        if (x > 600 && x < 950) continue;
        const h = 120 + r() * 40, w = 100 + r() * 20;
        hb += box(x, 800 - h, w, h); mans += `M${x - 4},${800 - h} L${x + 10},${800 - h - 30} H${x + w - 10} L${x + w + 4},${800 - h} Z `;
        s += windowsIn(r, x, 800 - h, w, h, .45, 18, 26);
      }
      s += P("f-mid", hb) + P("f-near", mans) + water(800) + waves(825, 4, 22);
      return s;
    },
    egypt(){
      const r = rng(171); let s = "";
      s += P("f-sand2", hills(660, 30, 300, 1));
      s += P("f-sand", "M560,700 L760,420 L960,700 Z") + P("f-sand2", "M760,420 L960,700 L800,700 Z");
      s += P("f-sand", "M960,700 L1100,520 L1240,700 Z") + P("f-sand2", "M1100,520 L1240,700 L1130,700 Z");
      s += P("f-sand", "M380,700 L470,580 L560,700 Z") + P("f-sand2", "M470,580 L560,700 L490,700 Z");
      s += P("f-sand", hills(740, 30, 260, 2.5)) + P("f-sand2", hills(830, 24, 300, .6));
      const camel = x => `<path class="f-near" d="M${x},790 h70 q10,-30 -10,-36 q-14,-20 -26,0 q-12,-16 -24,0 l-8,-20 h-10 l6,24 q-4,10 2,32 Z M${x + 6},790 v26 M${x + 20},790 v26 M${x + 52},790 v26 M${x + 64},790 v26" style="stroke:var(--near)" stroke-width="4"/>`;
      s += `<g class="caravan">${camel(0)}${camel(100)}${camel(200)}</g>`;
      return s;
    },
    venice(){
      const r = rng(181); let s = "";
      s += water(740) + waves(770, 6, 24);
      // nha hai ben kenh
      let L = "", R = "", wins = "";
      for (let i = 0; i < 6; i++){
        const h = 300 + r() * 140, x = -40 + i * 110;
        L += box(x, 760 - h, 112, h);
        for (let yy = 760 - h + 30; yy < 720; yy += 50) for (let k = 0; k < 3; k++) wins += `<path class="win" d="M${x + 16 + k * 32},${yy + 30} v-18 a8,8 0 0 1 16,0 v18 Z"/>`;
      }
      for (let i = 0; i < 6; i++){
        const h = 300 + r() * 140, x = 1000 + i * 110;
        R += box(x, 760 - h, 112, h);
        for (let yy = 760 - h + 30; yy < 720; yy += 50) for (let k = 0; k < 3; k++) wins += `<path class="win" d="M${x + 16 + k * 32},${yy + 30} v-18 a8,8 0 0 1 16,0 v18 Z"/>`;
      }
      s += P("f-mid", L + R) + wins;
      // cau vom phia xa
      s += P("f-far", skyline(r, 700, 100, 200, 60, 120).d);
      s += P("f-near", "M620,700 Q800,600 980,700 L980,716 H940 Q800,640 660,716 H620 Z M700,650 H900 V640 H700 Z");
      // thuyen gondola
      s += `<g class="boat" style="animation-duration:70s"><g class="bob"><path class="f-near" d="M600,800 Q680,816 760,800 Q776,792 782,780 Q772,800 760,804 Q680,826 600,808 Q590,800 588,790 Q594,800 600,800 Z"/><path class="f-near" d="M700,804 V744 M696,744 h8 v-20 h-8 Z M700,770 L740,830" style="stroke:var(--near)" stroke-width="4"/></g></g>`;
      return s;
    },
    city(){
      const r = rng(11);
      const f = skyline(r, 900, 280, 540, 50, 120), m = skyline(r, 900, 200, 420, 60, 140), n = skyline(r, 900, 110, 280, 70, 160, 9999, -1, .45);
      return P("f-far", f.d) + P("f-mid", m.d) + P("f-near", n.d) + n.wins;
    },

    danang(){
      const r = rng(241); let s = "";
      s += P("f-far", skyline(r, 720, 80, 230, 40, 110).d);
      // ban dao Son Tra va tuong Phat Ba
      s += P("f-mid", "M1120,722 Q1260,520 1440,540 Q1560,552 1650,600 V722 Z");
      s += P("f-snow", "M1368,560 L1374,506 Q1382,494 1390,506 L1396,560 Z") + `<circle class="f-snow" cx="1382" cy="498" r="7"/>`;
      s += water(720) + waves(752, 6, 26);
      // cau Rong: mat cau, tru, than rong uon luon
      s += P("f-near", "M150,704 H1450 V716 H150 Z");
      for (let x = 200; x <= 1400; x += 150) s += P("f-near", `M${x - 8},716 V780 H${x + 8} V716 Z`);
      let body = "M330,690";
      for (let i = 0; i < 5; i++){ const x = 330 + i * 190; body += ` C${x + 40},${590} ${x + 150},${590} ${x + 190},690`; }
      s += `<path d="${body}" fill="none" stroke="#e7b53b" stroke-width="18" stroke-linecap="round" class="pinkish"/>`;
      s += `<path d="${body}" fill="none" stroke="#fff3b0" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round" class="glowlite"/>`;
      s += `<path d="M1280,690 q50,-10 60,-50 q8,-30 -18,-30 q20,20 -10,46" fill="none" stroke="#e7b53b" stroke-width="12" stroke-linecap="round" class="pinkish"/>`;
      s += `<path d="M338,694 L300,640 L262,634 L250,650 L276,662 L246,676 L290,686 Z M300,640 l-6,-26 l18,20 Z" fill="#e7b53b" class="pinkish"/>`;
      s += `<circle cx="282" cy="648" r="3" fill="#1b1b1b"/>`;
      s += `<g class="glowlite"><path class="fire" d="M248,668 q-60,-16 -110,4 q40,6 60,18 q-40,4 -70,22 q60,4 120,-24 Z" fill="#ff8a2a"/><path class="fire" d="M246,670 q-36,-8 -70,4 q30,6 70,0 Z" fill="#ffe27a" style="animation-delay:-.3s"/></g>`;
      s += `<path class="glowlite" d="M300,724 h1000 l-60,140 h-880 Z" fill="rgba(255,210,110,.12)"/>`;
      return s;
    },
    melbourne(){
      const r = rng(141); let s = "";
      s += P("f-far", skyline(r, 820, 180, 380, 40, 100).d);
      // thap Eureka chop vang
      s += P("f-mid", "M1040,820 V330 H1100 V820 Z") + `<path d="M1040,330 H1100 V290 L1070,282 L1040,290 Z" fill="#e8b84a" class="pinkish"/>` + windowsIn(r, 1040, 340, 60, 470, .5);
      const sk = skyline(r, 820, 140, 300, 60, 120, 560, 1110, .4);
      s += P("f-mid", sk.d) + sk.wins;
      // ga Flinders Street: toa nha vang, mai vom xanh, thap dong ho
      s += `<g fill="#e4a64e" class="pinkish"><path d="M600,820 V712 H1000 V820 Z"/><path d="M590,716 H1010 V702 H590 Z"/><path d="M600,820 V640 H660 V820 Z"/><path d="M770,712 V680 H830 V712 Z"/></g>`;
      s += `<path d="M596,644 H664 V628 L630,600 L596,628 Z" fill="#5aa58a" class="pinkish"/><path d="M760,684 Q800,620 840,684 Z" fill="#5aa58a" class="pinkish"/><path d="M800,640 V620" stroke="#5aa58a" stroke-width="4"/>`;
      s += `<circle cx="630" cy="668" r="14" fill="#fff6e0"/><path d="M630,668 V658 M630,668 l7,4" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>`;
      for (let i = 0; i < 8; i++) s += `<path class="win" d="M${680 + i * 40},790 v-34 a10,10 0 0 1 20,0 v34 Z"/>`;
      s += P("f-near", "M-50,820 H1650 V900 H-50 Z");
      s += `<path d="M-50,770 H1650" stroke="rgba(0,0,0,.4)" stroke-width="1.5"/><path d="M-50,846 H1650 M-50,858 H1650" stroke="rgba(255,255,255,.18)" stroke-width="2"/>`;
      for (let x = 60; x < 1600; x += 260) s += P("f-near", `M${x},820 V650 H${x + 4} V820 Z M${x - 10},650 H${x + 14} V644 H${x - 10} Z`) + `<circle class="win" cx="${x + 2}" cy="656" r="7"/>`;
      s += `<g class="tram"><rect x="0" y="782" width="200" height="56" rx="10" fill="#2f8f5a"/><rect x="0" y="822" width="200" height="10" fill="#e9b83a"/>
            <rect x="12" y="792" width="30" height="20" rx="3" fill="#ffe7b0" opacity=".85"/><rect x="52" y="792" width="30" height="20" rx="3" fill="#ffe7b0" opacity=".85"/><rect x="92" y="792" width="30" height="20" rx="3" fill="#ffe7b0" opacity=".85"/><rect x="132" y="792" width="30" height="20" rx="3" fill="#ffe7b0" opacity=".85"/>
            <path d="M100,782 L120,770" stroke="#222" stroke-width="3"/><circle cx="40" cy="842" r="7" fill="#111"/><circle cx="160" cy="842" r="7" fill="#111"/></g>`;
      return s;
    },
    taiwan(){
      const r = rng(251); let s = "";
      s += P("f-far", ridge(r, 560, 160, 90, false));
      s += P("f-g2", "M-50,800 V560 Q120,470 300,520 Q420,560 520,800 Z", 'style="filter:brightness(.85)"');
      const sk = skyline(r, 820, 110, 260, 60, 130, 700, 900, .4);
      s += P("f-mid", sk.d) + sk.wins;
      // Taipei 101: than duoi, 8 doan loe len, chop nhon
      let t = "M760,820 V650 H840 V820 Z ";
      for (let i = 0; i < 8; i++){ const y = 650 - i * 42; t += `M770,${y} L760,${y - 42} H840 L830,${y} Z `; }
      t += "M772,314 H828 V296 H772 Z M790,296 V262 H810 V296 Z M797,262 L800,200 L803,262 Z";
      s += P("f-mid", t);
      for (let i = 0; i < 8; i++) s += `<rect class="win" x="772" y="${616 - i * 42}" width="56" height="4"/>`;
      s += windowsIn(r, 760, 650, 80, 170, .5);
      s += `<rect class="win blink" x="797" y="196" width="6" height="6" rx="3" style="fill:#ff6b6b"/>`;
      s += P("f-near", "M-50,820 H1650 V900 H-50 Z");
      // den troi bay len ve dem
      let lan = "";
      for (let i = 0; i < 16; i++){
        const x = 80 + r() * 1440, d = 18 + r() * 14;
        lan += `<g class="skylan" style="animation-duration:${d.toFixed(1)}s;animation-delay:-${(r() * d).toFixed(1)}s"><path d="M${x - 9},${780} h18 l-3,-24 h-12 Z" fill="#ffb347"/><circle cx="${x}" cy="${778}" r="3" fill="#fff3c0"/></g>`;
      }
      s += `<g class="glowlite">${lan}</g>`;
      return s;
    },
    korea(){
      const r = rng(271); let s = "";
      s += P("f-far", ridge(r, 560, 170, 90, false));
      // thap Lotte phia xa
      s += P("f-far", "M1290,700 L1302,330 L1312,300 L1322,330 L1334,700 Z", 'style="filter:brightness(.9)"');
      // nui Namsan va thap N Seoul
      s += P("f-g2", "M480,780 Q680,480 860,462 Q1040,480 1240,780 Z", 'style="filter:brightness(.85)"');
      s += P("f-mid", "M852,466 V340 H868 V466 Z M834,342 Q860,314 886,342 L878,356 H842 Z M856,318 V230 H864 V318 Z");
      s += `<rect class="win" x="842" y="336" width="36" height="7" rx="3"/><rect class="win blink" x="857" y="224" width="6" height="6" rx="3" style="fill:#ff6b6b"/>`;
      s += P("f-mid", skyline(r, 780, 80, 180, 50, 110, 420, 1180).d);
      // cong Gwanghwamun: be da 3 vom, lau go 2 tang mai cong
      s += P("f-mid", "M460,860 V760 H860 V860 Z");
      s += P("f-near", "M540,860 v-50 a24,24 0 0 1 48,0 v50 Z M636,860 v-60 a24,24 0 0 1 48,0 v60 Z M732,860 v-50 a24,24 0 0 1 48,0 v50 Z");
      s += `<path class="win" d="M548,860 v-46 a16,16 0 0 1 32,0 v46 Z M644,860 v-56 a16,16 0 0 1 32,0 v56 Z M740,860 v-46 a16,16 0 0 1 32,0 v46 Z" style="opacity:calc(var(--win) * .7)"/>`;
      s += P("f-mid", "M520,760 V736 H800 V760 Z M572,690 V650 H748 V690 Z");
      s += P("f-near", "M456,726 Q508,724 534,690 H786 Q812,724 864,726 L850,742 H470 Z");
      s += P("f-near", "M498,658 Q540,656 566,622 H754 Q780,656 822,658 L808,672 H512 Z M562,624 H758 V616 H562 Z");
      s += `<rect class="win" x="590" y="662" width="140" height="12" rx="2"/>`;
      s += P("f-near", "M-50,860 H1650 V900 H-50 Z");
      return s;
    },
    /* ---------- Thien nhien ---------- */
    sea(){
      let s = P("f-far", "M-50,620 L120,600 L260,612 L380,590 L520,620 Z M1100,620 L1240,596 L1360,606 L1500,588 L1650,620 Z");
      s += water(618) + waves(650, 7, 36);
      s += P("f-near", "M820,900 L840,720 L900,690 L980,700 L1040,740 L1090,900 Z") + P("f-snow", "M935,700 L943,560 H965 L973,700 Z");
      s += P("f-near", "M939,650 H969 V666 H937 Z M941,602 H967 V616 H941 Z M936,560 H972 V548 L954,532 L936,548 Z");
      s += `<rect class="win" x="945" y="550" width="18" height="10"/><g class="glowlite" transform="translate(954,555)"><path class="beam" d="M0,0 L-420,-60 L-420,60 Z" fill="rgba(255,236,170,.22)"/></g>`;
      return s + boat(560, 742);
    },
    mountain(){
      const r = rng(3);
      const peaks = [[200,330],[520,240],[860,290],[1150,220],[1450,300]];
      let far = "M-50,900 L-50,520", snow = "";
      peaks.forEach(([x, y]) => { far += ` L${x - 160},${y + 200} L${x},${y} `; snow += `M${x - 46},${y + 58} L${x},${y} L${x + 46},${y + 58} L${x + 20},${y + 46} L${x},${y + 66} L${x - 20},${y + 44} Z `; });
      far += " L1650,520 L1650,900 Z";
      return P("f-far", far) + P("f-snow", snow, 'style="opacity:.92"') +
        `<ellipse class="mist f-cloud" cx="500" cy="560" rx="380" ry="26" style="opacity:.35"/><ellipse class="mist s2 f-cloud" cx="1150" cy="520" rx="300" ry="20" style="opacity:.3"/>` +
        P("f-mid", ridge(r, 620, 150, 70, true)) + P("f-near", ridge(r, 740, 110, 60, true)) + P("f-g3", ridge(r, 830, 50, 40, true), 'style="filter:brightness(.7)"');
    },
    forest(){
      const r = rng(17); let s = P("f-far", ridge(r, 560, 110, 80, false)), g1 = "", g2 = "", g3 = "";
      for (let x = -40; x < 1660; x += 26 + r() * 20) g1 += pine(x, 680 + r() * 20, 110 + r() * 60, "f-g1");
      for (let x = -60; x < 1660; x += 44 + r() * 30) g2 += pine(x, 780 + r() * 20, 170 + r() * 80, "f-g2");
      for (let x = -80; x < 1680; x += 90 + r() * 60) if (x < 640 || x > 960) g3 += pine(x, 900, 300 + r() * 140, "f-g3");
      s += g1 + `<rect class="f-g1" x="-50" y="690" width="1700" height="40"/>` + g2 + `<rect class="f-g2" x="-50" y="790" width="1700" height="120"/>` + g3;
      for (let i = 0; i < 26; i++) s += `<circle class="fly" cx="${200 + r() * 1200}" cy="${640 + r() * 220}" r="${1.8 + r() * 1.6}" style="animation-delay:${-r() * 6}s;animation-duration:${4 + r() * 4}s"/>`;
      return s;
    },
    aurora(){
      const r = rng(191); let s = "";
      let au = "";
      [["#5cffb0", 260, 0], ["#7ad6ff", 300, 1.6], ["#c08cff", 230, 3.1]].forEach(([c, y, ph], i) => {
        let d = `M-100,${y}`; for (let x = -100; x <= 1700; x += 40) d += ` L${x},${(y + 50 * Math.sin(x / 210 + ph)).toFixed(0)}`;
        au += `<path class="aur" d="${d}" fill="none" stroke="${c}" stroke-width="${70 - i * 14}" stroke-linecap="round" style="animation-delay:-${i * 3}s"/>`;
      });
      s += `<g class="aurora">${au}</g>`;
      const peaks = [[250,420],[620,360],[1000,400],[1350,350]];
      let far = "M-50,900 L-50,620", snow = "";
      peaks.forEach(([x, y]) => { far += ` L${x - 170},${y + 200} L${x},${y}`; snow += `M${x - 60},${y + 70} L${x},${y} L${x + 60},${y + 70} L${x + 24},${y + 56} L${x},${y + 78} L${x - 24},${y + 56} Z `; });
      far += " L1650,620 L1650,900 Z";
      s += P("f-far", far) + P("f-snow", snow) + P("f-snow", hills(760, 24, 300, 1), 'style="opacity:.9"');
      let pines = "";
      for (let x = -60; x < 1680; x += 60 + r() * 50) if (x < 600 || x > 1000) pines += pine(x, 860 - r() * 60, 160 + r() * 120, "f-g3", true);
      s += pines + P("f-near", "M760,770 V730 L800,700 L840,730 V770 Z") + `<rect class="win" x="792" y="740" width="16" height="16"/>`;
      return s;
    },
    winter(){
      const r = rng(201); let s = "";
      s += P("f-far", ridge(r, 560, 120, 80, false)) + P("f-snow", hills(660, 30, 260, 1), 'style="opacity:.75"') + P("f-snow", hills(760, 26, 300, 2.4));
      let pines = "";
      for (let x = -60; x < 1680; x += 70 + r() * 60) if (x < 640 || x > 980) pines += pine(x, 830 - r() * 50, 160 + r() * 140, "f-g3", true);
      s += pines;
      s += P("f-near", "M720,780 V720 L790,670 L860,720 V780 Z M830,690 V650 H846 V706 Z") + P("f-snow", "M712,724 L790,664 L868,724 L860,730 L790,676 L720,730 Z");
      s += `<rect class="win" x="742" y="734" width="22" height="22" rx="2"/><rect class="win" x="806" y="734" width="22" height="22" rx="2"/>`;
      s += `<circle class="smoke f-cloud" cx="838" cy="644" r="8"/><circle class="smoke f-cloud" cx="838" cy="644" r="8" style="animation-delay:-1.7s"/><circle class="smoke f-cloud" cx="838" cy="644" r="8" style="animation-delay:-3.4s"/>`;
      s += falling("snowf", 50, r, "#ffffff", 3, 3, 8);
      return s;
    },
    tropical(){
      const r = rng(211); let s = "";
      s += water(600) + `<rect x="-50" y="600" width="1700" height="140" fill="rgba(80,230,220,.18)"/>` + waves(630, 6, 26);
      s += P("f-g3", "M1150,604 Q1250,560 1380,604 Z", 'style="filter:brightness(.8)"') + palm(1260, 600, 60, 10);
      s += P("f-sand", "M-50,900 V780 Q300,740 700,770 T1650,750 V900 Z") + `<path d="M-50,780 Q300,740 700,770 T1650,750" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="5"/>`;
      s += palm(200, 860, 300, 70) + palm(360, 880, 240, 40) + palm(1420, 880, 320, -80);
      s += boat(700, 690);
      return s;
    },
    desert(){
      const r = rng(221); let s = "";
      s += P("f-sand2", hills(620, 40, 320, .8)) + P("f-sand", hills(700, 50, 280, 2.2)) + P("f-sand2", hills(800, 40, 340, 4)) + P("f-sand", hills(870, 30, 300, 1.4));
      const cactus = (x, b, h) => P("f-g3", `M${x - 9},${b} V${b - h} a9,9 0 0 1 18,0 V${b} Z M${x - 9},${b - h * .45} h-22 a7,7 0 0 1 -7,-7 v-${h * .25} a7,7 0 0 1 14,0 v${h * .18} h15 Z M${x + 9},${b - h * .6} h20 a7,7 0 0 0 7,-7 v-${h * .2} a7,7 0 0 0 -14,0 v${h * .14} h-13 Z`, 'style="filter:brightness(.75)"');
      s += cactus(300, 820, 160) + cactus(1300, 840, 190) + cactus(620, 760, 90) + cactus(1050, 790, 110);
      return s;
    },
    flowers(){
      const r = rng(231); let s = "";
      s += P("f-far", ridge(r, 580, 100, 90, false)) + P("f-g1", hills(660, 40, 240, 1)) + P("f-g2", hills(760, 34, 280, 2.6)) + P("f-g3", hills(860, 24, 300, .3));
      const cols = ["#ff6b8a", "#ffd34d", "#ffffff", "#b98cff", "#ff9a4d"];
      let fl = "";
      for (let i = 0; i < 260; i++){
        const x = r() * 1600, y = 680 + r() * 220, rr = 2 + (y - 680) / 220 * 5;
        fl += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(1)}" fill="${cols[i % 5]}" class="petalc"/>`;
      }
      s += fl;
      let bf = "";
      for (let i = 0; i < 6; i++) bf += `<g class="bfly" style="animation-delay:-${i * 2}s;animation-duration:${10 + i * 2}s"><path d="M${500 + i * 120},${640 - i * 14} q-12,-14 -16,2 q8,8 16,-2 q12,-14 16,2 q-8,8 -16,-2 Z" fill="${cols[(i + 1) % 5]}"/></g>`;
      return s + bf;
    }
  };
})();


/* ---------- may cho chay ---------- */
const $q = (s, el = document) => el.querySelector(s);
const ss = { get(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }, set(k, v){ try{ sessionStorage.setItem(k, v); }catch(e){} } };
const ls = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} } };
const pre = html => html.replace(/class="([^"]*)"/g, (m, c) => 'class="' + c.trim().split(/\s+/).map(x => "dk-" + x).join(" ") + '"');
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const VARS = ["far","mid","near","g1","g2","g3","w2","snow","cloud","sand","sand2"];
let scene, band, mode = "scene", wanted = "scene", plainPref = false, themeKey = null, shown = null, front = "A", opts = {};

function pickTheme(){
  const u = new URL(location.href), q = u.searchParams.get("theme");
  if (q !== null){ u.searchParams.delete("theme"); try{ history.replaceState(history.state, "", u); }catch(e){} }
  if (q && DRAW[q]){ ss.set("dk_theme", q); return q; }
  const saved = ls.get("dk_theme"); if (saved && DRAW[saved]){ ss.set("dk_theme", saved); return saved; }
  const s = ss.get("dk_theme"); if (s && DRAW[s]) return s;
  const last = ls.get("dk_last_theme"), pool = THEMES.map(t => t.key).filter(k => k !== last);
  const k = pool[Math.floor(Math.random() * pool.length)];
  ls.set("dk_last_theme", k); ss.set("dk_theme", k); return k;
}
/* "Nền trơn": bỏ phong cảnh sau nội dung cho dễ nhìn. Nhớ theo máy, nhận từ cổng qua ?plain=1 */
function readPlain(){
  const u = new URL(location.href), q = u.searchParams.get("plain");
  if (q !== null){
    u.searchParams.delete("plain"); try{ history.replaceState(history.state, "", u); }catch(e){}
    if (q === "1" || q === "0"){ ls.set("dk_plain", q); return q === "1"; }
  }
  const s = ls.get("dk_plain"); if (s === "1" || s === "0") return s === "1";
  try{ return matchMedia("(prefers-contrast: more)").matches; }catch(e){ return false; }
}
function setPlain(on){
  plainPref = !!on; ls.set("dk_plain", plainPref ? "1" : "0");
  setMode(wanted); markTiles();
  const a = $q(".dk-portal"); if (a) a.href = portalLink();
  return DK;
}
function hourNow(){
  const p = new URLSearchParams(location.search).get("dkt");
  if (p !== null && !isNaN(parseFloat(p))) return parseFloat(p);
  const d = new Date(); return d.getHours() + d.getMinutes() / 60;
}
function phaseNow(){ const h = hourNow(); let cur = PHASES[PHASES.length - 1]; for (const p of PHASES) if (h >= p.from) cur = p; return cur; }
function applyPhase(force){
  const p = phaseNow(); if (shown === p.key && !force) return;
  const grad = `linear-gradient(180deg,${p.sky[0]} 0%,${p.sky[1]} 55%,${p.sky[2]} 100%)`;
  const a = $q(".dk-sky-a", scene), b = $q(".dk-sky-b", scene);
  if (shown === null) a.style.background = grad;
  else { const nx = front === "A" ? b : a, pv = front === "A" ? a : b; nx.style.background = grad; nx.style.opacity = 1; pv.style.opacity = 0; front = front === "A" ? "B" : "A"; }
  band.style.background = `linear-gradient(180deg,${p.sky[0]},${p.sky[1]} 70%,${p.sky[2]})`;
  [scene, band].forEach(el => {
    VARS.forEach(k => el.style.setProperty("--" + k, p[k]));
    el.style.setProperty("--birdc", p.bird); el.style.setProperty("--win", p.win); el.style.setProperty("--stars", p.stars);
  });
  const sun = $q(".dk-sun", scene), moon = $q(".dk-moon", scene);
  [[sun, p.sun], [moon, p.moon]].forEach(([el, pos]) => {
    if (pos){ el.style.left = pos[0] + "%"; el.style.top = pos[1] + "%"; el.style.opacity = 1; el.style.pointerEvents = "auto"; }
    else { el.style.opacity = 0; el.style.pointerEvents = "none"; }
  });
  shown = p.key;
}
function drawTheme(key){
  themeKey = key; const html = pre(DRAW[key]());
  $q(".dk-land", scene).innerHTML = html; $q(".dk-land", band).innerHTML = html;
  scene.querySelectorAll(".dk-win").forEach(w => w.addEventListener("click", () => {
    if (parseFloat(scene.style.getPropertyValue("--win")) < .3) return;
    w.classList.add("dk-off"); setTimeout(() => w.classList.remove("dk-off"), 1300);
  }));
  const a = $q(".dk-portal"); if (a) a.href = portalLink();
  markTiles();
}
const chosen = () => { const v = ls.get("dk_theme"); return v && DRAW[v] ? v : "random"; };
function markTiles(){ document.querySelectorAll(".dk-tile").forEach(t => t.classList.toggle("dk-on", t.dataset.k === "plain" ? plainPref : t.dataset.k === chosen())); }
const PIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.6"/></svg>';
function buildPicker(btn){
  const sheet = document.createElement("div"); sheet.className = "dk-sheet"; sheet.hidden = true;
  sheet.innerHTML = `<div class="dk-panel" role="dialog" aria-label="Chủ đề"><h2>Chủ đề</h2><div class="dk-tiles"></div></div>`;
  document.body.appendChild(sheet);
  const tiles = $q(".dk-tiles", sheet), day = PHASES[1];
  VARS.forEach(k => tiles.style.setProperty("--" + k, day[k])); tiles.style.setProperty("--win", 0); tiles.style.setProperty("--stars", 0);
  const sky = `linear-gradient(180deg,${day.sky[0]},${day.sky[1]} 60%,${day.sky[2]})`;
  const close = () => { sheet.hidden = true; };
  const add = (key, name) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "dk-tile"; b.dataset.k = key;
    if (key === "plain"){
      b.innerHTML = `<span class="dk-th dk-th-plain"><i></i><i></i><i></i></span><span>${name}</span>`;
      b.addEventListener("click", () => { setPlain(!plainPref); close(); });
      return b;
    }
    b.innerHTML = `<span class="dk-th" style="background:${key === "random" ? "linear-gradient(135deg,#2c7ad4,#b05a8e 50%,#ffc94d)" : sky}"></span><span>${name}</span>`;
    b.addEventListener("click", () => {
      if (key === "random"){ ls.set("dk_theme", "random"); const pool = THEMES.map(x => x.key).filter(k => k !== themeKey); const k = pool[Math.floor(Math.random() * pool.length)]; ss.set("dk_theme", k); drawTheme(k); }
      else { ls.set("dk_theme", key); ss.set("dk_theme", key); drawTheme(key); }
      close();
    });
    return b;
  };
  const top = document.createElement("div"); top.className = "dk-grid"; top.appendChild(add("random", "Ngẫu nhiên")); top.appendChild(add("plain", "Nền trơn")); tiles.appendChild(top);
  GROUPS.forEach(g => {
    const h3 = document.createElement("h3"); h3.textContent = g.name; tiles.appendChild(h3);
    const grid = document.createElement("div"); grid.className = "dk-grid";
    g.items.forEach(([k, n]) => grid.appendChild(add(k, n)));
    tiles.appendChild(grid);
  });
  let drawn = false;
  btn.addEventListener("click", () => {
    sheet.hidden = false; markTiles();
    if (drawn) return; drawn = true;
    sheet.querySelectorAll(".dk-tile").forEach(t => {
      if (t.dataset.k === "random" || t.dataset.k === "plain") return;
      t.querySelector(".dk-th").innerHTML = `<svg viewBox="250 220 1100 680" preserveAspectRatio="xMidYMax slice">${pre(DRAW[t.dataset.k]())}</svg>`;
    });
  });
  sheet.addEventListener("click", e => { if (e.target === sheet) close(); });
  addEventListener("keydown", e => { if (e.key === "Escape") close(); });
}
function portalLink(){ const u = new URL(opts.portal); u.searchParams.set("theme", themeKey); u.searchParams.set("plain", plainPref ? "1" : "0"); return u.href; }

function buildSky(){
  const st = $q(".dk-stars", scene);
  for (let i = 0; i < 90; i++){
    const s = document.createElement("i"); s.className = "dk-star"; const z = 1 + Math.random() * 2.2;
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;width:${z}px;height:${z}px;animation-delay:${-Math.random()*4}s`;
    st.appendChild(s);
  }
  [[9,170,95,-20],[19,120,120,-70],[30,210,140,-40],[14,90,110,-100]].forEach(([top, w, dur, delay]) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    c.setAttribute("viewBox", "-10 -30 220 100"); c.setAttribute("class", "dk-cloud");
    c.style.cssText = `top:${top}%;width:${w}px;animation-duration:${dur}s;animation-delay:${delay}s`;
    c.innerHTML = `<path d="M40 60h120a22 22 0 0 0 0-44 30 30 0 0 0-56-10 26 26 0 0 0-44 18 20 20 0 0 0-20 36z"/>`;
    c.addEventListener("click", () => {
      c.classList.add("dk-puff"); setTimeout(() => c.classList.remove("dk-puff"), 450);
      const an = c.getAnimations()[0]; if (an){ an.playbackRate = 6; setTimeout(() => an.playbackRate = 1, 1400); }
    });
    $q(".dk-clouds", scene).appendChild(c);
  });
}

const live = () => mode === "scene" && !document.hidden && !reduce;
const isNight = () => shown === "night";
function shootingStar(){
  const s = document.createElement("i"); s.className = "dk-shoot";
  s.style.left = (15 + Math.random() * 55) + "%"; s.style.top = (4 + Math.random() * 20) + "%"; $q(".dk-fx", scene).appendChild(s);
  const dx = 260 + Math.random() * 160, dy = dx * .45;
  s.animate([{ transform:"translate(0,0) rotate(24deg) scaleX(.2)", opacity:0 }, { opacity:1, offset:.2 },
             { transform:`translate(${dx}px,${dy}px) rotate(24deg) scaleX(1)`, opacity:0 }],
            { duration:1100, easing:"cubic-bezier(.3,.6,.5,1)" }).onfinish = () => s.remove();
}
const BIRD_SVG = '<svg viewBox="0 0 34 20"><path class="dk-w" d="M17 11 C12 4 6 3 1 6 C7 6 11 8 17 11Z"/><path class="dk-w dk-w2" d="M17 11 C12 4 6 3 1 6 C7 6 11 8 17 11Z"/></svg>';
function flock(){
  if (isNight() || !live()) return;
  const n = 2 + Math.floor(Math.random() * 3), ltr = Math.random() < .5;
  const W = innerWidth, baseY = innerHeight * (.08 + Math.random() * .2), dur = 14000 + Math.random() * 6000;
  for (let i = 0; i < n; i++){
    const b = document.createElement("div"); b.className = "dk-bird"; b.innerHTML = BIRD_SVG;
    const sz = .7 + Math.random() * .5; b.style.width = 30 * sz + "px"; b.style.height = 18 * sz + "px";
    b.querySelectorAll(".dk-w").forEach(w => w.style.animationDelay = (-Math.random() * .4) + "s");
    scene.appendChild(b);
    const y = baseY + i * 22 * (Math.random() < .5 ? 1 : -1) + Math.random() * 10;
    const x0 = ltr ? -60 - i * 40 : W + 60 + i * 40, x1 = ltr ? W + 80 : -80 - 40 * n, f = ltr ? 1 : -1;
    const fly = b.animate([{ transform:`translate(${x0}px,${y}px) scaleX(${f})` }, { transform:`translate(${(x0 + x1) / 2}px,${y - 30}px) scaleX(${f})` },
                           { transform:`translate(${x1}px,${y + 10}px) scaleX(${f})` }], { duration:dur + i * 400, delay:i * 250, easing:"linear" });
    fly.onfinish = () => b.remove();
    b.addEventListener("click", () => {
      if (b.classList.contains("dk-scared")) return;
      const r = b.getBoundingClientRect(), sx = r.left, sy = r.top;
      fly.cancel(); b.classList.add("dk-scared"); b.style.transform = `translate(${sx}px,${sy}px) scaleX(${f})`;
      b.animate([{ transform:`translate(${sx}px,${sy}px) scaleX(${f})` }, { transform:`translate(${sx + f * 80}px,${sy - 60}px) scaleX(${f})`, offset:.3 },
                 { transform:`translate(${sx + f * 260}px,-120px) scaleX(${f})` }], { duration:900, easing:"cubic-bezier(.2,.7,.4,1)", fill:"forwards" }).onfinish = () => b.remove();
      for (let k = 0; k < 4; k++){
        const ft = document.createElement("i"); ft.className = "dk-feather"; ft.style.left = (sx + 10) + "px"; ft.style.top = (sy + 6) + "px"; scene.appendChild(ft);
        const dr = (Math.random() - .5) * 90, fall = 120 + Math.random() * 120;
        ft.animate([{ transform:"translate(0,0) rotate(0)", opacity:.9 }, { transform:`translate(${dr * .5}px,${fall * .4}px) rotate(${60 + k * 30}deg)`, offset:.4 },
                    { transform:`translate(${dr}px,${fall}px) rotate(${-40 + k * 20}deg)`, opacity:0 }], { duration:2200 + Math.random() * 900, easing:"ease-in-out" }).onfinish = () => ft.remove();
      }
    });
  }
}
function loops(){
  (function autoShoot(){ setTimeout(() => { if (isNight() && live()) shootingStar(); autoShoot(); }, 7000 + Math.random() * 10000); })();
  (function planes(){
    setTimeout(() => {
      if (isNight() && live() && (themeKey === "city" || themeKey === "saigon")){
        const p = document.createElement("i"); p.className = "dk-plane dk-blink"; $q(".dk-fx", scene).appendChild(p);
        const y = innerHeight * (.12 + Math.random() * .15), ltr = Math.random() < .5;
        p.animate([{ transform:`translate(${ltr ? -20 : innerWidth + 20}px,${y}px)` }, { transform:`translate(${ltr ? innerWidth + 20 : -20}px,${y - 40}px)` }],
                  { duration:26000, easing:"linear" }).onfinish = () => p.remove();
      }
      planes();
    }, 12000 + Math.random() * 14000);
  })();
  (function birdLoop(){ setTimeout(() => { flock(); birdLoop(); }, 20000 + Math.random() * 20000); })();
  setTimeout(flock, 2500);
  setInterval(() => applyPhase(), 60000);
}

const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
function init(o = {}){
  if (scene) return DK;
  opts = Object.assign({ app:"", portal:PORTAL, mode:"scene", favicon:true }, o);
  if (!document.querySelector('link[href*="Be+Vietnam+Pro"]')){
    const f = document.createElement("link"); f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800&display=swap"; document.head.appendChild(f);
  }
  const st = document.createElement("style"); st.id = "dk-style"; st.textContent = CSS; document.head.prepend(st);
  if (opts.favicon){
    document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]').forEach(l => l.remove());
    const l = document.createElement("link"); l.rel = "icon"; l.type = "image/png"; l.href = FAVICON; document.head.appendChild(l);
  }
  document.body.classList.add("dk");
  scene = document.createElement("div"); scene.className = "dk-scene"; scene.setAttribute("aria-hidden", "true");
  scene.innerHTML = `<div class="dk-sky dk-sky-a"></div><div class="dk-sky dk-sky-b"></div><div class="dk-stars"></div>
    <div class="dk-orb dk-sun"></div><div class="dk-orb dk-moon"></div><div class="dk-clouds"></div>
    <svg class="dk-land" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice"></svg><div class="dk-shade"></div><div class="dk-fx"></div>`;
  band = document.createElement("div"); band.className = "dk-band"; band.setAttribute("aria-hidden", "true");
  band.innerHTML = `<svg class="dk-land dk-still" viewBox="0 430 1600 420" preserveAspectRatio="xMidYMid slice"></svg>`;
  const top = document.createElement("div"); top.className = "dk-top";
  top.innerHTML = `<div class="dk-top-l">${opts.portal ? `<a class="dk-pill dk-portal" href="#">${ARROW}<span>Cổng bài tập</span></a>` : ""}</div>
    <div class="dk-logo"><img src="${LOGO}" alt=""><span class="dk-wm"><b>Diamonds</b> <i>IELTS</i></span>${opts.app ? `<span class="dk-app">${opts.app}</span>` : ""}</div>
    <div class="dk-top-r"><span class="dk-top-slot" id="dk-top-r"></span><button class="dk-pill dk-themebtn" type="button" aria-label="Đổi chủ đề">${PIC}</button></div>`;
  document.body.prepend(scene, band, top);
  buildSky(); buildPicker($q(".dk-themebtn", top));
  $q(".dk-sun", scene).addEventListener("click", e => { e.currentTarget.classList.add("dk-flare"); setTimeout(() => $q(".dk-sun", scene).classList.remove("dk-flare"), 900); });
  $q(".dk-moon", scene).addEventListener("click", shootingStar);
  plainPref = readPlain(); applyPhase(true); drawTheme(pickTheme()); setMode(opts.mode); loops();
  return DK;
}
function setMode(m){
  wanted = m === "plain" ? "plain" : "scene";
  mode = (plainPref || wanted === "plain") ? "plain" : "scene";
  document.body.classList.toggle("dk-plain-pref", plainPref);
  if (mode === "plain"){ const sh = $q(".dk-sheet"); if (sh) sh.hidden = true; }
  document.body.classList.toggle("dk-mode-scene", mode === "scene");
  document.body.classList.toggle("dk-mode-plain", mode === "plain");
  return DK;
}
function showPortal(on){ const a = $q(".dk-portal"); if (a) a.hidden = !on; return DK; }
const DK = {
  init, mode:setMode, portal:showPortal, setPlain, get plain(){ return plainPref; },
  get theme(){ return themeKey; }, setTheme(k){ if (DRAW[k]){ ss.set("dk_theme", k); drawTheme(k); } },
  get themes(){ return THEMES.slice(); },
  get slot(){ return document.getElementById("dk-top-r"); },
  portalLink, version:VERSION
};
window.DK = DK;

})();
