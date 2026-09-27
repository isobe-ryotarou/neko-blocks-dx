(() => {
'use strict';

const CFG = {
  cols:10, rows:20, cell:30,
  baseFall:690, minFall:118,
  das:130, arr:40, softDrop:40,
  lockDelay:420, maxLockResets:12,
  targetFPS:60,
  dogChance:.12,
  screenShake:true,
  ghost:true,
  bgm:true, se:true,
  bgmVol:.42, seVol:.75
};

const COLORS=[0xe76f91,0xf2c94c,0x5cc58a,0x56a3e6,0x9b7be6,0xef9a52,0x58c5d1];
const NAMES=['T','O','S','Z','I','L','J'];
const LEVEL_BACKGROUNDS=[
  0xeef3f7,0xeaf3f0,0xf2efe8,0xefeaf4,0xe8f0f6,
  0xf4ece8,0xe9f2ee,0xeeeaf5
];

const SHAPES=[
  [[1,1,1],[0,1,0]],
  [[1,1],[1,1]],
  [[1,1,0],[0,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]]
];
const WEIGHTS=[13.45,13.45,13.45,13.45,19.30,13.45,13.45];

function cloneShape(s){return s.map(r=>r.slice())}
function rotCW(s){return s[0].map((_,i)=>s.map(r=>r[i]).reverse())}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function safeNum(v,d){return Number.isFinite(+v)?+v:d}

function setControlsVisible(v){const el=document.getElementById('mobileControls');if(el)el.style.display=v?'block':'none'}

const Store={
  load(){
    try{
      const raw=JSON.parse(localStorage.getItem('neko_blocks_dx_settings')||'{}');
      return {...CFG,...raw,bgmVol:clamp(safeNum(raw.bgmVol,CFG.bgmVol),0,1),seVol:clamp(safeNum(raw.seVol,CFG.seVol),0,1)};
    }catch(e){return {...CFG}}
  },
  save(s){try{localStorage.setItem('neko_blocks_dx_settings',JSON.stringify(s))}catch(e){}},
  best(){try{return Math.max(0,parseInt(localStorage.getItem('neko_blocks_dx_best')||'0',10)||0)}catch(e){return 0}},
  setBest(v){try{localStorage.setItem('neko_blocks_dx_best',String(v|0))}catch(e){}}
};
let SETTINGS=Store.load();

class AudioManager{
  constructor(){this.ctx=null;this.master=null;this.music=null;this.sfx=null;this.comp=null;this.rev=null;this.bgmTimer=null;this.step=0}
  ensure(){
    if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return}
    const A=window.AudioContext||window.webkitAudioContext;
    if(!A)return;
    this.ctx=new A();
    this.master=this.ctx.createGain(); this.master.gain.value=.92;
    this.music=this.ctx.createGain(); this.music.gain.value=SETTINGS.bgmVol;
    this.sfx=this.ctx.createGain(); this.sfx.gain.value=SETTINGS.seVol;
    this.comp=this.ctx.createDynamicsCompressor();
    this.comp.threshold.value=-18;this.comp.knee.value=20;this.comp.ratio.value=3.4;this.comp.attack.value=.008;this.comp.release.value=.25;
    this.rev=this.ctx.createConvolver();
    const len=(this.ctx.sampleRate*1.8)|0,b=this.ctx.createBuffer(2,len,this.ctx.sampleRate);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.7)*.28}
    this.rev.buffer=b;this.rev.connect(this.master);
    this.music.connect(this.master);this.sfx.connect(this.master);this.master.connect(this.comp);this.comp.connect(this.ctx.destination);
  }
  setVolumes(){if(this.music)this.music.gain.value=SETTINGS.bgmVol;if(this.sfx)this.sfx.gain.value=SETTINGS.seVol}
  tone(freq,dur=.18,delay=0,vol=.018,type='triangle',dest='sfx',wet=.12,slide=1){
    if(!this.ctx)return;
    const t=this.ctx.currentTime+delay,g=this.ctx.createGain(),flt=this.ctx.createBiquadFilter(),dry=this.ctx.createGain(),wg=this.ctx.createGain();
    flt.type='lowpass';flt.frequency.value=3100;flt.Q.value=.45;
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    dry.gain.value=.88;wg.gain.value=wet;
    g.connect(flt);flt.connect(dry);dry.connect(dest==='music'?this.music:this.sfx);flt.connect(wg);wg.connect(this.rev);
    [[-6,'sine',.45],[0,type,1],[6,'sine',.45]].forEach(([det,tp,a])=>{
      const o=this.ctx.createOscillator(),og=this.ctx.createGain();o.type=tp;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+dur);o.detune.value=det;og.gain.value=a;o.connect(og);og.connect(g);o.start(t);o.stop(t+dur+.04)
    });
  }
  noise(d=.07,v=.024,band=1100){
    if(!this.ctx)return;const n=(this.ctx.sampleRate*d)|0,b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),a=b.getChannelData(0);
    for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);
    const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();f.type='bandpass';f.frequency.value=band;f.Q.value=.7;
    g.gain.setValueAtTime(v,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+d);
    s.buffer=b;s.connect(f);f.connect(g);g.connect(this.sfx);s.start()
  }
  move(){if(!SETTINGS.se)return;this.ensure();this.tone(260,.045,0,.007,'square','sfx',.02,1.03)}
  rotate(){if(!SETTINGS.se)return;this.ensure();this.tone(420,.055,0,.008,'triangle','sfx',.04,1.13);this.tone(680,.04,.015,.004,'sine','sfx',.03,1.02)}
  land(){if(!SETTINGS.se)return;this.ensure();this.tone(105,.10,0,.025,'sine','sfx',.06,.74);this.tone(185,.055,.012,.008,'triangle','sfx',.04,.86)}
  drop(){if(!SETTINGS.se)return;this.ensure();this.tone(145,.09,0,.022,'sine','sfx',.05,.72);this.tone(78,.14,.018,.018,'triangle','sfx',.08,.82);this.noise(.06,.018,700)}
  line(n,combo){
    if(!SETTINGS.se)return;this.ensure();
    const chord=n===4?[587,740,880,1175,1480]:n===3?[523,659,784,1047]:n===2?[494,622,740,988]:[440,554,659];
    chord.forEach((f,i)=>this.tone(f*(1+combo*.015),.18,i*.035,.018,'triangle','sfx',.14,1.02));
    this.noise(.12,.022,1600)
  }
  meow(){
    if(!SETTINGS.se)return;this.ensure();
    const set=[[510,1.45,.23],[430,1.52,.27],[610,1.35,.20],[370,1.42,.30],[670,1.28,.18]],q=set[(Math.random()*set.length)|0];
    this.tone(q[0],q[2],0,.025,'sawtooth','sfx',.08,q[1])
  }
  bark(){if(!SETTINGS.se)return;this.ensure();this.tone(210,.11,0,.035,'sawtooth','sfx',.04,.62);this.tone(145,.10,.035,.021,'triangle','sfx',.03,.78);this.noise(.07,.02,800)}
  level(){if(!SETTINGS.se)return;this.ensure();[523,659,784,1047].forEach((f,i)=>this.tone(f,.20,i*.075,.019,'square','sfx',.14,1.01))}
  gameOver(){this.stopBgm();if(!SETTINGS.se)return;this.ensure();[[392,.15,0],[330,.15,.17],[262,.18,.34],[196,.42,.54]].forEach(n=>this.tone(n[0],n[1],n[2],.025,'triangle','sfx',.18,.97))}
  startBgm(){
    if(this.bgmTimer||!SETTINGS.bgm)return;this.ensure();if(!this.ctx)return;
    const mel=[740,659,587,554,494,440,494,554,587,494,554,587,659,587,554,494,440,370,440,494,554,494,440,370,330,370,440,494,554,587,659,740];
    const bass=[147,110,123,92.5,98,73.4,98,110],har=[294,220,247,185,196,147,196,220];
    const tick=()=>{
      if(!SETTINGS.bgm)return;
      const i=this.step%mel.length,p=(i/4|0)%8;
      this.tone(mel[i],.36,0,.0066,'triangle','music',.22,1);
      if(this.step>7)this.tone(mel[(i+24)%32]*.998,.35,.018,.0040,'triangle','music',.22,1);
      if(i%2===0)this.tone(har[p],.44,.008,.0030,'sine','music',.19,1);
      if(i%4===0){this.tone(bass[p],.70,0,.0072,'triangle','music',.18,1);this.tone(bass[p]*2,.52,.012,.0023,'sine','music',.16,1)}
      this.step++
    };
    tick();this.bgmTimer=setInterval(tick,208)
  }
  stopBgm(){if(this.bgmTimer){clearInterval(this.bgmTimer);this.bgmTimer=null}}
}
const AUDIO=new AudioManager();

class BootScene extends Phaser.Scene{
  constructor(){super('Boot')}
  create(){
    this.makeTextures();
    this.scene.start('Title')
  }
  makeTextures(){
    const g=this.add.graphics();
    COLORS.forEach((c,idx)=>{
      const key='cat'+idx;
      g.clear();g.fillStyle(c,1);g.fillRect(0,0,CFG.cell,CFG.cell);
      g.fillStyle(Phaser.Display.Color.ValueToColor(c).darken(8).color,1);
      g.fillTriangle(4,9,10,0,16,9);g.fillTriangle(CFG.cell-16,9,CFG.cell-10,0,CFG.cell-4,9);
      g.fillStyle(0x182028,1);g.fillCircle(10,14,1.5);g.fillCircle(20,14,1.5);g.fillTriangle(13,20,17,20,15,23);
      g.generateTexture(key,CFG.cell,CFG.cell)
    });
    g.clear();g.fillStyle(0xc08b5b,1);g.fillRect(0,0,CFG.cell,CFG.cell);
    g.fillStyle(0x805632,1);g.fillTriangle(3,8,10,1,15,10);g.fillTriangle(CFG.cell-15,10,CFG.cell-10,1,CFG.cell-3,8);
    g.fillStyle(0x201812,1);g.fillCircle(10,14,1.6);g.fillCircle(20,14,1.6);g.fillCircle(15,21,1.8);
    g.generateTexture('dog',CFG.cell,CFG.cell);
    g.destroy()
  }
}

class TitleScene extends Phaser.Scene{
  constructor(){super('Title')}
  create(){
    setControlsVisible(false);
    const {width:w,height:h}=this.scale;this.cameras.main.setBackgroundColor('#eef3f7');
    const bg=this.add.graphics();bg.fillStyle(0xdce7ef,.55);for(let i=0;i<12;i++)bg.fillCircle(Math.random()*w,Math.random()*h,3+Math.random()*8);
    this.add.text(w/2,h*.22,'NEKO BLOCKS DX 2.2',{fontFamily:'system-ui',fontSize:'42px',fontStyle:'bold',color:'#15202a',stroke:'#ffffff',strokeThickness:3}).setOrigin(.5);
    this.add.text(w/2,h*.29,'PHASER EDITION',{fontSize:'15px',fontStyle:'bold',color:'#6a7885',letterSpacing:2}).setOrigin(.5);
    const hero=this.add.image(w/2,h*.41,'cat4').setScale(2.2);
    this.tweens.add({targets:hero,y:hero.y-8,angle:{from:-2,to:2},yoyo:true,repeat:-1,duration:900,ease:'Sine.inOut'});
    this.add.text(w/2,h*.52,'ENDLESS PUZZLE',{fontSize:'20px',fontStyle:'bold',color:'#273542'}).setOrigin(.5);
    this.add.text(w/2,h*.57,'10ラインごとにLEVEL UP',{fontSize:'15px',color:'#52616d'}).setOrigin(.5);
    const start=this.button(w/2,h*.69,220,60,'START');
    const settings=this.button(w/2,h*.79,180,48,'SETTINGS',15,0xffffff);
    start.on('pointerdown',()=>{AUDIO.ensure();AUDIO.startBgm();this.scene.start('Game')});
    settings.on('pointerdown',()=>this.showSettings());
    this.input.keyboard.once('keydown-ENTER',()=>{AUDIO.ensure();AUDIO.startBgm();this.scene.start('Game')})
  }
  button(x,y,w,h,t,fs=22,fill=0xf0c86c){
    const r=this.add.rectangle(x,y,w,h,fill,1).setStrokeStyle(2,0x907128,.65).setInteractive({useHandCursor:true});
    const tx=this.add.text(x,y,t,{fontSize:fs+'px',fontStyle:'bold',color:'#111820'}).setOrigin(.5);
    r.on('pointerover',()=>r.setScale(1.02));r.on('pointerout',()=>r.setScale(1));r.on('pointerdown',()=>{r.setScale(.97);this.time.delayedCall(70,()=>r.setScale(1))});
    return r
  }
  showSettings(){
    if(this.panel)return;
    const {width:w,height:h}=this.scale;
    const shade=this.add.rectangle(w/2,h/2,w,h,0x071019,.64).setDepth(50).setInteractive();
    const panel=this.panel=this.add.container(w/2,h/2).setDepth(51);
    const box=this.add.rectangle(0,0,330,400,0xf8fbfd,1).setStrokeStyle(2,0xc3d0d9);
    panel.add(box);panel.add(this.add.text(0,-165,'SETTINGS',{fontSize:'24px',fontStyle:'bold',color:'#17212b'}).setOrigin(.5));
    const rows=[
      ['BGM',()=>SETTINGS.bgm, v=>{SETTINGS.bgm=v;v?AUDIO.startBgm():AUDIO.stopBgm()}],
      ['SE',()=>SETTINGS.se,v=>SETTINGS.se=v],
      ['GHOST',()=>SETTINGS.ghost,v=>SETTINGS.ghost=v],
      ['SHAKE',()=>SETTINGS.screenShake,v=>SETTINGS.screenShake=v]
    ];
    rows.forEach((r,i)=>{
      const y=-95+i*58;panel.add(this.add.text(-115,y,r[0],{fontSize:'17px',fontStyle:'bold',color:'#23313d'}).setOrigin(0,.5));
      const b=this.add.rectangle(90,y,80,34,r[1]()?0x79c98b:0xcbd3d9).setInteractive();const t=this.add.text(90,y,r[1]()?'ON':'OFF',{fontSize:'14px',fontStyle:'bold',color:'#15202a'}).setOrigin(.5);
      b.on('pointerdown',()=>{r[2](!r[1]());b.fillColor=r[1]()?0x79c98b:0xcbd3d9;t.setText(r[1]()?'ON':'OFF');Store.save(SETTINGS)});
      panel.add([b,t])
    });
    const close=this.add.rectangle(0,145,150,44,0xf0c86c).setInteractive();const ct=this.add.text(0,145,'CLOSE',{fontSize:'16px',fontStyle:'bold',color:'#111820'}).setOrigin(.5);panel.add([close,ct]);
    close.on('pointerdown',()=>{panel.destroy();shade.destroy();this.panel=null})
  }
}

class GameScene extends Phaser.Scene{
  constructor(){super('Game')}
  create(){
    setControlsVisible(true);
    const {width:w}=this.scale;
    this.bw=CFG.cols*CFG.cell;this.bh=CFG.rows*CFG.cell;this.bx=Math.round(w/2-this.bw/2);this.by=82;
    this.board=Array.from({length:CFG.rows},()=>Array(CFG.cols).fill(null));
    this.score=0;this.lines=0;this.combo=-1;this.level=1;this.ended=false;this.paused=false;
    this.lastKey='';this.streak=0;this.fallTimer=0;this.lockTimer=0;this.lockResets=0;this.holdDir=0;this.dasTimer=0;this.arrTimer=0;this.downHeld=false;
    this.best=Store.best();
    this.cameras.main.setBackgroundColor('#f4f7f9');

    this.drawBoardFrame();

    this.ghostLayer=this.add.container();
    this.blockLayer=this.add.container();
    this.fxLayer=this.add.container().setDepth(20);

    this.scoreT=this.add.text(12,12,'SCORE 0',{fontSize:'19px',fontStyle:'bold',color:'#111820'});
    this.linesT=this.add.text(12,38,'LINES 0',{fontSize:'15px',color:'#111820'});
    this.levelT=this.add.text(12,60,'LEVEL 1',{fontSize:'14px',fontStyle:'bold',color:'#55636f'});
    this.bestT=this.add.text(w-12,12,'BEST '+this.best,{fontSize:'14px',fontStyle:'bold',color:'#45525d'}).setOrigin(1,0);
    this.add.text(w/2,12,'v2.2',{fontSize:'12px',fontStyle:'bold',color:'#7b8791'}).setOrigin(.5,0);
    this.add.text(w-12,35,'NEXT',{fontSize:'13px',fontStyle:'bold',color:'#45525d'}).setOrigin(1,0);
    this.nextLayer=this.add.container().setDepth(5);
    this.comboT=this.add.text(w/2,this.by+this.bh*.38,'',{fontSize:'34px',fontStyle:'bold',color:'#ffffff',stroke:'#111820',strokeThickness:5}).setOrigin(.5).setDepth(25).setAlpha(0);
    this.pauseT=this.add.text(w/2,this.scale.height/2,'PAUSE',{fontSize:'44px',fontStyle:'bold',color:'#17212b',stroke:'#ffffff',strokeThickness:5}).setOrigin(.5).setDepth(40).setVisible(false);

    this.next=this.newPiece();this.spawn();
    this.bindKeyboard();this.bindButtons();
    AUDIO.startBgm()
  }
  drawBoardFrame(){
    const g=this.add.graphics();
    g.fillStyle(0xffffff,.28);g.fillRect(this.bx,this.by,this.bw,this.bh);
    g.lineStyle(1,0x53697a,.16);for(let x=1;x<CFG.cols;x++)g.lineBetween(this.bx+x*CFG.cell,this.by,this.bx+x*CFG.cell,this.by+this.bh);
    g.lineStyle(7,0x17212b,.95);
    g.lineBetween(this.bx-5,this.by-4,this.bx-5,this.by+this.bh+5);
    g.lineBetween(this.bx+this.bw+5,this.by-4,this.bx+this.bw+5,this.by+this.bh+5);
    g.lineStyle(5,0x17212b,.9);g.lineBetween(this.bx-5,this.by+this.bh+5,this.bx+this.bw+5,this.by+this.bh+5)
  }
  pickIndex(){
    let r=Math.random()*100;for(let i=0;i<WEIGHTS.length;i++){r-=WEIGHTS[i];if(r<0)return i}return 4
  }
  newPiece(){
    for(let z=0;z<40;z++){
      const idx=this.pickIndex(),dog=Math.random()<SETTINGS.dogChance,key=(dog?'D':'C')+idx;
      if(key===this.lastKey&&this.streak>=2)continue;
      if(key===this.lastKey)this.streak++;else{this.lastKey=key;this.streak=1}
      return {idx,shape:cloneShape(SHAPES[idx]),dog,color:COLORS[idx],key,x:0,y:0}
    }
    const idx=this.pickIndex();return {idx,shape:cloneShape(SHAPES[idx]),dog:false,color:COLORS[idx],key:'C'+idx,x:0,y:0}
  }
  applyLevelTheme(){
    const c=LEVEL_BACKGROUNDS[(this.level-1)%LEVEL_BACKGROUNDS.length];
    this.cameras.main.setBackgroundColor(c);
  }
  showClearLabel(n){
    const labels={1:'SINGLE',2:'DOUBLE',3:'TRIPLE',4:'QUAD!'};
    this.clearT.setText(labels[n]||('CLEAR ×'+n)).setAlpha(1).setScale(.72).setY(this.by+175);
    this.tweens.killTweensOf(this.clearT);
    this.tweens.add({
      targets:this.clearT,scale:1.04,y:this.clearT.y-18,duration:150,ease:'Back.easeOut',
      hold:220,yoyo:true,onComplete:()=>this.clearT.setAlpha(0)
    });
  }
  landingPulse(){
    if(!this.active || !this.active.list.length)return;
    this.tweens.add({
      targets:this.active.list,
      scaleX:{from:1.10,to:1},
      scaleY:{from:.84,to:1},
      duration:95,
      ease:'Back.easeOut'
    });
  }
  spawn(){
    this.piece=this.next;this.piece.x=Math.floor((CFG.cols-this.piece.shape[0].length)/2);this.piece.y=-1;this.next=this.newPiece();
    this.fallTimer=0;this.lockTimer=0;this.lockResets=0;
    if(this.collide(this.piece,0,1)){this.gameOver();return}
    this.redraw()
  }
  collide(p,dx=0,dy=0,shape=p.shape){
    for(let y=0;y<shape.length;y++)for(let x=0;x<shape[y].length;x++){
      if(!shape[y][x])continue;const nx=p.x+x+dx,ny=p.y+y+dy;
      if(nx<0||nx>=CFG.cols||ny>=CFG.rows)return true;
      if(ny>=0&&this.board[ny][nx])return true
    }return false
  }
  move(dx,play=true){
    if(this.paused||this.ended)return;
    if(!this.collide(this.piece,dx,0)){this.piece.x+=dx;if(this.collide(this.piece,0,1)&&this.lockResets<CFG.maxLockResets){this.lockTimer=0;this.lockResets++}if(play)AUDIO.move();this.redraw()}
  }
  rotate(){
    if(this.paused||this.ended)return;
    const r=rotCW(this.piece.shape),kicks=[0,-1,1,-2,2];
    for(const k of kicks)if(!this.collide(this.piece,k,0,r)){this.piece.x+=k;this.piece.shape=r;if(this.collide(this.piece,0,1)&&this.lockResets<CFG.maxLockResets){this.lockTimer=0;this.lockResets++}AUDIO.rotate();this.redraw();return}
  }
  stepDown(manual=false){
    if(this.paused||this.ended)return;
    if(!this.collide(this.piece,0,1)){
      this.piece.y++;
      this.lockTimer=0;
      if(manual)this.score++;
      this.updateHUD();
      this.redraw();
    }
  }
  softDrop(){this.stepDown(true)}
  hardDrop(){
    if(this.paused||this.ended)return;let n=0;
    while(!this.collide(this.piece,0,1)){this.piece.y++;n++}
    this.score+=n*2;AUDIO.drop();this.dropTrail(n);this.landingPulse();this.cameras.main.flash(45,255,255,255);if(SETTINGS.screenShake)this.cameras.main.shake(65,.0035);this.lock()
  }
  dropTrail(n){
    if(n<2)return;const x=this.bx+(this.piece.x+this.piece.shape[0].length/2)*CFG.cell,y=this.by+(this.piece.y)*CFG.cell;
    const r=this.add.rectangle(x,y,Math.max(8,this.piece.shape[0].length*CFG.cell*.35),Math.min(180,n*CFG.cell),0xffffff,.18).setDepth(10);
    this.tweens.add({targets:r,alpha:0,duration:120,onComplete:()=>r.destroy()})
  }
  lock(){
    for(let y=0;y<this.piece.shape.length;y++)for(let x=0;x<this.piece.shape[y].length;x++){
      if(!this.piece.shape[y][x])continue;const by=this.piece.y+y,bx=this.piece.x+x;
      if(by>=0)this.board[by][bx]={idx:this.piece.idx,dog:this.piece.dog}
    }
    this.landingPulse();this.piece.dog?AUDIO.bark():AUDIO.meow();AUDIO.land();
    if(SETTINGS.screenShake)this.cameras.main.shake(55,.0018);
    this.resolveLines();if(!this.ended)this.spawn()
  }
  resolveLines(){
    const rows=[];for(let y=CFG.rows-1;y>=0;y--)if(this.board[y].every(Boolean))rows.push(y);
    if(!rows.length){this.combo=-1;return}
    this.combo++;AUDIO.line(rows.length,this.combo);this.showClearLabel(rows.length);rows.forEach(y=>this.rowFX(y,rows.length));if(rows.length===4)this.fourLineFX();
    const remove=new Set(rows);
    this.board=this.board.filter((_,idx)=>!remove.has(idx));
    while(this.board.length<CFG.rows)this.board.unshift(Array(CFG.cols).fill(null));
    const base=[0,100,300,500,800][rows.length]||1000;this.score+=Math.round(base*(1+this.combo*.25)*this.level);
    const beforeLevel=this.level;this.lines+=rows.length;this.level=1+Math.floor(this.lines/10);
    if(this.combo>0)this.showCombo();
    if(this.level>beforeLevel){this.applyLevelTheme();this.levelUp();}
    this.updateHUD()
  }
  rowFX(row,count){
    const cy=this.by+row*CFG.cell+CFG.cell/2;
    const beam=this.add.rectangle(this.bx+this.bw/2,cy,this.bw+12,CFG.cell-3,0xffffff,.72).setDepth(25).setScale(.12,1);
    this.tweens.add({targets:beam,scaleX:1.08,alpha:0,duration:230,ease:'Cubic.easeOut',onComplete:()=>beam.destroy()});
    this.cameras.main.flash(70,255,255,255);if(SETTINGS.screenShake)this.cameras.main.shake(110,count===4?.009:.005);
    const total=count===4?105:62;
    for(let i=0;i<total;i++){
      const c=Phaser.Display.Color.HSVToRGB(Math.random(),.82,1).color,d=this.add.circle(this.bx+Math.random()*this.bw,cy+(Math.random()-.5)*CFG.cell,2+Math.random()*3,c).setDepth(24);
      const a=Math.random()*Math.PI*2,r=30+Math.random()*(count===4?150:95);
      this.tweens.add({targets:d,x:d.x+Math.cos(a)*r,y:d.y+Math.sin(a)*r,alpha:0,scale:.2,duration:320+Math.random()*340,ease:'Quad.easeOut',onComplete:()=>d.destroy()})
    }
    const ring=this.add.circle(this.bx+this.bw/2,cy,8).setStrokeStyle(count===4?7:4,0xffe9a5,.95).setDepth(23);
    this.tweens.add({targets:ring,scaleX:24,scaleY:8,alpha:0,duration:360,onComplete:()=>ring.destroy()})
  }
  fourLineFX(){
    const t=this.add.text(this.scale.width/2,this.by+120,'4 LINES!',{fontSize:'40px',fontStyle:'bold',color:'#fff2a8',stroke:'#17212b',strokeThickness:6}).setOrigin(.5).setDepth(35).setScale(.55);
    this.cameras.main.flash(120,255,235,160);
    this.tweens.add({targets:t,scale:1.15,y:t.y-24,duration:220,ease:'Back.easeOut',hold:420,yoyo:true,onComplete:()=>t.destroy()});
  }
  levelUp(){
    AUDIO.level();this.cameras.main.flash(180,255,242,184);
    const t=this.add.text(this.scale.width/2,this.by+150,'LEVEL '+this.level,{fontSize:'42px',fontStyle:'bold',color:'#ffffff',stroke:'#17212b',strokeThickness:6}).setOrigin(.5).setDepth(30).setScale(.6);
    this.tweens.add({targets:t,scale:1.08,y:t.y-28,duration:260,ease:'Back.easeOut',yoyo:true,hold:420,onComplete:()=>this.tweens.add({targets:t,alpha:0,duration:220,onComplete:()=>t.destroy()})});
    this.fireworks(5)
  }
  fireworks(count=4){
    const w=this.scale.width;
    for(let j=0;j<count;j++)this.time.delayedCall(j*115,()=>{
      const cx=w*(.18+Math.random()*.64),cy=this.by+70+Math.random()*180;
      for(let i=0;i<34;i++){const c=Phaser.Display.Color.HSVToRGB(Math.random(),.9,1).color,d=this.add.circle(cx,cy,2+Math.random()*2.6,c).setDepth(26),a=Math.random()*Math.PI*2,r=35+Math.random()*90;
        this.tweens.add({targets:d,x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r,alpha:0,duration:420+Math.random()*280,onComplete:()=>d.destroy()})
      }
    })
  }
  showCombo(){
    this.comboT.setText('COMBO ×'+(this.combo+1)).setAlpha(1).setScale(.6).setY(this.by+this.bh*.42);
    this.tweens.killTweensOf(this.comboT);
    this.tweens.add({targets:this.comboT,scale:1.05,y:this.comboT.y-20,duration:180,ease:'Back.easeOut',hold:350,yoyo:true,onComplete:()=>this.comboT.setAlpha(0)})
  }
  ghostY(){let gy=this.piece.y;while(!this.collide({...this.piece,y:gy},0,1))gy++;return gy}
  makeSprite(cell,x,y,ghost=false){
    const key=cell.dog?'dog':'cat'+cell.idx,sp=this.add.image(this.bx+x*CFG.cell+CFG.cell/2,this.by+y*CFG.cell+CFG.cell/2,key).setOrigin(.5);
    if(ghost)sp.setAlpha(.15).setTint(0x1a2630);return sp
  }
  redraw(){
    this.blockLayer.removeAll(true);this.ghostLayer.removeAll(true);this.nextLayer.removeAll(true);
    for(let y=0;y<CFG.rows;y++)for(let x=0;x<CFG.cols;x++){const c=this.board[y][x];if(c)this.blockLayer.add(this.makeSprite(c,x,y,false))}
    if(this.piece&&!this.ended){
      if(SETTINGS.ghost){const gy=this.ghostY();for(let y=0;y<this.piece.shape.length;y++)for(let x=0;x<this.piece.shape[y].length;x++)if(this.piece.shape[y][x]&&gy+y>=0)this.ghostLayer.add(this.makeSprite({idx:this.piece.idx,dog:false},this.piece.x+x,gy+y,true))}
      for(let y=0;y<this.piece.shape.length;y++)for(let x=0;x<this.piece.shape[y].length;x++)if(this.piece.shape[y][x]&&this.piece.y+y>=0)this.blockLayer.add(this.makeSprite({idx:this.piece.idx,dog:this.piece.dog},this.piece.x+x,this.piece.y+y,false))
    }
    const mini=18,ox=this.scale.width-76,oy=58;
    for(let y=0;y<this.next.shape.length;y++)for(let x=0;x<this.next.shape[y].length;x++)if(this.next.shape[y][x]){
      const key=this.next.dog?'dog':'cat'+this.next.idx,sp=this.add.image(ox+x*mini,oy+y*mini,key).setDisplaySize(mini,mini);this.nextLayer.add(sp)
    }
    this.updateHUD()
  }
  updateHUD(){
    this.scoreT.setText('SCORE '+this.score);this.linesT.setText('LINES '+this.lines);this.levelT.setText('LEVEL '+this.level);
    if(this.score>this.best){this.best=this.score;Store.setBest(this.best)}this.bestT.setText('BEST '+this.best)
  }
  fallDelay(){return Math.max(CFG.minFall,CFG.baseFall-(this.level-1)*52)}
  togglePause(){
    if(this.ended)return;this.paused=!this.paused;this.pauseT.setVisible(this.paused);
    if(this.paused && !this.pauseDim){
      this.pauseDim=this.add.rectangle(this.scale.width/2,this.scale.height/2,this.scale.width,this.scale.height,0x091119,.24).setDepth(58);
    }else if(!this.paused && this.pauseDim){
      this.pauseDim.destroy();this.pauseDim=null;
    }document.getElementById('pause').textContent=this.paused?'▶':'Ⅱ';
    if(this.paused)AUDIO.stopBgm();else AUDIO.startBgm()
  }
  gameOver(){
    if(this.ended)return;this.ended=true;AUDIO.gameOver();document.getElementById('pause').textContent='Ⅱ';
    if(SETTINGS.screenShake)this.cameras.main.shake(180,.004);
    this.cameras.main.flash(120,30,36,42);
    setControlsVisible(false);
    this.time.delayedCall(170,()=>this.showGameOver())
  }
  showGameOver(){
    const {width:w,height:h}=this.scale;
    const shade=this.add.rectangle(w/2,h/2,w,h,0x071019,.68).setDepth(40).setInteractive();
    const card=this.add.rectangle(w/2,h*.47,330,330,0xf7fafc,1).setStrokeStyle(2,0xc5d0d8).setDepth(41);
    this.add.text(w/2,h*.33,'GAME OVER',{fontSize:'40px',fontStyle:'bold',color:'#fff',stroke:'#000',strokeThickness:3,fontStyle:'bold',color:'#18222b'}).setOrigin(.5).setDepth(42);
    this.add.text(w/2,h*.415,`SCORE  ${this.score}\nLINES  ${this.lines}\nLEVEL  ${this.level}\nBEST   ${this.best}`,{fontSize:'18px',fontStyle:'bold',color:'#374652',align:'center',lineSpacing:9}).setOrigin(.5).setDepth(42);
    const retry=this.add.rectangle(w/2,h*.58,190,52,0xf0c86c).setDepth(42).setInteractive();this.add.text(w/2,h*.58,'RETRY',{fontSize:'19px',fontStyle:'bold',color:'#111820'}).setOrigin(.5).setDepth(43);
    const title=this.add.rectangle(w/2,h*.66,150,40,0xdde6ec).setDepth(42).setInteractive();this.add.text(w/2,h*.66,'TITLE',{fontSize:'15px',fontStyle:'bold',color:'#26333e'}).setOrigin(.5).setDepth(43);
    retry.on('pointerdown',()=>{setControlsVisible(true);AUDIO.step=0;AUDIO.startBgm();this.scene.restart()});
    title.on('pointerdown',()=>{setControlsVisible(false);AUDIO.stopBgm();this.scene.start('Title')})
  }
  bindKeyboard(){
    const k=this.input.keyboard;
    k.on('keydown-LEFT',()=>this.startHold(-1));k.on('keydown-A',()=>this.startHold(-1));
    k.on('keydown-RIGHT',()=>this.startHold(1));k.on('keydown-D',()=>this.startHold(1));
    k.on('keyup-LEFT',()=>this.stopHold(-1));k.on('keyup-A',()=>this.stopHold(-1));k.on('keyup-RIGHT',()=>this.stopHold(1));k.on('keyup-D',()=>this.stopHold(1));
    k.on('keydown-DOWN',()=>this.downHeld=true);k.on('keydown-S',()=>this.downHeld=true);k.on('keyup-DOWN',()=>this.downHeld=false);k.on('keyup-S',()=>this.downHeld=false);
    k.on('keydown-UP',()=>this.rotate());k.on('keydown-W',()=>this.rotate());k.on('keydown-SPACE',e=>{e.preventDefault();this.hardDrop()});
    k.on('keydown-P',()=>this.togglePause());k.on('keydown-ESC',()=>this.togglePause())
  }
  pressVisual(el,on){el.classList.toggle('pressed',on)}
  bindButtons(){
    const bindHold=(id,down,up)=>{
      const el=document.getElementById(id);
      el.onpointerdown=e=>{e.preventDefault();this.pressVisual(el,true);try{el.setPointerCapture(e.pointerId)}catch(_e){}down()};
      const end=e=>{e.preventDefault();this.pressVisual(el,false);up()};
      el.onpointerup=end;el.onpointercancel=end;el.onpointerleave=e=>{if(e.buttons===0)end(e)}
    };
    bindHold('left',()=>this.startHold(-1),()=>this.stopHold(-1));
    bindHold('right',()=>this.startHold(1),()=>this.stopHold(1));
    bindHold('down',()=>this.downHeld=true,()=>this.downHeld=false);
    const tap=(id,fn)=>{const el=document.getElementById(id);el.onpointerdown=e=>{e.preventDefault();this.pressVisual(el,true);fn()};el.onpointerup=e=>{e.preventDefault();this.pressVisual(el,false)};el.onpointercancel=()=>this.pressVisual(el,false)};
    tap('rotate',()=>this.rotate());tap('drop',()=>this.hardDrop());tap('pause',()=>this.togglePause());
    this.events.once('shutdown',()=>{this.unbindButtons();setControlsVisible(false)})
  }
  unbindButtons(){
    ['left','right','rotate','down','drop','pause'].forEach(id=>{const e=document.getElementById(id);e.onpointerdown=e.onpointerup=e.onpointercancel=e.onpointerleave=null;e.classList.remove('pressed')})
  }
  startHold(d){if(this.paused||this.ended)return;this.holdDir=d;this.dasTimer=0;this.arrTimer=0;this.move(d)}
  stopHold(d){if(this.holdDir===d)this.holdDir=0}
  update(_,delta){
    if(this.paused||this.ended)return;
    this.fallTimer+=delta;const fd=this.downHeld?CFG.softDrop:this.fallDelay();
    if(this.fallTimer>=fd){this.stepDown(this.downHeld);this.fallTimer=0}
    if(this.collide(this.piece,0,1)){
      this.lockTimer+=delta;
      if(this.lockTimer>=CFG.lockDelay){this.lock();return}
    }else{
      this.lockTimer=0;
    }
    if(this.holdDir){
      this.dasTimer+=delta;
      if(this.dasTimer>CFG.das){this.arrTimer+=delta;if(this.arrTimer>CFG.arr){this.move(this.holdDir,false);this.arrTimer=0}}
    }
  }
}

const config={
  type:Phaser.AUTO,parent:'game',width:520,height:760,backgroundColor:'#eef3f7',
  scene:[BootScene,TitleScene,GameScene],
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  render:{antialias:true,pixelArt:false,roundPixels:true},
  fps:{target:CFG.targetFPS,forceSetTimeOut:false}
};
new Phaser.Game(config);

document.addEventListener('visibilitychange',()=>{if(document.hidden)AUDIO.stopBgm()});
})();
