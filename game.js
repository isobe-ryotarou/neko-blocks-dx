
'use strict';

/*
  NEKO BLOCKS DX 5.5.1
  COLOR CHAIN full rebuild.
  Key design rule: a falling piece is a MATRIX OF COLORS.
  Rotation rotates that colored matrix itself, so four 90-degree rotations
  always return the piece to its original state.
*/

const CFG={
  cols:10,
  rows:20,
  cell:26,
  boardW:260,
  boardH:520,
  lockDelay:380,
  spawnDelay:120,
  clearDelay:230,
  gravityDelay:190,
  dogChance:.06
};

// Color-blind-conscious palette:
// NO red and NO green.
const COLORS=[
  0xffffff, // white
  0x56d9f5, // aqua
  0xf5d90a, // yellow
  0x151515, // black
  0xf01818  // red
];

const SHAPE_MASKS=[
  [[1,1,1],[0,1,0]],      // T
  [[1,1],[1,1]],          // O
  [[1,1,0],[0,1,1]],      // Z
  [[0,1,1],[1,1,0]],      // S
  [[1,1,1,1]],            // I
  [[1,0,0],[1,1,1]],      // J
  [[0,0,1],[1,1,1]]       // L
];

const PIECE_WEIGHTS=[13.45,13.45,13.45,13.45,19.30,13.45,13.45];

const STAGE_MESSAGES=['','達人','天才','神域','怪物','無双','伝説','覚醒','極限','王者','制覇'];

const REAL_BGM={
  1:[
    {
      title:'ボギー大佐',
      url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Colonel_Bogey.ogg',
      rate:1.08, volume:.98
    },
    {
      title:'Scott Joplin：The Entertainer',
      url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/The_Entertainer_-_Scott_Joplin.ogg',
      rate:1.08, volume:.98
    },
    {
      title:'12th Street Rag',
      url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Twelfth_Street_Rag.ogg',
      rate:1.08, volume:.98
    }
  ],
  2:{
    title:'ラデツキー行進曲',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Radetzky_March.ogg',
    rate:1.10, volume:.98
  },
  3:{
    title:'モーツァルト：レクイエム「怒りの日」',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/PMLP02751-S002-02-Mozart_Requiem_Mass.ogg',
    rate:1.08, volume:.98
  },
  4:{
    title:'カンカン',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Offenbach_-_Orpheus_in_the_Underworld_-_Overture,_Can_Can_section.ogg',
    rate:1.20, volume:.98
  },
  5:{
    title:'ウィリアム・テル序曲',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Gioachino_Rossini,_William_Tell_Overture_(military_band_version,_2000).ogg',
    rate:1.16, volume:.98, startAt:450, loopEnd:661
  },
  6:{
    title:'ハンガリー舞曲 第5番',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Brahms_nikisch_hd5.ogg',
    rate:1.20, volume:.98
  },
  7:{
    title:'Jazz Me Blues',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/OriginalDixielandJassBand-JazzMeBlues.ogg',
    rate:1.10, volume:.98
  },
  8:{
    title:'山の魔王の宮殿にて',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Musopen_-_In_the_Hall_Of_The_Mountain_King.ogg',
    rate:1.22, volume:.98
  },
  9:{
    title:'ワシントン・ポスト・マーチ',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Washington_Post_March_-_U.S._Army_Band.ogg',
    rate:1.14, volume:.98
  },
  10:{
    title:'リパブリック讃歌',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Battle_Hymn_of_the_Republic_(USAFB).ogg',
    rate:1.14, volume:1.0
  }
};

const Store={
  best(){
    try{return Math.max(0,Number(localStorage.getItem('neko_dx53_best'))||0)}
    catch{return 0}
  },
  setBest(v){
    try{localStorage.setItem('neko_dx53_best',String(Math.max(0,v|0)))}catch{}
  }
};

function setControlsVisible(v){
  const e=document.getElementById('controls');
  if(e)e.style.display=v?'block':'none';
}

function cloneMatrix(m){return m.map(r=>r.slice())}

function rotateCW(matrix){
  const h=matrix.length;
  const w=matrix[0].length;
  const out=Array.from({length:w},()=>Array(h).fill(null));
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      out[x][h-1-y]=matrix[y][x];
    }
  }
  return out;
}

function occupied(matrix,cb){
  for(let y=0;y<matrix.length;y++){
    for(let x=0;x<matrix[y].length;x++){
      if(matrix[y][x]!==null)cb(x,y,matrix[y][x]);
    }
  }
}

class AudioEngine{
  constructor(){
    this.ctx=null;
    this.realAudio=null;
    this.realStage=0;
    this.wantBgm=true;
    this.currentCfg=null;
  }

  ensure(){
    if(this.ctx)return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      this.ctx=new AC();
    }catch{}
  }

  tone(freq,dur=.07,vol=.025,type='triangle',delay=0){
    this.ensure();
    if(!this.ctx)return;
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
    const t=this.ctx.currentTime+delay;
    const o=this.ctx.createOscillator();
    const g=this.ctx.createGain();
    o.type=type;
    o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0001,vol),t+.008);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);o.stop(t+dur+.03);
  }

  land(){this.tone(125,.045,.017,'sine')}
  meow(){this.tone(540,.06,.018);this.tone(680,.08,.016,'triangle',.045)}
  bark(){this.tone(170,.055,.023,'square');this.tone(125,.08,.020,'square',.04)}
  clear(chain){
    const b=500+chain*80;
    this.tone(b,.07,.035);
    this.tone(b*1.25,.08,.03,'triangle',.05);
    this.tone(b*1.5,.10,.025,'triangle',.10);
  }
  thunder(chain){
    this.tone(68,.18,.05,'sawtooth');
    this.tone(46,.26,.04,'sawtooth',.04);
    if(chain>=4)this.tone(900,.045,.025,'square',.02);
  }

  setStage(stage){
    let cfg=REAL_BGM[stage];
    if(!cfg)return;

    // Stage 1 deliberately randomizes among three familiar tracks
    // each time a new game/retry begins.
    if(Array.isArray(cfg)){
      cfg=cfg[(Math.random()*cfg.length)|0];
    }
    this.currentCfg=cfg;

    this.stop();

    const a=new Audio();
    a.src=cfg.url;
    a.preload='auto';
    a.loop=!Number.isFinite(cfg.loopEnd);
    a.volume=cfg.volume;
    a.playbackRate=cfg.rate;

    if('preservesPitch' in a)a.preservesPitch=true;
    if('webkitPreservesPitch' in a)a.webkitPreservesPitch=true;

    a.addEventListener('loadedmetadata',()=>{
      if(Number.isFinite(cfg.startAt)&&cfg.startAt>0){
        try{a.currentTime=cfg.startAt}catch{}
      }
    },{once:true});

    a.addEventListener('timeupdate',()=>{
      if(Number.isFinite(cfg.loopEnd)&&a.currentTime>=cfg.loopEnd){
        try{a.currentTime=Number.isFinite(cfg.startAt)?cfg.startAt:0}catch{}
        if(this.wantBgm)a.play().catch(()=>{});
      }
    });

    this.realAudio=a;
    this.realStage=stage;

    if(this.wantBgm)a.play().catch(()=>{});
  }

  userGestureResume(){
    this.ensure();
    if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
    if(this.realAudio&&this.wantBgm)this.realAudio.play().catch(()=>{});
  }

  pause(){if(this.realAudio)this.realAudio.pause()}
  resume(){this.userGestureResume()}

  stop(){
    if(this.realAudio){
      this.realAudio.pause();
      try{this.realAudio.currentTime=0}catch{}
      this.realAudio.removeAttribute('src');
      this.realAudio.load();
      this.realAudio=null;
    }
  }
}
const AUDIO=new AudioEngine();

class PieceFactory{
  constructor(){
    this.stage=1;
    this.lastShape=-1;
    this.streak=0;
  }

  setStage(stage){this.stage=stage}
  colorCount(){return 5}

  pickShape(){
    let r=Math.random()*100;
    for(let i=0;i<PIECE_WEIGHTS.length;i++){
      r-=PIECE_WEIGHTS[i];
      if(r<0)return i;
    }
    return 4;
  }

  create(){
    let shapeIdx=this.pickShape();

    for(let k=0;k<30&&shapeIdx===this.lastShape&&this.streak>=2;k++){
      shapeIdx=this.pickShape();
    }

    if(shapeIdx===this.lastShape)this.streak++;
    else{
      this.lastShape=shapeIdx;
      this.streak=1;
    }

    const mask=SHAPE_MASKS[shapeIdx];
    const cc=this.colorCount();

    let matrix=mask.map(row=>row.map(v=>v?((Math.random()*cc)|0):null));

    const vals=[];
    occupied(matrix,(_,__,c)=>vals.push(c));

    // Never spawn a four-cell piece all in the same color.
    if(vals.length===4&&vals.every(c=>c===vals[0])){
      let seen=0;
      outer:
      for(let y=matrix.length-1;y>=0;y--){
        for(let x=matrix[y].length-1;x>=0;x--){
          if(matrix[y][x]!==null){
            matrix[y][x]=(matrix[y][x]+1+(Math.random()*(cc-1)|0))%cc;
            break outer;
          }
        }
      }
    }

    return {
      shapeIdx,
      matrix,
      dog:Math.random()<CFG.dogChance,
      x:0,
      y:0
    };
  }
}

class Board{
  constructor(){
    this.grid=Array.from({length:CFG.rows},()=>Array(CFG.cols).fill(null));
  }

  collides(piece,dx=0,dy=0,matrix=piece.matrix){
    let hit=false;
    occupied(matrix,(x,y)=>{
      if(hit)return;
      const nx=piece.x+x+dx;
      const ny=piece.y+y+dy;
      if(nx<0||nx>=CFG.cols||ny>=CFG.rows)hit=true;
      else if(ny>=0&&this.grid[ny][nx])hit=true;
    });
    return hit;
  }

  lock(piece){
    let overflow=false;
    occupied(piece.matrix,(x,y,colorIdx)=>{
      const bx=piece.x+x;
      const by=piece.y+y;
      if(by<0){
        overflow=true;
        return;
      }
      if(bx>=0&&bx<CFG.cols&&by>=0&&by<CFG.rows){
        this.grid[by][bx]={
          colorIdx,
          dog:piece.dog
        };
      }
    });
    return overflow;
  }

  ghostY(piece){
    let gy=piece.y;
    while(!this.collides({...piece,y:gy},0,1))gy++;
    return gy;
  }

  findGroups(min=4){
    const seen=Array.from({length:CFG.rows},()=>Array(CFG.cols).fill(false));
    const groups=[];

    for(let y=0;y<CFG.rows;y++){
      for(let x=0;x<CFG.cols;x++){
        const c=this.grid[y][x];
        if(!c||seen[y][x])continue;

        const color=c.colorIdx;
        const stack=[[x,y]];
        const group=[];
        seen[y][x]=true;

        while(stack.length){
          const [cx,cy]=stack.pop();
          group.push([cx,cy]);

          for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
            const nx=cx+dx,ny=cy+dy;
            if(nx<0||nx>=CFG.cols||ny<0||ny>=CFG.rows||seen[ny][nx])continue;
            const n=this.grid[ny][nx];
            if(n&&n.colorIdx===color){
              seen[ny][nx]=true;
              stack.push([nx,ny]);
            }
          }
        }

        if(group.length>=min)groups.push(group);
      }
    }
    return groups;
  }

  expandDogBomb(cells){
    const kill=new Set(cells.map(([x,y])=>`${x},${y}`));
    const snapshot=[...kill].map(s=>s.split(',').map(Number));

    for(const [x,y] of snapshot){
      for(let dy=-1;dy<=1;dy++){
        for(let dx=-1;dx<=1;dx++){
          const nx=x+dx,ny=y+dy;
          if(nx<0||nx>=CFG.cols||ny<0||ny>=CFG.rows)continue;
          const c=this.grid[ny][nx];
          if(!c||!c.dog)continue;

          for(let ddy=-1;ddy<=1;ddy++){
            for(let ddx=-1;ddx<=1;ddx++){
              const bx=nx+ddx,by=ny+ddy;
              if(bx>=0&&bx<CFG.cols&&by>=0&&by<CFG.rows&&this.grid[by][bx]){
                kill.add(`${bx},${by}`);
              }
            }
          }
        }
      }
    }

    return [...kill].map(s=>s.split(',').map(Number));
  }

  remove(cells){
    for(const [x,y] of cells){
      if(x>=0&&x<CFG.cols&&y>=0&&y<CFG.rows)this.grid[y][x]=null;
    }
  }

  collapse(){
    for(let x=0;x<CFG.cols;x++){
      const kept=[];
      for(let y=CFG.rows-1;y>=0;y--){
        if(this.grid[y][x])kept.push(this.grid[y][x]);
      }
      let i=0;
      for(let y=CFG.rows-1;y>=0;y--){
        this.grid[y][x]=i<kept.length?kept[i++]:null;
      }
    }
  }
}

class BootScene extends Phaser.Scene{
  constructor(){super('Boot')}

  preload(){
    this.load.image('cat0','cat_white.png');
    this.load.image('cat1','cat_aqua.png');
    this.load.image('cat2','cat_yellow.png');
    this.load.image('cat3','cat_black.png');
    this.load.image('cat4','cat_red.png');
  }

  create(){
    // Dog remains a special procedurally-drawn bomb block.
    const d=this.add.graphics();
    d.fillStyle(0x9b7a55,1);
    d.fillRoundedRect(1,1,24,24,3);
    d.lineStyle(2,0x101010,1);
    d.strokeRoundedRect(1,1,24,24,3);
    d.fillStyle(0xffffff,1);
    d.fillCircle(8,10,3);d.fillCircle(18,10,3);
    d.fillStyle(0x111111,1);
    d.fillCircle(8,10,1.2);d.fillCircle(18,10,1.2);d.fillCircle(13,16,2);
    d.generateTexture('dog',26,26);
    d.destroy();

    this.scene.start('Title');
  }
}

class TitleScene extends Phaser.Scene{
  constructor(){super('Title')}

  create(){
    setControlsVisible(false);
    const w=this.scale.width,h=this.scale.height;
    this.cameras.main.setBackgroundColor('#071019');

    const bg=this.add.graphics();
    bg.fillGradientStyle(0x102b3c,0x071019,0x12334a,0x05090e,1);
    bg.fillRect(0,0,w,h);

    for(let i=0;i<5;i++){
      const band=this.add.rectangle(-110+i*90,145+i*48,245,17,0x56b4e9,.10)
        .setAngle(-24).setDepth(1);
      this.tweens.add({
        targets:band,x:w+140,
        duration:3500+i*430,delay:i*220,
        repeat:-1,ease:'Linear'
      });
    }

    for(let i=0;i<42;i++){
      const p=this.add.circle(
        Math.random()*w,Math.random()*h*.80,
        .7+Math.random()*1.7,
        i%4===0?0xf0e442:0xffffff,
        .18+Math.random()*.55
      ).setDepth(2);
      this.tweens.add({
        targets:p,y:p.y-35-Math.random()*65,
        alpha:{from:p.alpha,to:.04},
        duration:2200+Math.random()*3300,
        yoyo:true,repeat:-1,
        delay:Math.random()*900,
        ease:'Sine.easeInOut'
      });
    }

    const cats=[[44,168,0,-13],[82,145,2,9],[278,146,3,-8],[317,176,1,13]];
    for(const [x,y,c,a] of cats){
      const s=this.add.image(x,y,'cat'+c).setScale(1.55).setAngle(a).setDepth(4);
      this.tweens.add({
        targets:s,y:y-8,angle:a+(a>0?-3:3),
        duration:1300+Math.random()*500,
        yoyo:true,repeat:-1,ease:'Sine.easeInOut'
      });
    }

    const logo=this.add.text(w/2,230,'NEKO BLOCKS',{
      fontFamily:'Arial Black, "Noto Sans JP", sans-serif',
      fontSize:'40px',fontStyle:'bold',
      color:'#ffffff',stroke:'#0a3145',strokeThickness:8,
      shadow:{offsetX:0,offsetY:0,color:'#56b4e9',blur:18,fill:true}
    }).setOrigin(.5).setDepth(6).setScale(.72).setAlpha(0);

    const dx=this.add.text(w/2,282,'DX',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'58px',fontStyle:'bold',
      color:'#f0e442',stroke:'#4a3a00',strokeThickness:8,
      shadow:{offsetX:0,offsetY:0,color:'#f0e442',blur:20,fill:true}
    }).setOrigin(.5).setDepth(6).setScale(.15).setAlpha(0);

    const sub=this.add.text(w/2,332,'COLOR CHAIN',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'21px',fontStyle:'bold',
      color:'#56b4e9'
    }).setOrigin(.5).setDepth(6).setAlpha(0);

    this.tweens.add({targets:logo,alpha:1,scale:1,duration:520,ease:'Back.easeOut'});
    this.tweens.add({targets:dx,alpha:1,scale:1,duration:460,delay:220,ease:'Back.easeOut'});
    this.tweens.add({targets:sub,alpha:1,y:322,duration:420,delay:460,ease:'Cubic.easeOut'});

    const slash=this.add.rectangle(-120,255,180,5,0xffffff,0).setAngle(-18).setDepth(8);
    this.time.delayedCall(620,()=>{
      slash.setAlpha(.9);
      this.tweens.add({
        targets:slash,x:w+140,duration:420,ease:'Cubic.easeOut',
        onComplete:()=>slash.destroy()
      });
      this.cameras.main.flash(75,190,235,255);
    });

    this.add.text(w/2,395,
      '同じ色を4つつなげて消せ。\n落下から生まれる連鎖が勝負を変える。',
      {align:'center',fontSize:'15px',fontStyle:'bold',color:'#dbeef8',lineSpacing:7}
    ).setOrigin(.5).setDepth(6);

    const start=this.add.text(w/2,505,'▶  START',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'27px',fontStyle:'bold',
      color:'#071019',backgroundColor:'#f0e442',
      padding:{left:34,right:34,top:13,bottom:13}
    }).setOrigin(.5).setDepth(10).setInteractive({useHandCursor:true});

    const glow=this.add.rectangle(w/2,505,194,58,0xf0e442,.16).setDepth(9);
    this.tweens.add({
      targets:glow,scaleX:1.13,scaleY:1.22,alpha:.03,
      duration:820,yoyo:true,repeat:-1,ease:'Sine.easeInOut'
    });

    start.on('pointerdown',()=>{
      start.setScale(.94).setAlpha(.72);
      AUDIO.userGestureResume();
      this.time.delayedCall(90,()=>this.scene.start('Game'));
    });
    start.on('pointerup',()=>start.setScale(1).setAlpha(1));
    start.on('pointerout',()=>start.setScale(1).setAlpha(1));

    this.add.text(w/2,575,'BUILD 5.5.1',{
      fontFamily:'Arial Black, sans-serif',fontSize:'11px',color:'#6c8797'
    }).setOrigin(.5).setDepth(6);

    this.add.text(w/2,643,'CONNECT  •  DROP  •  CHAIN',{
      fontFamily:'Arial Black, sans-serif',fontSize:'12px',color:'#9fb8c7'
    }).setOrigin(.5).setDepth(6);
  }
}

class GameScene extends Phaser.Scene{
  constructor(){super('Game')}

  create(){
    setControlsVisible(true);

    this.board=new Board();
    this.factory=new PieceFactory();

    this.score=0;
    this.clears=0;
    this.level=1;
    this.stage=1;
    this.best=Store.best();

    this.state='SPAWN';
    this.piece=null;
    this.next=null;
    this.ended=false;
    this.pausedByUser=false;
    this.stageCutin=false;
    this.softDrop=false;
    this.dropAccum=0;

    this.bx=Math.floor((this.scale.width-CFG.boardW)/2);
    this.by=96;

    this.buildUI();
    this.bindControls();
    this.applyTheme();

    this.factory.setStage(1);
    this.next=this.factory.create();

    AUDIO.setStage(1);
    this.spawn();
  }

  buildUI(){
    this.boardBg=this.add.rectangle(
      this.bx+CFG.boardW/2,
      this.by+CFG.boardH/2,
      CFG.boardW,CFG.boardH,
      0xffffff,.94
    ).setStrokeStyle(3,0x1b2830,1);

    this.guides=this.add.graphics();
    this.guides.lineStyle(1,0x6d7c86,.18);
    for(let x=1;x<CFG.cols;x++){
      const px=this.bx+x*CFG.cell;
      this.guides.lineBetween(px,this.by,px,this.by+CFG.boardH);
    }

    this.lockedLayer=this.add.container(0,0).setDepth(4);
    this.ghostLayer=this.add.container(0,0).setDepth(5);
    this.activeLayer=this.add.container(0,0).setDepth(6);
    this.nextLayer=this.add.container(this.scale.width-63,58).setDepth(20);

    this.scoreT=this.add.text(12,10,'SCORE 0',{
      fontFamily:'Arial Black, sans-serif',fontSize:'16px',color:'#14232d'
    }).setDepth(20);

    this.clearT=this.add.text(12,34,'CLEAR 0',{
      fontFamily:'Arial Black, sans-serif',fontSize:'14px',color:'#14232d'
    }).setDepth(20);

    this.stageT=this.add.text(this.scale.width-12,10,'STAGE 1',{
      fontFamily:'Arial Black, sans-serif',fontSize:'16px',color:'#14232d'
    }).setOrigin(1,0).setDepth(20);

    this.nextT=this.add.text(this.scale.width-12,34,'NEXT',{
      fontSize:'12px',fontStyle:'bold',color:'#14232d'
    }).setOrigin(1,0).setDepth(20);

    this.musicBar=this.add.rectangle(
      this.scale.width/2,72,246,24,0x071019,.84
    ).setDepth(19).setStrokeStyle(1,0x56b4e9,.48);

    this.musicT=this.add.text(this.scale.width/2,65,'',{
      fontFamily:'Arial, "Noto Sans JP", sans-serif',
      fontSize:'10px',fontStyle:'bold',
      color:'#ecf9ff',align:'center',fixedWidth:232
    }).setOrigin(.5,0).setDepth(20);

    this.chainT=this.add.text(this.scale.width/2,this.by+155,'',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'36px',fontStyle:'bold',
      color:'#ffffff',stroke:'#000000',strokeThickness:8
    }).setOrigin(.5).setAlpha(0).setDepth(75);

    this.pauseShade=this.add.rectangle(
      this.scale.width/2,this.scale.height/2,
      this.scale.width,this.scale.height,
      0x000000,.68
    ).setVisible(false).setDepth(130);

    this.pauseText=this.add.text(this.scale.width/2,this.scale.height/2,'PAUSE',{
      fontFamily:'Arial Black, sans-serif',fontSize:'44px',color:'#ffffff'
    }).setOrigin(.5).setVisible(false).setDepth(131);
  }

  buttonVisual(el,down){
    if(!el)return;
    el.classList.toggle('is-pressed',!!down);
  }

  bindControls(){
    const tap=(id,fn)=>{
      const el=document.getElementById(id);
      if(!el)return;

      el.onpointerdown=e=>{
        e.preventDefault();
        AUDIO.userGestureResume();
        this.buttonVisual(el,true);
        fn();
      };

      const release=()=>this.buttonVisual(el,false);
      el.onpointerup=release;
      el.onpointercancel=release;
      el.onpointerleave=release;
    };

    const hold=(id,onDown,onUp)=>{
      const el=document.getElementById(id);
      if(!el)return;

      el.onpointerdown=e=>{
        e.preventDefault();
        AUDIO.userGestureResume();
        this.buttonVisual(el,true);
        onDown();
      };

      const release=()=>{
        this.buttonVisual(el,false);
        onUp();
      };
      el.onpointerup=release;
      el.onpointercancel=release;
      el.onpointerleave=release;
    };

    tap('left',()=>this.move(-1));
    tap('right',()=>this.move(1));
    tap('rotate',()=>this.rotate());
    tap('drop',()=>this.hardDrop());
    tap('pause',()=>this.togglePause());
    hold('down',()=>this.softDrop=true,()=>this.softDrop=false);

    this.input.keyboard.on('keydown-LEFT',()=>this.move(-1));
    this.input.keyboard.on('keydown-RIGHT',()=>this.move(1));
    this.input.keyboard.on('keydown-UP',()=>this.rotate());
    this.input.keyboard.on('keydown-SPACE',()=>this.hardDrop());
    this.input.keyboard.on('keydown-P',()=>this.togglePause());
    this.input.keyboard.on('keydown-DOWN',()=>this.softDrop=true);
    this.input.keyboard.on('keyup-DOWN',()=>this.softDrop=false);
  }

  currentStage(){
    return Math.min(10,Math.floor(this.clears/10)+1);
  }

  fallMs(){
    return [760,700,640,580,520,470,420,370,320,270][this.stage-1]||270;
  }

  canControl(){
    return !this.ended&&!this.pausedByUser&&!this.stageCutin&&this.state==='FALLING'&&!!this.piece;
  }

  update(_,delta){
    if(!this.canControl())return;

    this.dropAccum+=delta;
    const interval=this.softDrop?Math.max(55,this.fallMs()*.12):this.fallMs();

    if(this.dropAccum>=interval){
      this.dropAccum=0;

      if(!this.board.collides(this.piece,0,1)){
        this.piece.y++;
        if(this.softDrop)this.score++;
        this.redraw();
      }else{
        this.beginLock(false);
      }
    }
  }

  spawn(){
    if(this.ended)return;

    this.state='SPAWN';
    this.factory.setStage(this.stage);

    this.piece=this.next||this.factory.create();
    this.next=this.factory.create();

    this.piece.x=Math.floor((CFG.cols-this.piece.matrix[0].length)/2);
    this.piece.y=0;

    if(this.board.collides(this.piece)){
      this.gameOver();
      return;
    }

    this.dropAccum=0;
    this.state='FALLING';
    this.redraw();
  }

  move(dx){
    if(!this.canControl())return;
    if(!this.board.collides(this.piece,dx,0)){
      this.piece.x+=dx;
      this.redraw();
    }
  }

  rotate(){
    if(!this.canControl())return;

    const rotated=rotateCW(this.piece.matrix);

    for(const kick of [0,-1,1,-2,2]){
      const test={
        ...this.piece,
        x:this.piece.x+kick,
        matrix:rotated
      };

      if(!this.board.collides(test,0,0,rotated)){
        this.piece=test;
        this.redraw();
        return;
      }
    }
  }

  hardDrop(){
    if(!this.canControl())return;

    let d=0;
    while(!this.board.collides(this.piece,0,1)){
      this.piece.y++;
      d++;
    }

    this.score+=d*2;
    this.redraw();
    this.beginLock(true);
  }

  beginLock(immediate){
    if(this.state!=='FALLING')return;
    this.state='LOCKING';

    this.time.delayedCall(immediate?0:CFG.lockDelay,()=>{
      if(this.ended)return;

      const overflow=this.board.lock(this.piece);
      AUDIO.land();
      this.piece.dog?AUDIO.bark():AUDIO.meow();
      this.piece=null;

      if(overflow){
        this.gameOver();
        return;
      }

      // 5.4: settle every occupied cell to the bottom of its column
      // before checking matches. This guarantees no floating cells / holes.
      this.board.collapse();
      this.redraw();

      this.time.delayedCall(110,()=>this.resolve(1));
    });
  }

  resolve(chainNo){
    if(this.ended)return;

    this.state='CHECKING';
    const groups=this.board.findGroups(4);

    if(groups.length===0){
      this.state='STABLE';
      this.redraw();

      if(this.clears>=100){
        this.masterClear();
        return;
      }

      const nextStage=this.currentStage();

      if(nextStage!==this.stage){
        this.enterStage(nextStage);
      }else{
        this.time.delayedCall(CFG.spawnDelay,()=>this.spawn());
      }
      return;
    }

    let cells=[];
    groups.forEach(g=>cells.push(...g));
    cells=this.board.expandDogBomb(cells);

    const uniq=[...new Set(cells.map(([x,y])=>`${x},${y}`))]
      .map(s=>s.split(',').map(Number));

    this.state='CLEARING';

    const multiplier=Math.pow(2,Math.max(0,chainNo-1));
    this.score+=uniq.length*25*multiplier*this.level;
    this.clears++;
    this.level=1+Math.floor(this.clears/10);

    AUDIO.clear(chainNo);
    if(chainNo>=3)AUDIO.thunder(chainNo);

    this.showChain(chainNo,uniq.length);
    this.animateClear(uniq,chainNo,()=>{
      this.board.remove(uniq);

      this.state='GRAVITY';
      this.time.delayedCall(CFG.gravityDelay,()=>{
        this.board.collapse();
        this.redraw();

        this.time.delayedCall(80,()=>this.resolve(chainNo+1));
      });
    });
  }

  animateClear(cells,chainNo,done){
    for(const [x,y] of cells){
      const c=this.board.grid[y][x];
      if(!c)continue;

      const sp=this.makeCell(c,x,y,1).setDepth(60);

      this.tweens.add({
        targets:sp,
        scaleX:1.30,scaleY:1.30,
        duration:85,
        ease:'Quad.easeOut',
        onComplete:()=>{
          this.tweens.add({
            targets:sp,
            alpha:0,scaleX:.05,scaleY:.05,
            angle:(Math.random()-.5)*35,
            duration:145,
            ease:'Back.easeIn',
            onComplete:()=>sp.destroy()
          });
        }
      });
    }

    if(chainNo>=3)this.chainLightning(chainNo,cells);
    if(chainNo>=5)this.chainFinisher(chainNo);

    this.time.delayedCall(CFG.clearDelay,done);
  }

  showChain(chainNo,count){
    const label=chainNo===1?`${count} MATCH!`:`${chainNo} CHAIN!`;

    this.chainT
      .setText(label)
      .setAlpha(1)
      .setScale(.45)
      .setY(this.by+160);

    this.tweens.killTweensOf(this.chainT);
    this.tweens.add({
      targets:this.chainT,
      scale:chainNo>=3?1.30:1.06,
      y:this.chainT.y-22,
      duration:170,
      ease:'Back.easeOut',
      hold:230,
      yoyo:true,
      onComplete:()=>this.chainT.setAlpha(0)
    });
  }

  chainLightning(chainNo,cells){
    const ax=cells.reduce((s,p)=>s+p[0],0)/cells.length;
    const ay=cells.reduce((s,p)=>s+p[1],0)/cells.length;
    const tx=this.bx+ax*CFG.cell+CFG.cell/2;
    const ty=this.by+ay*CFG.cell+CFG.cell/2;

    this.cameras.main.flash(90,220,245,255);
    this.cameras.main.shake(160,.007+Math.min(.01,chainNo*.0014));

    const bolt=this.add.graphics().setDepth(90);
    bolt.lineStyle(4,0xffffff,1);

    let sx=tx+(Math.random()-.5)*100;
    bolt.beginPath();
    bolt.moveTo(sx,this.by-45);

    for(let i=1;i<=9;i++){
      const t=i/9;
      bolt.lineTo(
        Phaser.Math.Linear(sx,tx,t)+(Math.random()-.5)*40,
        Phaser.Math.Linear(this.by-45,ty,t)
      );
    }
    bolt.lineTo(tx,ty);
    bolt.strokePath();

    this.tweens.add({
      targets:bolt,alpha:0,duration:280,
      onComplete:()=>bolt.destroy()
    });
  }

  chainFinisher(chainNo){
    const t=this.add.text(this.scale.width/2,this.scale.height*.38,
      `${chainNo} CHAIN!!`,
      {
        fontFamily:'Arial Black, sans-serif',
        fontSize:'54px',fontStyle:'bold',
        color:'#fff59d',
        stroke:'#000000',strokeThickness:9
      }
    ).setOrigin(.5).setDepth(105).setScale(.35);

    this.cameras.main.flash(130,255,245,185);
    this.cameras.main.shake(300,.014);

    this.tweens.add({
      targets:t,
      scale:1.25,y:t.y-40,
      duration:230,ease:'Back.easeOut',
      hold:420,yoyo:true,
      onComplete:()=>t.destroy()
    });
  }

  enterStage(newStage){
    this.stageCutin=true;
    this.state='STAGE_CUTIN';
    const clearedStage=newStage-1;

    this.stage=newStage;
    this.factory.setStage(newStage);
    AUDIO.setStage(newStage);
    this.applyTheme();
    this.updateHUD();

    this.showStageCutin(clearedStage,()=>{
      this.stageCutin=false;
      this.state='STABLE';
      this.spawn();
    });
  }

  showStageCutin(stageNumber,onDone){
    const msg=STAGE_MESSAGES[stageNumber]||'制覇';
    const w=this.scale.width,h=this.scale.height;

    const shade=this.add.rectangle(w/2,h/2,w,h,0x030509,.58).setDepth(120);
    const band=this.add.rectangle(w/2,h/2,w*1.7,178,0x101a24,.96)
      .setDepth(121).setAngle(-12).setScale(0,1);

    this.tweens.add({
      targets:band,scaleX:1,duration:180,ease:'Cubic.easeOut'
    });

    const lines=[];
    for(let i=0;i<32;i++){
      const a=i/32*Math.PI*2;
      const r=120+Math.random()*75;
      const l=this.add.rectangle(
        w/2+Math.cos(a)*r,
        h/2+Math.sin(a)*r,
        90+Math.random()*150,
        2,
        0xd7f6ff,.72
      ).setDepth(122).setAngle(Phaser.Math.RadToDeg(a));
      lines.push(l);
    }

    const sub=this.add.text(w/2,h/2-96,`STAGE ${stageNumber} CLEAR!`,{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'23px',fontStyle:'bold',
      color:'#ffffff',
      stroke:'#000000',strokeThickness:5
    }).setOrigin(.5).setDepth(124);

    const text=this.add.text(w/2,h/2,msg,{
      fontFamily:'Arial Black, "Noto Sans JP", sans-serif',
      fontSize:'176px',fontStyle:'bold',
      color:'#ffffff',
      stroke:'#0d3850',strokeThickness:14
    }).setOrigin(.5).setDepth(125).setAngle(-9).setScale(2.6).setAlpha(0);

    this.cameras.main.flash(90,255,255,255);

    this.tweens.add({
      targets:text,scale:1,alpha:1,duration:260,ease:'Back.easeOut'
    });

    this.time.delayedCall(1050,()=>{
      const ghost=this.add.text(text.x+20,text.y+14,msg,{
        fontFamily:'Arial Black, "Noto Sans JP", sans-serif',
        fontSize:'176px',fontStyle:'bold',
        color:'#56b4e9',
        stroke:'#000000',strokeThickness:10
      }).setOrigin(.5).setDepth(123).setAlpha(.28).setAngle(-9);

      this.tweens.add({
        targets:[text,ghost],
        x:-210,y:-110,alpha:0,
        duration:800,ease:'Cubic.easeIn'
      });

      this.tweens.add({
        targets:[shade,band,sub,...lines],
        alpha:0,duration:500,
        onComplete:()=>{
          [shade,band,sub,text,ghost,...lines].forEach(o=>o&&o.destroy&&o.destroy());
          onDone?.();
        }
      });
    });
  }

  masterClear(){
    if(this.ended)return;
    this.ended=true;
    this.state='COMPLETE';

    const w=this.scale.width,h=this.scale.height;
    this.add.rectangle(w/2,h/2,w,h,0x020406,1).setDepth(150);

    for(let i=0;i<56;i++){
      const p=this.add.circle(
        Math.random()*w,h+Math.random()*160,
        1+Math.random()*2.4,
        i%3===0?0xffffff:0xf0e442,
        .32+Math.random()*.65
      ).setDepth(151);
      this.tweens.add({
        targets:p,
        y:-30,x:p.x+(Math.random()-.5)*90,
        duration:2500+Math.random()*2700,
        delay:Math.random()*1200,
        repeat:-1,ease:'Sine.easeIn'
      });
    }

    const halo=this.add.circle(w/2,h*.40,84,0xf0e442,.06)
      .setStrokeStyle(3,0xf0e442,.28).setDepth(151);

    this.tweens.add({
      targets:halo,scale:1.45,alpha:.01,
      duration:1100,yoyo:true,repeat:-1,ease:'Sine.easeInOut'
    });

    const small=this.add.text(w/2,h*.25,'ALL STAGES COMPLETE',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'18px',fontStyle:'bold',color:'#56b4e9'
    }).setOrigin(.5).setDepth(153).setAlpha(0);

    const title=this.add.text(w/2,h*.39,'完全制覇',{
      fontFamily:'Arial Black, "Noto Sans JP", sans-serif',
      fontSize:'60px',fontStyle:'bold',
      color:'#fff8c6',stroke:'#6d5000',strokeThickness:10,
      shadow:{offsetX:0,offsetY:0,color:'#f0e442',blur:18,fill:true}
    }).setOrigin(.5).setDepth(154).setScale(2.2).setAlpha(0);

    const sub=this.add.text(w/2,h*.52,'100 CLEAR',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'28px',fontStyle:'bold',
      color:'#ffffff',stroke:'#000000',strokeThickness:5
    }).setOrigin(.5).setDepth(154).setAlpha(0);

    this.add.text(w/2,h*.62,'NEKO BLOCKS DX',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'22px',fontStyle:'bold',color:'#9fb8c7'
    }).setOrigin(.5).setDepth(153);

    this.time.delayedCall(220,()=>{
      this.cameras.main.flash(220,255,244,170);
      this.tweens.add({targets:small,alpha:1,y:small.y-8,duration:480,ease:'Cubic.easeOut'});
      this.tweens.add({targets:title,alpha:1,scale:1,duration:620,ease:'Back.easeOut'});
      this.tweens.add({targets:sub,alpha:1,y:sub.y-6,duration:480,delay:380,ease:'Cubic.easeOut'});
    });

    this.time.delayedCall(1800,()=>{
      const retry=this.add.text(w/2,h*.75,'PLAY AGAIN',{
        fontFamily:'Arial Black, sans-serif',
        fontSize:'22px',fontStyle:'bold',
        color:'#071019',backgroundColor:'#f0e442',
        padding:{left:30,right:30,top:11,bottom:11}
      }).setOrigin(.5).setDepth(160).setAlpha(0).setInteractive();

      this.tweens.add({targets:retry,alpha:1,y:retry.y-8,duration:380,ease:'Cubic.easeOut'});

      retry.on('pointerdown',()=>{
        retry.setScale(.94).setAlpha(.72);
        AUDIO.userGestureResume();
        this.time.delayedCall(90,()=>this.scene.restart());
      });
    });
  }

  togglePause(){
    if(this.ended||this.stageCutin)return;

    this.pausedByUser=!this.pausedByUser;
    this.pauseShade.setVisible(this.pausedByUser);
    this.pauseText.setVisible(this.pausedByUser);

    if(this.pausedByUser)AUDIO.pause();
    else AUDIO.resume();
  }

  applyTheme(){
    const shades=[
      '#eef7fb','#dcecf4','#cbdfe9','#b6cbd6','#9fb4c0',
      '#8398a5','#647985','#465a66','#293b46','#000000'
    ];

    this.cameras.main.setBackgroundColor(shades[this.stage-1]||'#000000');

    if(this.boardBg){
      this.boardBg.setFillStyle(this.stage===10?0x080808:0xffffff,this.stage===10?.93:.94);
      this.boardBg.setStrokeStyle(3,this.stage===10?0xffd54f:0x1b2830,1);
    }

    this.redraw();
  }

  makeCell(cell,x,y,alpha=1){
    const key=cell.dog?'dog':'cat'+cell.colorIdx;
    const sp=this.add.image(
      this.bx+x*CFG.cell+CFG.cell/2,
      this.by+y*CFG.cell+CFG.cell/2,
      key
    ).setAlpha(alpha).setDisplaySize(CFG.cell,CFG.cell);
    return sp;
  }

  drawPiece(layer,piece,boardY,alpha=1,ghost=false){
    occupied(piece.matrix,(x,y,colorIdx)=>{
      const key=piece.dog?'dog':'cat'+colorIdx;
      const sp=this.add.image(
        this.bx+(piece.x+x)*CFG.cell+CFG.cell/2,
        this.by+(boardY+y)*CFG.cell+CFG.cell/2,
        key
      ).setAlpha(alpha).setDisplaySize(CFG.cell,CFG.cell);

      if(ghost){
        sp.setTint(0xffffff);
        sp.setAlpha(.18);
      }

      layer.add(sp);
    });
  }

  drawNext(){
    this.nextLayer.removeAll(true);
    if(!this.next)return;

    occupied(this.next.matrix,(x,y,colorIdx)=>{
      const key=this.next.dog?'dog':'cat'+colorIdx;
      const sp=this.add.image(x*16,y*16,key).setDisplaySize(15,15);
      this.nextLayer.add(sp);
    });
  }

  redraw(){
    if(!this.lockedLayer)return;

    this.lockedLayer.removeAll(true);
    this.ghostLayer.removeAll(true);
    this.activeLayer.removeAll(true);

    for(let y=0;y<CFG.rows;y++){
      for(let x=0;x<CFG.cols;x++){
        const c=this.board.grid[y][x];
        if(!c)continue;

        const sp=this.makeCell(c,x,y,1);
        this.lockedLayer.add(sp);

        if(this.stage===10&&!c.dog){
          // gold outline/glow, while preserving original matching color
          const glow=this.add.image(sp.x,sp.y,sp.texture.key)
            .setAlpha(.18)
            .setTint(0xffd54f)
            .setDisplaySize(CFG.cell*1.08,CFG.cell*1.08)
            .setBlendMode(Phaser.BlendModes.ADD);
          this.lockedLayer.add(glow);
        }
      }
    }

    if(this.piece&&this.state==='FALLING'){
      const gy=this.board.ghostY(this.piece);
      this.drawPiece(this.ghostLayer,this.piece,gy,.18,true);
      this.drawPiece(this.activeLayer,this.piece,this.piece.y,1,false);
    }

    this.drawNext();
    this.updateHUD();
  }

  updateHUD(){
    this.scoreT.setText('SCORE '+this.score);
    this.clearT.setText('CLEAR '+this.clears);
    this.stageT.setText('STAGE '+this.stage);

    const music=(AUDIO.realStage===this.stage&&AUDIO.currentCfg)
      ? AUDIO.currentCfg
      : (Array.isArray(REAL_BGM[this.stage])?REAL_BGM[this.stage][0]:REAL_BGM[this.stage]);
    this.musicT.setText(music?'BGM: '+music.title:'');

    if(this.score>this.best){
      this.best=this.score;
      Store.setBest(this.best);
    }
  }

  gameOver(){
    if(this.ended)return;
    this.ended=true;
    this.state='GAME_OVER';
    AUDIO.pause();

    const w=this.scale.width,h=this.scale.height;
    this.add.rectangle(w/2,h/2,w,h,0x000000,.72).setDepth(160);

    this.add.text(w/2,h*.40,'GAME OVER',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'44px',color:'#ffffff'
    }).setOrigin(.5).setDepth(161);

    this.add.text(w/2,h*.51,
      `SCORE ${this.score}\nCLEAR ${this.clears}\nSTAGE ${this.stage}`,
      {align:'center',fontSize:'18px',color:'#ffffff',lineSpacing:8}
    ).setOrigin(.5).setDepth(161);

    const retry=this.add.text(w/2,h*.65,'RETRY',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'26px',color:'#111111',
      backgroundColor:'#ffffff',
      padding:{left:26,right:26,top:10,bottom:10}
    }).setOrigin(.5).setDepth(161).setInteractive();

    retry.on('pointerdown',()=>{
      AUDIO.userGestureResume();
      this.scene.restart();
    });
  }
}

const config={
  type:Phaser.AUTO,
  parent:'game',
  width:360,
  height:720,
  backgroundColor:'#eef7fb',
  scene:[BootScene,TitleScene,GameScene],
  scale:{
    mode:Phaser.Scale.FIT,
    autoCenter:Phaser.Scale.CENTER_BOTH
  },
  render:{
    antialias:false,
    pixelArt:false
  }
};

new Phaser.Game(config);
