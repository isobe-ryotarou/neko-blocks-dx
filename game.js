(() => {
'use strict';

const CFG = {
  width: 520,
  height: 760,
  cols: 10,
  rows: 20,
  cell: 30,
  boardY: 82,

  baseFallMs: 690,
  minFallMs: 120,
  softDropMs: 42,

  dasMs: 130,
  arrMs: 40,

  lockDelayMs: 420,
  maxLockResets: 12,

  dogChance: 0.12
};

const COLORS=[0xe76f91,0xf2c94c,0x5cc58a,0x56a3e6,0x9b7be6,0xef9a52,0x58c5d1];
const SHAPES=[
  [[1,1,1],[0,1,0]],     // T
  [[1,1],[1,1]],         // O
  [[1,1,0],[0,1,1]],     // S
  [[0,1,1],[1,1,0]],     // Z
  [[1,1,1,1]],           // I
  [[1,0,0],[1,1,1]],     // L
  [[0,0,1],[1,1,1]]      // J
];
const WEIGHTS=[13.45,13.45,13.45,13.45,19.30,13.45,13.45];
const STAGE_BACKGROUNDS=[
  0xf1f5f7, // 1
  0xdde6ea, // 2
  0xc9d4da, // 3
  0xb4c1c8, // 4
  0x99a9b1, // 5
  0x7f9099, // 6
  0x65747d, // 7
  0x48545c, // 8
  0x293239, // 9
  0x000000  // 10
];

const STAGE_CLEAR_MESSAGES=[
  '',
  '達人','天才','神域','怪物','無双','伝説','覚醒','極限','王者','制覇'
];



// Each stage has its own public-domain melody motif.
// score items are [frequency, beats]. 0 means rest.
const STAGE_MUSIC=[
  null,
  {
    name:'歓喜の歌 - NEKO RUSH MIX', bpm:156,
    score:[
      [329.63,.5],[329.63,.5],[349.23,.5],[392.00,.5],
      [392.00,.5],[349.23,.5],[329.63,.5],[293.66,.5],
      [261.63,.5],[261.63,.5],[293.66,.5],[329.63,.5],
      [329.63,.75],[293.66,.25],[293.66,1],
      [329.63,.5],[329.63,.5],[349.23,.5],[392.00,.5],
      [392.00,.5],[349.23,.5],[329.63,.5],[293.66,.5],
      [261.63,.5],[261.63,.5],[293.66,.5],[329.63,.5],
      [293.66,.75],[261.63,.25],[261.63,1]
    ]
  },
  {
    name:'アイネ・クライネ・ナハトムジーク', bpm:160,
    score:[
      [392.00,.25],[0,.12],[392.00,.13],[587.33,.38],[392.00,.12],
      [783.99,.5],[587.33,.25],[783.99,.25],[587.33,.25],[783.99,.25],
      [493.88,.38],[587.33,.12],[523.25,.25],[440.00,.25],
      [523.25,.25],[440.00,.25],[392.00,.5],[587.33,.25],[783.99,.5]
    ]
  },
  {
    name:'トルコ行進曲', bpm:164,
    score:[
      [493.88,.25],[523.25,.25],[587.33,.25],[659.25,.25],
      [698.46,.25],[659.25,.25],[587.33,.25],[554.37,.25],
      [587.33,.25],[659.25,.25],[587.33,.25],[523.25,.25],
      [493.88,.5],[523.25,.25],[587.33,.25],[659.25,.25],
      [698.46,.25],[783.99,.25],[698.46,.25],[659.25,.25],
      [587.33,.25],[554.37,.25],[523.25,.25],[493.88,.5]
    ]
  },
  {
    name:'カンカン', bpm:168,
    score:[
      [523.25,.25],[587.33,.25],[659.25,.25],[698.46,.25],
      [783.99,.25],[783.99,.25],[698.46,.25],[659.25,.25],
      [587.33,.25],[523.25,.25],[523.25,.25],[587.33,.25],
      [659.25,.25],[698.46,.25],[783.99,.25],[880.00,.25],
      [783.99,.25],[698.46,.25],[659.25,.25],[587.33,.25]
    ]
  },
  {
    name:'ウィリアム・テル序曲', bpm:172,
    score:[
      [659.25,.20],[659.25,.20],[659.25,.20],[523.25,.20],
      [659.25,.20],[783.99,.20],[659.25,.20],[523.25,.20],
      [659.25,.20],[783.99,.20],[880.00,.20],[783.99,.20],
      [659.25,.20],[587.33,.20],[523.25,.20],[659.25,.20],
      [783.99,.20],[880.00,.20],[987.77,.20],[880.00,.20]
    ]
  },
  {
    name:'ハンガリー舞曲第5番', bpm:168,
    score:[
      [587.33,.25],[698.46,.25],[783.99,.25],[698.46,.25],
      [659.25,.25],[587.33,.25],[554.37,.25],[587.33,.25],
      [659.25,.25],[698.46,.25],[659.25,.25],[587.33,.25],
      [523.25,.38],[587.33,.12],[659.25,.25],[698.46,.25],
      [783.99,.25],[880.00,.25],[783.99,.25],[698.46,.25]
    ]
  },
  {
    name:'熊蜂の飛行', bpm:176,
    score:[
      [659.25,.125],[622.25,.125],[587.33,.125],[554.37,.125],
      [523.25,.125],[493.88,.125],[466.16,.125],[440.00,.125],
      [466.16,.125],[493.88,.125],[523.25,.125],[554.37,.125],
      [587.33,.125],[622.25,.125],[659.25,.125],[698.46,.125],
      [739.99,.125],[698.46,.125],[659.25,.125],[622.25,.125],
      [587.33,.125],[554.37,.125],[523.25,.125],[493.88,.125]
    ]
  },
  {
    name:'山の魔王の宮殿にて', bpm:174,
    score:[
      [293.66,.25],[329.63,.25],[349.23,.25],[392.00,.25],
      [349.23,.25],[329.63,.25],[311.13,.25],[293.66,.25],
      [329.63,.25],[349.23,.25],[369.99,.25],[415.30,.25],
      [369.99,.25],[349.23,.25],[329.63,.25],[311.13,.25],
      [293.66,.25],[329.63,.25],[349.23,.25],[392.00,.25]
    ]
  },
  {
    name:'運命', bpm:166,
    score:[
      [392.00,.18],[392.00,.18],[392.00,.18],[311.13,.72],
      [0,.10],
      [349.23,.18],[349.23,.18],[349.23,.18],[293.66,.72],
      [0,.10],
      [392.00,.18],[392.00,.18],[392.00,.18],[311.13,.72],
      [415.30,.18],[415.30,.18],[415.30,.18],[349.23,.72]
    ]
  },
  {
    name:'熊蜂の飛行 - FINAL RUSH', bpm:188,
    score:[
      [783.99,.10],[739.99,.10],[698.46,.10],[659.25,.10],
      [622.25,.10],[587.33,.10],[554.37,.10],[523.25,.10],
      [493.88,.10],[466.16,.10],[440.00,.10],[415.30,.10],
      [392.00,.10],[415.30,.10],[440.00,.10],[466.16,.10],
      [493.88,.10],[523.25,.10],[554.37,.10],[587.33,.10],
      [622.25,.10],[659.25,.10],[698.46,.10],[739.99,.10]
    ]
  }
];



const Store={
  best(){
    try{return Math.max(0,Number(localStorage.getItem('neko_dx3_best'))||0)}
    catch{return 0}
  },
  setBest(v){
    try{localStorage.setItem('neko_dx3_best',String(Math.max(0,v|0)))}catch{}
  }
};

function setControlsVisible(visible){
  document.getElementById('controls').style.display=visible?'block':'none';
}

function cloneShape(s){return s.map(r=>r.slice())}
function rotateCW(s){return s[0].map((_,i)=>s.map(r=>r[i]).reverse())}

class AudioEngine{
  constructor(){
    this.ctx=null;
    this.master=null;
    this.music=null;
    this.sfx=null;
    this.comp=null;
    this.rev=null;
    this.bgmTimer=null;
    this.bgmStep=0;
    this.wantBgm=false;
    this.musicStage=1;
    this.odeIndex=0;
    this.bgmMode='';
  }

  ensure(){
    if(!this.ctx){
      const A=window.AudioContext||window.webkitAudioContext;
      if(!A)return;
      this.ctx=new A();

      this.master=this.ctx.createGain();
      this.master.gain.value=1.20;

      this.music=this.ctx.createGain();
      this.music.gain.value=.92;

      this.sfx=this.ctx.createGain();
      this.sfx.gain.value=1.18;

      this.comp=this.ctx.createDynamicsCompressor();
      this.comp.threshold.value=-24;
      this.comp.knee.value=16;
      this.comp.ratio.value=4.5;
      this.comp.attack.value=.008;
      this.comp.release.value=.22;

      this.rev=this.ctx.createConvolver();
      const len=(this.ctx.sampleRate*1.2)|0;
      const impulse=this.ctx.createBuffer(2,len,this.ctx.sampleRate);
      for(let ch=0;ch<2;ch++){
        const d=impulse.getChannelData(ch);
        for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.8)*.22;
      }
      this.rev.buffer=impulse;

      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.rev.connect(this.master);
      this.master.connect(this.comp);
      this.comp.connect(this.ctx.destination);
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
  }

  tone(freq,dur=.14,delay=0,vol=.015,type='triangle',dest='sfx',slide=1,wet=.08){
    if(!this.ctx)return;
    const t=this.ctx.currentTime+delay;
    const o=this.ctx.createOscillator();
    const g=this.ctx.createGain();
    const dry=this.ctx.createGain();
    const wg=this.ctx.createGain();
    o.type=type;
    o.frequency.setValueAtTime(freq,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*slide),t+dur);
    g.gain.setValueAtTime(.0001,t);
    g.gain.linearRampToValueAtTime(vol,t+.012);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    dry.gain.value=.9;
    wg.gain.value=wet;
    o.connect(g);
    g.connect(dry);dry.connect(dest==='music'?this.music:this.sfx);
    g.connect(wg);wg.connect(this.rev);
    o.start(t);o.stop(t+dur+.03);
  }

  noise(dur=.08,vol=.02,band=1600,dest='sfx'){
    if(!this.ctx)return;
    const n=Math.floor(this.ctx.sampleRate*dur);
    const b=this.ctx.createBuffer(1,n,this.ctx.sampleRate);
    const d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
    const src=this.ctx.createBufferSource();
    const f=this.ctx.createBiquadFilter();
    const g=this.ctx.createGain();
    f.type='bandpass';f.frequency.value=band;f.Q.value=.8;
    g.gain.value=vol;
    src.buffer=b;src.connect(f);f.connect(g);g.connect(dest==='music'?this.music:this.sfx);src.start();
  }

  popKick(delay=0,vol=.017){
    if(!this.ctx)return;
    const t=this.ctx.currentTime+delay;
    const o=this.ctx.createOscillator();
    const g=this.ctx.createGain();
    o.type='sine';
    o.frequency.setValueAtTime(150,t);
    o.frequency.exponentialRampToValueAtTime(52,t+.11);
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(.0001,t+.13);
    o.connect(g);g.connect(this.music);o.start(t);o.stop(t+.14);
  }

  popHat(delay=0,vol=.004){
    this.noise(.035,vol,4700,'music');
  }

  move(){this.ensure();this.tone(260,.04,0,.0055,'square','sfx',1.04,.02)}
  rotate(){this.ensure();this.tone(430,.055,0,.007,'triangle','sfx',1.11,.03);this.tone(680,.035,.015,.003,'sine','sfx',1.02,.02)}
  drop(){this.ensure();this.tone(145,.09,0,.020,'sine','sfx',.72,.05);this.tone(78,.14,.018,.017,'triangle','sfx',.82,.07)}
  land(){this.ensure();this.tone(108,.10,0,.022,'sine','sfx',.74,.05);this.tone(185,.05,.012,.007,'triangle','sfx',.86,.03)}

  meow(){
    this.ensure();
    const q=[
      [390,610,520,.28],[470,720,580,.24],[330,540,450,.31],
      [560,760,650,.22],[420,650,500,.27],[610,820,690,.20]
    ][(Math.random()*6)|0];
    this.tone(q[0],q[3],0,.016,'sawtooth','sfx',q[2]/q[0],.06);
    this.tone(q[1],q[3]*.52,.035,.006,'sine','sfx',q[2]/q[1],.04);
  }

  bark(){
    this.ensure();
    this.tone(230,.11,0,.024,'sawtooth','sfx',.58,.03);
    this.tone(155,.09,.04,.017,'triangle','sfx',.76,.02);
    this.noise(.07,.013,720);
  }

  clearImpact(lines,combo){
    this.ensure();
    const p=Math.min(1,.64+lines*.1+Math.max(0,combo)*.03);
    this.tone(118,.17,0,.033*p,'sine','sfx',.46,.08);
    this.tone(900+lines*130,.11,.018,.017*p,'square','sfx',1.7,.06);
    this.noise(.18,.030*p,1800+lines*300);
    [523,659,784,1047].slice(0,Math.min(4,lines+1)).forEach((f,i)=>{
      this.tone(f,.19,.045+i*.032,.012*p,'triangle','sfx',1.015,.12);
    });
  }

  thunder(){
    this.ensure();
    // layered low-frequency rumble + crack
    this.tone(72,.55,0,.050,'sine','sfx',.42,.10);
    this.tone(48,.80,.03,.045,'triangle','sfx',.62,.14);
    this.tone(120,.20,0,.030,'square','sfx',.38,.05);
    this.noise(.30,.055,850);
    this.noise(.18,.040,2600);
    this.noise(.65,.025,320);
  }

  level(){
    this.ensure();
    [523,659,784,1047,1319].forEach((f,i)=>this.tone(f,.2,i*.06,.014,'triangle','sfx',1.01,.12));
  }

  gameOver(){
    this.stopBgm(true);
    this.ensure();
    [[392,.17,0],[330,.17,.17],[262,.2,.34],[220,.22,.54],[196,.44,.74]].forEach(n=>{
      this.tone(n[0],n[1],n[2],.02,'triangle','sfx',.965,.14);
    });
  }

  startBgm(stage=this.musicStage||1){
    this.wantBgm=true;
    this.musicStage=Math.max(1,Math.min(10,stage|0));
    if(this.bgmTimer)return;
    this.ensure();
    if(!this.ctx)return;

    this.bgmMode='score';
    this.playStageScoreNext();
  }

  playStageScoreNext(){
    if(!this.wantBgm)return;
    if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});

    const theme=STAGE_MUSIC[this.musicStage]||STAGE_MUSIC[1];
    const score=theme.score;
    const beatMs=(60000/theme.bpm)*0.85;
    const [freq,beats]=score[this.odeIndex%score.length];
    const noteMs=beatMs*beats;

    const idx=this.odeIndex%score.length;
    const bar=Math.floor(idx/4)%4;

    // stage-specific energy curve
    const energy=1+(this.musicStage-1)*.035;
    const roots=[130.81,110.00,123.47,98.00];
    const thirds=[164.81,138.59,146.83,123.47];
    const fifths=[196.00,164.81,185.00,146.83];

    if(freq>0){
      // melody is deliberately loud and doubled
      this.tone(freq,Math.max(.080,noteMs/1000*.92),0,.0135*energy,'triangle','music',1,.13);
      this.tone(freq*2,Math.max(.055,noteMs/1000*.76),.010,.0032*energy,'sine','music',1,.08);
    }

    // chord/bass pulse every 4 score events
    if(idx%4===0){
      this.tone(roots[bar],Math.max(.12,noteMs/1000*.9),0,.0048*energy,'triangle','music',1,.10);
      this.tone(thirds[bar]*2,.16,.006,.0020*energy,'sine','music',1,.07);
      this.tone(fifths[bar]*2,.16,.012,.0019*energy,'sine','music',1,.07);
      this.popKick(0,.019*energy);
    }else if(idx%2===0){
      this.popKick(0,.011*energy);
    }

    this.popHat(0,.0038*energy);

    this.odeIndex=(this.odeIndex+1)%score.length;
    this.bgmTimer=setTimeout(()=>{
      this.bgmTimer=null;
      this.playStageScoreNext();
    },Math.max(70,noteMs));
  }

  setStageMusic(stage){
    const next=Math.max(1,Math.min(10,stage|0));
    if(this.musicStage===next&&this.bgmTimer)return;
    const shouldResume=this.wantBgm;
    this.stopBgm(false);
    this.musicStage=next;
    this.bgmStep=0;
    this.odeIndex=0;
    if(shouldResume)this.startBgm(next);
  }

  stopBgm(permanent=true){
    if(permanent)this.wantBgm=false;
    if(this.bgmTimer){
      clearInterval(this.bgmTimer);
      clearTimeout(this.bgmTimer);
      this.bgmTimer=null;
    }
  }

  pauseBgm(){
    this.stopBgm(false);
  }

  resumeBgm(){
    if(!this.wantBgm)return;
    this.ensure();
    if(!this.bgmTimer)this.startBgm(this.musicStage);
  }
}
const AUDIO=new AudioEngine();

class PieceFactory{
  constructor(){this.lastKey='';this.streak=0}

  pickIndex(){
    let r=Math.random()*100;
    for(let i=0;i<WEIGHTS.length;i++){
      r-=WEIGHTS[i];
      if(r<0)return i;
    }
    return 4;
  }

  create(){
    for(let tries=0;tries<40;tries++){
      const idx=this.pickIndex();
      const dog=Math.random()<CFG.dogChance;
      const key=(dog?'D':'C')+idx;
      if(key===this.lastKey&&this.streak>=2)continue;
      if(key===this.lastKey)this.streak++;
      else{this.lastKey=key;this.streak=1}
      return {idx,dog,shape:cloneShape(SHAPES[idx]),x:0,y:0};
    }
    const idx=this.pickIndex();
    return {idx,dog:false,shape:cloneShape(SHAPES[idx]),x:0,y:0};
  }
}

class Board{
  constructor(){
    this.grid=Array.from({length:CFG.rows},()=>Array(CFG.cols).fill(null));
  }

  collides(piece,dx=0,dy=0,shape=piece.shape){
    for(let y=0;y<shape.length;y++){
      for(let x=0;x<shape[y].length;x++){
        if(!shape[y][x])continue;
        const nx=piece.x+x+dx;
        const ny=piece.y+y+dy;
        if(nx<0||nx>=CFG.cols||ny>=CFG.rows)return true;
        if(ny>=0&&this.grid[ny][nx])return true;
      }
    }
    return false;
  }

  lock(piece){
    for(let y=0;y<piece.shape.length;y++){
      for(let x=0;x<piece.shape[y].length;x++){
        if(!piece.shape[y][x])continue;
        const bx=piece.x+x;
        const by=piece.y+y;
        if(by>=0&&by<CFG.rows&&bx>=0&&bx<CFG.cols){
          this.grid[by][bx]={idx:piece.idx,dog:piece.dog};
        }
      }
    }
  }

  fullRows(){
    const rows=[];
    for(let y=0;y<CFG.rows;y++){
      let full=true;
      for(let x=0;x<CFG.cols;x++){
        if(!this.grid[y][x]){full=false;break}
      }
      if(full)rows.push(y);
    }
    return rows;
  }

  removeRows(rows){
    const remove=new Set(rows);
    this.grid=this.grid.filter((_,y)=>!remove.has(y));
    while(this.grid.length<CFG.rows){
      this.grid.unshift(Array(CFG.cols).fill(null));
    }
  }

  ghostY(piece){
    let gy=piece.y;
    while(!this.collides({...piece,y:gy},0,1))gy++;
    return gy;
  }
}

class BootScene extends Phaser.Scene{
  constructor(){super('Boot')}

  create(){
    const g=this.add.graphics();

    COLORS.forEach((color,idx)=>{
      g.clear();
      g.fillStyle(color,1);
      g.fillRect(0,0,CFG.cell,CFG.cell);

      g.fillStyle(0x17212b,1);
      g.fillTriangle(4,9,10,0,16,9);
      g.fillTriangle(CFG.cell-16,9,CFG.cell-10,0,CFG.cell-4,9);
      g.fillCircle(10,14,1.5);
      g.fillCircle(20,14,1.5);
      g.fillTriangle(13,20,17,20,15,23);

      g.generateTexture('cat'+idx,CFG.cell,CFG.cell);
    });

    g.clear();
    g.fillStyle(0xc08b5b,1);
    g.fillRect(0,0,CFG.cell,CFG.cell);
    g.fillStyle(0x805632,1);
    g.fillTriangle(3,8,10,1,15,10);
    g.fillTriangle(CFG.cell-15,10,CFG.cell-10,1,CFG.cell-3,8);
    g.fillStyle(0x201812,1);
    g.fillCircle(10,14,1.6);
    g.fillCircle(20,14,1.6);
    g.fillCircle(15,21,1.8);
    g.generateTexture('dog',CFG.cell,CFG.cell);

    g.destroy();
    this.scene.start('Title');
  }
}

class TitleScene extends Phaser.Scene{
  constructor(){super('Title')}

  create(){
    setControlsVisible(false);
    this.cameras.main.setBackgroundColor('#eef3f7');

    const {width:w,height:h}=this.scale;
    this.add.text(w/2,h*.21,'NEKO BLOCKS DX 3.7',{
      fontSize:'39px',fontStyle:'bold',color:'#17212b',stroke:'#fff',strokeThickness:3
    }).setOrigin(.5);

    this.add.text(w/2,h*.285,'REBUILD EDITION',{
      fontSize:'14px',fontStyle:'bold',color:'#60707d'
    }).setOrigin(.5);

    const hero=this.add.image(w/2,h*.42,'cat4').setScale(2.2);
    this.tweens.add({
      targets:hero,y:hero.y-8,angle:{from:-2,to:2},
      duration:900,yoyo:true,repeat:-1,ease:'Sine.inOut'
    });

    this.add.text(w/2,h*.54,'ENDLESS PUZZLE',{
      fontSize:'20px',fontStyle:'bold',color:'#263642'
    }).setOrigin(.5);

    this.add.text(w/2,h*.59,'10ラインごとにLEVEL UP',{
      fontSize:'15px',color:'#566572'
    }).setOrigin(.5);

    const start=this.add.rectangle(w/2,h*.72,220,60,0xf0c86c)
      .setStrokeStyle(2,0x99752b)
      .setInteractive({useHandCursor:true});
    this.add.text(w/2,h*.72,'START',{
      fontSize:'22px',fontStyle:'bold',color:'#111820'
    }).setOrigin(.5);

    start.on('pointerdown',()=>{
      AUDIO.ensure();
      AUDIO.startBgm(1);
      this.scene.start('Game');
    });
  }
}

class GameScene extends Phaser.Scene{
  constructor(){super('Game')}

  create(){
    setControlsVisible(true);

    this.board=new Board();
    this.factory=new PieceFactory();

    this.score=0;
    this.lines=0;
    this.level=1;
    this.stage=1;
    this.lastClearedStage=0;
    this.combo=-1;
    this.best=Store.best();

    this.ended=false;
    this.paused=false;
    this.clearing=false;
    this.locking=false;

    this.fallTimer=0;
    this.lockTimer=0;
    this.lockResets=0;

    this.holdDir=0;
    this.dasTimer=0;
    this.arrTimer=0;
    this.downHeld=false;

    this.bw=CFG.cols*CFG.cell;
    this.bh=CFG.rows*CFG.cell;
    this.bx=Math.round(this.scale.width/2-this.bw/2);
    this.by=CFG.boardY;

    this.drawFrame();

    this.lockedLayer=this.add.container();
    this.ghostLayer=this.add.container();
    this.activeLayer=this.add.container();
    this.nextLayer=this.add.container();

    this.scoreT=this.add.text(12,12,'SCORE 0',{fontSize:'19px',fontStyle:'bold',color:'#111820'});
    this.linesT=this.add.text(12,38,'LINES 0',{fontSize:'15px',color:'#111820'});
    this.levelT=this.add.text(12,60,'LEVEL 1',{fontSize:'14px',fontStyle:'bold',color:'#55636f'});
    this.stageT=this.add.text(this.scale.width/2,34,'STAGE 1 / 10',{fontSize:'14px',fontStyle:'bold',color:'#45525d'}).setOrigin(.5,0);
    this.musicT=this.add.text(this.scale.width/2,54,'BGM: 歓喜の歌 - NEKO RUSH MIX',{fontSize:'11px',fontStyle:'bold',color:'#71808b'}).setOrigin(.5,0);

    this.bestT=this.add.text(this.scale.width-12,12,'BEST '+this.best,{
      fontSize:'14px',fontStyle:'bold',color:'#45525d'
    }).setOrigin(1,0);

    this.add.text(this.scale.width/2,12,'v3.7',{
      fontSize:'12px',fontStyle:'bold',color:'#7b8791'
    }).setOrigin(.5,0);

    this.add.text(this.scale.width-12,36,'NEXT',{
      fontSize:'13px',fontStyle:'bold',color:'#45525d'
    }).setOrigin(1,0);

    this.clearT=this.add.text(this.scale.width/2,this.by+170,'',{
      fontSize:'26px',fontStyle:'bold',color:'#fff',stroke:'#17212b',strokeThickness:5
    }).setOrigin(.5).setDepth(50).setAlpha(0);

    this.comboT=this.add.text(this.scale.width/2,this.by+225,'',{
      fontSize:'31px',fontStyle:'bold',color:'#fff',stroke:'#17212b',strokeThickness:5
    }).setOrigin(.5).setDepth(50).setAlpha(0);

    this.pauseT=this.add.text(this.scale.width/2,this.scale.height/2,'PAUSE',{
      fontSize:'44px',fontStyle:'bold',color:'#17212b',stroke:'#fff',strokeThickness:5
    }).setOrigin(.5).setDepth(70).setVisible(false);

    this.next=this.factory.create();
    this.applyStageTheme();
    this.spawn();

    this.bindKeyboard();
    this.bindButtons();

    this.events.once('shutdown',()=>this.unbindButtons());

    AUDIO.startBgm(this.currentStage());
  }

  drawFrame(){
    const g=this.add.graphics();

    g.fillStyle(0xffffff,.30);
    g.fillRect(this.bx,this.by,this.bw,this.bh);

    g.lineStyle(1,0x53697a,.16);
    for(let x=1;x<CFG.cols;x++){
      g.lineBetween(this.bx+x*CFG.cell,this.by,this.bx+x*CFG.cell,this.by+this.bh);
    }

    g.lineStyle(8,0x17212b,.97);
    g.lineBetween(this.bx-6,this.by-4,this.bx-6,this.by+this.bh+5);
    g.lineBetween(this.bx+this.bw+6,this.by-4,this.bx+this.bw+6,this.by+this.bh+5);

    g.lineStyle(2,0xffffff,.45);
    g.lineBetween(this.bx-1,this.by,this.bx-1,this.by+this.bh);
    g.lineBetween(this.bx+this.bw+1,this.by,this.bx+this.bw+1,this.by+this.bh);

    g.lineStyle(5,0x17212b,.92);
    g.lineBetween(this.bx-6,this.by+this.bh+5,this.bx+this.bw+6,this.by+this.bh+5);
  }

  currentStage(){
    return Math.min(10,Math.floor(this.lines/10)+1);
  }

  applyStageTheme(){
    this.stage=this.currentStage();
    AUDIO.setStageMusic(this.stage);
    const bg=STAGE_BACKGROUNDS[this.stage-1];
    this.cameras.main.setBackgroundColor(bg);

    const dark=this.stage>=7;
    this.scoreT.setColor(dark?'#ffffff':'#111820');
    this.linesT.setColor(dark?'#ffffff':'#111820');
    this.levelT.setColor(dark?'#e5edf2':'#55636f');
    this.stageT.setColor(dark?'#ffe082':'#45525d');
    this.bestT.setColor(dark?'#ffffff':'#45525d');
  }

  spawn(){
    this.piece=this.next;
    this.piece.x=Math.floor((CFG.cols-this.piece.shape[0].length)/2);
    this.piece.y=-1;

    this.next=this.factory.create();

    this.fallTimer=0;
    this.lockTimer=0;
    this.lockResets=0;
    this.locking=false;

    if(this.board.collides(this.piece,0,1)){
      this.gameOver();
      return;
    }

    this.redraw();
  }

  move(dx,playSound=true){
    if(this.paused||this.ended||this.clearing||this.locking||!this.piece)return;

    if(!this.board.collides(this.piece,dx,0)){
      this.piece.x+=dx;

      if(this.board.collides(this.piece,0,1)&&this.lockResets<CFG.maxLockResets){
        this.lockTimer=0;
        this.lockResets++;
      }

      if(playSound)AUDIO.move();
      this.redraw();
    }
  }

  rotate(){
    if(this.paused||this.ended||this.clearing||this.locking||!this.piece)return;

    const rotated=rotateCW(this.piece.shape);

    for(const kick of [0,-1,1,-2,2]){
      if(!this.board.collides(this.piece,kick,0,rotated)){
        this.piece.x+=kick;
        this.piece.shape=rotated;

        if(this.board.collides(this.piece,0,1)&&this.lockResets<CFG.maxLockResets){
          this.lockTimer=0;
          this.lockResets++;
        }

        AUDIO.rotate();
        this.redraw();
        return;
      }
    }
  }

  stepDown(manual=false){
    if(this.paused||this.ended||this.clearing||this.locking||!this.piece)return;

    if(!this.board.collides(this.piece,0,1)){
      this.piece.y++;
      this.lockTimer=0;
      if(manual)this.score++;
      this.updateHUD();
      this.redraw();
    }
  }

  hardDrop(){
    if(this.paused||this.ended||this.clearing||this.locking||!this.piece)return;

    this.locking=true;

    let cells=0;
    while(!this.board.collides(this.piece,0,1)&&cells<CFG.rows+4){
      this.piece.y++;
      cells++;
    }

    this.score+=cells*2;
    AUDIO.drop();
    this.dropTrail(cells);

    this.cameras.main.flash(50,255,255,255);
    this.cameras.main.shake(65,.0035);

    this.lockPiece();
  }

  lockPiece(){
    if(!this.piece){
      this.locking=false;
      return;
    }

    this.board.lock(this.piece);
    AUDIO.land();
    this.piece.dog?AUDIO.bark():AUDIO.meow();

    const rows=this.board.fullRows();

    if(rows.length){
      this.startClear(rows);
    }else{
      this.combo=-1;
      this.locking=false;
      this.spawn();
    }
  }

  startClear(rows){
    this.clearing=true;
    this.combo++;

    AUDIO.clearImpact(rows.length,this.combo);
    this.showClearLabel(rows.length);

    if(this.combo>0)this.showCombo();
    if(rows.length===4){this.lightningQuakeFX(rows);this.fourLineFX();}

    const overlays=[];

    for(const row of rows){
      this.rowFX(row,rows.length);

      for(let x=0;x<CFG.cols;x++){
        const cell=this.board.grid[row][x];
        if(!cell)continue;

        const key=cell.dog?'dog':'cat'+cell.idx;
        const sp=this.add.image(
          this.bx+x*CFG.cell+CFG.cell/2,
          this.by+row*CFG.cell+CFG.cell/2,
          key
        ).setDepth(40);
        if(this.currentStage()===10)sp.setTint(cell.dog?0xffd54f:0xffc928);

        overlays.push(sp);

        this.tweens.add({
          targets:sp,
          scaleX:1.22,
          scaleY:1.22,
          alpha:1,
          duration:90,
          ease:'Quad.easeOut',
          onComplete:()=>{
            this.tweens.add({
              targets:sp,
              scaleX:.16,
              scaleY:.16,
              alpha:0,
              duration:135,
              ease:'Back.easeIn',
              onComplete:()=>sp.destroy()
            });
          }
        });
      }
    }

    const base=[0,100,300,500,800][rows.length]||1000;
    this.score+=Math.round(base*(1+Math.max(0,this.combo)*.25)*this.level);

    const previousLevel=this.level;
    const previousStage=this.currentStage();
    this.lines+=rows.length;
    this.level=1+Math.floor(this.lines/10);

    const clearedStage=Math.min(10,Math.floor(this.lines/10));
    const stageJustCleared=clearedStage>this.lastClearedStage;
    if(stageJustCleared)this.lastClearedStage=clearedStage;

    this.updateHUD();

    // 先に盤面データを更新し、230ms後に描画と次ピースを進める
    this.board.removeRows(rows);

    this.piece=null;
    this.activeLayer.removeAll(true);
    this.ghostLayer.removeAll(true);

    if(this.level>previousLevel)this.levelUpFX();

    this.applyStageTheme();

    this.time.delayedCall(230,()=>{
      this.clearing=false;
      this.locking=false;
      this.redraw();

      if(stageJustCleared){
        this.showStageClearCutin(clearedStage);
      }

      if(clearedStage>=10){
        return;
      }

      if(!this.ended)this.spawn();
    });
  }

  showStageClearCutin(stageNumber){
    this.paused=true;

    const msg=STAGE_CLEAR_MESSAGES[stageNumber]||'制覇';
    const {width:w,height:h}=this.scale;

    const shade=this.add.rectangle(w/2,h/2,w,h,0x000000,.0).setDepth(90);
    const text=this.add.text(0,0,msg,{
      fontFamily:'Arial Black, "Noto Sans JP", sans-serif',
      fontSize:'150px',
      fontStyle:'bold',
      color:stageNumber===10?'#ffd54f':'#ffffff',
      stroke:'#000000',
      strokeThickness:12,
      shadow:{offsetX:10,offsetY:10,color:'#000000',blur:8,fill:true},
      padding:{left:24,right:24,top:18,bottom:18}
    }).setOrigin(.5).setDepth(92).setAlpha(0).setAngle(-12);

    const tail=this.add.rectangle(
      w+80,h+80,300,20,
      stageNumber===10?0xffd54f:0xffffff,.0
    ).setDepth(91).setAngle(-32);

    this.tweens.add({targets:shade,alpha:.30,duration:120,ease:'Linear'});

    const startX=w+text.width*.6;
    const startY=h+text.height*.35;
    const endX=-text.width*.65;
    const endY=-text.height*.45;

    text.setPosition(startX,startY).setAlpha(1);
    tail.setPosition(startX+120,startY+80).setAlpha(.46);

    this.tweens.add({
      targets:text,x:endX,y:endY,duration:2000,ease:'Linear'
    });
    this.tweens.add({
      targets:tail,x:endX+150,y:endY+110,alpha:0,scaleX:2.4,
      duration:2000,ease:'Linear'
    });

    this.time.delayedCall(2000,()=>{
      this.tweens.add({
        targets:shade,alpha:0,duration:140,
        onComplete:()=>{
          text.destroy();tail.destroy();shade.destroy();
          if(stageNumber===10)this.showMasterClear();
          else this.paused=false;
        }
      });
    });
  }

  showMasterClear(){
    const {width:w,height:h}=this.scale;
    this.paused=true;
    setControlsVisible(false);
    AUDIO.stopBgm(true);

    const shade=this.add.rectangle(w/2,h/2,w,h,0x000000,.86).setDepth(110);
    this.add.text(w/2,h*.38,'10 STAGES COMPLETE!',{
      fontSize:'36px',fontStyle:'bold',color:'#ffd54f',
      stroke:'#000000',strokeThickness:6
    }).setOrigin(.5).setDepth(111);

    this.add.text(w/2,h*.50,'100 LINE CLEAR\n完全制覇！',{
      fontSize:'24px',fontStyle:'bold',color:'#ffffff',
      align:'center',lineSpacing:8
    }).setOrigin(.5).setDepth(111);

    const retry=this.add.rectangle(w/2,h*.66,200,54,0xffd54f).setDepth(111).setInteractive();
    this.add.text(w/2,h*.66,'PLAY AGAIN',{
      fontSize:'18px',fontStyle:'bold',color:'#111820'
    }).setOrigin(.5).setDepth(112);

    retry.on('pointerdown',()=>{
      setControlsVisible(true);
      AUDIO.startBgm(1);
      this.scene.restart();
    });
  }

  showClearLabel(n){
    const labels={1:'SINGLE',2:'DOUBLE',3:'TRIPLE',4:'QUAD!'};
    this.clearT.setText(labels[n]||('CLEAR ×'+n)).setAlpha(1).setScale(.72).setY(this.by+175);
    this.tweens.killTweensOf(this.clearT);
    this.tweens.add({
      targets:this.clearT,
      scale:1.04,
      y:this.clearT.y-18,
      duration:150,
      ease:'Back.easeOut',
      hold:220,
      yoyo:true,
      onComplete:()=>this.clearT.setAlpha(0)
    });
  }

  showCombo(){
    this.comboT.setText('COMBO ×'+(this.combo+1)).setAlpha(1).setScale(.65).setY(this.by+235);
    this.tweens.killTweensOf(this.comboT);
    this.tweens.add({
      targets:this.comboT,
      scale:1.08,
      y:this.comboT.y-20,
      duration:180,
      ease:'Back.easeOut',
      hold:280,
      yoyo:true,
      onComplete:()=>this.comboT.setAlpha(0)
    });
  }

  rowFX(row,count){
    const cy=this.by+row*CFG.cell+CFG.cell/2;

    const beam=this.add.rectangle(
      this.bx+this.bw/2,cy,this.bw+14,CFG.cell-3,0xffffff,.82
    ).setDepth(34).setScale(.10,1);

    this.tweens.add({
      targets:beam,
      scaleX:1.10,
      alpha:0,
      duration:240,
      ease:'Cubic.easeOut',
      onComplete:()=>beam.destroy()
    });

    this.cameras.main.flash(120,255,245,205);
    this.cameras.main.shake(190,count===4?.014:.009);

    const total=count===4?150:92;

    for(let i=0;i<total;i++){
      const color=Phaser.Display.Color.HSVToRGB(Math.random(),.86,1).color;
      const dot=this.add.circle(
        this.bx+Math.random()*this.bw,
        cy+(Math.random()-.5)*CFG.cell,
        2+Math.random()*3.5,
        color
      ).setDepth(33);

      const a=Math.random()*Math.PI*2;
      const dist=35+Math.random()*(count===4?160:105);

      this.tweens.add({
        targets:dot,
        x:dot.x+Math.cos(a)*dist,
        y:dot.y+Math.sin(a)*dist,
        alpha:0,
        scale:.15,
        duration:330+Math.random()*360,
        ease:'Quad.easeOut',
        onComplete:()=>dot.destroy()
      });
    }

    const ring1=this.add.circle(this.bx+this.bw/2,cy,7)
      .setStrokeStyle(count===4?7:4,0xffe9a5,.98)
      .setDepth(32);

    this.tweens.add({
      targets:ring1,
      scaleX:24,
      scaleY:8,
      alpha:0,
      duration:360,
      onComplete:()=>ring1.destroy()
    });

    const ring2=this.add.circle(this.bx+this.bw/2,cy,5)
      .setStrokeStyle(3,0xffffff,.92)
      .setDepth(32);

    this.tweens.add({
      targets:ring2,
      scaleX:31,
      scaleY:10,
      alpha:0,
      duration:470,
      delay:55,
      onComplete:()=>ring2.destroy()
    });
  }

  lightningQuakeFX(rows){
    const {width:w,height:h}=this.scale;
    const targetRow=Math.max(...rows);
    const tx=this.bx+this.bw/2;
    const ty=this.by+targetRow*CFG.cell+CFG.cell/2;

    AUDIO.thunder();

    // Darken the scene very briefly before the flash.
    const storm=this.add.rectangle(w/2,h/2,w,h,0x071018,.0).setDepth(70);
    this.tweens.add({
      targets:storm,alpha:.52,duration:90,yoyo:true,hold:45,
      onComplete:()=>storm.destroy()
    });

    // Main quake + aftershocks.
    this.cameras.main.shake(240,.020);
    this.time.delayedCall(250,()=>this.cameras.main.shake(210,.013));
    this.time.delayedCall(500,()=>this.cameras.main.shake(260,.008));
    this.time.delayedCall(760,()=>this.cameras.main.shake(220,.004));

    // Bright flash on strike.
    this.time.delayedCall(65,()=>this.cameras.main.flash(150,255,255,255));

    // Build a jagged lightning path from above the board to impact point.
    const points=[];
    let x=tx+(Math.random()-.5)*80;
    let y=this.by-70;
    points.push({x,y});
    const segments=13;
    for(let i=1;i<segments;i++){
      const t=i/segments;
      x=Phaser.Math.Linear(x,tx,t*.20)+(Math.random()-.5)*46;
      y=Phaser.Math.Linear(this.by-70,ty,t);
      points.push({x,y});
    }
    points.push({x:tx,y:ty});

    const glow=this.add.graphics().setDepth(74);
    glow.lineStyle(16,0x8bdcff,.18);
    glow.beginPath();glow.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)glow.lineTo(points[i].x,points[i].y);
    glow.strokePath();

    const bolt=this.add.graphics().setDepth(75);
    bolt.lineStyle(5,0xdff8ff,1);
    bolt.beginPath();bolt.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)bolt.lineTo(points[i].x,points[i].y);
    bolt.strokePath();

    const core=this.add.graphics().setDepth(76);
    core.lineStyle(2,0xffffff,1);
    core.beginPath();core.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)core.lineTo(points[i].x,points[i].y);
    core.strokePath();

    // Branches.
    for(let b=3;b<points.length-2;b+=3){
      const p=points[b];
      const branch=this.add.graphics().setDepth(74);
      const dir=Math.random()<.5?-1:1;
      branch.lineStyle(2,0xbbeeff,.75);
      branch.beginPath();
      branch.moveTo(p.x,p.y);
      branch.lineTo(p.x+dir*(25+Math.random()*35),p.y+25+Math.random()*28);
      branch.lineTo(p.x+dir*(40+Math.random()*55),p.y+45+Math.random()*38);
      branch.strokePath();
      this.tweens.add({targets:branch,alpha:0,duration:230,delay:70,onComplete:()=>branch.destroy()});
    }

    // Impact bloom.
    const impact=this.add.circle(tx,ty,12,0xffffff,.95).setDepth(77);
    this.tweens.add({
      targets:impact,scale:8,alpha:0,duration:330,ease:'Quad.easeOut',
      onComplete:()=>impact.destroy()
    });

    for(let i=0;i<42;i++){
      const spark=this.add.circle(tx,ty,1.5+Math.random()*2.5,0xdff8ff,.95).setDepth(76);
      const a=Math.random()*Math.PI*2;
      const r=35+Math.random()*120;
      this.tweens.add({
        targets:spark,
        x:tx+Math.cos(a)*r,
        y:ty+Math.sin(a)*r*.55,
        alpha:0,
        duration:260+Math.random()*320,
        ease:'Quad.easeOut',
        onComplete:()=>spark.destroy()
      });
    }

    // Bolt flicker like a real multi-strike lightning channel.
    bolt.setAlpha(1);core.setAlpha(1);glow.setAlpha(1);
    this.time.delayedCall(70,()=>{bolt.setAlpha(.18);core.setAlpha(.25);});
    this.time.delayedCall(105,()=>{bolt.setAlpha(.95);core.setAlpha(1);});
    this.time.delayedCall(155,()=>{bolt.setAlpha(.12);core.setAlpha(.15);glow.setAlpha(.08);});
    this.time.delayedCall(210,()=>{
      bolt.destroy();core.destroy();glow.destroy();
    });
  }

  fourLineFX(){
    const t=this.add.text(this.scale.width/2,this.by+120,'4 LINES!',{
      fontSize:'40px',fontStyle:'bold',color:'#fff2a8',stroke:'#17212b',strokeThickness:6
    }).setOrigin(.5).setDepth(55).setScale(.55);

    this.cameras.main.flash(140,255,235,160);

    this.tweens.add({
      targets:t,
      scale:1.15,
      y:t.y-24,
      duration:220,
      ease:'Back.easeOut',
      hold:420,
      yoyo:true,
      onComplete:()=>t.destroy()
    });
  }

  levelUpFX(){
    AUDIO.level();

    const t=this.add.text(this.scale.width/2,this.by+145,'LEVEL '+this.level,{
      fontSize:'42px',fontStyle:'bold',color:'#fff',stroke:'#17212b',strokeThickness:6
    }).setOrigin(.5).setDepth(55).setScale(.6);

    this.cameras.main.flash(180,255,242,184);

    this.tweens.add({
      targets:t,
      scale:1.08,
      y:t.y-28,
      duration:260,
      ease:'Back.easeOut',
      hold:420,
      yoyo:true,
      onComplete:()=>t.destroy()
    });
  }

  dropTrail(cells){
    if(cells<2)return;

    const x=this.bx+(this.piece.x+this.piece.shape[0].length/2)*CFG.cell;
    const y=this.by+this.piece.y*CFG.cell;

    const trail=this.add.rectangle(
      x,y,
      Math.max(8,this.piece.shape[0].length*CFG.cell*.35),
      Math.min(190,cells*CFG.cell),
      0xffffff,.22
    ).setDepth(25);

    this.tweens.add({
      targets:trail,
      alpha:0,
      duration:120,
      onComplete:()=>trail.destroy()
    });
  }

  makeSprite(cell,x,y,alpha=1){
    const key=cell.dog?'dog':'cat'+cell.idx;
    const sp=this.add.image(
      this.bx+x*CFG.cell+CFG.cell/2,
      this.by+y*CFG.cell+CFG.cell/2,
      key
    ).setAlpha(alpha);

    if(this.currentStage()===10){
      sp.setTint(cell.dog?0xffd54f:0xffc928);
    }
    return sp;
  }

  redraw(){
    this.lockedLayer.removeAll(true);
    this.ghostLayer.removeAll(true);
    this.activeLayer.removeAll(true);
    this.nextLayer.removeAll(true);

    for(let y=0;y<CFG.rows;y++){
      for(let x=0;x<CFG.cols;x++){
        const cell=this.board.grid[y][x];
        if(cell)this.lockedLayer.add(this.makeSprite(cell,x,y,1));
      }
    }

    if(this.piece&&!this.ended&&!this.clearing){
      const gy=this.board.ghostY(this.piece);

      for(let y=0;y<this.piece.shape.length;y++){
        for(let x=0;x<this.piece.shape[y].length;x++){
          if(!this.piece.shape[y][x])continue;

          if(gy+y>=0){
            const sp=this.makeSprite(
              {idx:this.piece.idx,dog:false},
              this.piece.x+x,
              gy+y,
              .09
            ).setTint(0x5d7080);
            this.ghostLayer.add(sp);
          }

          if(this.piece.y+y>=0){
            this.activeLayer.add(
              this.makeSprite(this.piece,this.piece.x+x,this.piece.y+y,1)
            );
          }
        }
      }
    }

    const mini=18;
    const ox=this.scale.width-72;
    const oy=63;

    for(let y=0;y<this.next.shape.length;y++){
      for(let x=0;x<this.next.shape[y].length;x++){
        if(!this.next.shape[y][x])continue;

        const key=this.next.dog?'dog':'cat'+this.next.idx;
        this.nextLayer.add(
          this.add.image(ox+x*mini,oy+y*mini,key).setDisplaySize(mini,mini)
        );
      }
    }

    this.updateHUD();
  }

  updateHUD(){
    this.scoreT.setText('SCORE '+this.score);
    this.linesT.setText('LINES '+this.lines);
    this.levelT.setText('LEVEL '+this.level);
    this.stageT.setText('STAGE '+this.currentStage()+' / 10');
    const themeName=(STAGE_MUSIC[this.currentStage()]||STAGE_MUSIC[1]).name;
    this.musicT.setText('BGM: '+themeName+' 〈MELODY MIX〉');

    if(this.score>this.best){
      this.best=this.score;
      Store.setBest(this.best);
    }

    this.bestT.setText('BEST '+this.best);
  }

  fallDelay(){
    return Math.max(
      CFG.minFallMs,
      CFG.baseFallMs-(this.level-1)*52
    );
  }

  togglePause(){
    if(this.ended||this.clearing)return;

    this.paused=!this.paused;
    this.pauseT.setVisible(this.paused);

    document.getElementById('pause').textContent=this.paused?'▶':'Ⅱ';

    if(this.paused){
      this.pauseDim=this.add.rectangle(
        this.scale.width/2,
        this.scale.height/2,
        this.scale.width,
        this.scale.height,
        0x091119,.24
      ).setDepth(68);

      AUDIO.pauseBgm();
    }else{
      if(this.pauseDim){this.pauseDim.destroy();this.pauseDim=null}
      AUDIO.resumeBgm();
    }
  }

  gameOver(){
    if(this.ended)return;

    this.ended=true;
    setControlsVisible(false);

    AUDIO.gameOver();

    this.cameras.main.shake(180,.004);
    this.cameras.main.flash(120,30,36,42);

    this.time.delayedCall(160,()=>this.showGameOver());
  }

  showGameOver(){
    const {width:w,height:h}=this.scale;

    this.add.rectangle(w/2,h/2,w,h,0x071019,.68).setDepth(80);

    this.add.text(w/2,h*.35,'GAME OVER',{
      fontSize:'40px',fontStyle:'bold',color:'#fff',stroke:'#000',strokeThickness:3
    }).setOrigin(.5).setDepth(81);

    this.add.text(w/2,h*.47,
      `SCORE ${this.score}\nLINES ${this.lines}\nLEVEL ${this.level}\nBEST ${this.best}`,
      {fontSize:'18px',align:'center',lineSpacing:8,color:'#fff'}
    ).setOrigin(.5).setDepth(81);

    const retry=this.add.rectangle(w/2,h*.63,190,54,0xf0c86c)
      .setDepth(81)
      .setInteractive();

    this.add.text(w/2,h*.63,'RETRY',{
      fontSize:'19px',fontStyle:'bold',color:'#111820'
    }).setOrigin(.5).setDepth(82);

    retry.on('pointerdown',()=>{
      setControlsVisible(true);
      AUDIO.startBgm(1);
      this.scene.restart();
    });
  }

  startHold(dir){
    if(this.paused||this.ended||this.clearing)return;

    this.holdDir=dir;
    this.dasTimer=0;
    this.arrTimer=0;
    this.move(dir,true);
  }

  stopHold(dir){
    if(this.holdDir===dir)this.holdDir=0;
  }

  bindKeyboard(){
    const k=this.input.keyboard;

    k.on('keydown-LEFT',()=>this.startHold(-1));
    k.on('keydown-A',()=>this.startHold(-1));
    k.on('keydown-RIGHT',()=>this.startHold(1));
    k.on('keydown-D',()=>this.startHold(1));

    k.on('keyup-LEFT',()=>this.stopHold(-1));
    k.on('keyup-A',()=>this.stopHold(-1));
    k.on('keyup-RIGHT',()=>this.stopHold(1));
    k.on('keyup-D',()=>this.stopHold(1));

    k.on('keydown-DOWN',()=>this.downHeld=true);
    k.on('keydown-S',()=>this.downHeld=true);
    k.on('keyup-DOWN',()=>this.downHeld=false);
    k.on('keyup-S',()=>this.downHeld=false);

    k.on('keydown-UP',()=>this.rotate());
    k.on('keydown-W',()=>this.rotate());

    k.on('keydown-SPACE',e=>{
      e.preventDefault();
      this.hardDrop();
    });

    k.on('keydown-P',()=>this.togglePause());
    k.on('keydown-ESC',()=>this.togglePause());
  }

  bindButtons(){
    const press=(el,on)=>el.classList.toggle('pressed',on);

    const bindHold=(id,down,up)=>{
      const el=document.getElementById(id);

      el.style.touchAction='none';

      el.onpointerdown=e=>{
        e.preventDefault();
        e.stopPropagation();
        press(el,true);
        try{el.setPointerCapture(e.pointerId)}catch{}
        down();
      };

      const end=e=>{
        e.preventDefault();
        press(el,false);
        up();
      };

      el.onpointerup=end;
      el.onpointercancel=end;
      el.onpointerleave=e=>{
        if(e.buttons===0)end(e);
      };
    };

    bindHold('left',()=>this.startHold(-1),()=>this.stopHold(-1));
    bindHold('right',()=>this.startHold(1),()=>this.stopHold(1));
    bindHold('down',()=>this.downHeld=true,()=>this.downHeld=false);

    const bindTap=(id,fn)=>{
      const el=document.getElementById(id);
      el.style.touchAction='none';

      el.onpointerdown=e=>{
        e.preventDefault();
        e.stopPropagation();
        press(el,true);
        fn();
      };

      const end=e=>{
        e.preventDefault();
        press(el,false);
      };

      el.onpointerup=end;
      el.onpointercancel=end;
      el.onpointerleave=end;
    };

    bindTap('rotate',()=>this.rotate());
    bindTap('drop',()=>this.hardDrop());
    bindTap('pause',()=>this.togglePause());
  }

  unbindButtons(){
    ['left','right','rotate','down','drop','pause'].forEach(id=>{
      const el=document.getElementById(id);
      el.onpointerdown=null;
      el.onpointerup=null;
      el.onpointercancel=null;
      el.onpointerleave=null;
      el.classList.remove('pressed');
    });
  }

  update(_,delta){
    if(this.paused||this.ended||this.clearing||!this.piece)return;

    this.fallTimer+=delta;

    const fallMs=this.downHeld?CFG.softDropMs:this.fallDelay();

    if(this.fallTimer>=fallMs){
      this.stepDown(this.downHeld);
      this.fallTimer=0;
    }

    if(this.board.collides(this.piece,0,1)){
      this.lockTimer+=delta;

      if(this.lockTimer>=CFG.lockDelayMs&&!this.locking){
        this.locking=true;
        this.lockPiece();
        return;
      }
    }else{
      this.lockTimer=0;
    }

    if(this.holdDir){
      this.dasTimer+=delta;

      if(this.dasTimer>CFG.dasMs){
        this.arrTimer+=delta;

        if(this.arrTimer>CFG.arrMs){
          this.move(this.holdDir,false);
          this.arrTimer=0;
        }
      }
    }
  }
}

new Phaser.Game({
  type:Phaser.AUTO,
  parent:'game',
  width:CFG.width,
  height:CFG.height,
  backgroundColor:'#eef3f7',
  scene:[BootScene,TitleScene,GameScene],
  scale:{
    mode:Phaser.Scale.FIT,
    autoCenter:Phaser.Scale.CENTER_BOTH
  },
  render:{
    antialias:true,
    roundPixels:true
  },
  fps:{
    target:60
  }
});

document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    AUDIO.pauseBgm();
  }else{
    AUDIO.resumeBgm();
  }
});
})();