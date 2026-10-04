export class Soundscape{
 constructor(){
  this.enabled=false;this.narration=true;this.mode='intro';this.available='speechSynthesis' in window;this.voices=[];this.voiceReady=false;this.retry=0;
  if(this.available){this.synth=window.speechSynthesis;this.voices=this.synth.getVoices();this.voiceReady=this.voices.length>0;this.synth.addEventListener('voiceschanged',()=>{this.voices=this.synth.getVoices();this.voiceReady=this.voices.length>0;});}
 }
 async start(enabled){this.enabled=enabled;if(enabled){await this.ensure();this.context?.resume();if(this.master&&this.context)this.master.gain.setTargetAtTime(.22,this.context.currentTime,.7);}this.beatTimer??=setInterval(()=>{if(this.enabled&&['intro','body','sleep'].includes(this.mode))this.heartbeat();},1100);}
 async ensure(){if(this.context)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;try{this.context=new C();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);for(const hz of [55,82.41,110.2]){const osc=this.context.createOscillator(),g=this.context.createGain();osc.type='sine';osc.frequency.value=hz;g.gain.value=hz===55?.043:.012;osc.connect(g).connect(this.master);osc.start();}}catch{this.enabled=false;}}
 async toggle(){this.enabled=!this.enabled;await this.ensure();if(this.context){await this.context.resume();this.master.gain.setTargetAtTime(this.enabled?.22:0,this.context.currentTime,.3);}if(!this.enabled)this.cancel();return this.enabled;}
 heartbeat(){if(!this.context)return;for(const offset of [0,.18]){const o=this.context.createOscillator(),g=this.context.createGain(),t=this.context.currentTime+offset;o.type='sine';o.frequency.setValueAtTime(65,t);o.frequency.exponentialRampToValueAtTime(32,t+.18);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(offset?.17:.29,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+.23);o.connect(g).connect(this.master);o.start(t);o.stop(t+.26);}}
 cue(kind='signal'){if(!this.enabled||!this.context)return;const t=this.context.currentTime,o=this.context.createOscillator(),g=this.context.createGain();o.type='sine';o.frequency.setValueAtTime(kind==='signal'?360:180,t);o.frequency.exponentialRampToValueAtTime(kind==='signal'?1100:75,t+.35);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.028,t+.04);g.gain.exponentialRampToValueAtTime(.0001,t+.8);o.connect(g).connect(this.master);o.start(t);o.stop(t+.85);}
 speak(text){
  if(!this.narration||!this.available||!text)return;
  const phrase=String(text);this.cancel();this.retry=0;
  const deliver=()=>{
   if(!this.narration||!this.available)return;
   const u=new SpeechSynthesisUtterance(phrase);u.lang='en-US';u.rate=.86;u.pitch=.91;u.volume=.9;
   const voices=this.voices.length?this.voices:this.synth.getVoices();
   u.voice=voices.find(v=>/^en(-|_)/i.test(v.lang)&&/Samantha|Alex|Daniel|Karen|Google|Microsoft/i.test(v.name))||voices.find(v=>/^en(-|_)/i.test(v.lang))||null;
   u.onend=()=>{this.utterance=null;};u.onerror=()=>{if(this.retry++<1){this.synth.cancel();setTimeout(deliver,180);}};
   this.utterance=u;this.synth.resume();this.synth.speak(u);
  };
  if(!this.voiceReady&&!this.voices.length){setTimeout(()=>{this.voices=this.synth.getVoices();this.voiceReady=this.voices.length>0;deliver();},250);}else deliver();
 }
 cancel(){if(this.available){this.synth.cancel();this.utterance=null;}}
 pause(paused){if(!this.available)return;if(paused)this.synth.pause();else this.synth.resume();}
}
