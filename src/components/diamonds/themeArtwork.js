/* Original Diamonds scenery paths and phase palette. */
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const PHASES = [
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

export const GROUPS = [
  { name:"Việt Nam", items:[["saigon","Sài Gòn"],["hoian","Hội An"],["halong","Vịnh Hạ Long"],["hanoi","Hà Nội"],["danang","Đà Nẵng"],["hagiang","Hà Giang"],["mekong","Chợ nổi"],["country","Đồng quê"]] },
  { name:"Du học", items:[["london","London"],["sydney","Sydney"],["canada","Canada"],["newyork","New York"],["newzealand","New Zealand"],["melbourne","Melbourne"],["korea","Hàn Quốc"],["taiwan","Đài Loan"]] },
  { name:"Thế giới", items:[["tokyo","Tokyo"],["paris","Paris"],["egypt","Ai Cập"],["venice","Venice"],["city","Thành phố"]] },
  { name:"Thiên nhiên", items:[["sea","Biển"],["mountain","Núi"],["forest","Rừng thông"],["aurora","Cực quang"],["winter","Mùa đông"],["tropical","Đảo nhiệt đới"],["desert","Sa mạc"],["flowers","Đồng hoa"]] }
];
export const THEMES = GROUPS.flatMap(g => g.items.map(([key, name]) => ({ key, name })));
export const DRAW = (() => {
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
