
'use strict';

const CFG={
  cols:10,
  rows:20,
  cell:26,
  boardW:260,
  boardH:520,
  lockDelay:420,
  spawnDelay:110,
  dogChance:.07,
  clearAnimMs:250,
  gravityAnimMs:210
};

const COLORS=[
  0x0072b2, // blue
  0x56b4e9, // sky blue
  0xf0e442, // yellow
  0xcc79a7, // purple-pink
  0xe69f00, // orange
  0x7a7a7a  // gray
];

const SHAPES=[
  [[1,1,1],[0,1,0]],      // T
  [[1,1],[1,1]],          // O
  [[1,1,0],[0,1,1]],      // Z
  [[0,1,1],[1,1,0]],      // S
  [[1,1,1,1]],            // I
  [[1,0,0],[1,1,1]],      // J
  [[0,0,1],[1,1,1]]       // L
];

const PIECE_WEIGHTS=[13.45,13.45,13.45,13.45,19.30,13.45,13.45];

const STAGE_CLEAR_MESSAGES=['','達人','天才','神域','怪物','無双','伝説','覚醒','極限','王者','制覇'];

const REAL_BGM={
  1:{
    title:'ショパン：英雄ポロネーズ Op.53',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Chopin_-_Polonaise_Op._53.oga',
    rate:1.08, volume:.98
  },
  2:{
    title:'ラデツキー行進曲',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Radetzky_March.ogg',
    rate:1.12, volume:.98
  },
  3:{
    title:'モーツァルト：レクイエム「怒りの日」',
    url:'https://commons.wikimedia.org/wiki/Special:Redirect/file/PMLP02751-S002-02-Mozart_Requiem_Mass.ogg',
    rate:1.10, volume:.98
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
    try{return Math.max(0,Number(localStorage.getItem('neko_dx5_best'))||0)}
    catch{return 0}
  },
  setBest(v){
    try{localStorage.setItem('neko_dx5_best',String(Math.max(0,v|0)))}catch{}
  }
};

function cloneMatrix(m){return m.map(r=>r.slice())}
function rotateMatrixCW(m){return m[0].map((_,i)=>m.map(r=>r[i]).reverse())}

function setControlsVisible(v){
  const el=document.getElementById('controls');
  if(el)el.style.display=v?'block':'none';
}

class AudioEngine{
  constructor(){
    this.ctx=null;
    this.wantBgm=true;
    this.realAudio=null;
    this.realStage=0;
    this.pendingRealPlay=false;
  }

  ensure(){
    if(this.ctx)return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      this.ctx=new AC();
    }catch{}
  }

  beep(freq=440,dur=.08,vol=.03,type='square',delay=0){
    this.ensure();
    if(!this.ctx)return;
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

  land(){this.beep(120,.045,.018,'sine')}
  meow(){this.beep(540,.06,.018,'triangle');this.beep(690,.08,.015,'triangle',.045)}
  bark(){this.beep(180,.055,.024,'square');this.beep(135,.08,.020,'square',.04)}

  clear(chain){
    const base=520+chain*80;
    this.beep(base,.07,.035,'triangle');
    this.beep(base*1.25,.08,.03,'triangle',.05);
    this.beep(base*1.5,.10,.028,'triangle',.10);
  }

  thunder(chain){
    this.beep(70,.18,.05,'sawtooth');
    this.beep(48,.26,.04,'sawtooth',.04);
    if(chain>=4)this.beep(920,.05,.025,'square',.02);
  }

  setStage(stage){
    const cfg=REAL_BGM[stage];
    if(!cfg)return;
    this.stopReal();

    const a=new Audio();
    a.src=cfg.url;
    a.loop=!Number.isFinite(cfg.loopEnd);
    a.preload='auto';
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
        if(this.wantBgm)a.play().catch(()=>{this.pendingRealPlay=true});
      }
    });

    this.realAudio=a;
    this.realStage=stage;

    if(this.wantBgm){
      a.play().then(()=>this.pendingRealPlay=false).catch(()=>this.pendingRealPlay=true);
    }
  }

  userGestureResume(){
    this.ensure();
    if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
    if(this.realAudio&&this.wantBgm){
      this.realAudio.play().then(()=>this.pendingRealPlay=false).catch(()=>{});
    }
  }

  pause(){
    if(this.realAudio)this.realAudio.pause();
  }

  resume(){
    this.userGestureResume();
  }

  stopReal(){
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
    this.lastShape=-1;
    this.sameShapeCount=0;
    this.stage=1;
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
    for(let i=0;i<24&&shapeIdx===this.lastShape&&this.sameShapeCount>=2;i++){
      shapeIdx=this.pickShape();
    }

    if(shapeIdx===this.lastShape)this.sameShapeCount++;
    else{
      this.lastShape=shapeIdx;
      this.sameShapeCount=1;
    }

    const shape=cloneMatrix(SHAPES[shapeIdx]);
    const colorCount=this.colorCount();
    const colors=[];
    let cells=0;
    for(const row of shape)for(const v of row)if(v)cells++;

    // Critical rule: each of the 4 cells receives its own color.
    // Avoid generating all four cells in the same color.
    for(let i=0;i<cells;i++)colors.push((Math.random()*colorCount)|0);
    if(colors.length>=4 && colors.every(v=>v===colors[0])){
      colors[colors.length-1]=(colors[0]+1+(Math.random()*(colorCount-1)|0))%colorCount;
    }

    return {
      shapeIdx,
      shape,
      colors,
      dog:Math.random()<CFG.dogChance,
      x:0,y:0
    };
  }
}

class Board{
  constructor(){
    this.grid=Array.from({length:CFG.rows},()=>Array(CFG.cols).fill(null));
  }

  cloneGrid(){return this.grid.map(r=>r.map(c=>c?{...c}:null))}

  eachPieceCell(piece,cb,shape=piece.shape){
    let ci=0;
    for(let y=0;y<shape.length;y++){
      for(let x=0;x<shape[y].length;x++){
        if(!shape[y][x])continue;
        cb(x,y,piece.colors[ci],ci);
        ci++;
      }
    }
  }

  collides(piece,dx=0,dy=0,shape=piece.shape){
    let hit=false;
    this.eachPieceCell(piece,(x,y)=>{
      if(hit)return;
      const nx=piece.x+x+dx;
      const ny=piece.y+y+dy;
      if(nx<0||nx>=CFG.cols||ny>=CFG.rows)hit=true;
      else if(ny>=0&&this.grid[ny][nx])hit=true;
    },shape);
    return hit;
  }

  rotatedPiece(piece){
    // Rotate the occupied-cell COLORS together with the shape.
    // This also makes the O piece visibly rotate because its four colors move.
    const h=piece.shape.length;
    const w=piece.shape[0].length;

    const colorMatrix=Array.from({length:h},()=>Array(w).fill(null));
    let ci=0;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        if(piece.shape[y][x])colorMatrix[y][x]=piece.colors[ci++];
      }
    }

    const rotatedShape=rotateMatrixCW(piece.shape);
    const rotatedColor=Array.from(
      {length:w},
      ()=>Array(h).fill(null)
    );

    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        if(colorMatrix[y][x]!==null){
          rotatedColor[x][h-1-y]=colorMatrix[y][x];
        }
      }
    }

    const rotatedColors=[];
    for(let y=0;y<rotatedShape.length;y++){
      for(let x=0;x<rotatedShape[y].length;x++){
        if(rotatedShape[y][x])rotatedColors.push(rotatedColor[y][x]);
      }
    }

    return {
      ...piece,
      shape:rotatedShape,
      colors:rotatedColors
    };
  }

  lock(piece){
    let overflow=false;
    this.eachPieceCell(piece,(x,y,color)=>{
      const bx=piece.x+x;
      const by=piece.y+y;
      if(by<0){overflow=true;return}
      if(by>=0&&by<CFG.rows&&bx>=0&&bx<CFG.cols){
        this.grid[by][bx]={
          colorIdx:color,
          dog:piece.dog,
          shapeIdx:piece.shapeIdx
        };
      }
    });
    return overflow;
  }

  ghostY(piece){
    let y=piece.y;
    while(!this.collides({...piece,y},0,1))y++;
    return y;
  }

  findGroups(min=4){
    const seen=Array.from({length:CFG.rows},()=>Array(CFG.cols).fill(false));
    const groups=[];

    for(let y=0;y<CFG.rows;y++){
      for(let x=0;x<CFG.cols;x++){
        const cell=this.grid[y][x];
        if(!cell||seen[y][x])continue;

        const color=cell.colorIdx;
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
    const initial=[...kill].map(s=>s.split(',').map(Number));

    for(const [x,y] of initial){
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

  removeCells(cells){
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
    // cat tiles
    for(let i=0;i<COLORS.length;i++){
      const g=this.add.graphics();
      g.fillStyle(COLORS[i],1);
      g.fillRoundedRect(1,1,24,24,3);
      g.lineStyle(2,0x111111,.9);
      g.strokeRoundedRect(1,1,24,24,3);

      g.fillStyle(0xffffff,.95);
      g.fillCircle(8,10,3);
      g.fillCircle(18,10,3);
      g.fillStyle(0x111111,1);
      g.fillCircle(8,10,1.2);
      g.fillCircle(18,10,1.2);

      g.lineStyle(1.5,0x111111,.9);
      g.beginPath();
      g.moveTo(10,17);g.lineTo(13,19);g.lineTo(16,17);g.strokePath();

      // Color-blind accessibility marker: every color has a unique symbol.
      // Marker is in the lower-right corner, so color is not the only cue.
      g.fillStyle(0xffffff,.98);
      g.lineStyle(1.4,0x111111,1);
      if(i===0){
        g.fillCircle(21,21,2.4); g.strokeCircle(21,21,2.4);
      }else if(i===1){
        g.fillTriangle(18.5,23,21,18,23.5,23);
        g.strokeTriangle(18.5,23,21,18,23.5,23);
      }else if(i===2){
        g.fillRect(18.5,18.5,5,5); g.strokeRect(18.5,18.5,5,5);
      }else if(i===3){
        g.beginPath(); g.moveTo(21,18); g.lineTo(24,21); g.lineTo(21,24); g.lineTo(18,21); g.closePath();
        g.fillPath(); g.strokePath();
      }else if(i===4){
        g.lineStyle(2,0xffffff,1);
        g.lineBetween(18.5,21,23.5,21); g.lineBetween(21,18.5,21,23.5);
        g.lineStyle(1,0x111111,1);
      }else{
        g.fillCircle(19,20,1.2); g.fillCircle(23,20,1.2); g.fillCircle(21,23,1.2);
      }

      // ears
      g.fillStyle(COLORS[i],1);
      g.fillTriangle(3,3,7,0,9,5);
      g.fillTriangle(17,5,19,0,23,3);

      g.generateTexture('cat'+i,26,26);
      g.destroy();
    }

    // dog
    {
      const g=this.add.graphics();
      g.fillStyle(0x9c6b30,1);
      g.fillRoundedRect(1,1,24,24,3);
      g.lineStyle(2,0x111111,.9);
      g.strokeRoundedRect(1,1,24,24,3);
      g.fillStyle(0xffffff,1);
      g.fillCircle(8,10,3);g.fillCircle(18,10,3);
      g.fillStyle(0x111111,1);
      g.fillCircle(8,10,1.2);g.fillCircle(18,10,1.2);
      g.fillCircle(13,16,2);
      g.generateTexture('dog',26,26);
      g.destroy();
    }

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
      fontSize:'34px',fontStyle:'bold',color:'#10212c',
      stroke:'#ffffff',strokeThickness:4
    }).setOrigin(.5);

    this.add.text(w/2,h*.29,'COLOR CHAIN',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'20px',fontStyle:'bold',color:'#1976d2'
    }).setOrigin(.5);

    this.add.text(w/2,h*.39,
      '同じ色を上下左右で4個つなげると消える！\n消えた後は落下して、さらに揃えば連鎖！',
      {
        align:'center',fontSize:'16px',color:'#33434f',
        lineSpacing:8
      }
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

    this.add.text(w/2,h*.72,'5.2  /  COLOR-SAFE ROTATION',{
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
    this.best=Store.best();
    this.stage=1;

    this.state='SPAWN';
    this.pausedByUser=false;
    this.ended=false;
    this.stageCutinActive=false;
    this.lastStageClear=0;

    this.dropAccum=0;
    this.softDrop=false;

    this.bx=Math.floor((this.scale.width-CFG.boardW)/2);
    this.by=82;

    this.buildUI();
    this.bindControls();
    this.applyStageTheme(true);

    this.factory.setStage(this.stage);
    this.next=this.factory.create();

    AUDIO.setStage(1);
    this.spawnPiece();
  }

  buildUI(){
    this.boardBg=this.add.rectangle(
      this.bx+CFG.boardW/2,
      this.by+CFG.boardH/2,
      CFG.boardW,
      CFG.boardH,
      0xffffff,
      .93
    ).setStrokeStyle(3,0x1b2830,1).setDepth(0);

    // vertical guide lines only
    this.guides=this.add.graphics().setDepth(1);
    this.guides.lineStyle(1,0x6d7c86,.20);
    for(let x=1;x<CFG.cols;x++){
      const px=this.bx+x*CFG.cell;
      this.guides.lineBetween(px,this.by,px,this.by+CFG.boardH);
    }

    this.lockedLayer=this.add.container(0,0).setDepth(4);
    this.ghostLayer=this.add.container(0,0).setDepth(5);
    this.activeLayer=this.add.container(0,0).setDepth(6);

    this.scoreT=this.add.text(12,10,'SCORE 0',{
      fontFamily:'Arial Black, sans-serif',fontSize:'16px',color:'#14232d'
    }).setDepth(20);

    this.clearCountT=this.add.text(12,34,'CLEAR 0',{
      fontFamily:'Arial Black, sans-serif',fontSize:'14px',color:'#14232d'
    }).setDepth(20);

    this.stageT=this.add.text(this.scale.width-12,10,'STAGE 1',{
      fontFamily:'Arial Black, sans-serif',fontSize:'16px',color:'#14232d'
    }).setOrigin(1,0).setDepth(20);

    this.musicT=this.add.text(this.scale.width/2,58,'',{
      fontSize:'11px',fontStyle:'bold',color:'#596974'
    }).setOrigin(.5,0).setDepth(20);

    this.nextT=this.add.text(this.scale.width-12,34,'NEXT',{
      fontSize:'12px',fontStyle:'bold',color:'#14232d'
    }).setOrigin(1,0).setDepth(20);

    this.nextLayer=this.add.container(this.scale.width-62,56).setDepth(20);

    this.chainT=this.add.text(this.scale.width/2,this.by+150,'',{
      fontFamily:'Arial Black, "Noto Sans JP", sans-serif',
      fontSize:'34px',fontStyle:'bold',
      color:'#ffffff',stroke:'#000000',strokeThickness:8
    }).setOrigin(.5).setAlpha(0).setDepth(70);

    this.pauseShade=this.add.rectangle(
      this.scale.width/2,this.scale.height/2,
      this.scale.width,this.scale.height,
      0x000000,.62
    ).setDepth(120).setVisible(false);

    this.pauseT=this.add.text(this.scale.width/2,this.scale.height/2,'PAUSE',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'46px',color:'#ffffff'
    }).setOrigin(.5).setDepth(121).setVisible(false);
  }

  bindControls(){
    const one=(id,fn)=>{
      const el=document.getElementById(id);
      if(!el)return;
      el.onpointerdown=e=>{
        e.preventDefault();
        AUDIO.userGestureResume();
        fn();
      };
    };

    const hold=(id,onDown,onUp)=>{
      const el=document.getElementById(id);
      if(!el)return;
      el.onpointerdown=e=>{
        e.preventDefault();
        AUDIO.userGestureResume();
        onDown();
      };
      el.onpointerup=e=>{e.preventDefault();onUp()};
      el.onpointercancel=()=>onUp();
      el.onpointerleave=()=>onUp();
    };

    one('left',()=>this.move(-1));
    one('right',()=>this.move(1));
    one('rotate',()=>this.rotate());
    one('drop',()=>this.hardDrop());
    one('pause',()=>this.togglePause());
    hold('down',()=>{this.softDrop=true},()=>{this.softDrop=false});

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
    const stageSpeed=[760,700,640,580,520,470,420,370,320,270];
    return stageSpeed[this.stage-1]||270;
  }

  activeGameplay(){
    return !this.ended&&!this.pausedByUser&&!this.stageCutinActive&&this.state==='FALLING'&&this.piece;
  }

  update(_,delta){
    if(!this.activeGameplay())return;

    this.dropAccum+=delta;
    const interval=this.softDrop?Math.max(55,this.fallMs()*.12):this.fallMs();

    if(this.dropAccum>=interval){
      this.dropAccum=0;
      if(!this.board.collides(this.piece,0,1)){
        this.piece.y++;
        if(this.softDrop)this.score++;
        this.redraw();
      }else{
        this.beginLock();
      }
    }
  }

  spawnPiece(){
    if(this.ended)return;

    this.state='SPAWN';
    this.factory.setStage(this.stage);

    this.piece=this.next||this.factory.create();
    this.next=this.factory.create();

    this.piece.x=Math.floor((CFG.cols-this.piece.shape[0].length)/2);
    this.piece.y=-2;

    if(this.board.collides(this.piece,0,0)){
      this.gameOver();
      return;
    }

    this.dropAccum=0;
    this.state='FALLING';
    this.redraw();
  }

  move(dx){
    if(!this.activeGameplay())return;
    if(!this.board.collides(this.piece,dx,0)){
      this.piece.x+=dx;
      this.redraw();
    }
  }

  rotate(){
    if(!this.activeGameplay())return;
    const rotated=this.board.rotatedPiece(this.piece);

    for(const kick of [0,-1,1,-2,2]){
      const test={...rotated,x:this.piece.x+kick,y:this.piece.y};
      if(!this.board.collides(test,0,0,test.shape)){
        this.piece=test;
        this.redraw();
        return;
      }
    }
  }

  hardDrop(){
    if(!this.activeGameplay())return;

    let moved=0;
    while(!this.board.collides(this.piece,0,1)){
      this.piece.y++;
      moved++;
    }
    this.score+=moved*2;
    this.redraw();
    this.beginLock(true);
  }

  beginLock(immediate=false){
    if(this.state!=='FALLING')return;
    this.state='LOCKING';

    const delay=immediate?0:CFG.lockDelay;
    this.time.delayedCall(delay,()=>{
      if(this.ended||this.pausedByUser)return;

      // if player movement would have freed the piece, this version still locks;
      // state separation keeps resolution deterministic.
      const overflow=this.board.lock(this.piece);
      AUDIO.land();
      this.piece.dog?AUDIO.bark():AUDIO.meow();
      this.piece=null;

      if(overflow){
        this.gameOver();
        return;
      }

      this.resolveBoard(1);
    });
  }

  resolveBoard(chainNo){
    if(this.ended)return;

    this.state='CHECKING';
    const groups=this.board.findGroups(4);

    if(groups.length===0){
      this.state='STABLE';
      this.redraw();

      const stageNow=this.currentStage();
      if(stageNow!==this.stage){
        this.enterStage(stageNow,()=>this.spawnPiece());
      }else{
        this.time.delayedCall(CFG.spawnDelay,()=>this.spawnPiece());
      }
      return;
    }

    let cells=[];
    for(const group of groups)cells.push(...group);
    cells=this.board.expandDogBomb(cells);

    const uniq=[...new Set(cells.map(([x,y])=>`${x},${y}`))]
      .map(s=>s.split(',').map(Number));

    this.state='CLEARING';

    const mult=Math.pow(2,Math.max(0,chainNo-1));
    this.score+=uniq.length*25*mult*this.level;
    this.clears+=1;
    this.level=1+Math.floor(this.clears/10);

    AUDIO.clear(chainNo);
    if(chainNo>=3)AUDIO.thunder(chainNo);

    this.showChain(chainNo,uniq.length);
    this.animateClear(uniq,chainNo,()=>{
      this.board.removeCells(uniq);

      this.state='GRAVITY';
      this.animateGravity(()=>{
        this.board.collapse();
        this.redraw();

        // Re-check only after gravity fully settles.
        this.time.delayedCall(90,()=>this.resolveBoard(chainNo+1));
      });
    });
  }

  animateClear(cells,chainNo,done){
    const ghosts=[];

    for(const [x,y] of cells){
      const c=this.board.grid[y][x];
      if(!c)continue;

      const sp=this.createCellSprite(c,x,y,1).setDepth(50);
      ghosts.push(sp);

      this.tweens.add({
        targets:sp,
        scaleX:1.28,scaleY:1.28,
        angle:(Math.random()-.5)*20,
        duration:90,
        ease:'Quad.easeOut',
        onComplete:()=>{
          this.tweens.add({
            targets:sp,
            alpha:0,scaleX:.06,scaleY:.06,
            duration:150,
            ease:'Back.easeIn',
            onComplete:()=>sp.destroy()
          });
        }
      });
    }

    if(chainNo>=3)this.chainLightning(chainNo,cells);
    if(chainNo>=5)this.chainFinisher(chainNo);

    this.time.delayedCall(CFG.clearAnimMs,done);
  }

  animateGravity(done){
    // Board mutation happens only after animation timing;
    // this keeps logic deterministic while still showing a drop beat.
    this.cameras.main.shake(80,.003);
    this.time.delayedCall(CFG.gravityAnimMs,done);
  }

  showChain(chainNo,count){
    const text=chainNo===1?`${count} MATCH!`:`${chainNo} CHAIN!`;

    this.chainT
      .setText(text)
      .setAlpha(1)
      .setScale(.45)
      .setY(this.by+165);

    this.tweens.killTweensOf(this.chainT);
    this.tweens.add({
      targets:this.chainT,
      scale:chainNo>=3?1.28:1.05,
      y:this.chainT.y-20,
      duration:180,
      ease:'Back.easeOut',
      hold:220,
      yoyo:true,
      onComplete:()=>this.chainT.setAlpha(0)
    });
  }

  chainLightning(chainNo,cells){
    const avgX=cells.reduce((s,p)=>s+p[0],0)/cells.length;
    const avgY=cells.reduce((s,p)=>s+p[1],0)/cells.length;
    const tx=this.bx+avgX*CFG.cell+CFG.cell/2;
    const ty=this.by+avgY*CFG.cell+CFG.cell/2;

    this.cameras.main.flash(90,220,245,255);
    this.cameras.main.shake(150,.006+Math.min(.012,chainNo*.0015));

    const bolt=this.add.graphics().setDepth(80);
    bolt.lineStyle(4,0xeaffff,1);

    let x=tx+(Math.random()-.5)*100;
    let y=this.by-40;
    bolt.beginPath();
    bolt.moveTo(x,y);

    for(let i=1;i<=9;i++){
      const t=i/9;
      const nx=Phaser.Math.Linear(x,tx,t)+(Math.random()-.5)*38;
      const ny=Phaser.Math.Linear(this.by-40,ty,t);
      bolt.lineTo(nx,ny);
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
        color:'#fff59d',stroke:'#000000',strokeThickness:9
      }
    ).setOrigin(.5).setDepth(100).setScale(.35);

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

  enterStage(newStage,after){
    if(this.stageCutinActive)return;

    this.stageCutinActive=true;
    this.state='STAGE_CUTIN';
    this.stage=newStage;
    this.factory.setStage(newStage);

    AUDIO.setStage(newStage);
    this.applyStageTheme();
    this.updateHUD();

    this.showStageClearCutin(newStage-1,()=>{
      this.stageCutinActive=false;
      this.state='STABLE';
      after?.();
    });
  }

  showStageClearCutin(clearedStage,onDone){
    const stageNumber=Math.max(1,Math.min(10,clearedStage));
    const msg=STAGE_CLEAR_MESSAGES[stageNumber]||'制覇';
    const w=this.scale.width,h=this.scale.height;
    const gold=stageNumber===10;

    const shade=this.add.rectangle(w/2,h/2,w,h,0x05080c,.56).setDepth(90);
    const band=this.add.rectangle(w/2,h/2,w*1.65,176,gold?0x3a2b00:0x101a24,.94)
      .setDepth(91).setAngle(-12).setScale(0,1);

    this.tweens.add({targets:band,scaleX:1,duration:180,ease:'Cubic.easeOut'});

    const lines=[];
    for(let i=0;i<30;i++){
      const a=(i/30)*Math.PI*2;
      const len=90+Math.random()*150;
      const r=125+Math.random()*70;
      const line=this.add.rectangle(
        w/2+Math.cos(a)*r,
        h/2+Math.sin(a)*r,
        len,2,
        gold?0xffe082:0xcaf5ff,.72
      ).setDepth(92).setAngle(Phaser.Math.RadToDeg(a));
      lines.push(line);
    }

    const sub=this.add.text(w/2,h/2-96,`STAGE ${stageNumber} CLEAR!`,{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'23px',fontStyle:'bold',
      color:gold?'#ffe082':'#e9fbff',
      stroke:'#000000',strokeThickness:5
    }).setOrigin(.5).setDepth(95);

    const t=this.add.text(w/2,h/2,msg,{
      fontFamily:'Arial Black, "Noto Sans JP", sans-serif',
      fontSize:'176px',fontStyle:'bold',
      color:gold?'#ffd54f':'#ffffff',
      stroke:gold?'#6c4b00':'#0d3850',
      strokeThickness:14
    }).setOrigin(.5).setDepth(96).setScale(2.6).setAlpha(0).setAngle(-9);

    this.cameras.main.flash(90,255,255,255);

    this.tweens.add({
      targets:t,alpha:1,scale:1,
      duration:260,ease:'Back.easeOut'
    });

    this.time.delayedCall(1050,()=>{
      const g1=this.add.text(t.x+18,t.y+12,msg,{
        fontFamily:'Arial Black, "Noto Sans JP", sans-serif',
        fontSize:'176px',fontStyle:'bold',
        color:gold?'#ffd54f':'#73e6ff',
        stroke:'#000',strokeThickness:10
      }).setOrigin(.5).setDepth(94).setAlpha(.30).setAngle(-9);

      this.tweens.add({
        targets:[t,g1],
        x:-200,y:-100,alpha:0,
        duration:800,ease:'Cubic.easeIn'
      });

      this.tweens.add({
        targets:[shade,band,sub,...lines],
        alpha:0,duration:500,
        onComplete:()=>{
          for(const obj of [shade,band,sub,t,g1,...lines]){
            if(obj&&obj.destroy)obj.destroy();
          }
          onDone?.();
        }
      });
    });
  }

  togglePause(){
    if(this.ended||this.stageCutinActive)return;
    this.pausedByUser=!this.pausedByUser;
    this.pauseShade.setVisible(this.pausedByUser);
    this.pauseT.setVisible(this.pausedByUser);

    if(this.pausedByUser)AUDIO.pause();
    else AUDIO.resume();
  }

  applyStageTheme(initial=false){
    const stage=this.stage;
    const shades=[
      '#eef7fb','#dcecf4','#cbdfe9','#b6cbd6','#9fb4c0',
      '#8398a5','#647985','#465a66','#293b46','#000000'
    ];

    this.cameras.main.setBackgroundColor(shades[stage-1]||'#000000');

    if(this.boardBg){
      this.boardBg.setFillStyle(stage===10?0x070707:0xffffff,stage===10?.92:.93);
      this.boardBg.setStrokeStyle(3,stage===10?0xffd54f:0x1b2830,1);
    }

    if(!initial)this.redraw();
  }

  createCellSprite(cell,x,y,alpha=1){
    const key=cell.dog?'dog':'cat'+cell.colorIdx;
    const sp=this.add.image(
      this.bx+x*CFG.cell+CFG.cell/2,
      this.by+y*CFG.cell+CFG.cell/2,
      key
    ).setAlpha(alpha);

    if(this.stage===10&&!cell.dog){
      // Keep original color for matching; final stage uses only gold outer glow.
      sp.setScale(.96);
    }
    return sp;
  }

  drawPiece(container,piece,boardY,alpha=1,ghost=false){
    let ci=0;
    for(let y=0;y<piece.shape.length;y++){
      for(let x=0;x<piece.shape[y].length;x++){
        if(!piece.shape[y][x])continue;

        const colorIdx=piece.colors[ci++];
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

        container.add(sp);
      }
    }
  }

  drawNext(){
    this.nextLayer.removeAll(true);
    if(!this.next)return;

    let ci=0;
    for(let y=0;y<this.next.shape.length;y++){
      for(let x=0;x<this.next.shape[y].length;x++){
        if(!this.next.shape[y][x])continue;
        const color=this.next.colors[ci++];
        const key=this.next.dog?'dog':'cat'+color;
        const sp=this.add.image(x*16,y*16,key).setScale(.58);
        this.nextLayer.add(sp);
      }
    }
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

        const sp=this.createCellSprite(c,x,y,1);
        this.lockedLayer.add(sp);

        if(this.stage===10&&!c.dog){
          const glow=this.add.image(sp.x,sp.y,sp.texture.key)
            .setAlpha(.20).setTint(0xffd54f).setScale(1.08)
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
    const shownBest=Math.max(this.best,this.score);
    this.scoreT.setText('SCORE '+this.score);
    this.clearCountT.setText('CLEAR '+this.clears);
    this.stageT.setText('STAGE '+this.stage);

    const cfg=REAL_BGM[this.stage];
    this.musicT.setText(cfg?'BGM: '+cfg.title:'');

    if(this.score>this.best){
      this.best=this.score;
      Store.setBest(this.best);
    }
  }

  gameOver(){
    this.ended=true;
    this.state='GAME_OVER';
    AUDIO.pause();

    const w=this.scale.width,h=this.scale.height;
    const shade=this.add.rectangle(w/2,h/2,w,h,0x000000,.72).setDepth(150);

    this.add.text(w/2,h*.40,'GAME OVER',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'44px',color:'#ffffff'
    }).setOrigin(.5).setDepth(151);

    this.add.text(w/2,h*.50,
      `SCORE ${this.score}\nCLEAR ${this.clears}\nSTAGE ${this.stage}\nBEST ${Math.max(this.best,this.score)}`,
      {
        align:'center',fontSize:'18px',color:'#ffffff',lineSpacing:8
      }
    ).setOrigin(.5).setDepth(151);

    const retry=this.add.text(w/2,h*.64,'RETRY',{
      fontFamily:'Arial Black, sans-serif',
      fontSize:'26px',color:'#111111',
      backgroundColor:'#ffffff',
      padding:{left:25,right:25,top:10,bottom:10}
    }).setOrigin(.5).setDepth(151).setInteractive();

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
