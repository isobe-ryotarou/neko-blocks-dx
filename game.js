
'use strict';

/*
  NEKO BLOCKS DX 5.3
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
  0x0072b2, // blue
  0x56b4e9, // sky blue
  0xf0e442, // yellow
  0xcc79a7, // purple-pink
  0xe69f00, // orange
  0x6b6b6b  // gray
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
  1:{
    title:'ショパン：英雄ポロネーズ Op.53',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Chopin_-_Polonaise_Op._53.oga',
    rate:1.06, volume:.98
  },
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
    title:'熊蜂の飛行',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Rimsky-Korsakov_-_flight_of_the_bumblebee.oga',
    rate:1.22, volume:.98
  },
  8:{
    title:'山の魔王の宮殿にて',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Musopen_-_In_the_Hall_Of_The_Mountain_King.ogg',
    rate:1.22, volume:.98
  },
  9:{
    title:'運命 第1楽章',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Ludwig_van_Beethoven_-_symphony_no._5_in_c_minor,_op._67_-_i._allegro_con_brio.ogg',
    rate:1.20, volume:.98
  },
  10:{
    title:'熊蜂の飛行 - FINAL RUSH',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Rimsky-Korsakov_-_flight_of_the_bumblebee.oga',
    rate:1.32, volume:1.0
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
    const cfg=REAL_BGM[stage];
    if(!cfg)return;

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
  colorCount(){return this.stage>=7?6:5}

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

  create(){
    for(let i=0;i<COLORS.length;i++){
      const g=this.add.graphics();

      g.fillStyle(COLORS[i],1);
      g.fillRoundedRect(1,1,24,24,3);
      g.lineStyle(2,0x101010,1);
      g.strokeRoundedRect(1,1,24,24,3);

      // ears
      g.fillStyle(COLORS[i],1);
      g.fillTriangle(3,4,7,0,9,6);
      g.fillTriangle(17,6,19,0,23,4);

      // face
      g.fillStyle(0xffffff,1);
      g.fillCircle(8,10,3);
      g.fillCircle(18,10,3);
      g.fillStyle(0x111111,1);
      g.fillCircle(8,10,1.2);
      g.fillCircle(18,10,1.2);

      g.lineStyle(1.5,0x111111,1);
      g.beginPath();
      g.moveTo(10,17);
      g.lineTo(13,19);
      g.lineTo(16,17);
      g.strokePath();

      // Non-color identification mark: each color has a unique symbol.
      g.lineStyle(1.5,0x111111,1);
      g.fillStyle(0xffffff,1);

      if(i===0){
        g.fillCircle(21,21,2.5);
        g.strokeCircle(21,21,2.5);
      }else if(i===1){
        g.fillTriangle(18.5,23,21,18,23.5,23);
        g.strokeTriangle(18.5,23,21,18,23.5,23);
      }else if(i===2){
        g.fillRect(18.5,18.5,5,5);
        g.strokeRect(18.5,18.5,5,5);
      }else if(i===3){
        g.beginPath();
        g.moveTo(21,18);
        g.lineTo(24,21);
        g.lineTo(21,24);
        g.lineTo(18,21);
        g.closePath();
        g.fillPath();
        g.strokePath();
      }else if(i===4){
        g.lineStyle(2,0xffffff,1);
        g.lineBetween(18,21,24,21);
        g.lineBetween(21,18,21,24);
      }else{
        g.fillCircle(19,20,1.3);
        g.fillCircle(23,20,1.3);
        g.fillCircle(21,23,1.3);
      }

      g.generateTexture('cat'+i,26,26);
      g.destroy();
    }

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
    this.cameras.main.setBackgroundColor('#eef7fb');

    this.add.text(w/2,h*.20,'NEKO BLOCKS DX',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'34px',fontStyle:'bold',
      color:'#10212c',stroke:'#ffffff',strokeThickness:4
    }).setOrigin(.5);

    this.add.text(w/2,h*.29,'COLOR CHAIN',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'20px',fontStyle:'bold',
      color:'#0072b2'
    }).setOrigin(.5);

    this.add.text(w/2,h*.39,
      '同じ色を上下左右で4個つなげると消える！\n消えた後は落下して、さらに揃えば連鎖！',
      {align:'center',fontSize:'16px',color:'#33434f',lineSpacing:8}
    ).setOrigin(.5);

    const start=this.add.text(w/2,h*.58,'START',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'30px',fontStyle:'bold',
      color:'#ffffff',backgroundColor:'#111111',
      padding:{left:34,right:34,top:14,bottom:14}
    }).setOrigin(.5).setInteractive({useHandCursor:true});

    start.on('pointerdown',()=>{
      AUDIO.userGestureResume();
      this.scene.start('Game');
    });

    this.add.text(w/2,h*.72,'v5.3  FULL REBUILD',{
      fontSize:'12px',color:'#71808b'
    }).setOrigin(.5);
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
    this.by=82;

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

    this.musicT=this.add.text(this.scale.width/2,58,'',{
      fontSize:'11px',fontStyle:'bold',color:'#596974'
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
    this.piece.y=-2;

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

      this.resolve(1);
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
    this.cameras.main.flash(250,255,230,120);

    const shade=this.add.rectangle(w/2,h/2,w,h,0x000000,.78).setDepth(150);
    const t=this.add.text(w/2,h*.40,'完全制覇',{
      fontFamily:'Arial Black, "Noto Sans JP", sans-serif',
      fontSize:'62px',fontStyle:'bold',
      color:'#ffd54f',stroke:'#000000',strokeThickness:10
    }).setOrigin(.5).setDepth(151);

    this.add.text(w/2,h*.53,'100 CLEAR',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'26px',color:'#ffffff'
    }).setOrigin(.5).setDepth(151);
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
    ).setAlpha(alpha);
    return sp;
  }

  drawPiece(layer,piece,boardY,alpha=1,ghost=false){
    occupied(piece.matrix,(x,y,colorIdx)=>{
      const key=piece.dog?'dog':'cat'+colorIdx;
      const sp=this.add.image(
        this.bx+(piece.x+x)*CFG.cell+CFG.cell/2,
        this.by+(boardY+y)*CFG.cell+CFG.cell/2,
        key
      ).setAlpha(alpha);

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
      const sp=this.add.image(x*16,y*16,key).setScale(.58);
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
            .setScale(1.08)
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

    const music=REAL_BGM[this.stage];
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
