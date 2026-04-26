// allowance-quest.jsx v4 — おこづかいクエスト（Firebase同期対応）
import { useState, useEffect, useRef } from "react";
import { db } from "./src/firebase.js";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

// ─── ファミリーコード ─────────────────────────────────────
const FAMILY_KEY = "allowance_quest_family_v4";
const genFamilyCode = () => Math.random().toString(36).slice(2,8).toUpperCase();

// iOS viewport
if (typeof document !== "undefined") {
  let m = document.querySelector('meta[name="viewport"]');
  if (!m) { m = document.createElement("meta"); m.name = "viewport"; document.head.appendChild(m); }
  m.content = "width=device-width,initial-scale=1,viewport-fit=cover";
}

// ─── 定数 ────────────────────────────────────────────────
const STORAGE_KEY = "allowance_quest_v3";
const WEEKDAYS = ["日","月","火","水","木","金","土"];
const LEVEL_THRESHOLDS = [0, 10, 50, 100, 200];
const CATEGORIES = ["せいかつ","べんきょう","おてつだい","特別"];

const MONSTER_DEFS = [
  { id:1,  name:"プニョン",   type:"ノーマル",   typeColor:"#7986cb", desc:"まるくてやわらかい。なでるとぷにぷにする。",           levels:["たまご","ちびプニョン","プニョン","プニョンガ","マスタープニョン"] },
  { id:2,  name:"メラゴン",   type:"ほのお",     typeColor:"#ef5350", desc:"しっぽから炎が出る。いつも元気いっぱい！",             levels:["たまご","チビメラ","メラゴン","メラゴン改","ゴッドメラゴン"] },
  { id:3,  name:"アクアリン", type:"みず",       typeColor:"#29b6f6", desc:"雨の日が大好き。体が透けて見えるほど澄んでいる。",     levels:["たまご","しずくちゃん","アクアリン","アクアリンS","オーシャンキング"] },
  { id:4,  name:"ピリカ",     type:"でんき",     typeColor:"#ffd600", desc:"全身がぴかぴか光る。静電気でびりびり！",               levels:["たまご","ぴかちゃん","ピリカ","ピリカボルト","サンダーキング"] },
  { id:5,  name:"ハナポン",   type:"くさ",       typeColor:"#66bb6a", desc:"頭に花が咲く。お日さまが大好き。",                     levels:["たまご","めばえ","ハナポン","ハナポンフル","フォレストクイーン"] },
  { id:6,  name:"ユーレイン", type:"ゴースト",   typeColor:"#ab47bc", desc:"ふわふわ浮かぶ。実は寂しがり屋で友達が大好き。",       levels:["たまご","こゆうれい","ユーレイン","ユーレインX","ゴーストロード"] },
  { id:7,  name:"ドラゴリン", type:"ドラゴン",   typeColor:"#ff7043", desc:"小さくても勇敢。いつか空を飛ぶのが夢。",               levels:["たまご","ちびドラゴ","ドラゴリン","ドラゴリン改","ドラゴキング"] },
  { id:8,  name:"コオリン",   type:"こおり",     typeColor:"#80deea", desc:"雪が大好きな氷の生き物。ひんやり冷たい。",             levels:["たまご","ちびコオリ","コオリン","コオリンS","フリーズキング"] },
  { id:9,  name:"ガントス",   type:"いわ",       typeColor:"#bcaaa4", desc:"固い体が自慢。でも意外と転がりやすい。",               levels:["たまご","こいし","ガントス","ガントスG","ロックロード"] },
  { id:10, name:"カゼリン",   type:"ひこう",     typeColor:"#81d4fa", desc:"風に乗ってどこへでも飛べる。自由が大好き。",           levels:["たまご","ひなドリ","カゼリン","カゼリンX","スカイキング"] },
  { id:11, name:"フェアリン", type:"フェアリー", typeColor:"#f48fb1", desc:"星のかけらで生まれた不思議な妖精。",                   levels:["たまご","ちびフェア","フェアリン","フェアリンS","フェアリクイーン"] },
  { id:12, name:"ダークロン", type:"あく",       typeColor:"#78909c", desc:"暗い場所が好き。でも友達の前では笑ってる。",           levels:["たまご","かげっこ","ダークロン","ダークロンZ","シャドウロード"] },
  { id:13, name:"サイコン",   type:"エスパー",   typeColor:"#ce93d8", desc:"宝石のような体に不思議な力が宿っている。",             levels:["たまご","こクリスタル","サイコン","サイコンX","マインドキング"] },
  { id:14, name:"ムシポン",   type:"むし",       typeColor:"#aed581", desc:"たくさんの足でぴょこぴょこ歩く。葉っぱが好き。",       levels:["たまご","ちびムシ","ムシポン","ムシポンG","バグマスター"] },
  { id:15, name:"キノポン",   type:"どく",       typeColor:"#ba68c8", desc:"大きなキノコのかさが目印。見た目より無害。",           levels:["たまご","こキノコ","キノポン","キノポンX","マッシュロード"] },
  { id:16, name:"フワリン",   type:"ノーマル",   typeColor:"#bdbdbd", desc:"ふわふわの雲のような体。夢の中で会えるかも。",         levels:["たまご","こぐも","フワリン","フワリンS","クラウドキング"] },
  { id:17, name:"テツゴン",   type:"はがね",     typeColor:"#90a4ae", desc:"鉄の体で何でも守る。実は泣き虫。",                     levels:["たまご","ちびロボ","テツゴン","テツゴンMk2","アイアンキング"] },
  { id:18, name:"サンゴリン", type:"みず",       typeColor:"#f06292", desc:"海の底に住むサンゴの精。歌が得意。",                   levels:["たまご","こサンゴ","サンゴリン","サンゴリンX","オーシャンクイーン"] },
  { id:19, name:"ヒカリン",   type:"ひかり",     typeColor:"#fdd835", desc:"星の形をした光の化身。夜になると輝く。",               levels:["たまご","こびかり","ヒカリン","ヒカリンS","スターキング"] },
  { id:20, name:"ツチポン",   type:"じめん",     typeColor:"#ff8a65", desc:"大きなつめで土を掘るのが得意。わんぱく。",             levels:["たまご","こもぐら","ツチポン","ツチポンG","アースキング"] },
  { id:21, name:"ナゾリン",   type:"なぞ",       typeColor:"#4db6ac", desc:"何者なのか誰も知らない。でもいつも楽しそう。",         levels:["たまご","こなぞ","ナゾリン","ナゾリンX","ミステリーロード"] },
];

const DEFAULT_QUESTS = [];

// ─── ユーティリティ ───────────────────────────────────────
const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const thisMonth = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const formatDate = () => { const d=new Date(); return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`; };
const getLevel = (exp) => { for(let i=LEVEL_THRESHOLDS.length-1;i>=0;i--) if(exp>=LEVEL_THRESHOLDS[i]) return i; return 0; };
const getLevelName = (monster, exp) => monster.levels[getLevel(exp)];
const getNextThreshold = (exp) => { for(const t of LEVEL_THRESHOLDS) if(exp<t) return t; return null; };

const getFreeExp = (child) => {
  if (!child) return 0;
  const assigned = Object.values(child.monsterExp || {}).reduce((a,b)=>a+b,0);
  return Math.max(0, (child.totalPoints||0) - assigned);
};

const loadData = () => { try { const r=localStorage.getItem(STORAGE_KEY); return r?JSON.parse(r):null; } catch { return null; } };
const saveData = (d) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); };

const migrateChild = (c) => {
  // 旧形式からの移行
  if (!c.activeMonster) c.activeMonster = c.monsterId || 1;
  if (!c.monsterExp) c.monsterExp = { [c.activeMonster]: c.totalPoints || 0 };
  // onceClears: flat→month-keyed
  if (c.onceClears) {
    const firstVal = Object.values(c.onceClears)[0];
    if (firstVal === true || firstVal === false) {
      c.onceClears = { [thisMonth()]: c.onceClears };
    }
  } else {
    c.onceClears = {};
  }
  return c;
};

const initData = () => ({ quests: DEFAULT_QUESTS, nextQuestId: 1, children: [], nextChildId: 1, lastKnownMonth: thisMonth() });

// ─── SVGモンスター共通ラッパー ────────────────────────────
function MonsterSVG({ monsterId, level, size=160, animate=false }) {
  const m = MONSTER_DEFS.find(x=>x.id===monsterId) || MONSTER_DEFS[0];
  const isEgg = level===0;
  const glow = level>=4;
  const c = m.typeColor;
  const uid = `m${monsterId}`;
  const scale = 0.72 + level * 0.07;
  const tx = 100 - 100*scale, ty = 100 - 100*scale;

  const BODY = {
    1: <PunyonSVG    level={level} color={c} />,
    2: <MeragonSVG   level={level} color={c} />,
    3: <AquarinSVG   level={level} color={c} />,
    4: <PirikaSVG    level={level} color={c} />,
    5: <HanaponSVG   level={level} color={c} />,
    6: <YureinSVG    level={level} color={c} />,
    7: <DragorinSVG  level={level} color={c} />,
    8: <KoorinSVG    level={level} color={c} />,
    9: <GantosSVG    level={level} color={c} />,
    10:<KazerinSVG   level={level} color={c} />,
    11:<FairinSVG    level={level} color={c} />,
    12:<DarkronSVG   level={level} color={c} />,
    13:<PsyconSVG    level={level} color={c} />,
    14:<MushiponSVG  level={level} color={c} />,
    15:<KinoponSVG   level={level} color={c} />,
    16:<FuwarinSVG   level={level} color={c} />,
    17:<TetsugonSVG  level={level} color={c} />,
    18:<SangorinSVG  level={level} color={c} />,
    19:<HikarinSVG   level={level} color={c} />,
    20:<TuchiponSVG  level={level} color={c} />,
    21:<NazorinSVG   level={level} color={c} />,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 200 200"
      style={animate ? {animation:"bounce 1.6s ease-in-out infinite"} : {}}>
      <defs>
        <radialGradient id={`bg-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c} stopOpacity={glow?0.38:0.18}/>
          <stop offset="100%" stopColor={c} stopOpacity="0.03"/>
        </radialGradient>
        {glow && <filter id={`gf-${uid}`}><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>}
      </defs>
      <circle cx="100" cy="100" r="95" fill={`url(#bg-${uid})`}/>
      {isEgg ? (
        <>
          <defs>
            <radialGradient id={`eg-${uid}`} cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#fff"/><stop offset="100%" stopColor={c} stopOpacity="0.7"/></radialGradient>
          </defs>
          <ellipse cx="100" cy="108" rx="52" ry="62" fill={`url(#eg-${uid})`} stroke={c} strokeWidth="2" strokeOpacity="0.6"/>
          <ellipse cx="84" cy="90" rx="10" ry="12" fill="white" fillOpacity="0.65"/>
          <text x="100" y="188" textAnchor="middle" fontSize="11" fill={c} fontWeight="bold">たまご</text>
        </>
      ) : (
        <>
          <g transform={`translate(${tx},${ty}) scale(${scale})`} filter={glow?`url(#gf-${uid})`:undefined}>
            {BODY[monsterId] || BODY[1]}
          </g>
          {glow && [0,60,120,180,240,300].map((deg,i)=>(
            <line key={i} x1="100" y1="100"
              x2={100+88*Math.cos(deg*Math.PI/180)} y2={100+88*Math.sin(deg*Math.PI/180)}
              stroke={c} strokeWidth="1.5" strokeOpacity="0.25"/>
          ))}
        </>
      )}
    </svg>
  );
}

// ─── SVG Monster 1: プニョン ──────────────────────────────
function PunyonSVG({level,color}){return(<g>
  <ellipse cx="100" cy="112" rx="60" ry="56" fill={color}/>
  <ellipse cx="80" cy="90" rx="16" ry="10" fill="white" fillOpacity="0.4"/>
  <circle cx="83" cy="107" r="13" fill="white"/><circle cx="117" cy="107" r="13" fill="white"/>
  <circle cx="86" cy="108" r="8" fill="#1a1a2e"/><circle cx="120" cy="108" r="8" fill="#1a1a2e"/>
  <circle cx="88" cy="105" r="3" fill="white"/><circle cx="122" cy="105" r="3" fill="white"/>
  <path d="M90 124 Q100 133 110 124" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  {level>=2&&<><circle cx="56" cy="93" r="8" fill={color} fillOpacity="0.8"/><circle cx="144" cy="93" r="8" fill={color} fillOpacity="0.8"/></>}
  {level>=3&&<ellipse cx="100" cy="167" rx="48" ry="10" fill={color} fillOpacity="0.4"/>}
  {level>=4&&<><polygon points="100,56 106,70 100,66 94,70" fill="#ffd700"/><polygon points="84,61 88,74 82,71 80,77" fill="#ffd700"/><polygon points="116,61 118,74 120,71 112,75" fill="#ffd700"/></>}
</g>);}

// ─── SVG Monster 2: メラゴン ─────────────────────────────
function MeragonSVG({level,color}){return(<g>
  <path d="M140 145 Q170 160 175 140 Q168 120 155 130" fill={color} fillOpacity="0.8"/>
  <path d="M148 130 Q158 115 150 100 Q145 115 138 108 Q142 120 132 118 Q138 128 148 130" fill="#ff6f00"/>
  <path d="M148 130 Q155 120 150 110 Q147 120 142 115 Q145 122 148 130" fill="#ffca28"/>
  <ellipse cx="95" cy="125" rx="50" ry="48" fill={color}/>
  <ellipse cx="95" cy="88" rx="38" ry="34" fill={color}/>
  <polygon points="78,62 74,42 84,58" fill="#b71c1c"/><polygon points="95,58 95,38 101,55" fill="#b71c1c"/><polygon points="112,62 116,42 106,58" fill="#b71c1c"/>
  <circle cx="82" cy="86" r="11" fill="white"/><circle cx="108" cy="86" r="11" fill="white"/>
  <circle cx="84" cy="87" r="7" fill="#1a1a2e"/><circle cx="110" cy="87" r="7" fill="#1a1a2e"/>
  <circle cx="85" cy="85" r="2.5" fill="white"/><circle cx="111" cy="85" r="2.5" fill="white"/>
  <path d="M82 100 Q95 110 108 100" stroke="#7f0000" strokeWidth="2" fill="none"/>
  {level>=3&&<><ellipse cx="70" cy="82" rx="12" ry="6" fill={color} stroke="#b71c1c" strokeWidth="1"/><ellipse cx="120" cy="82" rx="12" ry="6" fill={color} stroke="#b71c1c" strokeWidth="1"/></>}
  {level>=4&&<><polygon points="95,50 98,60 95,57 92,60" fill="#ffd700"/><path d="M58 88 Q48 75 52 62 Q62 72 58 88" fill={color} stroke="#b71c1c" strokeWidth="1"/><path d="M132 88 Q142 75 138 62 Q128 72 132 88" fill={color} stroke="#b71c1c" strokeWidth="1"/></>}
</g>);}

// ─── SVG Monster 3: アクアリン ───────────────────────────
function AquarinSVG({level,color}){return(<g>
  <ellipse cx="100" cy="165" rx="55" ry="12" fill={color} fillOpacity="0.25"/>
  <path d="M100 42 Q138 75 140 118 Q140 158 100 162 Q60 158 60 118 Q62 75 100 42Z" fill={color} fillOpacity="0.88"/>
  <path d="M100 55 Q122 78 123 110 Q122 140 100 145" stroke="white" strokeWidth="3" fill="none" strokeOpacity="0.35" strokeLinecap="round"/>
  <path d="M72 72 L75 58 L82 68 L89 50 L96 62 L100 48 L104 62 L111 50 L118 68 L125 58 L128 72" stroke={color} strokeWidth="2.5" fill="none" strokeOpacity="0.8" strokeLinejoin="round"/>
  <circle cx="86" cy="106" r="13" fill="white" fillOpacity="0.92"/><circle cx="114" cy="106" r="13" fill="white" fillOpacity="0.92"/>
  <circle cx="88" cy="107" r="8" fill="#0d47a1"/><circle cx="116" cy="107" r="8" fill="#0d47a1"/>
  <circle cx="90" cy="104" r="3" fill="white"/><circle cx="118" cy="104" r="3" fill="white"/>
  <path d="M88 123 Q100 132 112 123" stroke="#0d47a1" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  {level>=3&&<><circle cx="65" cy="100" r="7" fill={color} fillOpacity="0.7"/><circle cx="135" cy="100" r="7" fill={color} fillOpacity="0.7"/></>}
  {level>=4&&[0,45,90,135,180,225,270,315].map((deg,i)=><circle key={i} cx={100+72*Math.cos(deg*Math.PI/180)} cy={100+72*Math.sin(deg*Math.PI/180)} r="4" fill={color} fillOpacity="0.6"/>)}
</g>);}

// ─── SVG Monster 4: ピリカ ───────────────────────────────
function PirikaSVG({level,color}){
  const spikes=[[100,45],[118,50],[132,62],[78,50],[68,62],[60,80],[140,80],[55,100],[145,100]];
  return(<g>
    <path d="M100 30 L88 55 L98 55 L84 82" stroke={color} strokeWidth="3.5" fill="none" strokeOpacity="0.7" strokeLinecap="round" strokeLinejoin="round"/>
    {spikes.map(([x,y],i)=><ellipse key={i} cx={x} cy={y} rx="6" ry="14" transform={`rotate(${Math.atan2(y-105,x-100)*180/Math.PI+90} ${x} ${y})`} fill={color} fillOpacity="0.85"/>)}
    <circle cx="100" cy="112" r="52" fill={color}/>
    <ellipse cx="100" cy="120" rx="32" ry="28" fill="#fff9c4"/>
    <circle cx="87" cy="105" r="12" fill="white"/><circle cx="113" cy="105" r="12" fill="white"/>
    <circle cx="89" cy="106" r="7.5" fill="#1a1a2e"/><circle cx="115" cy="106" r="7.5" fill="#1a1a2e"/>
    <circle cx="91" cy="103" r="2.5" fill="white"/><circle cx="117" cy="103" r="2.5" fill="white"/>
    <ellipse cx="73" cy="116" r="9" fill="#ffca28" fillOpacity="0.6"/><ellipse cx="127" cy="116" r="9" fill="#ffca28" fillOpacity="0.6"/>
    <text x="73" y="119" textAnchor="middle" fontSize="9" fill="#e65100">⚡</text><text x="127" y="119" textAnchor="middle" fontSize="9" fill="#e65100">⚡</text>
    <path d="M90 122 Q100 130 110 122" stroke="#e65100" strokeWidth="2" fill="none" strokeLinecap="round"/>
    {level>=3&&<><polygon points="100,62 104,74 100,70 96,74" fill="#ffd700"/><polygon points="85,64 88,75 83,72 82,78" fill="#ffd700"/><polygon points="115,64 117,75 119,72 112,76" fill="#ffd700"/></>}
  </g>);
}

// ─── SVG Monster 5: ハナポン ─────────────────────────────
function HanaponSVG({level,color}){return(<g>
  <path d="M60 80 Q40 60 50 40 Q65 60 60 80Z" fill={color} fillOpacity="0.8"/>
  <path d="M140 80 Q160 60 150 40 Q135 60 140 80Z" fill={color} fillOpacity="0.8"/>
  <line x1="100" y1="62" x2="100" y2="80" stroke="#2e7d32" strokeWidth="4" strokeLinecap="round"/>
  {[0,45,90,135,180,225,270,315].map((deg,i)=><ellipse key={i} cx={100+24*Math.cos(deg*Math.PI/180)} cy={58+24*Math.sin(deg*Math.PI/180)} rx="10" ry="7" transform={`rotate(${deg} ${100+24*Math.cos(deg*Math.PI/180)} ${58+24*Math.sin(deg*Math.PI/180)})`} fill="#f48fb1" fillOpacity="0.9"/>)}
  <circle cx="100" cy="58" r="12" fill="#fdd835"/>
  <circle cx="100" cy="125" r="52" fill={color}/>
  <ellipse cx="100" cy="130" rx="28" ry="24" fill="#c8e6c9"/>
  <circle cx="86" cy="115" r="12" fill="white"/><circle cx="114" cy="115" r="12" fill="white"/>
  <circle cx="88" cy="116" r="7.5" fill="#1b5e20"/><circle cx="116" cy="116" r="7.5" fill="#1b5e20"/>
  <circle cx="90" cy="113" r="2.5" fill="white"/><circle cx="118" cy="113" r="2.5" fill="white"/>
  <ellipse cx="72" cy="124" r="9" fill="#f48fb1" fillOpacity="0.5"/><ellipse cx="128" cy="124" r="9" fill="#f48fb1" fillOpacity="0.5"/>
  <path d="M89 132 Q100 142 111 132" stroke="#2e7d32" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  {level>=3&&[30,150,270].map((deg,i)=><g key={i}><line x1={100+55*Math.cos(deg*Math.PI/180)} y1={125+55*Math.sin(deg*Math.PI/180)} x2={100+65*Math.cos(deg*Math.PI/180)} y2={125+65*Math.sin(deg*Math.PI/180)} stroke={color} strokeWidth="3"/><circle cx={100+68*Math.cos(deg*Math.PI/180)} cy={125+68*Math.sin(deg*Math.PI/180)} r="5" fill="#f48fb1"/></g>)}
  {level>=4&&<text x="100" y="63" textAnchor="middle" fontSize="14">✨</text>}
</g>);}

// ─── SVG Monster 6: ユーレイン ───────────────────────────
function YureinSVG({level,color}){return(<g>
  <ellipse cx="100" cy="172" rx="35" ry="8" fill="#000" fillOpacity="0.12"/>
  <path d="M62 100 Q62 65 100 55 Q138 65 138 100 L138 155 Q128 148 118 155 Q108 162 100 155 Q92 162 82 155 Q72 148 62 155 Z" fill={color} fillOpacity="0.82"/>
  <circle cx="86" cy="100" r="13" fill="white" fillOpacity="0.95"/><circle cx="114" cy="100" r="13" fill="white" fillOpacity="0.95"/>
  <ellipse cx="88" cy="101" rx="8" ry="9" fill="#4a148c"/><ellipse cx="116" cy="101" rx="8" ry="9" fill="#4a148c"/>
  <circle cx="90" cy="98" r="3" fill="white"/><circle cx="118" cy="98" r="3" fill="white"/>
  <path d="M86 118 Q100 128 114 118" stroke="#4a148c" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  <path d="M62 155 Q55 165 62 170 Q69 165 76 170 Q83 165 82 155" fill={color} fillOpacity="0.75"/>
  <path d="M118 155 Q111 165 118 170 Q125 165 132 170 Q139 165 138 155" fill={color} fillOpacity="0.75"/>
  <ellipse cx="52" cy="115" rx="14" ry="10" fill={color} fillOpacity="0.7"/>
  <ellipse cx="148" cy="115" rx="14" ry="10" fill={color} fillOpacity="0.7"/>
  {level>=2&&<><circle cx="62" cy="75" r="5" fill="white" fillOpacity="0.5"/><circle cx="138" cy="75" r="5" fill="white" fillOpacity="0.5"/></>}
  {level>=3&&<text x="100" y="52" textAnchor="middle" fontSize="16">👑</text>}
  {level>=4&&[0,60,120,180,240,300].map((deg,i)=><circle key={i} cx={100+78*Math.cos(deg*Math.PI/180)} cy={100+78*Math.sin(deg*Math.PI/180)} r="5" fill={color} fillOpacity="0.5"/>)}
</g>);}

// ─── SVG Monster 7: ドラゴリン ───────────────────────────
function DragorinSVG({level,color}){return(<g>
  <path d="M60 95 Q30 68 32 45 Q50 60 65 80 Q70 88 68 95Z" fill={color} fillOpacity="0.75"/>
  <path d="M140 95 Q170 68 168 45 Q150 60 135 80 Q130 88 132 95Z" fill={color} fillOpacity="0.75"/>
  <path d="M130 148 Q158 155 165 142 Q160 128 148 132" fill={color} fillOpacity="0.85"/>
  <polygon points="158,140 168,133 165,145" fill={color} fillOpacity="0.9"/>
  <ellipse cx="98" cy="130" rx="48" ry="44" fill={color}/>
  <ellipse cx="98" cy="92" rx="40" ry="36" fill={color}/>
  <polygon points="82,62 76,40 88,58" fill="#b71c1c"/><polygon points="114,62 120,40 108,58" fill="#b71c1c"/>
  <ellipse cx="98" cy="132" rx="30" ry="26" fill="#ffccbc"/>
  <circle cx="85" cy="88" r="12" fill="white"/><circle cx="111" cy="88" r="12" fill="white"/>
  <ellipse cx="87" cy="89" rx="7.5" ry="9" fill="#1a1a2e"/><ellipse cx="113" cy="89" rx="7.5" ry="9" fill="#1a1a2e"/>
  <circle cx="89" cy="86" r="2.5" fill="white"/><circle cx="115" cy="86" r="2.5" fill="white"/>
  <path d="M82 106 Q98 118 114 106" stroke="#7f0000" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  {level>=3&&<><path d="M60 120 Q50 108 54 96 Q62 108 60 120Z" fill={color} stroke="#b71c1c" strokeWidth="1"/><path d="M136 120 Q146 108 142 96 Q134 108 136 120Z" fill={color} stroke="#b71c1c" strokeWidth="1"/></>}
  {level>=4&&<><polygon points="98,50 101,60 98,57 95,60" fill="#ffd700"/><circle cx="72" cy="70" r="6" fill="#ffd700" fillOpacity="0.8"/><circle cx="124" cy="70" r="6" fill="#ffd700" fillOpacity="0.8"/></>}
</g>);}

// ─── SVG Monster 8: コオリン (こおり) ────────────────────
function KoorinSVG({level,color}){return(<g>
  <ellipse cx="100" cy="125" rx="46" ry="52" fill={color}/>
  <ellipse cx="100" cy="130" rx="28" ry="34" fill="white" fillOpacity="0.9"/>
  <ellipse cx="100" cy="85" rx="34" ry="30" fill="#e0f7fa"/>
  <ellipse cx="82" cy="78" rx="12" ry="10" fill="white" fillOpacity="0.6"/>
  <ellipse cx="68" cy="120" rx="18" ry="10" fill={color} fillOpacity="0.8" transform="rotate(-20 68 120)"/>
  <ellipse cx="132" cy="120" rx="18" ry="10" fill={color} fillOpacity="0.8" transform="rotate(20 132 120)"/>
  <circle cx="88" cy="83" r="11" fill="white"/><circle cx="112" cy="83" r="11" fill="white"/>
  <circle cx="90" cy="84" r="7" fill="#1a1a2e"/><circle cx="114" cy="84" r="7" fill="#1a1a2e"/>
  <circle cx="91" cy="82" r="2.5" fill="white"/><circle cx="115" cy="82" r="2.5" fill="white"/>
  <ellipse cx="100" cy="97" rx="8" ry="5" fill="#ff8a65"/>
  <path d="M93 105 Q100 110 107 105" stroke="#1a1a2e" strokeWidth="2" fill="none" strokeLinecap="round"/>
  <ellipse cx="88" cy="160" rx="10" ry="6" fill="#ff8a65"/><ellipse cx="112" cy="160" rx="10" ry="6" fill="#ff8a65"/>
  {level>=2&&<><circle cx="78" cy="58" r="6" fill="white" fillOpacity="0.7"/><circle cx="100" cy="52" r="5" fill="white" fillOpacity="0.6"/><circle cx="122" cy="58" r="6" fill="white" fillOpacity="0.7"/></>}
  {level>=3&&[0,60,120,180,240,300].map((deg,i)=><line key={i} x1={100+48*Math.cos(deg*Math.PI/180)} y1={100+48*Math.sin(deg*Math.PI/180)} x2={100+56*Math.cos(deg*Math.PI/180)} y2={100+56*Math.sin(deg*Math.PI/180)} stroke="white" strokeWidth="2" strokeOpacity="0.7"/>)}
  {level>=4&&<><polygon points="100,45 103,55 100,52 97,55" fill="#ffd700"/><polygon points="86,48 88,57 84,55 83,60" fill="#ffd700"/><polygon points="114,48 116,57 118,55 112,59" fill="#ffd700"/></>}
</g>);}

// ─── SVG Monster 9: ガントス (いわ) ──────────────────────
function GantosSVG({level,color}){return(<g>
  <ellipse cx="100" cy="135" rx="56" ry="42" fill={color}/>
  <ellipse cx="100" cy="128" rx="44" ry="36" fill={color} fillOpacity="0.7" stroke="#6d4c41" strokeWidth="1.5"/>
  {[{cx:78,cy:118,rx:12,ry:9},{cx:100,cy:108,rx:14,ry:10},{cx:122,cy:118,rx:12,ry:9},{cx:88,cy:133,rx:11,ry:8},{cx:112,cy:133,rx:11,ry:8}].map((e,i)=><ellipse key={i} {...e} fill={color} stroke="#6d4c41" strokeWidth="1" fillOpacity="0.5"/>)}
  <ellipse cx="100" cy="88" rx="36" ry="30" fill={color}/>
  <ellipse cx="82" cy="76" rx="13" ry="10" fill="white" fillOpacity="0.5"/>
  <circle cx="87" cy="87" r="11" fill="white"/><circle cx="113" cy="87" r="11" fill="white"/>
  <circle cx="89" cy="88" r="7" fill="#3e2723"/><circle cx="115" cy="88" r="7" fill="#3e2723"/>
  <circle cx="91" cy="86" r="2.5" fill="white"/><circle cx="117" cy="86" r="2.5" fill="white"/>
  <path d="M88 102 Q100 110 112 102" stroke="#4e342e" strokeWidth="2" fill="none" strokeLinecap="round"/>
  <ellipse cx="60" cy="138" rx="14" ry="10" fill={color} stroke="#6d4c41" strokeWidth="1"/>
  <ellipse cx="140" cy="138" rx="14" ry="10" fill={color} stroke="#6d4c41" strokeWidth="1"/>
  {level>=3&&<><circle cx="78" cy="68" r="7" fill={color} stroke="#6d4c41" strokeWidth="1.5"/><circle cx="122" cy="68" r="7" fill={color} stroke="#6d4c41" strokeWidth="1.5"/></>}
  {level>=4&&<text x="100" y="58" textAnchor="middle" fontSize="16">👑</text>}
</g>);}

// ─── SVG Monster 10: カゼリン (ひこう) ───────────────────
function KazerinSVG({level,color}){return(<g>
  <path d="M62 100 Q42 85 38 68 Q55 78 68 95Z" fill={color} fillOpacity="0.6"/>
  <path d="M138 100 Q158 85 162 68 Q145 78 132 95Z" fill={color} fillOpacity="0.6"/>
  <path d="M100 45 Q130 60 135 90 Q130 72 100 75 Q70 72 65 90 Q70 60 100 45Z" fill={color} fillOpacity="0.7"/>
  <ellipse cx="100" cy="118" rx="44" ry="48" fill={color}/>
  <ellipse cx="100" cy="92" rx="32" ry="28" fill={color}/>
  <ellipse cx="82" cy="80" rx="12" ry="8" fill="white" fillOpacity="0.5"/>
  <ellipse cx="100" cy="145" rx="24" ry="28" fill="#e3f2fd"/>
  <circle cx="89" cy="90" r="11" fill="white"/><circle cx="111" cy="90" r="11" fill="white"/>
  <circle cx="91" cy="91" r="7" fill="#0d47a1"/><circle cx="113" cy="91" r="7" fill="#0d47a1"/>
  <circle cx="92" cy="89" r="2.5" fill="white"/><circle cx="114" cy="89" r="2.5" fill="white"/>
  <ellipse cx="100" cy="104" rx="7" ry="4" fill="#ff8a65"/>
  {[{x1:152,y1:80,x2:168,y2:70},{x1:156,y1:92,x2:174,y2:90},{x1:148,y1:104,x2:164,y2:106}].map((l,i)=><path key={i} d={`M${l.x1} ${l.y1} Q${(l.x1+l.x2)/2} ${l.y1-5} ${l.x2} ${l.y2}`} stroke={color} strokeWidth="2" fill="none" strokeOpacity="0.6"/>)}
  {level>=3&&<><ellipse cx="76" cy="165" rx="8" ry="14" fill={color} fillOpacity="0.7" transform="rotate(-15 76 165)"/><ellipse cx="124" cy="165" rx="8" ry="14" fill={color} fillOpacity="0.7" transform="rotate(15 124 165)"/></>}
  {level>=4&&<polygon points="100,46 103,58 100,55 97,58" fill="#ffd700"/>}
</g>);}

// ─── SVG Monster 11: フェアリン (フェアリー) ─────────────
function FairinSVG({level,color}){return(<g>
  <path d="M100 115 Q68 108 55 85 Q72 82 100 95Z" fill={color} fillOpacity="0.55"/>
  <path d="M100 115 Q132 108 145 85 Q128 82 100 95Z" fill={color} fillOpacity="0.55"/>
  <path d="M100 115 Q72 125 60 148 Q78 138 100 130Z" fill={color} fillOpacity="0.4"/>
  <path d="M100 115 Q128 125 140 148 Q122 138 100 130Z" fill={color} fillOpacity="0.4"/>
  <circle cx="100" cy="105" r="40" fill={color}/>
  <ellipse cx="82" cy="88" rx="13" ry="10" fill="white" fillOpacity="0.5"/>
  <circle cx="88" cy="102" r="12" fill="white"/><circle cx="112" cy="102" r="12" fill="white"/>
  <circle cx="90" cy="103" r="7.5" fill="#880e4f"/><circle cx="114" cy="103" r="7.5" fill="#880e4f"/>
  <circle cx="92" cy="101" r="2.5" fill="white"/><circle cx="116" cy="101" r="2.5" fill="white"/>
  <ellipse cx="76" cy="112" r="8" fill="#f8bbd9" fillOpacity="0.6"/><ellipse cx="124" cy="112" r="8" fill="#f8bbd9" fillOpacity="0.6"/>
  <path d="M90 118 Q100 126 110 118" stroke="#880e4f" strokeWidth="2" fill="none" strokeLinecap="round"/>
  <polygon points="100,68 103,78 100,74 97,78" fill="#ffd700"/>
  <polygon points="88,70 90,80 86,77 85,83" fill="#ffd700"/>
  <polygon points="112,70 114,80 116,77 110,82" fill="#ffd700"/>
  {level>=2&&[0,45,90,135,180,225,270,315].map((deg,i)=><circle key={i} cx={100+60*Math.cos(deg*Math.PI/180)} cy={105+60*Math.sin(deg*Math.PI/180)} r="3" fill={color} fillOpacity="0.5"/>)}
  {level>=4&&<text x="100" y="62" textAnchor="middle" fontSize="15">✨</text>}
</g>);}

// ─── SVG Monster 12: ダークロン (あく) ───────────────────
function DarkronSVG({level,color}){return(<g>
  <path d="M100 60 Q138 70 148 105 Q155 135 140 155 Q120 168 100 165 Q80 168 60 155 Q45 135 52 105 Q62 70 100 60Z" fill="#263238"/>
  <path d="M52 105 Q48 125 55 140 Q42 130 40 112 Q44 98 52 105Z" fill="#263238"/>
  <path d="M148 105 Q152 125 145 140 Q158 130 160 112 Q156 98 148 105Z" fill="#263238"/>
  <path d="M72 155 Q68 165 74 170 Q80 165 86 170 Q90 160 86 155Z" fill="#263238"/>
  <path d="M128 155 Q124 165 130 170 Q136 165 142 170 Q146 160 142 155Z" fill="#263238"/>
  <ellipse cx="82" cy="80" rx="14" ry="10" fill="#263238" fillOpacity="0.6"/>
  <circle cx="86" cy="105" r="14" fill="#ef5350" fillOpacity="0.9"/><circle cx="114" cy="105" r="14" fill="#ef5350" fillOpacity="0.9"/>
  <circle cx="86" cy="105" r="8" fill="#b71c1c"/><circle cx="114" cy="105" r="8" fill="#b71c1c"/>
  <circle cx="88" cy="103" r="3" fill="#ffcdd2"/><circle cx="116" cy="103" r="3" fill="#ffcdd2"/>
  <path d="M85 125 L88 118 L91 125 L94 118 L97 125 L100 118 L103 125 L106 118 L109 125 L112 118 L115 125" stroke="#ef5350" strokeWidth="1.5" fill="none" strokeOpacity="0.7"/>
  {level>=2&&<><circle cx="64" cy="85" r="8" fill="#ef5350" fillOpacity="0.4"/><circle cx="136" cy="85" r="8" fill="#ef5350" fillOpacity="0.4"/></>}
  {level>=4&&[30,90,150,210,270,330].map((deg,i)=><path key={i} d={`M ${100+55*Math.cos(deg*Math.PI/180)} ${112+55*Math.sin(deg*Math.PI/180)} L ${100+65*Math.cos(deg*Math.PI/180)} ${112+65*Math.sin(deg*Math.PI/180)}`} stroke="#ef5350" strokeWidth="2" strokeOpacity="0.6"/>)}
</g>);}

// ─── SVG Monster 13: サイコン (エスパー) ─────────────────
function PsyconSVG({level,color}){return(<g>
  <polygon points="100,40 140,95 130,160 70,160 60,95" fill={color} fillOpacity="0.75"/>
  <polygon points="100,40 140,95 130,160 70,160 60,95" fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.9"/>
  <polygon points="100,52 132,98 122,152 78,152 68,98" fill={color} fillOpacity="0.3"/>
  <path d="M80 80 Q100 60 120 80 Q130 100 120 120 Q100 140 80 120 Q70 100 80 80Z" fill="white" fillOpacity="0.15"/>
  <circle cx="100" cy="105" r="16" fill={color} fillOpacity="0.4"/>
  <ellipse cx="100" cy="105" rx="12" ry="14" fill="#1a1a2e" fillOpacity="0.8"/>
  <ellipse cx="100" cy="105" rx="8" ry="10" fill={color} fillOpacity="0.9"/>
  <circle cx="102" cy="102" r="3" fill="white"/>
  {[0,72,144,216,288].map((deg,i)=><circle key={i} cx={100+35*Math.cos(deg*Math.PI/180)} cy={105+35*Math.sin(deg*Math.PI/180)} r="4" fill={color} fillOpacity="0.7"/>)}
  {level>=2&&[36,108,180,252,324].map((deg,i)=><circle key={i} cx={100+50*Math.cos(deg*Math.PI/180)} cy={105+50*Math.sin(deg*Math.PI/180)} r="3" fill="white" fillOpacity="0.5"/>)}
  {level>=4&&[0,72,144,216,288].map((deg,i)=><path key={i} d={`M 100 105 L ${100+70*Math.cos(deg*Math.PI/180)} ${105+70*Math.sin(deg*Math.PI/180)}`} stroke={color} strokeWidth="1.5" strokeOpacity="0.4"/>)}
</g>);}

// ─── SVG Monster 14: ムシポン (むし) ─────────────────────
function MushiponSVG({level,color}){return(<g>
  <ellipse cx="100" cy="155" rx="38" ry="24" fill={color} fillOpacity="0.8"/>
  <ellipse cx="100" cy="125" rx="42" ry="32" fill={color}/>
  <ellipse cx="100" cy="97" rx="38" ry="30" fill={color}/>
  {[70,85,100,115,130].map((x,i)=><circle key={i} cx={x} cy={97+(i%2)*6} r="6" fill="white" fillOpacity="0.2"/>)}
  <ellipse cx="100" cy="78" rx="34" ry="26" fill={color}/>
  <ellipse cx="82" cy="66" rx="12" ry="9" fill="white" fillOpacity="0.5"/>
  <circle cx="88" cy="77" r="12" fill="white"/><circle cx="112" cy="77" r="12" fill="white"/>
  <circle cx="90" cy="78" r="7.5" fill="#1b5e20"/><circle cx="114" cy="78" r="7.5" fill="#1b5e20"/>
  <circle cx="92" cy="76" r="2.5" fill="white"/><circle cx="116" cy="76" r="2.5" fill="white"/>
  <path d="M90 91 Q100 99 110 91" stroke="#1b5e20" strokeWidth="2" fill="none" strokeLinecap="round"/>
  <line x1="85" y1="60" x2="76" y2="44" stroke={color} strokeWidth="2.5"/><circle cx="75" cy="43" r="4" fill={color}/>
  <line x1="115" y1="60" x2="124" y2="44" stroke={color} strokeWidth="2.5"/><circle cx="125" cy="43" r="4" fill={color}/>
  {[55,75,95].map((y,i)=><g key={i}><line x1="62" y1={y+8} x2="44" y2={y-4} stroke={color} strokeWidth="2" strokeOpacity="0.7"/><line x1="138" y1={y+8} x2="156" y2={y-4} stroke={color} strokeWidth="2" strokeOpacity="0.7"/></g>)}
</g>);}

// ─── SVG Monster 15: キノポン (どく) ─────────────────────
function KinoponSVG({level,color}){return(<g>
  <ellipse cx="100" cy="168" rx="35" ry="10" fill={color} fillOpacity="0.3"/>
  <ellipse cx="100" cy="140" rx="28" ry="38" fill="#f3e5f5"/>
  <circle cx="88" cy="128" r="12" fill="white"/><circle cx="112" cy="128" r="12" fill="white"/>
  <circle cx="90" cy="129" r="7.5" fill="#4a148c"/><circle cx="114" cy="129" r="7.5" fill="#4a148c"/>
  <circle cx="92" cy="127" r="2.5" fill="white"/><circle cx="116" cy="127" r="2.5" fill="white"/>
  <ellipse cx="76" cy="138" r="8" fill={color} fillOpacity="0.4"/><ellipse cx="124" cy="138" r="8" fill={color} fillOpacity="0.4"/>
  <path d="M88 144 Q100 153 112 144" stroke="#4a148c" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  <path d="M55 108 Q58 70 100 58 Q142 70 145 108 Q130 95 100 92 Q70 95 55 108Z" fill={color}/>
  {[{cx:78,cy:74,r:7},{cx:95,cy:66,r:5},{cx:112,cy:70,r:8},{cx:125,cy:82,r:5},{cx:70,cy:88,r:4}].map((p,i)=><circle key={i} {...p} fill="white" fillOpacity="0.6"/>)}
  <path d="M58 108 Q100 120 142 108" stroke={color} strokeWidth="2" fill="none" strokeOpacity="0.5"/>
  {level>=2&&<><ellipse cx="62" cy="96" rx="10" ry="6" fill={color} fillOpacity="0.6" transform="rotate(-20 62 96)"/><ellipse cx="138" cy="96" rx="10" ry="6" fill={color} fillOpacity="0.6" transform="rotate(20 138 96)"/></>}
  {level>=4&&[0,60,120,180,240,300].map((deg,i)=><circle key={i} cx={100+65*Math.cos(deg*Math.PI/180)} cy={105+65*Math.sin(deg*Math.PI/180)} r="4" fill={color} fillOpacity="0.5"/>)}
</g>);}

// ─── SVG Monster 16: フワリン (くも) ─────────────────────
function FuwarinSVG({level,color}){return(<g>
  <circle cx="100" cy="105" r="42" fill={color}/>
  <circle cx="72" cy="115" r="30" fill={color}/>
  <circle cx="128" cy="115" r="30" fill={color}/>
  <circle cx="85" cy="88" r="26" fill={color}/>
  <circle cx="115" cy="88" r="26" fill={color}/>
  <circle cx="100" cy="80" r="28" fill={color}/>
  <circle cx="72" cy="100" r="24" fill="white" fillOpacity="0.35"/>
  <circle cx="88" cy="97" r="13" fill="white"/><circle cx="112" cy="97" r="13" fill="white"/>
  <circle cx="90" cy="98" r="8" fill="#455a64"/><circle cx="114" cy="98" r="8" fill="#455a64"/>
  <circle cx="92" cy="96" r="2.8" fill="white"/><circle cx="116" cy="96" r="2.8" fill="white"/>
  <path d="M88 113 Q100 122 112 113" stroke="#455a64" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  <ellipse cx="76" cy="108" r="9" fill={color} fillOpacity="0.5"/><ellipse cx="124" cy="108" r="9" fill={color} fillOpacity="0.5"/>
  {level>=2&&[75,88,100,112,125].map((x,i)=><line key={i} x1={x} y1={145+(i%2)*5} x2={x} y2={155+(i%2)*5} stroke="#90caf9" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7"/>)}
  {level>=4&&[0,45,90,135,180,225,270,315].map((deg,i)=><circle key={i} cx={100+68*Math.cos(deg*Math.PI/180)} cy={102+68*Math.sin(deg*Math.PI/180)} r="4" fill="white" fillOpacity="0.5"/>)}
</g>);}

// ─── SVG Monster 17: テツゴン (はがね) ───────────────────
function TetsugonSVG({level,color}){return(<g>
  <rect x="62" y="88" width="76" height="80" rx="10" fill={color}/>
  <rect x="70" y="96" width="60" height="26" rx="5" fill="#37474f"/>
  <rect x="74" y="100" width="22" height="18" rx="3" fill="#00bcd4" fillOpacity="0.8"/>
  <rect x="104" y="100" width="22" height="18" rx="3" fill="#00bcd4" fillOpacity="0.8"/>
  <circle cx="85" cy="109" r="6" fill="white" fillOpacity="0.9"/><circle cx="115" cy="109" r="6" fill="white" fillOpacity="0.9"/>
  <circle cx="87" cy="111" r="4" fill="#1a1a2e"/><circle cx="117" cy="111" r="4" fill="#1a1a2e"/>
  <rect x="74" y="130" width="52" height="8" rx="3" fill="#37474f"/>
  <circle cx="84" cy="134" r="3" fill="#ef5350"/><circle cx="100" cy="134" r="3" fill="#ffd600"/><circle cx="116" cy="134" r="3" fill="#4caf50"/>
  <rect x="66" y="76" width="68" height="18" rx="6" fill={color}/>
  <rect x="72" y="60" width="56" height="22" rx="8" fill={color}/>
  <rect x="80" y="64" width="40" height="14" rx="4" fill="#263238"/>
  <line x1="100" y1="60" x2="100" y2="48" stroke={color} strokeWidth="4" strokeLinecap="round"/>
  <circle cx="100" cy="46" r="6" fill="#ef5350"/>
  <rect x="40" y="95" width="24" height="36" rx="6" fill={color}/>
  <rect x="136" y="95" width="24" height="36" rx="6" fill={color}/>
  <rect x="74" y="162" width="20" height="20" rx="5" fill={color}/><rect x="106" y="162" width="20" height="20" rx="5" fill={color}/>
  {level>=3&&<><rect x="36" y="90" width="10" height="12" rx="3" fill="#ef5350" fillOpacity="0.8"/><rect x="154" y="90" width="10" height="12" rx="3" fill="#ef5350" fillOpacity="0.8"/></>}
  {level>=4&&<><circle cx="80" cy="70" r="4" fill="#ffd600" fillOpacity="0.9"/><circle cx="100" cy="68" r="4" fill="#ffd600" fillOpacity="0.9"/><circle cx="120" cy="70" r="4" fill="#ffd600" fillOpacity="0.9"/></>}
</g>);}

// ─── SVG Monster 18: サンゴリン (みず) ───────────────────
function SangorinSVG({level,color}){return(<g>
  <ellipse cx="100" cy="155" rx="40" ry="14" fill={color} fillOpacity="0.3"/>
  <ellipse cx="100" cy="135" rx="38" ry="32" fill={color}/>
  <path d="M68 120 Q62 95 70 75 Q78 88 75 108Z" fill={color} fillOpacity="0.8"/>
  <path d="M132 120 Q138 95 130 75 Q122 88 125 108Z" fill={color} fillOpacity="0.8"/>
  <path d="M80 115 Q75 88 82 68 Q90 80 87 105Z" fill={color} fillOpacity="0.7"/>
  <path d="M120 115 Q125 88 118 68 Q110 80 113 105Z" fill={color} fillOpacity="0.7"/>
  <path d="M100 110 Q95 80 100 60 Q105 80 100 110Z" fill={color} fillOpacity="0.9"/>
  <circle cx="70" cy="73" r="7" fill={color} fillOpacity="0.9"/><circle cx="130" cy="73" r="7" fill={color} fillOpacity="0.9"/>
  <circle cx="80" cy="66" r="6" fill={color} fillOpacity="0.9"/><circle cx="120" cy="66" r="6" fill={color} fillOpacity="0.9"/>
  <circle cx="100" cy="58" r="7" fill={color} fillOpacity="0.9"/>
  <circle cx="88" cy="128" r="12" fill="white"/><circle cx="112" cy="128" r="12" fill="white"/>
  <circle cx="90" cy="129" r="7.5" fill="#880e4f"/><circle cx="114" cy="129" r="7.5" fill="#880e4f"/>
  <circle cx="92" cy="127" r="2.5" fill="white"/><circle cx="116" cy="127" r="2.5" fill="white"/>
  <path d="M89 143 Q100 151 111 143" stroke="#880e4f" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  <ellipse cx="74" cy="138" r="8" fill="#f8bbd9" fillOpacity="0.5"/><ellipse cx="126" cy="138" r="8" fill="#f8bbd9" fillOpacity="0.5"/>
</g>);}

// ─── SVG Monster 19: ヒカリン (ひかり) ───────────────────
function HikarinSVG({level,color}){
  const star=(r1,r2,cx,cy)=>{let s="";for(let i=0;i<10;i++){const r=i%2===0?r1:r2,a=(i*Math.PI/5)-Math.PI/2;s+=`${cx+r*Math.cos(a)},${cy+r*Math.sin(a)} `;}return s.trim();};
  return(<g>
    <polygon points={star(78,34,100,105)} fill={color} fillOpacity="0.3"/>
    <polygon points={star(72,30,100,105)} fill={color}/>
    <polygon points={star(55,24,100,105)} fill={color} fillOpacity="0.5"/>
    <circle cx="80" cy="85" r="12" fill="white" fillOpacity="0.4"/>
    <circle cx="90" cy="102" r="12" fill="white"/><circle cx="110" cy="102" r="12" fill="white"/>
    <circle cx="92" cy="103" r="8" fill="#f57f17"/><circle cx="112" cy="103" r="8" fill="#f57f17"/>
    <circle cx="94" cy="101" r="3" fill="white"/><circle cx="114" cy="101" r="3" fill="white"/>
    <path d="M89 116 Q100 124 111 116" stroke="#f57f17" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    {[0,72,144,216,288].map((deg,i)=><circle key={i} cx={100+85*Math.cos((deg-90)*Math.PI/180)} cy={105+85*Math.sin((deg-90)*Math.PI/180)} r="5" fill={color} fillOpacity="0.6"/>)}
    {level>=2&&[36,108,180,252,324].map((deg,i)=><line key={i} x1={100+60*Math.cos((deg-90)*Math.PI/180)} y1={105+60*Math.sin((deg-90)*Math.PI/180)} x2={100+80*Math.cos((deg-90)*Math.PI/180)} y2={105+80*Math.sin((deg-90)*Math.PI/180)} stroke={color} strokeWidth="2" strokeOpacity="0.5"/>)}
    {level>=4&&[0,72,144,216,288].map((deg,i)=><circle key={i} cx={100+92*Math.cos((deg-90)*Math.PI/180)} cy={105+92*Math.sin((deg-90)*Math.PI/180)} r="4" fill="white" fillOpacity="0.7"/>)}
  </g>);
}

// ─── SVG Monster 20: ツチポン (じめん) ───────────────────
function TuchiponSVG({level,color}){return(<g>
  <ellipse cx="100" cy="168" rx="45" ry="12" fill={color} fillOpacity="0.3"/>
  <ellipse cx="100" cy="128" rx="52" ry="46" fill={color}/>
  <ellipse cx="62" cy="138" rx="22" ry="14" fill={color} transform="rotate(-15 62 138)"/>
  <ellipse cx="138" cy="138" rx="22" ry="14" fill={color} transform="rotate(15 138 138)"/>
  <path d="M48 138 Q40 148 44 158 L56 155 Q50 148 55 140Z" fill={color} fillOpacity="0.8"/>
  <path d="M152 138 Q160 148 156 158 L144 155 Q150 148 145 140Z" fill={color} fillOpacity="0.8"/>
  <ellipse cx="100" cy="95" rx="40" ry="34" fill={color}/>
  <ellipse cx="80" cy="80" rx="14" ry="10" fill="white" fillOpacity="0.4"/>
  <circle cx="87" cy="93" r="11" fill="white"/><circle cx="113" cy="93" r="11" fill="white"/>
  <circle cx="89" cy="94" r="7" fill="#3e2723"/><circle cx="115" cy="94" r="7" fill="#3e2723"/>
  <circle cx="91" cy="92" r="2.5" fill="white"/><circle cx="117" cy="92" r="2.5" fill="white"/>
  <circle cx="100" cy="108" r="9" fill="#bf360c" fillOpacity="0.7"/>
  <circle cx="95" cy="106" r="3.5" fill="#3e2723"/><circle cx="105" cy="106" r="3.5" fill="#3e2723"/>
  <path d="M87 118 Q100 126 113 118" stroke="#4e342e" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  {level>=2&&<><line x1="60" y1="128" x2="46" y2="118" stroke={color} strokeWidth="3"/><circle cx="44" cy="117" r="5" fill={color}/><line x1="140" y1="128" x2="154" y2="118" stroke={color} strokeWidth="3"/><circle cx="156" cy="117" r="5" fill={color}/></>}
  {level>=4&&<text x="100" y="60" textAnchor="middle" fontSize="16">👑</text>}
</g>);}

// ─── SVG Monster 21: ナゾリン (なぞ) ─────────────────────
function NazorinSVG({level,color}){return(<g>
  <path d="M100 42 Q130 42 142 58 Q154 74 148 92 Q142 108 128 112 Q118 116 112 128 Q110 140 110 150 L90 150 Q90 140 88 128 Q82 116 72 112 Q58 108 52 92 Q46 74 58 58 Q70 42 100 42Z" fill={color} fillOpacity="0.85"/>
  <ellipse cx="100" cy="165" rx="20" ry="20" fill={color} fillOpacity="0.85"/>
  <path d="M100 42 Q128 44 140 60 Q150 74 145 90 Q140 106 126 110 Q116 114 110 126 Q108 138 108 150 L112 150 Q112 138 114 128 Q120 114 132 110 Q148 106 154 92 Q160 74 148 58 Q136 42 100 42Z" fill="white" fillOpacity="0.18"/>
  <circle cx="90" cy="108" r="13" fill="white"/><circle cx="110" cy="108" r="13" fill="white"/>
  <circle cx="92" cy="109" r="8.5" fill="#004d40"/><circle cx="112" cy="109" r="8.5" fill="#004d40"/>
  <circle cx="94" cy="107" r="3" fill="white"/><circle cx="114" cy="107" r="3" fill="white"/>
  <path d="M88 124 Q100 132 112 124" stroke="#004d40" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  <circle cx="100" cy="165" r="8" fill="white" fillOpacity="0.9"/>
  <circle cx="100" cy="165" r="5" fill="#004d40"/>
  <circle cx="101" cy="163" r="2" fill="white"/>
  {level>=2&&[0,120,240].map((deg,i)=><circle key={i} cx={100+55*Math.cos(deg*Math.PI/180)} cy={100+55*Math.sin(deg*Math.PI/180)} r="5" fill={color} fillOpacity="0.5"/>)}
  {level>=3&&[60,180,300].map((deg,i)=><circle key={i} cx={100+68*Math.cos(deg*Math.PI/180)} cy={100+68*Math.sin(deg*Math.PI/180)} r="4" fill="white" fillOpacity="0.4"/>)}
  {level>=4&&[0,40,80,120,160,200,240,280,320].map((deg,i)=><circle key={i} cx={100+82*Math.cos(deg*Math.PI/180)} cy={100+82*Math.sin(deg*Math.PI/180)} r="3" fill={color} fillOpacity="0.6"/>)}
</g>);}

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [data, setData] = useState(() => {
    const saved = loadData();
    if (!saved) return initData();
    saved.children = saved.children.map(migrateChild);
    // 起動時に月が変わっていた場合、一度切りクエストを削除
    const currentMonth = thisMonth();
    if (saved.lastKnownMonth && saved.lastKnownMonth !== currentMonth) {
      saved.quests = (saved.quests || []).filter(q => q.type !== "once");
    }
    if (!saved.lastKnownMonth) saved.lastKnownMonth = currentMonth;
    return saved;
  });
  const [activeChildIdx, setActiveChildIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("quest");
  const [showAddChild, setShowAddChild] = useState(false);
  const [showMonthEnd, setShowMonthEnd] = useState(false);
  const [monthEndData, setMonthEndData] = useState(null);
  const [showEvolution, setShowEvolution] = useState(false);
  const [evolutionInfo, setEvolutionInfo] = useState(null);
  const [toast, setToast] = useState(null);
  const [pageInputs, setPageInputs] = useState({});
  const [showParentPin, setShowParentPin] = useState(false);
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [showChangeMonster, setShowChangeMonster] = useState(false);
  const prevDateRef = useRef(todayStr());

  // ─── ファミリー同期 ────────────────────────────────────
  const [familyCode, setFamilyCode] = useState(() => localStorage.getItem(FAMILY_KEY));
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | synced | offline
  const lastSyncedRef = useRef(null);
  const syncTimerRef = useRef(null);
  const initialSyncDoneRef = useRef(false);

  // Firestoreリアルタイム受信
  useEffect(() => {
    if (!familyCode) return;
    initialSyncDoneRef.current = false;
    setSyncStatus("syncing");
    const ref = doc(db, "families", familyCode);
    const unsub = onSnapshot(ref,
      (snap) => {
        if (snap.exists()) {
          const remote = snap.data();
          const remoteStr = JSON.stringify(remote);
          if (remoteStr !== lastSyncedRef.current) {
            lastSyncedRef.current = remoteStr;
            const migrated = { ...remote, children: (remote.children || []).map(migrateChild) };
            setData(migrated);
            saveData(migrated);
          }
        }
        initialSyncDoneRef.current = true;
        setSyncStatus("synced");
      },
      () => { initialSyncDoneRef.current = true; setSyncStatus("offline"); }
    );
    return unsub;
  }, [familyCode]);

  // Firestoreへの書き込み（500msデバウンス）
  useEffect(() => {
    if (!familyCode) return;
    if (!initialSyncDoneRef.current) return;
    const dataStr = JSON.stringify(data);
    if (dataStr === lastSyncedRef.current) return;
    clearTimeout(syncTimerRef.current);
    setSyncStatus("syncing");
    syncTimerRef.current = setTimeout(() => {
      setDoc(doc(db, "families", familyCode), data)
        .then(() => { lastSyncedRef.current = dataStr; setSyncStatus("synced"); })
        .catch(() => setSyncStatus("offline"));
    }, 500);
  }, [data, familyCode]);

  const child = data.children[activeChildIdx];

  useEffect(() => { saveData(data); }, [data]);

  // 日付・月替わりチェック
  useEffect(() => {
    const check = () => {
      const now = todayStr();
      if (now === prevDateRef.current) return;
      const prevM = prevDateRef.current.substring(0,7);
      prevDateRef.current = now;
      const nowM = now.substring(0,7);
      if (prevM !== nowM) {
        // 月替わり：一度切りクエストを削除してから集計モーダルを表示
        setData(prev => ({
          ...prev,
          quests: prev.quests.filter(q => q.type !== "once"),
          lastKnownMonth: nowM,
        }));
        triggerMonthEnd(prevM);
      } else showToast("🌅 新しい日のクエストが更新されました！");
    };
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, [data]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null),2800); };

  const triggerMonthEnd = (month) => {
    if (!child) return;
    const log = child.monthlyLog?.[month] || {};
    const pts = Object.values(log).reduce((a,b)=>a+b,0);
    setMonthEndData({ month, pts, yen: pts * (child.pointRate||10) });
    setShowMonthEnd(true);
  };

  const getTodayClears = () => {
    if (!child) return {};
    const d = todayStr();
    const log = child.monthlyLog?.[thisMonth()] || {};
    const res = {};
    Object.keys(log).forEach(k => { if(k.endsWith(`_${d}`)) res[k.split("_")[0]] = log[k]; });
    return res;
  };

  const getOnceClears = () => (child?.onceClears?.[thisMonth()] || {});

  const getTodayPages = (qid) => (child?.monthlyLog?.[thisMonth()]?.[`${qid}_pages_${todayStr()}`] || 0);

  const getMonthPoints = () => {
    if (!child) return 0;
    return Object.values(child.monthlyLog?.[thisMonth()] || {}).reduce((a,b)=>a+b,0);
  };

  const checkLevelUp = (monsterId, oldExp, newExp) => {
    if (getLevel(newExp) > getLevel(oldExp)) {
      const m = MONSTER_DEFS.find(x=>x.id===monsterId) || MONSTER_DEFS[0];
      setEvolutionInfo({ monster: m, level: getLevel(newExp) });
      setTimeout(() => setShowEvolution(true), 300);
    }
  };

  // ─── クエストクリア共通 ────────────────────────────────
  const addPoints = (pts, label) => {
    setData(prev => {
      const updated = {...prev};
      const c = {...updated.children[activeChildIdx]};
      c.totalPoints = (c.totalPoints||0) + pts;
      updated.children = [...updated.children];
      updated.children[activeChildIdx] = c;
      return updated;
    });
    showToast(`${label} +${pts}pt！`);
  };

  const recordMonthlyLog = (key, pts) => {
    const m = thisMonth();
    setData(prev => {
      const updated = {...prev};
      const c = {...updated.children[activeChildIdx]};
      c.monthlyLog = {...c.monthlyLog};
      c.monthlyLog[m] = {...(c.monthlyLog[m]||{}), [key]: pts};
      c.totalPoints = (c.totalPoints||0) + pts;
      updated.children = [...updated.children];
      updated.children[activeChildIdx] = c;
      return updated;
    });
  };

  const removeMonthlyLog = (key, pts) => {
    const m = thisMonth();
    setData(prev => {
      const updated = {...prev};
      const c = {...updated.children[activeChildIdx]};
      c.monthlyLog = {...c.monthlyLog};
      c.monthlyLog[m] = {...(c.monthlyLog[m]||{})};
      delete c.monthlyLog[m][key];
      c.totalPoints = Math.max(0, (c.totalPoints||0) - pts);
      updated.children = [...updated.children];
      updated.children[activeChildIdx] = c;
      return updated;
    });
  };

  const clearDailyQuest = (quest) => {
    if (quest.type === "once") { clearOnceQuest(quest); return; }
    const d = todayStr();
    const key = `${quest.id}_${d}`;
    if (getTodayClears()[String(quest.id)]) {
      removeMonthlyLog(key, quest.points);
      showToast(`❌ ${quest.name} を取り消しました`);
    } else {
      recordMonthlyLog(key, quest.points);
      showToast(`✅ ${quest.name} +${quest.points}pt！`);
    }
  };

  const undoOnceQuest = (quest) => {
    const m = thisMonth();
    if (!getOnceClears()[String(quest.id)]) return;
    setData(prev => {
      const updated = {...prev};
      const c = {...updated.children[activeChildIdx]};
      c.onceClears = {...(c.onceClears||{})};
      c.onceClears[m] = {...(c.onceClears[m]||{})};
      delete c.onceClears[m][String(quest.id)];
      c.monthlyLog = {...c.monthlyLog};
      c.monthlyLog[m] = {...(c.monthlyLog[m]||{})};
      delete c.monthlyLog[m][`${quest.id}_once_${m}`];
      c.totalPoints = Math.max(0, (c.totalPoints||0) - quest.points);
      updated.children = [...updated.children];
      updated.children[activeChildIdx] = c;
      return updated;
    });
    showToast(`❌ ${quest.name} を取り消しました`);
  };

  const clearOnceQuest = (quest) => {
    const m = thisMonth();
    if (getOnceClears()[String(quest.id)]) return;
    setData(prev => {
      const updated = {...prev};
      const c = {...updated.children[activeChildIdx]};
      c.onceClears = {...(c.onceClears||{})};
      c.onceClears[m] = {...(c.onceClears[m]||{}), [String(quest.id)]: true};
      c.monthlyLog = {...c.monthlyLog};
      c.monthlyLog[m] = {...(c.monthlyLog[m]||{}), [`${quest.id}_once_${m}`]: quest.points};
      c.totalPoints = (c.totalPoints||0) + quest.points;
      updated.children = [...updated.children];
      updated.children[activeChildIdx] = c;
      return updated;
    });
    showToast(`🌟 ${quest.name} +${quest.points}pt！`);
  };

  const clearPagesQuest = (quest, pages) => {
    if (!pages || pages<=0) return;
    const pts = pages * (quest.pointsPerPage||1);
    recordMonthlyLog(`${quest.id}_pages_${todayStr()}`, pts);
    setPageInputs(p=>({...p,[quest.id]:""}));
    showToast(`📖 ${quest.name} ${pages}p → +${pts}pt！`);
  };


  // ─── 経験値配布 ───────────────────────────────────────
  const assignExp = (amount) => {
    if (!child || amount<=0) return;
    const free = getFreeExp(child);
    const actual = Math.min(amount, free);
    if (actual<=0) return;
    const mid = child.activeMonster;
    const oldExp = (child.monsterExp||{})[mid] || 0;
    setData(prev => {
      const updated = {...prev};
      const c = {...updated.children[activeChildIdx]};
      c.monsterExp = {...(c.monsterExp||{})};
      c.monsterExp[mid] = (c.monsterExp[mid]||0) + actual;
      updated.children = [...updated.children];
      updated.children[activeChildIdx] = c;
      return updated;
    });
    checkLevelUp(mid, oldExp, oldExp+actual);
    showToast(`✨ ${actual}ptを配布しました！`);
  };

  // ─── モンスター切替 ───────────────────────────────────
  const changeMonster = (mid) => {
    setData(prev => {
      const updated = {...prev};
      updated.children = [...updated.children];
      updated.children[activeChildIdx] = {...updated.children[activeChildIdx], activeMonster: mid};
      return updated;
    });
    setShowChangeMonster(false);
    showToast("🐣 モンスターを変えました！");
  };

  const addChild = (name, monsterId, pointRate) => {
    const nc = { id:data.nextChildId, name, activeMonster:monsterId||1,
      monsterExp:{}, totalPoints:0, pointRate:pointRate||10,
      monthlyLog:{}, onceClears:{} };
    setData(prev=>({...prev, children:[...prev.children,nc], nextChildId:prev.nextChildId+1}));
    setActiveChildIdx(data.children.length);
    setShowAddChild(false);
    showToast(`🎉 ${name}を追加しました！`);
  };

  // ファミリーコード未設定なら設定画面
  if (!familyCode) return (
    <FamilySetupScreen
      onSetup={(code) => {
        localStorage.setItem(FAMILY_KEY, code);
        setFamilyCode(code);
      }}
    />
  );

  if (data.children.length===0) return <WelcomeScreen onAdd={addChild}/>;

  const freeExp = getFreeExp(child);
  const activeM = MONSTER_DEFS.find(x=>x.id===child?.activeMonster) || MONSTER_DEFS[0];

  const syncIcon = syncStatus==="synced" ? "☁️" : syncStatus==="offline" ? "📵" : "🔄";
  const syncLabel = syncStatus==="synced" ? "同期済" : syncStatus==="offline" ? "オフライン" : "同期中";

  return (
    <div style={S.app} className="app-root">
      {/* ヘッダー */}
      <header style={S.header}>
        <div style={S.headerTop}>
          <span style={S.appTitle}>⚔️ おこづかいクエスト</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={S.dateText}>{formatDate()}</span>
            <span style={S.syncBadge} title={syncLabel}>{syncIcon}</span>
            <button style={S.addChildBtn} onClick={()=>setShowAddChild(true)}>＋</button>
          </div>
        </div>
        <div style={S.childTabs}>
          {data.children.map((c,i)=>(
            <button key={c.id} style={{...S.childTab,...(i===activeChildIdx?S.childTabActive:{})}} onClick={()=>setActiveChildIdx(i)}>{c.name}</button>
          ))}
        </div>
      </header>

      {/* ポイントバナー */}
      {child && (
        <div style={S.pointBanner}>
          <div style={S.pointBannerLeft}>
            <span style={S.pointMonth}>{thisMonth().replace("-","年")}月</span>
            <span style={S.pointLabel}>今月のポイント</span>
          </div>
          <div style={S.pointBannerRight}>
            <span style={S.pointValue}>{getMonthPoints()}</span>
            <span style={S.pointUnit}>pt</span>
            <span style={S.pointYen}>≈ {getMonthPoints()*(child.pointRate||10)}円</span>
          </div>
          {freeExp>0 && (
            <button style={S.freeExpBadge} onClick={()=>setActiveTab("monster")}>
              ✨ {freeExp}pt
            </button>
          )}
        </div>
      )}

      {/* メイン */}
      <main style={S.main}>
        {activeTab==="quest" && child && (
          <QuestView quests={data.quests} child={child}
            todayClears={getTodayClears()} onceClears={getOnceClears()}
            getTodayPages={getTodayPages} pageInputs={pageInputs} setPageInputs={setPageInputs}
            onClear={clearDailyQuest} onClearPages={clearPagesQuest}
            onUndoOnce={undoOnceQuest}
            onMonthEnd={()=>triggerMonthEnd(thisMonth())}/>
        )}
        {activeTab==="monster" && child && (
          <MonsterView child={child} freeExp={freeExp}
            onAssign={assignExp} onChangeMonster={()=>setShowChangeMonster(true)}/>
        )}
        {activeTab==="encyclopedia" && (
          <EncyclopediaView children={data.children}/>
        )}
        {activeTab==="records" && child && <RecordsView child={child} quests={data.quests}/>}
        {activeTab==="settings" && (
          <SettingsView data={data} setData={setData}
            parentUnlocked={parentUnlocked} onUnlock={()=>setShowParentPin(true)}
            showToast={showToast} activeChildIdx={activeChildIdx}/>
        )}
      </main>

      {/* ボトムナビ */}
      <nav style={S.bottomNav}>
        {[
          {id:"quest",   label:"クエスト", icon:"⚔️"},
          {id:"monster", label:"モンスター",icon:"🐣", badge: freeExp>0},
          {id:"encyclopedia",label:"図鑑",icon:"📖"},
          {id:"records", label:"記録",     icon:"📊"},
          {id:"settings",label:"せってい", icon:"⚙️"},
        ].map(t=>(
          <button key={t.id} style={{...S.navBtn,...(activeTab===t.id?S.navBtnActive:{})}} onClick={()=>setActiveTab(t.id)}>
            <span style={{position:"relative",display:"inline-block"}}>
              <span style={S.navIcon}>{t.icon}</span>
              {t.badge && <span style={S.navBadge}/>}
            </span>
            <span style={S.navLabel}>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* モーダル */}
      {showAddChild && <AddChildModal onAdd={addChild} onClose={()=>setShowAddChild(false)}/>}
      {showMonthEnd && monthEndData && <MonthEndModal data={monthEndData} child={child} onClose={()=>setShowMonthEnd(false)}/>}
      {showEvolution && evolutionInfo && <EvolutionModal info={evolutionInfo} onClose={()=>setShowEvolution(false)}/>}
      {showParentPin && <PinModal onSuccess={()=>{setParentUnlocked(true);setShowParentPin(false);}} onClose={()=>setShowParentPin(false)}/>}
      {showChangeMonster && child && <ChangeMonsterModal current={child.activeMonster} monsterExp={child.monsterExp||{}} onSelect={changeMonster} onClose={()=>setShowChangeMonster(false)}/>}
      {toast && <div style={S.toast}>{toast}</div>}

      <style>{`
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
        *{box-sizing:border-box;margin:0;padding:0}
        html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
        .app-root{height:100dvh}
        button,a,input,select{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
        input,select{-webkit-appearance:none;appearance:none}
        .scroll-area{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#7986cb;border-radius:4px}
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// クエスト画面
// ════════════════════════════════════════════════════════════
function QuestView({quests,child,todayClears,onceClears,getTodayPages,pageInputs,setPageInputs,onClear,onClearPages,onUndoOnce,onMonthEnd}){
  const cats=[...new Set(quests.map(q=>q.category))];
  return(
    <div style={S.scrollArea} className="scroll-area">
      {cats.map(cat=>(
        <div key={cat} style={S.categorySection}>
          <h3 style={S.categoryTitle}>{cat}</h3>
          {quests.filter(q=>q.category===cat).map(q=>(
            <QuestCard key={q.id} quest={q} todayClears={todayClears} onceClears={onceClears}
              getTodayPages={getTodayPages}
              pageInput={pageInputs[q.id]||""} setPageInput={v=>setPageInputs(p=>({...p,[q.id]:v}))}
              onClear={()=>onClear(q)} onClearPages={pages=>onClearPages(q,pages)}
              onUndoOnce={()=>onUndoOnce(q)}/>
          ))}
        </div>
      ))}
      <div style={{padding:"8px 0 16px",display:"flex",flexDirection:"column",gap:8}}>
        <button style={{...S.specialBtn,background:"#37474f"}} onClick={onMonthEnd}>📅 月次集計を確認</button>
      </div>
    </div>
  );
}

function QuestCard({quest,todayClears,onceClears,getTodayPages,pageInput,setPageInput,onClear,onClearPages,onUndoOnce}){
  const isOnce = quest.type==="once";
  const onceDone = isOnce && !!(onceClears||{})[String(quest.id)];
  const cleared = quest.type==="daily" && !!todayClears[String(quest.id)];
  const todayPages = getTodayPages(quest.id);

  if (quest.type==="pages") return(
    <div style={{...S.questCard,...(todayPages>0?S.questCardCleared:{})}}>
      <div style={S.questIcon}>{quest.icon}</div>
      <div style={S.questInfo}>
        <div style={S.questName}>{quest.name}</div>
        <div style={S.questMeta}>
          <span style={S.questPts}>1ページ = {quest.pointsPerPage||1}pt</span>
          {todayPages>0 && <span style={S.questDone}>今日{todayPages}p完了</span>}
        </div>
      </div>
      <div style={S.pageInputArea}>
        <input type="number" inputMode="numeric" pattern="[0-9]*" min="1" max={quest.maxPages||99}
          value={pageInput} onChange={e=>setPageInput(e.target.value)} style={S.pageInput} placeholder="p数"/>
        <button style={S.pageBtn} onClick={()=>onClearPages(Number(pageInput))}>＋</button>
      </div>
    </div>
  );

  if (isOnce) return(
    <div style={{...S.questCard,...(onceDone?S.questCardCleared:{}),display:"flex",alignItems:"center"}}>
      <button style={{flex:1,display:"flex",alignItems:"center",gap:0,background:"none",border:"none",cursor:onceDone?"default":"pointer",padding:0,textAlign:"left"}}
        onClick={onceDone?undefined:onClear}>
        <div style={S.questIcon}>{quest.icon}</div>
        <div style={S.questInfo}>
          <div style={{...S.questName,textDecoration:onceDone?"line-through":"none",opacity:onceDone?0.55:1}}>{quest.name}</div>
          <div style={S.questMeta}>
            <span style={S.questPts}>+{quest.points}pt</span>
            <span style={{fontSize:11,color:"#e57373",fontWeight:700}}>特別</span>
          </div>
        </div>
        <div style={{...S.questCheck,...(onceDone?S.questCheckDone:{})}}>{onceDone?"✓":""}</div>
      </button>
      {onceDone&&<button onClick={onUndoOnce} style={{background:"none",border:"1px solid #555",borderRadius:8,color:"#aaa",fontSize:11,padding:"4px 8px",cursor:"pointer",marginLeft:6,flexShrink:0}}>取り消し</button>}
    </div>
  );

  return(
    <button style={{...S.questCard,...(cleared?S.questCardCleared:{}),cursor:"pointer",width:"100%",border:"none"}} onClick={onClear}>
      <div style={S.questIcon}>{quest.icon}</div>
      <div style={S.questInfo}>
        <div style={{...S.questName,textDecoration:cleared?"line-through":"none",opacity:cleared?0.6:1}}>{quest.name}</div>
        <div style={S.questMeta}><span style={S.questPts}>+{quest.points}pt</span></div>
      </div>
      <div style={{...S.questCheck,...(cleared?S.questCheckDone:{})}}>{cleared?"✓":""}</div>
    </button>
  );
}

// ════════════════════════════════════════════════════════════
// モンスター画面
// ════════════════════════════════════════════════════════════
function MonsterView({child,freeExp,onAssign,onChangeMonster}){
  const [amount,setAmount]=useState("");
  const mid = child.activeMonster;
  const monster = MONSTER_DEFS.find(x=>x.id===mid)||MONSTER_DEFS[0];
  const exp = (child.monsterExp||{})[mid]||0;
  const level = getLevel(exp);
  const next = getNextThreshold(exp);
  const progress = next ? ((exp-LEVEL_THRESHOLDS[level])/(next-LEVEL_THRESHOLDS[level]))*100 : 100;

  return(
    <div style={S.scrollArea} className="scroll-area">
      {/* モンスターカード */}
      <div style={S.monsterCard}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:monster.typeColor,fontSize:20,fontWeight:900}}>{monster.name}</span>
            <span style={{...S.typeChip,background:monster.typeColor}}>{monster.type}</span>
          </div>
          <button style={S.changeMonBtn} onClick={onChangeMonster}>🔄 かえる</button>
        </div>
        <MonsterSVG monsterId={mid} level={level} size={170} animate/>
        <div style={S.levelBadge}>Lv.{level+1} <span style={{fontWeight:700}}>{getLevelName(monster,exp)}</span></div>
        <p style={S.monsterDesc}>{monster.desc}</p>
        <div style={S.progressSection}>
          <div style={S.progressLabel}>
            <span>経験値 {exp}pt</span>
            {next?<span>次まで {next-exp}pt</span>:<span>🏆 最大レベル！</span>}
          </div>
          <div style={S.progressBar}><div style={{...S.progressFill,width:`${Math.min(100,progress)}%`,background:monster.typeColor}}/></div>
        </div>
        <div style={S.levelList}>
          {LEVEL_THRESHOLDS.map((t,i)=>(
            <div key={i} style={{...S.levelItem,...(i===level?S.levelItemActive:{}),...(i<level?S.levelItemDone:{})}}>
              <span>Lv.{i+1}</span><span>{monster.levels[i]}</span><span style={{fontSize:11,opacity:0.6}}>{t}pt～</span>
            </div>
          ))}
        </div>
      </div>

      {/* 経験値配布パネル */}
      <div style={S.expPanel}>
        <div style={S.expPanelTitle}>✨ 経験値を配布する</div>
        <div style={S.expPanelFree}>配布できる経験値：<span style={{color:"#ffd600",fontWeight:900,fontSize:20}}>{freeExp}</span> pt</div>
        {freeExp>0?(
          <>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="number" inputMode="numeric" pattern="[0-9]*" min="1" max={freeExp}
                value={amount} onChange={e=>setAmount(e.target.value)} style={S.expInput} placeholder="pt数"/>
              <button style={S.expBtn} onClick={()=>{onAssign(Number(amount));setAmount("");}}>配布</button>
              <button style={{...S.expBtn,background:"#37474f"}} onClick={()=>{onAssign(freeExp);setAmount("");}}>全部</button>
            </div>
            <p style={{fontSize:11,color:"#888",marginTop:4}}>このモンスターに経験値を振り分けます</p>
          </>
        ):(
          <p style={{fontSize:13,color:"#888"}}>クエストをクリアして経験値を貯めよう！</p>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 図鑑
// ════════════════════════════════════════════════════════════
function EncyclopediaView({children}){
  const [sel,setSel]=useState(null);
  const allExp={};
  children.forEach(c=>{ Object.entries(c.monsterExp||{}).forEach(([id,v])=>{ allExp[id]=(allExp[id]||0)+v; }); });

  return(
    <div style={S.scrollArea} className="scroll-area">
      <h3 style={S.sectionTitle}>モンスター図鑑</h3>
      <p style={S.sectionSub}>全{MONSTER_DEFS.length}種類</p>
      <div style={S.encGrid}>
        {MONSTER_DEFS.map(m=>{
          const exp=allExp[m.id]||0;
          const owned=exp>0 || children.some(c=>c.activeMonster===m.id);
          const lv=getLevel(exp);
          return(
            <button key={m.id} style={{...S.encCard,...(!owned?S.encCardLocked:{}),border:sel===m.id?`2px solid ${m.typeColor}`:"2px solid transparent"}}
              onClick={()=>setSel(sel===m.id?null:m.id)}>
              <div style={{filter:owned?"none":"grayscale(1) brightness(0.35)"}}>
                <MonsterSVG monsterId={m.id} level={owned?lv:1} size={80}/>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:owned?m.typeColor:"#555"}}>{owned?m.name:"？？？"}</div>
              {owned&&<div style={{...S.typeChip,background:m.typeColor,fontSize:9,marginTop:2}}>Lv.{lv+1}</div>}
            </button>
          );
        })}
      </div>
      {sel&&(()=>{
        const m=MONSTER_DEFS.find(x=>x.id===sel);
        const exp=allExp[m.id]||0;
        const owned=exp>0||children.some(c=>c.activeMonster===m.id);
        return(
          <div style={S.encDetail}>
            <div style={{display:"flex",gap:16,alignItems:"center"}}>
              <div style={{filter:owned?"none":"grayscale(1) brightness(0.4)"}}>
                <MonsterSVG monsterId={m.id} level={getLevel(exp)} size={110}/>
              </div>
              <div>
                <div style={{fontSize:18,fontWeight:900,color:m.typeColor}}>{owned?m.name:"？？？"}</div>
                <span style={{...S.typeChip,background:m.typeColor}}>{m.type}</span>
                {owned&&<><p style={{marginTop:8,fontSize:13,color:"#ccc",lineHeight:1.6}}>{m.desc}</p><p style={{marginTop:6,fontSize:12,color:"#aaa"}}>累計経験値: {exp}pt / Lv.{getLevel(exp)+1}</p></>}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 記録
// ════════════════════════════════════════════════════════════
function RecordsView({child,quests}){
  const logs=child.monthlyLog||{};
  const months=Object.keys(logs).sort().reverse();

  const getQuestCounts=(monthLog)=>{
    const counts={};
    Object.keys(monthLog).forEach(key=>{
      const qid=key.split("_")[0];
      if(qid==="special") return;
      counts[qid]=(counts[qid]||0)+1;
    });
    return counts;
  };

  return(
    <div style={S.scrollArea} className="scroll-area">
      <h3 style={S.sectionTitle}>ポイント記録</h3>
      {months.length===0&&<p style={{color:"#888",padding:16}}>まだ記録がありません</p>}
      {months.map(m=>{
        const total=Object.values(logs[m]).reduce((a,b)=>a+b,0);
        const counts=getQuestCounts(logs[m]);
        return(
          <div key={m} style={S.recordCard}>
            <div style={S.recordMonth}>{m.replace("-","年")}月</div>
            <div style={S.recordStats}>
              <div style={S.recordStat}><span style={S.recordNum}>{total}</span><span style={S.recordLbl}>pt</span></div>
              <div style={S.recordStat}><span style={S.recordNum}>{total*(child.pointRate||10)}</span><span style={S.recordLbl}>円</span></div>
            </div>
            {Object.keys(counts).length>0&&(
              <div style={{marginTop:8,borderTop:"1px solid #2a3660",paddingTop:8,display:"flex",flexDirection:"column",gap:4}}>
                {Object.entries(counts).map(([qid,cnt])=>{
                  const q=quests.find(x=>String(x.id)===qid);
                  const label=q?`${q.icon} ${q.name}`:`クエスト#${qid}`;
                  return(
                    <div key={qid} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,color:"#ccc"}}>
                      <span>{label}</span>
                      <span style={{color:"#7986cb",fontWeight:700}}>{cnt}回</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 設定
// ════════════════════════════════════════════════════════════
function SettingsView({data,setData,parentUnlocked,onUnlock,showToast,activeChildIdx}){
  const child=data.children[activeChildIdx];
  const [name,setName]=useState("");
  const [pts,setPts]=useState("1");
  const [cat,setCat]=useState("せいかつ");
  const [icon,setIcon]=useState("⭐");
  const [type,setType]=useState("daily");
  const [ppp,setPpp]=useState("1");
  const [editQ,setEditQ]=useState(null);
  const [resetStep,setResetStep]=useState(0);

  if(!parentUnlocked) return(
    <div style={S.lockScreen}>
      <div style={{fontSize:48}}>🔒</div>
      <p style={{color:"#ccc",marginBottom:16}}>保護者モードに入るには</p>
      <button style={S.unlockBtn} onClick={onUnlock}>PINを入力</button>
    </div>
  );

  const updRate=v=>{ if(!child)return; setData(p=>{const u={...p};u.children=[...u.children];u.children[activeChildIdx]={...u.children[activeChildIdx],pointRate:Number(v)};return u;}); };
  const addQ=()=>{
    if(!name.trim())return;
    const q={id:data.nextQuestId,name:name.trim(),points:Number(pts),icon:icon||"⭐",category:cat,type,
      ...(type==="pages"?{pointsPerPage:Number(ppp)||1}:{})};
    setData(p=>({...p,quests:[...p.quests,q],nextQuestId:p.nextQuestId+1}));
    setName("");showToast("クエストを追加しました！");
  };
  const delQ=id=>{setData(p=>({...p,quests:p.quests.filter(q=>q.id!==id)}));showToast("削除しました");};
  const saveQ=q=>{setData(p=>({...p,quests:p.quests.map(x=>x.id===q.id?q:x)}));setEditQ(null);showToast("更新しました！");};
  const move=(idx,dir)=>{
    const ni=idx+dir;
    if(ni<0||ni>=data.quests.length)return;
    setData(p=>{const qs=[...p.quests];[qs[idx],qs[ni]]=[qs[ni],qs[idx]];return{...p,quests:qs};});
  };

  const familyCode = localStorage.getItem(FAMILY_KEY) || "------";

  return(
    <div style={S.scrollArea} className="scroll-area">
      <h3 style={S.sectionTitle}>⚙️ 保護者設定</h3>
      {/* ファミリーコード表示 */}
      <div style={S.settingSection}>
        <h4 style={S.settingH}>☁️ ファミリーコード</h4>
        <div style={{background:"#0f1117",borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
          <span style={{fontSize:28,fontWeight:900,letterSpacing:6,color:"#7986cb",fontFamily:"monospace"}}>{familyCode}</span>
        </div>
        <p style={{fontSize:11,color:"#888",lineHeight:1.6}}>このコードを家族に共有すると、同じデータで使えます。アプリ初回起動時の「ファミリーに参加する」から入力してください。</p>
      </div>
      {child&&(
        <div style={S.settingSection}>
          <h4 style={S.settingH}>「{child.name}」の設定</h4>
          <div style={S.settingRow}><span style={{color:"#ccc"}}>1pt =</span>
            <input type="number" value={child.pointRate||10} min="1" onChange={e=>updRate(e.target.value)} style={{...S.settingInput,width:80}}/>
            <span style={{color:"#ccc"}}>円</span></div>
        </div>
      )}
      <div style={S.settingSection}>
        <h4 style={S.settingH}>クエスト追加</h4>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="クエスト名" style={S.settingInput}/>
        <div style={S.settingRow}>
          <select value={cat} onChange={e=>setCat(e.target.value)} style={S.settingSelect}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
          <select value={type} onChange={e=>setType(e.target.value)} style={S.settingSelect}>
            <option value="daily">毎日</option><option value="pages">ページ数</option><option value="once">特別</option>
          </select>
        </div>
        <div style={S.settingRow}>
          <input value={icon} onChange={e=>setIcon(e.target.value)} style={{...S.settingInput,width:52}}/>
          {type==="pages"
            ?<><input type="number" value={ppp} onChange={e=>setPpp(e.target.value)} style={{...S.settingInput,width:80}}/><span style={{color:"#ccc"}}>pt/p</span></>
            :<><input type="number" min="0" value={pts} onChange={e=>setPts(e.target.value)} style={{...S.settingInput,width:80}}/><span style={{color:"#ccc"}}>pt</span></>}
        </div>
        <button style={S.addBtn} onClick={addQ}>クエストを追加</button>
      </div>
      <div style={S.settingSection}>
        <h4 style={S.settingH}>クエスト一覧 <span style={{fontSize:11,color:"#888",fontWeight:400}}>タップで編集</span></h4>
        {data.quests.map((q,idx)=>(
          <div key={q.id} style={S.sqRow}>
            <div style={S.reorderBtns}>
              <button style={S.reorderBtn} onClick={()=>move(idx,-1)} disabled={idx===0}>▲</button>
              <button style={S.reorderBtn} onClick={()=>move(idx,1)} disabled={idx===data.quests.length-1}>▼</button>
            </div>
            <button style={S.sqInfo} onClick={()=>setEditQ({...q})}>
              <span style={{fontSize:18}}>{q.icon}</span>
              <span style={{flex:1,color:"#eee",fontSize:13,textAlign:"left"}}>{q.name}</span>
              <span style={{color:"#7986cb",fontSize:11}}>{q.type==="pages"?`${q.pointsPerPage}pt/p`:q.type==="once"?`${q.points}pt 特別`:`${q.points}pt`}</span>
            </button>
            <button style={S.deleteBtn} onClick={()=>delQ(q.id)}>✕</button>
          </div>
        ))}
      </div>
      {editQ&&<EditQuestModal quest={editQ} onSave={saveQ} onClose={()=>setEditQ(null)}/>}
      <div style={S.settingSection}>
        <h4 style={{...S.settingH,color:"#ef9a9a"}}>⚠️ データリセット</h4>
        {resetStep===0&&(
          <button style={{...S.addBtn,background:"#b71c1c",marginTop:4}} onClick={()=>setResetStep(1)}>
            データをリセットする
          </button>
        )}
        {resetStep===1&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <p style={{color:"#ef9a9a",fontSize:13,margin:0}}>本当にリセットしますか？すべてのデータが消えます。</p>
            <div style={{display:"flex",gap:8}}>
              <button style={{...S.addBtn,background:"#b71c1c",flex:1}} onClick={()=>{
                localStorage.clear();
                window.location.reload();
              }}>はい、リセットする</button>
              <button style={{...S.addBtn,background:"#37474f",flex:1}} onClick={()=>setResetStep(0)}>キャンセル</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ウェルカム画面
// ════════════════════════════════════════════════════════════
function WelcomeScreen({onAdd}){
  const [name,setName]=useState("");
  const [mid,setMid]=useState(1);
  const [rate,setRate]=useState("10");
  return(
    <div style={S.welcomeScreen}>
      <div style={S.welcomeCard}>
        <h1 style={S.welcomeTitle}>⚔️ おこづかいクエスト</h1>
        <p style={{fontSize:14,color:"#aaa",marginBottom:14}}>はじめに名前とモンスターを決めよう！</p>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="名前を入力" style={S.welcomeInput}/>
        <p style={{color:"#aaa",marginBottom:8,fontSize:13}}>モンスターを選ぼう：</p>
        <div style={S.monSelectGrid}>
          {MONSTER_DEFS.map(m=>(
            <button key={m.id} style={{...S.monSelectBtn,...(mid===m.id?{border:`2px solid ${m.typeColor}`}:{})}} onClick={()=>setMid(m.id)}>
              <MonsterSVG monsterId={m.id} level={1} size={62}/>
              <div style={{fontSize:9,color:mid===m.id?m.typeColor:"#888",fontWeight:700}}>{m.name}</div>
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",marginTop:10}}>
          <span style={{color:"#ccc"}}>1pt =</span>
          <input type="number" inputMode="numeric" value={rate} onChange={e=>setRate(e.target.value)} style={{...S.welcomeInput,width:80,textAlign:"center",marginBottom:0}}/>
          <span style={{color:"#ccc"}}>円</span>
        </div>
        <button style={{...S.startBtn,...(!name.trim()?{background:"#37474f",cursor:"not-allowed",opacity:0.6}:{})}}
          onClick={()=>name.trim()&&onAdd(name.trim(),mid,Number(rate)||10)}>
          {name.trim()?"はじめる！":"名前を入力してください"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ファミリー設定画面（初回起動）
// ════════════════════════════════════════════════════════════
function FamilySetupScreen({ onSetup }) {
  const [mode, setMode] = useState(null); // null | "create" | "join"
  const [inputCode, setInputCode] = useState("");
  const [generated, setGenerated] = useState("");

  const handleCreate = () => {
    const code = genFamilyCode();
    setGenerated(code);
    setMode("create");
  };

  const handleJoin = () => {
    const code = inputCode.trim().toUpperCase();
    if (code.length < 4) return;
    onSetup(code);
  };

  return (
    <div style={S.welcomeScreen}>
      <div style={S.welcomeCard}>
        <h1 style={S.welcomeTitle}>⚔️ おこづかいクエスト</h1>
        <p style={{fontSize:13,color:"#9fa8da",textAlign:"center",marginBottom:4}}>
          家族みんなでデータを共有できます
        </p>

        {!mode && (
          <>
            <button style={{...S.startBtn,marginTop:8}} onClick={handleCreate}>
              🏠 新しいファミリーを作る
            </button>
            <button style={{...S.startBtn,background:"#1e2740",border:"1px solid #2a3660",marginTop:4}} onClick={()=>setMode("join")}>
              🔑 ファミリーに参加する
            </button>
          </>
        )}

        {mode === "create" && (
          <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:8}}>
            <p style={{fontSize:13,color:"#ccc",textAlign:"center"}}>このコードを家族に伝えてください</p>
            <div style={{background:"#0f1117",borderRadius:12,padding:"14px 20px",textAlign:"center"}}>
              <span style={{fontSize:36,fontWeight:900,letterSpacing:8,color:"#7986cb",fontFamily:"monospace"}}>{generated}</span>
            </div>
            <p style={{fontSize:11,color:"#888",lineHeight:1.6,textAlign:"center"}}>
              子どもの端末で「ファミリーに参加する」→ このコードを入力
            </p>
            <button style={S.startBtn} onClick={()=>onSetup(generated)}>このコードで始める！</button>
            <button style={{background:"none",border:"none",color:"#7986cb",fontSize:12,cursor:"pointer"}} onClick={()=>setMode(null)}>← 戻る</button>
          </div>
        )}

        {mode === "join" && (
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:8}}>
            <p style={{fontSize:13,color:"#ccc",textAlign:"center"}}>ファミリーコードを入力</p>
            <input
              value={inputCode}
              onChange={e=>setInputCode(e.target.value.toUpperCase().slice(0,8))}
              placeholder="例：ABC123"
              maxLength={8}
              style={{...S.welcomeInput,textAlign:"center",fontSize:22,fontFamily:"monospace",letterSpacing:4}}
            />
            <button style={S.startBtn} onClick={handleJoin} disabled={inputCode.trim().length<4}>
              参加する！
            </button>
            <button style={{background:"none",border:"none",color:"#7986cb",fontSize:12,cursor:"pointer"}} onClick={()=>setMode(null)}>← 戻る</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// モーダル群
// ════════════════════════════════════════════════════════════
function Modal({children,onClose,title,footer}){return(
  <div style={S.modalOverlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={S.modalContent}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <h3 style={{fontSize:17,fontWeight:800,color:"#f0f0f0"}}>{title}</h3>
        <button style={S.modalClose} onClick={onClose}>✕</button>
      </div>
      <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:10}}>
        {children}
      </div>
      {footer&&<div style={{paddingTop:8,borderTop:"1px solid #2a3660",flexShrink:0}}>{footer}</div>}
    </div>
  </div>
);}

function AddChildModal({onAdd,onClose}){
  const [name,setName]=useState("");
  const [mid,setMid]=useState(1);
  const [rate,setRate]=useState("10");
  return(<Modal onClose={onClose} title="子どもを追加">
    <input value={name} onChange={e=>setName(e.target.value)} placeholder="名前" style={S.modalInput}/>
    <div style={S.monSelectGrid}>
      {MONSTER_DEFS.map(m=>(
        <button key={m.id} style={{...S.monSelectBtn,...(mid===m.id?{border:`2px solid ${m.typeColor}`}:{})}} onClick={()=>setMid(m.id)}>
          <MonsterSVG monsterId={m.id} level={1} size={55}/>
          <div style={{fontSize:9,color:"#aaa"}}>{m.name}</div>
        </button>
      ))}
    </div>
    <div style={{display:"flex",gap:8,alignItems:"center"}}>
      <span style={{color:"#ccc"}}>1pt =</span>
      <input type="number" value={rate} onChange={e=>setRate(e.target.value)} style={{...S.modalInput,width:80}}/>
      <span style={{color:"#ccc"}}>円</span>
    </div>
    <button style={S.modalConfirm} onClick={()=>name&&onAdd(name,mid,Number(rate))}>追加する</button>
  </Modal>);}

function ChangeMonsterModal({current,monsterExp,onSelect,onClose}){return(
  <Modal onClose={onClose} title="🐣 モンスターを変える">
    <p style={{color:"#aaa",fontSize:13,marginBottom:10}}>モンスターごとに経験値が保存されます。</p>
    <div style={S.monSelectGrid}>
      {MONSTER_DEFS.map(m=>{
        const exp=(monsterExp||{})[m.id]||0;
        const lv=getLevel(exp);
        return(
          <button key={m.id} style={{...S.monSelectBtn,...(current===m.id?{border:`2px solid ${m.typeColor}`}:{})}} onClick={()=>onSelect(m.id)}>
            <MonsterSVG monsterId={m.id} level={lv} size={62}/>
            <div style={{fontSize:9,color:current===m.id?m.typeColor:"#aaa",fontWeight:700}}>{m.name}</div>
            <div style={{fontSize:9,color:"#666"}}>Lv.{lv+1}</div>
          </button>
        );
      })}
    </div>
  </Modal>
);}

function MonthEndModal({data,child,onClose}){
  const {month,pts,yen}=data;
  const monster=MONSTER_DEFS.find(m=>m.id===child?.activeMonster)||MONSTER_DEFS[0];
  const exp=(child?.monsterExp||{})[child?.activeMonster]||0;
  return(<Modal onClose={onClose} title={`📅 ${month.replace("-","年")}月の結果`}>
    <div style={{textAlign:"center"}}>
      <MonsterSVG monsterId={monster.id} level={getLevel(exp)} size={130} animate/>
      <div style={{margin:"12px 0 4px",display:"flex",alignItems:"baseline",gap:4,justifyContent:"center"}}>
        <span style={{fontSize:44,fontWeight:900,color:"#7986cb"}}>{pts}</span><span style={{fontSize:16,color:"#9fa8da"}}>pt</span>
      </div>
      <div style={{color:"#ffd600",fontSize:20,fontWeight:700,marginBottom:8}}>{yen}円</div>
      <button style={S.modalConfirm} onClick={onClose}>次の月へ進む！</button>
    </div>
  </Modal>);}

function EvolutionModal({info,onClose}){
  const {monster,level}=info;
  return(<Modal onClose={onClose} title="🎉 レベルアップ！">
    <div style={{textAlign:"center"}}>
      <p style={{color:"#ffd600",fontSize:18,fontWeight:700,marginBottom:12}}>{monster.name} が<br/>Lv.{level+1} に進化した！</p>
      <MonsterSVG monsterId={monster.id} level={level} size={170} animate/>
      <p style={{color:"#ccc",marginTop:8,fontSize:14,fontWeight:700}}>{monster.levels[level]}</p>
      <button style={S.modalConfirm} onClick={onClose}>やったー！</button>
    </div>
  </Modal>);}

function EditQuestModal({quest,onSave,onClose}){
  const [q,setQ]=useState({...quest});
  const upd=(k,v)=>setQ(p=>({...p,[k]:v}));
  return(<Modal onClose={onClose} title="✏️ クエストを編集"
    footer={<button style={S.modalConfirm} onClick={()=>q.name.trim()&&onSave(q)}>保存する</button>}>
    <div style={{display:"flex",gap:8}}>
      <input value={q.icon} onChange={e=>upd("icon",e.target.value)} style={{...S.modalInput,width:52}}/>
      <input value={q.name} onChange={e=>upd("name",e.target.value)} placeholder="クエスト名" style={S.modalInput}/>
    </div>
    <div style={{display:"flex",gap:8}}>
      <select value={q.category} onChange={e=>upd("category",e.target.value)} style={S.settingSelect}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
      <select value={q.type} onChange={e=>upd("type",e.target.value)} style={S.settingSelect}>
        <option value="daily">毎日</option><option value="pages">ページ数</option><option value="once">特別</option>
      </select>
    </div>
    {q.type==="pages"
      ?<div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{color:"#ccc",fontSize:13}}>1ページ =</span><input type="number" inputMode="numeric" value={q.pointsPerPage||1} min="1" onChange={e=>upd("pointsPerPage",Number(e.target.value))} style={{...S.modalInput,width:80}}/><span style={{color:"#ccc"}}>pt</span></div>
      :<div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{color:"#ccc",fontSize:13}}>ポイント</span><input type="number" inputMode="numeric" value={q.points} min="0" onChange={e=>upd("points",Number(e.target.value))} style={{...S.modalInput,width:80}}/><span style={{color:"#ccc"}}>pt</span></div>}
  </Modal>);}

function PinModal({onSuccess,onClose}){
  const [pin,setPin]=useState("");
  return(<Modal onClose={onClose} title="🔑 PIN入力">
    <p style={{color:"#aaa",fontSize:13,marginBottom:8}}>PINコードを入力（初期値: 1234）</p>
    <input type="password" value={pin} onChange={e=>setPin(e.target.value)} style={S.modalInput}/>
    <button style={S.modalConfirm} onClick={()=>pin==="1234"?onSuccess():alert("PINが違います")}>確認</button>
  </Modal>);}

// ════════════════════════════════════════════════════════════
// スタイル定義
// ════════════════════════════════════════════════════════════
const S = {
  // ── レイアウト ──────────────────────────────────────────
  app:{
    display:"flex",flexDirection:"column",
    height:"100dvh",
    background:"#0f1117",
    color:"#f0f0f0",
    fontFamily:"'Hiragino Kaku Gothic Pro','Noto Sans JP','YuGothic',sans-serif",
    maxWidth:520,margin:"0 auto",
    paddingTop:"env(safe-area-inset-top)",
    paddingBottom:"env(safe-area-inset-bottom)",
    overflow:"hidden",
  },
  header:{
    background:"linear-gradient(135deg,#1a1a3e 0%,#16213e 100%)",
    borderBottom:"1px solid #2a2a5a",
    paddingLeft:"max(12px,env(safe-area-inset-left))",
    paddingRight:"max(12px,env(safe-area-inset-right))",
    paddingTop:8,paddingBottom:8,
    flexShrink:0,
  },
  headerTop:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6},
  appTitle:{fontSize:16,fontWeight:900,color:"#9fa8da",letterSpacing:0.5},
  dateText:{fontSize:13,color:"#9fa8da",fontWeight:700},
  syncBadge:{fontSize:14,opacity:0.85,cursor:"default",userSelect:"none"},
  addChildBtn:{
    background:"#7986cb",color:"#fff",border:"none",
    borderRadius:20,width:28,height:28,fontSize:18,lineHeight:"28px",
    cursor:"pointer",flexShrink:0,
  },
  childTabs:{display:"flex",gap:6,overflowX:"auto"},
  childTab:{
    background:"#1e2740",color:"#9fa8da",border:"1px solid #2a3660",
    borderRadius:20,padding:"4px 14px",fontSize:13,fontWeight:600,
    cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
  },
  childTabActive:{background:"#7986cb",color:"#fff",borderColor:"#7986cb"},

  // ── ポイントバナー ────────────────────────────────────
  pointBanner:{
    display:"flex",alignItems:"center",gap:10,
    background:"linear-gradient(90deg,#1a1a3e,#1e2a4a)",
    borderBottom:"1px solid #2a2a5a",
    padding:"8px max(12px,env(safe-area-inset-left))",
    flexShrink:0,position:"relative",
  },
  pointBannerLeft:{display:"flex",flexDirection:"column",gap:1},
  pointBannerRight:{display:"flex",alignItems:"baseline",gap:4,marginLeft:"auto"},
  pointMonth:{fontSize:10,color:"#7986cb",fontWeight:700},
  pointLabel:{fontSize:10,color:"#888"},
  pointValue:{fontSize:32,fontWeight:900,color:"#7986cb",lineHeight:1},
  pointUnit:{fontSize:13,color:"#9fa8da"},
  pointYen:{fontSize:12,color:"#ffd600",fontWeight:700},
  freeExpBadge:{
    background:"linear-gradient(135deg,#7e57c2,#7986cb)",
    color:"#fff",border:"none",borderRadius:20,
    padding:"4px 10px",fontSize:12,fontWeight:700,
    cursor:"pointer",animation:"fadeIn 0.3s ease",
    flexShrink:0,
  },

  // ── メイン・スクロールエリア ──────────────────────────
  main:{flex:1,overflow:"hidden",position:"relative"},
  scrollArea:{
    height:"100%",overflowY:"auto",
    padding:"10px max(12px,env(safe-area-inset-left)) 12px",
    display:"flex",flexDirection:"column",gap:8,
  },

  // ── ボトムナビ ────────────────────────────────────────
  bottomNav:{
    display:"flex",background:"#13151f",
    borderTop:"1px solid #1e2740",
    paddingBottom:"max(8px,env(safe-area-inset-bottom))",
    paddingLeft:"env(safe-area-inset-left)",
    paddingRight:"env(safe-area-inset-right)",
    flexShrink:0,
  },
  navBtn:{
    flex:1,display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",
    padding:"8px 4px 4px",background:"none",border:"none",
    color:"#4a5270",cursor:"pointer",gap:2,minWidth:0,
  },
  navBtnActive:{color:"#7986cb"},
  navIcon:{fontSize:20,display:"block"},
  navLabel:{fontSize:9,fontWeight:700,letterSpacing:0.3},
  navBadge:{
    position:"absolute",top:-1,right:-3,
    width:8,height:8,borderRadius:"50%",
    background:"#ff5252",border:"1.5px solid #13151f",
    display:"block",
  },

  // ── クエスト ─────────────────────────────────────────
  categorySection:{display:"flex",flexDirection:"column",gap:6},
  categoryTitle:{
    fontSize:11,fontWeight:800,color:"#7986cb",
    letterSpacing:1.5,textTransform:"uppercase",
    padding:"4px 0 2px",borderBottom:"1px solid #1e2740",
  },
  questCard:{
    display:"flex",alignItems:"center",gap:10,
    background:"#1a1f30",borderRadius:12,
    padding:"10px 12px",
    boxShadow:"0 2px 8px rgba(0,0,0,0.3)",
    transition:"background 0.2s",
  },
  questCardCleared:{background:"#141b28"},
  questIcon:{fontSize:22,flexShrink:0,width:32,textAlign:"center"},
  questInfo:{flex:1,minWidth:0},
  questName:{fontSize:14,fontWeight:700,color:"#e8eaf6",marginBottom:2},
  questMeta:{display:"flex",gap:8,alignItems:"center"},
  questPts:{fontSize:12,color:"#7986cb",fontWeight:700},
  questDone:{fontSize:11,color:"#66bb6a",fontWeight:700},
  questCheck:{
    width:28,height:28,borderRadius:"50%",
    border:"2px solid #2a3660",background:"#0f1117",
    display:"flex",alignItems:"center",justifyContent:"center",
    fontSize:14,color:"#66bb6a",fontWeight:900,flexShrink:0,
  },
  questCheckDone:{background:"#1b3a2a",borderColor:"#66bb6a"},
  pageInputArea:{display:"flex",gap:4,alignItems:"center",flexShrink:0},
  pageInput:{
    width:56,background:"#0f1117",border:"1px solid #2a3660",
    borderRadius:8,color:"#f0f0f0",fontSize:16,
    padding:"4px 6px",textAlign:"center",outline:"none",
  },
  pageBtn:{
    background:"#7986cb",color:"#fff",border:"none",
    borderRadius:8,width:28,height:28,fontSize:18,
    cursor:"pointer",fontWeight:900,
  },
  specialBtn:{
    background:"linear-gradient(135deg,#7e57c2,#5c6bc0)",
    color:"#fff",border:"none",borderRadius:14,
    padding:"12px 20px",fontSize:14,fontWeight:700,
    cursor:"pointer",textAlign:"center",
  },

  // ── モンスター画面 ────────────────────────────────────
  monsterCard:{
    background:"linear-gradient(135deg,#1a1f30,#16213e)",
    border:"1px solid #2a2a5a",borderRadius:18,
    padding:16,display:"flex",flexDirection:"column",
    alignItems:"center",gap:8,
  },
  typeChip:{
    display:"inline-block",borderRadius:10,
    padding:"2px 8px",fontSize:10,fontWeight:700,color:"#fff",
  },
  changeMonBtn:{
    background:"#1e2740",color:"#9fa8da",
    border:"1px solid #2a3660",borderRadius:20,
    padding:"4px 12px",fontSize:12,fontWeight:700,cursor:"pointer",
  },
  levelBadge:{
    background:"rgba(121,134,203,0.18)",borderRadius:20,
    padding:"4px 14px",fontSize:14,color:"#c5cae9",
  },
  monsterDesc:{fontSize:12,color:"#9fa8da",textAlign:"center",lineHeight:1.7},
  progressSection:{width:"100%"},
  progressLabel:{
    display:"flex",justifyContent:"space-between",
    fontSize:11,color:"#888",marginBottom:5,
  },
  progressBar:{
    height:8,background:"#1a1f30",borderRadius:4,overflow:"hidden",
    border:"1px solid #2a3660",
  },
  progressFill:{height:"100%",borderRadius:4,transition:"width 0.5s ease"},
  levelList:{width:"100%",display:"flex",flexDirection:"column",gap:3,marginTop:4},
  levelItem:{
    display:"flex",justifyContent:"space-between",alignItems:"center",
    background:"#0f1117",borderRadius:8,padding:"5px 10px",
    fontSize:12,color:"#666",
  },
  levelItemActive:{background:"#1e2740",color:"#c5cae9",fontWeight:700},
  levelItemDone:{color:"#4a5e4a"},

  // ── 経験値配布パネル ──────────────────────────────────
  expPanel:{
    background:"#1a1f30",border:"1px solid #2a2a5a",
    borderRadius:14,padding:14,
    display:"flex",flexDirection:"column",gap:8,
  },
  expPanelTitle:{fontSize:14,fontWeight:800,color:"#c5cae9"},
  expPanelFree:{fontSize:13,color:"#9fa8da"},
  expInput:{
    flex:1,background:"#0f1117",border:"1px solid #2a3660",
    borderRadius:8,color:"#f0f0f0",fontSize:16,
    padding:"6px 10px",outline:"none",minWidth:0,
  },
  expBtn:{
    background:"#7986cb",color:"#fff",border:"none",
    borderRadius:10,padding:"6px 14px",fontSize:13,
    fontWeight:700,cursor:"pointer",flexShrink:0,
  },

  // ── 図鑑 ─────────────────────────────────────────────
  sectionTitle:{fontSize:16,fontWeight:900,color:"#9fa8da",marginBottom:2},
  sectionSub:{fontSize:12,color:"#555",marginBottom:8},
  encGrid:{
    display:"grid",gridTemplateColumns:"repeat(4,1fr)",
    gap:6,
  },
  encCard:{
    background:"#1a1f30",border:"2px solid transparent",
    borderRadius:12,padding:"8px 4px",
    display:"flex",flexDirection:"column",alignItems:"center",gap:3,
    cursor:"pointer",
  },
  encCardLocked:{background:"#111318"},
  encDetail:{
    background:"#1a1f30",border:"1px solid #2a2a5a",
    borderRadius:14,padding:14,marginTop:4,
    animation:"fadeIn 0.25s ease",
  },

  // ── 記録 ─────────────────────────────────────────────
  recordCard:{
    background:"#1a1f30",border:"1px solid #1e2740",
    borderRadius:12,padding:"12px 14px",
  },
  recordMonth:{fontSize:13,fontWeight:700,color:"#9fa8da",marginBottom:8},
  recordStats:{display:"flex",gap:16},
  recordStat:{display:"flex",alignItems:"baseline",gap:4},
  recordNum:{fontSize:26,fontWeight:900,color:"#7986cb"},
  recordLbl:{fontSize:12,color:"#666"},

  // ── 設定 ─────────────────────────────────────────────
  lockScreen:{
    display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",
    height:"100%",gap:12,padding:20,
  },
  unlockBtn:{
    background:"linear-gradient(135deg,#7986cb,#5c6bc0)",
    color:"#fff",border:"none",borderRadius:14,
    padding:"12px 28px",fontSize:16,fontWeight:700,cursor:"pointer",
  },
  settingSection:{
    background:"#1a1f30",border:"1px solid #1e2740",
    borderRadius:14,padding:14,
    display:"flex",flexDirection:"column",gap:8,
  },
  settingH:{fontSize:13,fontWeight:800,color:"#9fa8da",marginBottom:2},
  settingRow:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"},
  settingInput:{
    flex:1,background:"#0f1117",border:"1px solid #2a3660",
    borderRadius:8,color:"#f0f0f0",fontSize:16,
    padding:"8px 10px",outline:"none",minWidth:0,
  },
  settingSelect:{
    flex:1,background:"#0f1117",border:"1px solid #2a3660",
    borderRadius:8,color:"#f0f0f0",fontSize:14,
    padding:"8px 10px",outline:"none",minWidth:0,cursor:"pointer",
  },
  addBtn:{
    background:"linear-gradient(135deg,#7986cb,#5c6bc0)",
    color:"#fff",border:"none",borderRadius:10,
    padding:"10px 18px",fontSize:14,fontWeight:700,cursor:"pointer",
  },
  sqRow:{
    display:"flex",gap:6,alignItems:"center",
    background:"#0f1117",borderRadius:8,overflow:"hidden",
  },
  reorderBtns:{display:"flex",flexDirection:"column"},
  reorderBtn:{
    background:"none",border:"none",color:"#4a5270",
    fontSize:10,lineHeight:"14px",cursor:"pointer",padding:"0 4px",
  },
  sqInfo:{
    flex:1,display:"flex",alignItems:"center",gap:8,
    background:"none",border:"none",padding:"8px 4px",cursor:"pointer",
    minWidth:0,
  },
  deleteBtn:{
    background:"none",border:"none",color:"#e57373",
    fontSize:16,padding:"8px 10px",cursor:"pointer",flexShrink:0,
  },

  // ── ウェルカム画面 ────────────────────────────────────
  welcomeScreen:{
    display:"flex",alignItems:"flex-start",justifyContent:"center",
    minHeight:"100dvh",background:"#0f1117",
    padding:"20px max(16px,env(safe-area-inset-left)) 40px",
    overflowY:"auto",
  },
  welcomeCard:{
    background:"#1a1f30",border:"1px solid #2a2a5a",
    borderRadius:20,padding:24,
    width:"100%",maxWidth:380,
    display:"flex",flexDirection:"column",gap:10,
    animation:"popIn 0.35s cubic-bezier(.34,1.56,.64,1)",
  },
  welcomeTitle:{fontSize:20,fontWeight:900,color:"#9fa8da",textAlign:"center",marginBottom:4},
  welcomeInput:{
    width:"100%",background:"#0f1117",border:"1px solid #2a3660",
    borderRadius:10,color:"#f0f0f0",fontSize:16,
    padding:"10px 12px",outline:"none",marginBottom:4,
  },
  monSelectGrid:{
    display:"grid",gridTemplateColumns:"repeat(5,1fr)",
    gap:5,maxHeight:320,overflowY:"auto",
  },
  monSelectBtn:{
    background:"#0f1117",border:"2px solid transparent",
    borderRadius:10,padding:"6px 2px",
    display:"flex",flexDirection:"column",alignItems:"center",gap:3,
    cursor:"pointer",transition:"border-color 0.15s",
  },
  startBtn:{
    background:"linear-gradient(135deg,#7986cb,#5c6bc0)",
    color:"#fff",border:"none",borderRadius:14,
    padding:"13px",fontSize:16,fontWeight:800,
    cursor:"pointer",marginTop:6,
  },

  // ── モーダル ─────────────────────────────────────────
  modalOverlay:{
    position:"fixed",inset:0,
    background:"rgba(0,0,0,0.75)",
    display:"flex",alignItems:"flex-end",justifyContent:"center",
    zIndex:1000,animation:"fadeIn 0.15s ease",
    paddingBottom:"calc(65px + env(safe-area-inset-bottom))",
  },
  modalContent:{
    background:"#1a1f30",borderRadius:"20px 20px 0 0",
    padding:"20px max(16px,env(safe-area-inset-left))",
    width:"100%",maxWidth:520,
    maxHeight:"80vh",overflowY:"hidden",
    display:"flex",flexDirection:"column",gap:10,
    animation:"popIn 0.25s cubic-bezier(.34,1.56,.64,1)",
  },
  modalClose:{
    background:"none",border:"none",color:"#666",
    fontSize:18,cursor:"pointer",padding:"0 4px",
  },
  modalInput:{
    width:"100%",background:"#0f1117",border:"1px solid #2a3660",
    borderRadius:8,color:"#f0f0f0",fontSize:16,
    padding:"8px 10px",outline:"none",
  },
  modalConfirm:{
    width:"100%",background:"linear-gradient(135deg,#7986cb,#5c6bc0)",
    color:"#fff",border:"none",borderRadius:12,
    padding:"12px",fontSize:16,fontWeight:700,cursor:"pointer",marginTop:4,
  },
  presetBtn:{
    background:"#1e2740",color:"#e8eaf6",border:"1px solid #2a3660",
    borderRadius:10,padding:"10px 14px",fontSize:14,
    cursor:"pointer",textAlign:"left",fontWeight:600,
  },

  // ── トースト ─────────────────────────────────────────
  toast:{
    position:"fixed",bottom:"calc(64px + env(safe-area-inset-bottom) + 8px)",
    left:"50%",transform:"translateX(-50%)",
    background:"#2a3060",color:"#e8eaf6",
    borderRadius:24,padding:"10px 20px",
    fontSize:13,fontWeight:700,
    boxShadow:"0 4px 20px rgba(0,0,0,0.5)",
    zIndex:2000,whiteSpace:"nowrap",
    animation:"fadeIn 0.2s ease",pointerEvents:"none",
  },
};

// ※ export default は関数定義時に記載済みのため省略
