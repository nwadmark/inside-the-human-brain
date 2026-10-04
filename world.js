import * as THREE from 'three';
import {OrbitControls} from './assets/OrbitControls.js?v=5';
import {STRUCTURES, NETWORKS, EXPERIENCES} from './content.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const ras=p=>V(p[0]/50,(p[2]-15)/50,p[1]/50);
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
let seed=78;
const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.66,metalness:.03,...extra});
const mesh=(geo,material,pos,scale,parent)=>{const o=new THREE.Mesh(geo,material); if(pos)o.position.copy(pos);if(scale)o.scale.copy(scale);if(parent)parent.add(o);return o;};
const sph=(pos,scale,color,parent,extra={})=>mesh(new THREE.SphereGeometry(1,28,20),mat(color,extra),pos,scale,parent);
const curve=(pts,radius,color,parent,extra={})=>{const c=new THREE.CatmullRomCurve3(pts);const o=mesh(new THREE.TubeGeometry(c,Math.max(16,pts.length*7),radius,8,false),mat(color,extra),null,null,parent);o.userData.curve=c;return o;};

class CanvasFallbackRenderer {
 constructor(container){
  this.domElement=document.createElement('canvas');
  this.domElement.className='brain-fallback-canvas';
  this.ctx=this.domElement.getContext('2d');
  this.container=container;
  this.angle=0;
  this.setSize(container.clientWidth||window.innerWidth,container.clientHeight||window.innerHeight);
 }
 setPixelRatio(){}
 setClearColor(){}
 clearViewOffset(){}
 setSize(w,h){this.domElement.width=Math.max(1,Math.floor(w));this.domElement.height=Math.max(1,Math.floor(h));this.domElement.style.width='100%';this.domElement.style.height='100%';}
 render(){
  const ctx=this.ctx,w=this.domElement.width,h=this.domElement.height;
  if(!ctx)return;
  this.angle+=.003;
  ctx.fillStyle='#080b10';ctx.fillRect(0,0,w,h);
  const cx=w*.63,cy=h*.48,rx=Math.min(w*.22,250),ry=Math.min(h*.29,290);
  ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.sin(this.angle)*.035);
  const grad=ctx.createRadialGradient(-rx*.25,-ry*.3,rx*.08,0,0,Math.max(rx,ry));
  grad.addColorStop(0,'#f0d5c3');grad.addColorStop(.62,'#bc9d97');grad.addColorStop(1,'#704f58');
  ctx.fillStyle=grad;ctx.strokeStyle='#e0b8a7';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(-rx*.22,0,rx*.72,ry,0,0,Math.PI*2);ctx.ellipse(rx*.22,0,rx*.72,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.globalAlpha=.42;ctx.strokeStyle='#f3c7b4';ctx.lineWidth=3;
  for(let i=-5;i<=5;i++){ctx.beginPath();ctx.moveTo(-rx*.7+i*rx*.08,-ry*.75);ctx.bezierCurveTo(-rx*.95+i*rx*.09,-ry*.25, -rx*.5+i*rx*.13,ry*.05, -rx*.74+i*rx*.1,ry*.72);ctx.stroke();ctx.beginPath();ctx.moveTo(rx*.7-i*rx*.08,-ry*.75);ctx.bezierCurveTo(rx*.95-i*rx*.09,-ry*.25, rx*.5-i*rx*.13,ry*.05, rx*.74-i*rx*.1,ry*.72);ctx.stroke();}
  ctx.globalAlpha=.8;ctx.strokeStyle='#d9b06f';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-ry*.78);ctx.lineTo(0,ry*.78);ctx.stroke();
  ctx.globalAlpha=.76;ctx.fillStyle='#9b7d83';ctx.strokeStyle='#d1a59d';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(rx*.03,ry*.83,rx*.32,ry*.18,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.globalAlpha=.42;ctx.strokeStyle='#edc0b2';ctx.lineWidth=2;for(let i=-4;i<=4;i++){ctx.beginPath();ctx.moveTo(rx*.03-rx*.25,ry*.73+i*ry*.02);ctx.quadraticCurveTo(rx*.03,ry*.83+i*ry*.025,rx*.03+rx*.25,ry*.73+i*ry*.02);ctx.stroke();}ctx.globalAlpha=.7;ctx.fillStyle='#80636d';ctx.beginPath();ctx.roundRect(-rx*.08,ry*.93,rx*.16,ry*.32,rx*.07);ctx.fill();
  ctx.restore();
  ctx.fillStyle='#d9b06f';ctx.font='12px sans-serif';ctx.letterSpacing='2px';ctx.fillText('VISUAL COMPATIBILITY MODE',cx-rx*.72,h*.86);
 }
}

export class BrainWorld{
 constructor(container,callbacks={}){
  this.container=container;this.callbacks=callbacks;this.time=0;this.view='brain';this.focus=[];this.labels=[];this.meshes=[];this.xray=false;this.exploded=false;this.isolated=false;this.connections=false;this.section=false;this.playing=true;this.rotating=true;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.speed=1000;this.myelinated=true;this.signalStart=-100;this.synapseStart=-100;this.neuroColor='#e4ba73';
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#080b10');this.scene.fog=new THREE.FogExp2('#080b10',.023);
  this.camera=new THREE.PerspectiveCamera(34,1,.01,160);this.camera.position.set(7,2.8,6.7);
  try{this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default',failIfMajorPerformanceCaveat:false});}catch(primary){console.warn('WebGL unavailable; using canvas compatibility mode.',primary);this.renderer=new CanvasFallbackRenderer(container);}this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));this.renderer.setClearColor('#080b10');this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;this.renderer.localClippingEnabled=true;container.append(this.renderer.domElement);
  this.renderer.domElement.setAttribute('aria-label','3D brain: drag to rotate, pinch or scroll to zoom, right-drag or two-finger drag to pan. Structure selection is also available in the text index.');this.renderer.domElement.setAttribute('role','img');
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.075;this.controls.minDistance=1;this.controls.maxDistance=70;this.controls.enablePan=true;this.controls.rotateSpeed=.55;this.controls.zoomSpeed=.6;this.controls.autoRotate=true;this.controls.autoRotateSpeed=.22;this.controls.target.set(0,-.15,-.15);
  this.controls.addEventListener('start',()=>{this.flight=null;this.rotating=false;this.callbacks.interact?.();});
  this.scene.add(new THREE.HemisphereLight('#d5e0ea','#1b1117',2.1));
  for(const [color,power,pos]of[['#f8dfc4',4,[2,5,6]],['#6a99b6',3,[-4,1,-4]],['#e5b4a4',1.8,[5,-2,-2]]]){const l=new THREE.DirectionalLight(color,power);l.position.set(...pos);this.scene.add(l);}
  this.brain=new THREE.Group();this.scene.add(this.brain);this.hemi={left:new THREE.Group(),right:new THREE.Group()};this.brain.add(this.hemi.left,this.hemi.right);this.inner=new THREE.Group();this.brain.add(this.inner);this.lines=new THREE.Group();this.brain.add(this.lines);
  this.neuron=new THREE.Group();this.synapse=new THREE.Group();this.glia=new THREE.Group();this.circuit=new THREE.Group();this.human=new THREE.Group();this.scene.add(this.neuron,this.synapse,this.glia,this.circuit,this.human);for(const g of [this.neuron,this.synapse,this.glia,this.circuit,this.human])g.visible=false;
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.pointerStart=null;this.renderer.domElement.addEventListener('pointerdown',e=>{this.pointerStart=[e.clientX,e.clientY];});this.renderer.domElement.addEventListener('pointerup',e=>this.pick(e));this.renderer.domElement.addEventListener('pointermove',e=>this.hover(e));
  this.resize=()=>{const w=container.clientWidth,h=container.clientHeight;this.camera.aspect=w/h;this.renderer.setSize(w,h);this.camera.clearViewOffset();if(w>850)this.camera.setViewOffset(w,h,-w*.15,0,w,h);else this.camera.setViewOffset(w,h,0,h*.20,w,h);this.camera.updateProjectionMatrix();};window.addEventListener('resize',this.resize);this.resize();
  this.clock=new THREE.Clock();this._loop=()=>{this.frame();this.frameId=requestAnimationFrame(this._loop);};this._loop();
 }
 async load(){
  const fetchMesh=async url=>{const r=await fetch(url);if(!r.ok)throw new Error('Anatomy asset could not be loaded.');const text=await r.text();if(!text.trim().startsWith('{'))throw new Error('Anatomy asset is not valid JSON.');return JSON.parse(text);};
  let cortex=null,subcortex=null;
  try{[cortex,subcortex]=await Promise.all([fetchMesh('assets/cortex-fsaverage5.json'),fetchMesh('assets/subcortex-fsaverage.json')]);}
  catch(error){console.warn('Research anatomy unavailable; using procedural teaching model.',error);}
  if(cortex)this.buildCortex(cortex);else this.buildFallbackCortex();
  if(subcortex)this.buildSubcortex(subcortex);
  this.buildSupportingAnatomy();this.buildNeuron();this.buildSynapse();this.buildGlia();this.buildCircuit();this.buildHuman();this.setView('brain',[],true);
 }
 geometry(raw){const positions=new Float32Array(raw.positions.length);for(let i=0;i<positions.length;i+=3){positions[i]=raw.positions[i]/50;positions[i+1]=(raw.positions[i+2]-15)/50;positions[i+2]=raw.positions[i+1]/50;}const ix=new Uint32Array(raw.indices.length);for(let i=0;i<ix.length;i+=3){ix[i]=raw.indices[i];ix[i+1]=raw.indices[i+2];ix[i+2]=raw.indices[i+1];}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setIndex(new THREE.BufferAttribute(ix,1));g.computeVertexNormals();return g;}
 register(o,id,kind='deep',side=null){o.userData.id=id;o.userData.kind=kind;o.userData.side=side;o.userData.baseColor=o.material.color.clone();o.userData.opacity=1;o.userData.originalPosition=o.position.clone();this.meshes.push(o);return o;}
 buildFallbackCortex(){
  for(const side of [-1,1]){
   const root=side<0?this.hemi.left:this.hemi.right;
   const lobes=[['frontal',[-.48,.18,.02],[.72,.9,.78]],['parietal',[-.18,.65,-.02],[.72,.72,.8]],['temporal',[-.2,-.35,.12],[.78,.48,.68]],['occipital',[.28,.25,-.03],[.58,.72,.7]]];
   for(const[id,pos,scale]of lobes){const o=sph(V(side*(pos[0]+.16),pos[1],pos[2]),V(...scale.map(x=>x)),STRUCTURES[id]?.color||'#ceaea0',root,{transparent:true,opacity:.92});o.userData.id=id;o.userData.kind='cortex';o.userData.side=side<0?'left':'right';o.userData.baseColor=o.material.color.clone();o.userData.opacity=1;this.meshes.push(o);}
   for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const p=V(side*(.46+.12*Math.cos(a)),.12+.72*Math.sin(a),.02);curve([p,V(p.x+side*.08,p.y+.13,p.z+.06),V(p.x-side*.04,p.y+.25,p.z-.04)],.018,'#e4b8a8',root,{transparent:true,opacity:.55});}
  }
 } 
 buildCortex(data){
  this.surfaceData={};for(const side of ['left','right']){
   const d=data.hemispheres[side],base=this.geometry(d),grouped={};this.surfaceData[side]={position:base.attributes.position,normal:base.attributes.normal};
   for(let i=0;i<d.indices.length;i+=3){const ids=d.indices.slice(i,i+3).map(j=>d.labels[j]);const id=ids[0]===ids[1]||ids[0]===ids[2]?ids[0]:ids[1]===ids[2]?ids[1]:ids[0];const label=data.labels[id];const key=label.name==='precentral'?'motor':['frontal','parietal','temporal','occipital'].includes(label.lobe)?label.lobe:'cortex';(grouped[key]??=[]).push(d.indices[i],d.indices[i+2],d.indices[i+1]);}
   const colors=new Float32Array(d.labels.length*3);for(let i=0;i<d.labels.length;i++){const v=clamp(.82-(d.sulc?.[i]??0)*.17,.34,1);colors.set([v,v*.93,v*.89],i*3);}
   for(const[id,indices]of Object.entries(grouped)){const g=new THREE.BufferGeometry();g.setAttribute('position',base.attributes.position);g.setAttribute('normal',base.attributes.normal);g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.setIndex(indices);g.computeBoundingSphere();const material=mat('#ceaea0',{vertexColors:true,transparent:true,opacity:1,depthWrite:true});const o=mesh(g,material,null,null,this.hemi[side]);this.register(o,id,'cortex',side);}
  }
 }
 buildSubcortex(data){
  for(const d of data.structures){let id=d.name.toLowerCase();if(['accumbens','caudate','pallidum','putamen'].some(n=>id.includes(n)))id='basal';else if(id.includes('ventricle'))id='ventricles';else if(id.includes('hippocampus'))id='hippocampus';else if(id.includes('amygdala'))id='amygdala';else if(id.includes('thalamus'))id='thalamus';if(!STRUCTURES[id])continue;const o=mesh(this.geometry(d),mat(STRUCTURES[id].color,{transparent:true}),null,null,this.inner);this.register(o,id,'deep',d.hemisphere);}
 }
 buildSupportingAnatomy(){
  const ell=(id,p,s)=>this.register(sph(ras(p),V(...s.map(x=>x/50)),STRUCTURES[id].color,this.inner,{transparent:true}),id);
  ell('hypothalamus',[0,-3,-12],[7,7,6]);
  const callosal=[];for(let i=0;i<=36;i++){const a=.05+i/36*Math.PI;callosal.push(ras([0,-10+42*Math.cos(a),17+19*Math.sin(a)]));}const cc=curve(callosal,.12,STRUCTURES.callosum.color,this.inner,{transparent:true});cc.scale.x=1.3;this.register(cc,'callosum');
  for(const side of [-1,1]){
   const geo=new THREE.SphereGeometry(1,80,56),p=geo.attributes.position;
   for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const a=Math.atan2(z,x),r=1+.025*Math.sin(Math.asin(clamp(y,-1,1))*95+a*3);p.setXYZ(i,x*r,y*r,z*r);}geo.computeVertexNormals();const cb=mesh(geo,mat('#c5a888',{transparent:true}),ras([side*24,-62,-37]),V(.64,.44,.65),this.inner);this.register(cb,'cerebellum');
  }
  ell('midbrain',[0,-20,-17],[11,10,11]);ell('pons',[0,-22,-32],[15,14,11]);ell('medulla',[0,-28,-48],[8,8,14]);
  this.register(curve([ras([0,-27,-56]),ras([0,-29,-75]),ras([0,-28,-100])],.10,STRUCTURES.spinal.color,this.inner,{transparent:true}),'spinal');
  // A few representative surface vascular paths; not a named arterial atlas.
  this.vessels=new THREE.Group();this.brain.add(this.vessels);
  if(this.surfaceData)for(const side of [-1,1])for(let k=0;k<3;k++){const pts=[],surface=this.surfaceData[side<0?'left':'right'];for(let j=0;j<11;j++){const target=ras([side*(51-7*j/10),30-k*26-j*2,5+j*4.8]);let best=0,distance=Infinity;for(let i=0;i<surface.position.count;i++){const p=V().fromBufferAttribute(surface.position,i),d=p.distanceToSquared(target);if(d<distance){distance=d;best=i;}}const p=V().fromBufferAttribute(surface.position,best);p.addScaledVector(V().fromBufferAttribute(surface.normal,best),.013);if(!pts.length||p.distanceTo(pts[pts.length-1])>.01)pts.push(p);}if(pts.length>2)curve(pts,.008,'#88433f',this.vessels,{transparent:true,opacity:.58});}this.vessels.visible=false;
 }
 buildNeuron(){
  this.axonPieces=[];this.myelinPieces=[];this.neuronParts=[];
  const part=(o,id,name,p,description)=>{o.userData.neuronPart=id;this.neuronParts.push(o);this.neuronLabels??=[];this.neuronLabels.push({id,name,pos:V(...p),description});return o;};
  part(sph(V(-1.35,.08,0),V(.4,.34,.34),'#c69b81',this.neuron),'soma','Cell body',[-1.35,-.4,0],'The soma sustains the cell and integrates many incoming signals.');
  part(sph(V(-1.35,.08,.29),V(.15,.15,.13),'#d9bbb6',this.neuron),'nucleus','Nucleus',[-1.35,.25,.34],'The nucleus contains DNA and regulates gene expression.');
  for(let i=0;i<11;i++){
   const a=.58+i/(10)*(Math.PI*2-1.16);const start=V(-1.35+Math.cos(a)*.25,Math.sin(a)*.24,0);const end=V(-1.35+Math.cos(a)*(1.2+rand()*.5),Math.sin(a)*(1.05+rand()*.6),(rand()-.5)*1.2);const trunk=curve([start,start.clone().lerp(end,.55).add(V(0,.1,0)),end],.034,'#bd977f',this.neuron);trunk.userData.neuronPart='dendrites';this.neuronParts.push(trunk);
   for(let j=0;j<3;j++){const end2=end.clone().add(V((rand()-.5)*.8,(rand()-.5)*.8,(rand()-.5)*.7));curve([end.clone().lerp(start,.15+j*.1),end2],.012,'#af8d77',this.neuron);for(let k=0;k<2;k++){const twig=end2.clone().add(V((rand()-.5)*.45,(rand()-.5)*.45,(rand()-.5)*.35));curve([end2,twig],.005,'#af8d77',this.neuron);}}
  }
  this.neuronLabels.push({id:'dendrites',name:'Dendrites',pos:V(-2.55,1.0,.2),description:'Branching structures that receive many synaptic inputs. Real neurons have diverse shapes.'});
  this.axonCurve=new THREE.CatmullRomCurve3([V(-1,.02,0),V(-.4,-.12,0),V(.7,-.22,.1),V(1.9,-.05,0),V(3,.13,0)]);
  for(let i=0;i<75;i++){const o=curve([this.axonCurve.getPoint(i/75),this.axonCurve.getPoint((i+1)/75)],.025,'#b99d87',this.neuron,{emissive:'#dbb977',emissiveIntensity:0});o.userData.neuronPart='axon';this.axonPieces.push(o);this.neuronParts.push(o);}
  for(let i=0;i<7;i++){const a=.19+i*.103,b=a+.081;const o=curve([this.axonCurve.getPoint(a),this.axonCurve.getPoint((a+b)/2),this.axonCurve.getPoint(b)],.10,'#93b7b0',this.neuron,{transparent:true,opacity:.78,roughness:.45});o.userData.neuronPart='myelin';this.myelinPieces.push(o);this.neuronParts.push(o);}
  for(let i=0;i<4;i++){const start=V(3,.13,0),end=V(3.6+rand()*.2,(i-1.5)*.4,(rand()-.5)*.7);const b=curve([start,start.clone().lerp(end,.5),end],.018,'#bfab87',this.neuron);part(sph(end,V(.07,.07,.07),'#d8b678',this.neuron),'terminals','Axon terminals',[3.7,.5,0],'Terminals communicate with target cells, commonly by releasing neurotransmitters at synapses.');}
  this.neuronLabels.push({id:'axon',name:'Axon',pos:V(.55,-.55,.1),description:'The long extension along which an action potential propagates.'},{id:'myelin',name:'Myelin',pos:V(1.45,.4,0),description:'A multilayered membrane sheath around some axons.'},{id:'nodes',name:'Node of Ranvier',pos:this.axonCurve.getPoint(.48).add(V(0,-.45,0)),description:'A gap in myelin where action potentials regenerate.'});
 }
 buildSynapse(){
  this.vesicles=[];this.molecules=[];this.receptors=[];
  sph(V(0,1.25,0),V(1.75,1.12,.87),'#a58674',this.synapse,{transparent:true,opacity:.38,side:THREE.DoubleSide,depthWrite:false});
  curve([V(-.26,2.65,0),V(-.18,2.03,0),V(0,1.9,0)],.19,'#b89c81',this.synapse);
  const membrane=new THREE.BoxGeometry(4.5,.10,1.7);mesh(membrane,mat('#9ca8ab',{roughness:.38}),V(0,-.8,0),null,this.synapse);
  mesh(new THREE.BoxGeometry(4.5,.6,1.7),mat('#668a9a',{transparent:true,opacity:.1,depthWrite:false}),V(0,-1.12,0),null,this.synapse);
  for(let i=0;i<9;i++){const pos=V((rand()-.5)*2.3,.48+rand()*.9,(rand()-.5)*.8);const o=sph(pos,V(.15,.15,.15),'#d5b986',this.synapse,{transparent:true,opacity:.62,wireframe:true});o.userData.rest=pos.clone();this.vesicles.push(o);for(let j=0;j<5;j++)sph(V((rand()-.5)*.14,(rand()-.5)*.14,(rand()-.5)*.14),V(.015,.015,.015),'#e4ba73',o,{emissive:'#a4783e',emissiveIntensity:.4});}
  for(let i=0;i<6;i++){const g=new THREE.Group();g.position.set((i-2.5)*.57,-.7,.25);this.synapse.add(g);for(let s of [-1,1])sph(V(s*.065,.06,0),V(.047,.15,.085),'#9fbac9',g);this.receptors.push(g);}
  for(let i=0;i<40;i++){const o=sph(V(),V(.027,.027,.027),this.neuroColor,this.synapse,{emissive:this.neuroColor,emissiveIntensity:.6});o.visible=false;o.userData.seed=rand();o.userData.dest=V((rand()-.5)*3,-.61,(rand()-.5)*.75);this.molecules.push(o);}
  this.calcium=[];for(let i=0;i<9;i++){const o=sph(V(),V(.024,.024,.024),'#a5d9e8',this.synapse,{emissive:'#80c8e8',emissiveIntensity:.6});o.visible=false;o.userData.n=i;this.calcium.push(o);}
  this.synapseLabels=[{name:'Presynaptic terminal',pos:V(-1.8,1.55,.2)},{name:'Vesicles',pos:V(.85,1.48,.8)},{name:'Synaptic cleft',pos:V(1.7,-.3,.5)},{name:'Receptors',pos:V(.5,-.58,.5)},{name:'Postsynaptic membrane',pos:V(-1.55,-.95,.6)}];
 }
 buildGlia(){
  this.gliaCells={};const colors={astrocyte:'#a0c9c9',oligodendrocyte:'#c6b9dc',microglia:'#b2bd85'};
  for(const[id,pos,radius,n]of[['astrocyte',[-1.8,.25,0],.85,15],['oligodendrocyte',[.7,-.5,0],.7,7],['microglia',[1.9,.65,0],.6,13]]){const g=new THREE.Group();g.position.set(...pos);this.glia.add(g);this.gliaCells[id]=g;sph(V(),V(.15,.15,.15),colors[id],g);for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const end=V(Math.cos(a)*radius,Math.sin(a)*radius,(rand()-.5)*.5);curve([V(),end.clone().multiplyScalar(.5).add(V(.05,0,0)),end],id==='microglia'?.009:.024,colors[id],g);for(let j=0;j<3;j++)curve([end,end.clone().add(V((rand()-.5)*.4,(rand()-.5)*.4,(rand()-.5)*.3))],.007,colors[id],g);}}
  curve([V(-3,1.4,-.2),V(-1.7,1.2,-.3),V(-.5,1.45,-.3)],.095,'#9e5554',this.glia);curve([V(-3,-1.3,0),V(0,-1,0),V(3,-1.25,0)],.035,'#bba082',this.glia);
  for(let i=0;i<4;i++){const x=-.4+i*.58;curve([V(x,-1.04,0),V(x+.4,-1.09,0)],.092,'#c0b5d1',this.glia);curve([V(.7,-.5,0),V(x+.2,-1.07,0)],.014,'#c0b5d1',this.glia);}
 }
 buildCircuit(){
  this.circuitNodes=[];const count=90;for(let i=0;i<count;i++){const pos=V((rand()-.5)*6,(rand()-.5)*3.7,(rand()-.5)*3);const o=sph(pos,V(.025,.025,.025),'#c4b58f',this.circuit,{emissive:'#d6b374',emissiveIntensity:.45});this.circuitNodes.push(o);}
  for(let i=0;i<count;i++){const near=this.circuitNodes.map((o,j)=>({j,d:o.position.distanceTo(this.circuitNodes[i].position)})).filter(o=>o.j!==i).sort((a,b)=>a.d-b.d).slice(0,3);for(const n of near){const g=new THREE.BufferGeometry().setFromPoints([this.circuitNodes[i].position,this.circuitNodes[n.j].position]);this.circuit.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:'#b09b72',transparent:true,opacity:.16})));}}
 }
 buildHuman(){
  const m=mat('#6b8491',{transparent:true,opacity:.08,depthWrite:false,roughness:1});this.skull=sph(V(0,.05,-.14),V(1.62,1.96,2.12),'#627684',this.human,{transparent:true,opacity:.055,depthWrite:false,side:THREE.BackSide});
  mesh(new THREE.SphereGeometry(1,32,24),m,V(0,-5.4,-.3),V(3.3,3.3,1.0),this.human);mesh(new THREE.CylinderGeometry(.55,.8,2.4,20),m,V(0,-2.7,-.35),null,this.human);
  for(const s of [-1,1]){mesh(new THREE.CapsuleGeometry(.36,4.7,6,12),m,V(s*3.15,-5.6,-.1),null,this.human);mesh(new THREE.CapsuleGeometry(.5,4.8,6,12),m,V(s*.85,-10.8,-.2),null,this.human);}
  this.eyes=new THREE.Group();this.scene.add(this.eyes);this.eyeForms=[];for(const side of [-1,1]){const eye=new THREE.Group();eye.position.copy(ras([side*30,88,-15]));this.eyes.add(eye);sph(V(),V(.18,.13,.17),'#9aabb2',eye,{transparent:true,opacity:.55});sph(V(0,0,.165),V(.062,.062,.025),'#5e929f',eye);sph(V(0,0,.19),V(.025,.025,.012),'#111d26',eye);this.eyeForms.push(eye);}this.eyes.visible=false;
  this.hand=new THREE.Group();this.hand.position.set(3.15,-8.5,0);this.human.add(this.hand);sph(V(),V(.22,.28,.11),'#7a8b96',this.hand,{transparent:true,opacity:.3});for(let i=0;i<4;i++)mesh(new THREE.CapsuleGeometry(.035,.24,4,8),m,V((i-1.5)*.09,-.35,0),null,this.hand);this.finger=this.hand.children[2];this.muscle=sph(V(3.15,-6.8,0),V(.18,.8,.15),'#a47466',this.human,{transparent:true,opacity:.18,emissive:'#ba9170',emissiveIntensity:0});
 }
 groupMode(view){return ['neuron'].includes(view)?'neuron':view==='synapse'?'synapse':view==='glia'?'glia':view==='circuit'?'circuit':'brain';}
 setView(view,focus=[],instant=false){
  const previousMode=this.groupMode(this.view);this.view=view;this.viewStarted=this.time;this.focus=focus;this.exploded=view==='hemispheres';this.xray=['xray','memory','emotion','body','network','stem','sleep','vision'].includes(view);this.section=view==='section';this.isolated=false;
  const mode=this.groupMode(view);for(const name of ['brain','neuron','synapse','glia','circuit'])this[name].visible=name===mode;
  this.human.visible=['intro','body','finale'].includes(view);this.brain.visible=mode==='brain';this.vessels.visible=['intro','brain','cortex','finale'].includes(view)&&!focus.length;if(this.eyes)this.eyes.visible=['intro','body','finale','vision'].includes(view);
  const views={brain:[7,2.8,6.7],hemispheres:[.2,3,9.6],cortex:[4.1,2.3,2.5],xray:[6,2.4,6.2],memory:[6,.8,5.5],emotion:[6,1.2,5.6],cerebellum:[5,-2.3,-6.3],stem:[5,-2.2,5.5],section:[7,2,6],vision:[5,2,-6.6],network:[6.8,3,7],body:[10,-3,17],neuron:[.5,1,10.5],synapse:[.2,2.2,10.8],glia:[0,1.6,10.7],circuit:[0,2,10],sleep:[6,2.5,7],intro:[0,-4,28],finale:[0,-4,24]};
  const target=mode==='synapse'?V(0,.65,0):['body','intro','finale'].includes(view)?V(0,-3.4,0):view==='stem'?V(0,-.7,-.1):mode==='brain'?V(0,-.15,-.15):V(.15,0,0);
  const position=V(...(views[view]??views.brain));if(this.container.clientWidth<=850){const f=mode==='neuron'?2.4:mode==='synapse'?1.7:mode==='brain'?1.55:2.1;position.sub(target).multiplyScalar(f).add(target);}
  if(previousMode!==mode&&!instant&&!this.reduced){this.camera.position.copy(target).add(V(.3,.3,1.6));this.controls.target.copy(target);}
  this.fly(position,target,instant);this.setConnections(false);this.applyFocus();this.renderer.toneMappingExposure=1.2;
 }
 fly(pos,target,instant=false){if(instant||this.reduced){this.camera.position.copy(pos);this.controls.target.copy(target);this.flight=null;return;}this.flight={start:this.time,duration:2.4,from:this.camera.position.clone(),to:pos,tf:this.controls.target.clone(),tt:target};}
 takeMe(id){const d=STRUCTURES[id];if(!d)return;const p=ras(d.pos);const normal=V(p.x<0?-1:1,.45,p.z<-.6?-1:1).normalize();this.fly(p.clone().addScaledVector(normal,3.4),p);this.focus=[id];this.applyFocus();}
 reset(){this.setView(this.view,[]);this.rotating=true;}
 setFocus(ids){this.focus=ids;this.applyFocus();}
 applyFocus(){
  for(const o of this.meshes){const {id,kind,side}=o.userData;const active=this.focus.includes(id)||this.focus.includes('brainstem')&&['midbrain','pons','medulla'].includes(id)||this.focus.includes(side)||this.focus.includes('cortex')&&kind==='cortex'||this.focus.includes('frontal')&&id==='motor';
   const has=this.focus.length>0;let opacity=kind==='cortex'?(this.xray?.09:this.section?.32:has&&!active?.26:1):1;
   if(kind!=='cortex'&&has&&!active)opacity=this.xray?.25:.65;if(this.isolated&&!active)opacity=.055;
   o.userData.opacity=opacity;const color=active?new THREE.Color(STRUCTURES[id]?.color??'#e0b887'):kind==='cortex'?new THREE.Color('#c6a899'):o.userData.baseColor;
   o.userData.targetColor=color;o.material.depthWrite=opacity>.65;o.material.emissive.set(active?'#6e5137':'#000000');o.material.emissiveIntensity=active?.12:0;
   o.material.clippingPlanes=this.section&&kind==='cortex'?[new THREE.Plane(V(-1,0,0),.05)]:[];
  }
 }
 setConnections(enabled,kind){this.connections=enabled;this.connectionKind=kind;while(this.lines.children.length){const o=this.lines.children.pop();o.traverse?.(n=>{n.geometry?.dispose();n.material?.dispose();});}this.pathCurves=[];this.pathDots=[];if(!enabled)return;
  let points,color='#d4b17b';if(NETWORKS[kind]){points=NETWORKS[kind].points;color=NETWORKS[kind].color;}
  else if(EXPERIENCES[kind])points=EXPERIENCES[kind].points;
  else if(kind==='callosal')points=[[-40,28,25],[0,0,30],[40,28,25],[0,-25,30],[-40,-40,30]];
  else if(kind==='sensory')points=[[15,-26,3],[22,-91,12],[13,-19,6],[53,-20,-13],[36,37,25]];
  else if(kind==='action')points=[[36,37,25],[24,2,5],[13,-19,6],[36,-12,52],[25,-57,-37],[36,37,25]];
  else points=(this.focus.length>1?this.focus:['frontal','thalamus','temporal','hippocampus','parietal','occipital']).map(k=>STRUCTURES[k]?.pos).filter(Boolean);
  if(points.length===1)points.push(STRUCTURES.thalamus.pos,STRUCTURES.frontal.pos);
  const pts=points.map(ras);for(let i=0;i<pts.length;i++){const node=sph(pts[i],V(.036,.036,.036),color,this.lines,{emissive:color,emissiveIntensity:1.2});node.userData.node=true;}
  const links=NETWORKS[kind]?pts.map((_,i)=>[i,(i+1)%pts.length]).concat(pts.slice(2).map((_,i)=>[0,i+2])):pts.slice(1).map((_,i)=>[i,i+1]);
  for(const[a,b]of links){const mid=pts[a].clone().lerp(pts[b],.5).add(V(0,.1,.15));const c=new THREE.CatmullRomCurve3([pts[a],mid,pts[b]]);const line=mesh(new THREE.TubeGeometry(c,36,.009,6,false),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.4}),null,null,this.lines);this.pathCurves.push(c);for(let d=0;d<2;d++){const dot=sph(V(),V(.025,.025,.025),color,this.lines,{emissive:color,emissiveIntensity:1.3});dot.userData={curve:c,offset:d*.5};this.pathDots.push(dot);}}
  if(kind==='see'){const c=new THREE.CatmullRomCurve3([ras([-31,86,-10]),ras([-9,10,-12]),ras([0,3,-12]),ras([15,-26,3])]);mesh(new THREE.TubeGeometry(c,45,.009,6,false),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.4}),null,null,this.lines);this.pathCurves.push(c);const dot=sph(V(),V(.025,.025,.025),color,this.lines,{emissive:color,emissiveIntensity:1.3});dot.userData={curve:c,offset:.2};this.pathDots.push(dot);}
 }
 setTransmitter(color){this.neuroColor=color;for(const o of this.molecules){o.material.color.set(color);o.material.emissive.set(color);}}
 setGlia(id){this.glial=id;for(const[key,g]of Object.entries(this.gliaCells))g.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=key===id?1:.15;}});}
 trigger(){if(this.view==='synapse')this.synapseStart=this.time;else this.signalStart=this.time;}
 setMyelin(value){this.myelinated=value;for(const o of this.myelinPieces)o.visible=value;}
 pick(e){if(!this.pointerStart||Math.hypot(e.clientX-this.pointerStart[0],e.clientY-this.pointerStart[1])>6)return;const hits=this.hits(e);if(!hits.length)return;const o=hits[0].object;if(o.userData.neuronPart){this.callbacks.neuron?.(o.userData.neuronPart);return;}const id=o.userData.id;if(id)this.callbacks.select?.(id);}
 hits(e){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);let list=this.groupMode(this.view)==='neuron'?this.neuronParts:this.meshes;list=list.filter(o=>o.visible&&this.visible(o)&&(!this.xray||o.userData.kind!=='cortex'));return this.raycaster.intersectObjects(list,false);}
 visible(o){while(o){if(!o.visible)return false;o=o.parent;}return true;}
 hover(e){if(this.hoverLast&&performance.now()-this.hoverLast<90)return;this.hoverLast=performance.now();const hit=this.hits(e)[0];this.renderer.domElement.style.cursor=hit?'pointer':'grab';this.callbacks.hover?.(hit?.object.userData.id??hit?.object.userData.neuronPart??null);}
 getLabels(){
  let labels=[];if(this.view==='neuron')labels=this.neuronLabels;else if(this.view==='synapse')labels=this.synapseLabels;else if(this.view==='glia')labels=[{name:'Astrocyte',pos:V(-1.8,.55,0)},{name:'Oligodendrocyte',pos:V(.7,-.4,0)},{name:'Microglia',pos:V(1.9,1,0)}];else if(this.brain.visible){labels=(this.focus.length?this.focus.slice(0,5):['frontal','parietal','temporal','cerebellum']).filter(k=>STRUCTURES[k]).map(id=>({id,name:STRUCTURES[id].name,pos:ras(STRUCTURES[id].pos)}));}
  return (labels??[]).map(l=>{const p=l.pos.clone();if(this.exploded&&this.groupMode(this.view)==='brain')p.x+=p.x<0?-(this.explodeAmount??0):(this.explodeAmount??0);const n=p.project(this.camera);return{...l,x:(n.x*.5+.5)*this.container.clientWidth,y:(-.5*n.y+.5)*this.container.clientHeight,visible:n.z<1&&Math.abs(n.x)<1&&Math.abs(n.y)<.92};});
 }
 frame(){
  const dt=Math.min(this.clock.getDelta(),.05);this.time+=this.playing?dt:0;const t=this.time;
  if(this.flight){const a=clamp((t-this.flight.start)/this.flight.duration),e=a*a*(3-2*a);this.camera.position.lerpVectors(this.flight.from,this.flight.to,e);this.controls.target.lerpVectors(this.flight.tf,this.flight.tt,e);if(a===1)this.flight=null;}
  this.controls.autoRotate=this.rotating&&!this.flight&&this.playing&&!this.reduced&&this.groupMode(this.view)==='brain';this.controls.update(dt);
  this.explodeAmount=mix(this.explodeAmount??0,this.exploded?.65:0,Math.min(dt*3,1));this.hemi.left.position.x=-this.explodeAmount;this.hemi.right.position.x=this.explodeAmount;
  for(const o of this.meshes){o.material.opacity=mix(o.material.opacity,o.userData.opacity??1,Math.min(dt*4,1));if(o.userData.targetColor)o.material.color.lerp(o.userData.targetColor,Math.min(dt*4,1));}
  for(const dot of this.pathDots??[]){const p=(t*.24+dot.userData.offset)%1;dot.position.copy(dot.userData.curve.getPoint(p));}
  if(this.neuron.visible){const dur=(this.myelinated?.006:.03)*this.speed,elapsed=t-this.signalStart,p=elapsed/dur;this.signalProgress=clamp(p);for(let i=0;i<this.axonPieces.length;i++){const q=i/this.axonPieces.length;this.axonPieces[i].material.emissiveIntensity=p>=0&&p<=1?Math.max(0,1-Math.abs(q-p)*15)*2.7:0;}}
  if(this.synapse.visible){const elapsed=t-this.synapseStart,phase=elapsed/7;this.synapseProgress=clamp(phase);for(let i=0;i<this.vesicles.length;i++){const v=this.vesicles[i];v.position.copy(v.userData.rest);if(i===0&&phase>=0&&phase<.5)v.position.lerp(V(0,.18,0),clamp(phase/.28));v.scale.setScalar(i===0&&phase>.28&&phase<.9?.75:1);}
   for(const m of this.molecules){const s=m.userData.seed,start=.24+s*.14,p=clamp((phase-start)/.3);m.visible=phase>start&&phase<.93;if(m.visible){m.position.copy(V(0,.12,0)).lerp(m.userData.dest,p);m.position.x+=Math.sin(t*8+s*90)*.07*Math.sin(p*Math.PI);m.position.z+=Math.cos(t*11+s*70)*.1*Math.sin(p*Math.PI);m.material.opacity=phase>.7?clamp((.93-phase)/.23):1;m.material.transparent=true;}}
   for(const c of this.calcium){c.visible=phase>=0&&phase<.3;const p=clamp(phase/.3);c.position.set((c.userData.n-4)*.14,mix(-.03,.6,p),.35);}
   for(const r of this.receptors)r.children.forEach(o=>{o.material.emissive.set(this.neuroColor);o.material.emissiveIntensity=phase>.48&&phase<.85?.8:0;});
  }
  if(this.circuit.visible)for(let i=0;i<this.circuitNodes.length;i++)this.circuitNodes[i].material.emissiveIntensity=.2+Math.pow(Math.max(0,Math.sin(t*1.8+i*.52)),5)*2;
  if(this.glia.visible&&this.gliaCells?.microglia&&!this.reduced)this.gliaCells.microglia.rotation.z=Math.sin(t*.3)*.04;
  if(this.eyes?.visible)for(const e of this.eyeForms)e.scale.y=this.view==='intro'?.07:this.view==='finale'?mix(.07,1,clamp((t-this.viewStarted-1.4)/2)):1;
  if(this.muscle){const activation=this.human.visible&&this.connectionKind==='move'?Math.max(0,Math.sin(t*1.5))**8:0;this.muscle.material.emissiveIntensity=activation*.6;this.muscle.material.opacity=.18+activation*.35;if(this.finger)this.finger.rotation.x=activation*.6;}
  this.renderer.render(this.scene,this.camera);if(!this.lastLabels||performance.now()-this.lastLabels>70){this.callbacks.labels?.(this.getLabels());this.lastLabels=performance.now();}
 }
}

