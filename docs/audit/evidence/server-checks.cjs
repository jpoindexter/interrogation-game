const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');
const root = process.cwd();
const req = createRequire(path.join(root, 'package.json'));
const ts = req('typescript');
const { NextRequest } = req('next/server');
const cache = new Map();
const results = [];
let aiResponse = {};
let judgeFails = false;
let dbFails = false;
let fetchCalls = 0;
const db = { from: () => ({
  upsert: () => Promise.resolve({error:null}),
  insert: () => ({select: () => ({single: async () => ({
    data: dbFails ? null : {id:'test',score:1},
    error: dbFails ? new Error('simulated DB failure') : null,
  })})}),
})};
const mocks = {
  [path.join(root,'src/lib/db.ts')]: {__esModule:true,default:db,getSupabaseClient:()=>db},
  [path.join(root,'src/lib/mistral/index.ts')]: {
    interrogate:async()=>({...aiResponse}),
    evaluateAccusation:async()=>{if(judgeFails)throw new Error('simulated provider failure');return {correct:false,confession:'No.'};},
  },
};
function load(file) {
  if (mocks[file]) return mocks[file];
  if (cache.has(file)) return cache.get(file).exports;
  const mod = {exports:{}}; cache.set(file,mod);
  function localRequire(id) {
    if (!id.startsWith('.') && !id.startsWith('@/')) return req(id);
    const p = id.startsWith('@/') ? path.join(root,'src',id.slice(2)) : path.resolve(path.dirname(file),id);
    const found = [p+'.ts',path.join(p,'index.ts'),p].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
    if (!found) throw new Error('Missing '+id);
    return load(found);
  }
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(localRequire,mod,mod.exports);
  return mod.exports;
}
function note(name, observed) {results.push({name,observed});}
function request(route, body, headers={}) {return new NextRequest('http://audit.invalid/api/'+route,{method:'POST',headers:{'content-type':'application/json','x-real-ip':String(Math.random()),...headers},body:JSON.stringify(body)});}
function assert(x,msg) {if(!x)throw new Error(msg);}
const sessions = load(path.join(root,'src/lib/game-session.ts'));
const questionRoute = load(path.join(root,'app/api/interrogate/route.ts'));
const accuseRoute = load(path.join(root,'app/api/accuse/route.ts'));
const boardRoute = load(path.join(root,'app/api/leaderboard/route.ts'));
const ttsRoute = load(path.join(root,'app/api/tts/route.ts'));
const sanitize = load(path.join(root,'src/lib/sanitize.ts'));
const caseData = {difficulty:'easy',the_lie:'I never accessed the vault at midnight',the_truth:'Stole the diamond using a duplicate vault key',the_contradiction:'The camera recorded vault entry at midnight',suspect_name:'Test',setting:'bank'};
function session(mode='countdown') {const id=sessions.createSession(caseData,[],0,mode);return sessions.getSession(id);}
(async()=>{
  const s=session(); s.currentStress=7;
  for(let i=0;i<3;i++)sessions.addMessage(s.id,'user','Please explain your whereabouts that evening.');
  aiResponse={spoken_response:caseData.the_truth,stress_level:8,clue_unlocked:'A duplicate key exists.'};
  const leak=await (await questionRoute.POST(request('interrogate',{sessionId:s.id,playerQuestion:'Explain who could access the security room.'}))).json();
  assert(leak.clue_unlocked===null&&s.cluesCollected===1,'clue mismatch not reproduced');
  assert(s.conversationHistory.at(-1).content===caseData.the_truth,'raw response not stored');
  note('Filtered clue still counted and raw leak persisted',{returnedClue:leak.clue_unlocked,serverClues:s.cluesCollected,storedRawLeak:true});
  const u=session('unlimited');u.startTime=Date.now()-601000;
  const timed=await(await questionRoute.POST(request('interrogate',{sessionId:u.id,playerQuestion:'Explain who was working that evening.'}))).json();
  assert(timed.timeExpired===true,'unlimited cap not reproduced');
  note('Unlimited easy session expires after 10 minutes',{timeExpired:timed.timeExpired});
  const a=session();a.cluesCollected=2;judgeFails=true;
  const failed=await accuseRoute.POST(request('accuse',{sessionId:a.id,accusation:'You lied about being home during the robbery.'}));
  assert(failed.status===500&&a.accusationsLeft===3&&a.accusationsUsed===1,'refund mismatch not reproduced');
  note('Provider failure refunds remaining attempt but retains score penalty',{status:failed.status,left:a.accusationsLeft,used:a.accusationsUsed});
  judgeFails=false;
  const w=session();sessions.addMessage(w.id,'user','Where were you?');sessions.addMessage(w.id,'user','[ACCUSATION] You lied about the key.');
  const token=sessions.issueWinToken(w.id);dbFails=true;
  const serverQuestionCount=sessions.getSessionStats(w.id).questionsAsked;
  sessions.deleteSession(w.id); // Real win screen evaluates and deletes the session before score submission.
  const submission=await boardRoute.POST(request('leaderboard',{sessionId:w.id,winToken:token,playerName:'TST'}));
  const retry=await boardRoute.POST(request('leaderboard',{sessionId:w.id,winToken:token,playerName:'TST'}));
  assert(submission.status===500&&retry.status===401,'token loss not reproduced');
  note('Failed leaderboard write consumes retry token after evaluation',{first:submission.status,retry:retry.status,serverQuestionCount});
  assert(serverQuestionCount===2,'accusation not counted');
  const realFetch=global.fetch;
  global.fetch=async()=>{fetchCalls++;return new Response(new Uint8Array([0,1,2]),{headers:{'content-type':'audio/mpeg'}});};
  const t=session();
  const audio=await ttsRoute.POST(request('tts',{sessionId:t.id,role:'detective',text:'Arbitrary speech unrelated to the case.'},{'x-elevenlabs-api-key':'audit-placeholder'}));
  global.fetch=realFetch;
  assert(audio.status===200&&fetchCalls===1,'detective bypass not reproduced');
  note('Detective role skips conversation text validation',{status:audio.status,mockedProviderCalls:fetchCalls});
  const innocent='What were you told about the security alarm?';
  assert(sanitize.isInjectionAttempt(innocent),'false positive not reproduced');
  note('Ordinary detective question classified as injection',{question:innocent,blocked:true});
  const limiter=load(path.join(root,'src/lib/rate-limit.ts'));
  const noHeaders=new NextRequest('http://audit.invalid');
  const ip1=limiter.getClientIp(noHeaders),ip2=limiter.getClientIp(noHeaders);
  assert(ip1!==ip2,'unique bucket not reproduced');
  note('Missing IP headers yield fresh rate-limit buckets',{sameRequestDifferentBuckets:true});
  const twice=session(); const twiceToken=sessions.issueWinToken(twice.id);
  const accepts=[sessions.consumeWinToken(twice.id,twiceToken),sessions.consumeWinToken(twice.id,twiceToken),sessions.consumeWinToken(twice.id,twiceToken)];
  assert(accepts[0]&&accepts[1]&&!accepts[2],'double consumption not reproduced');
  note('Win token accepted twice while game session remains alive',{accepts});
  fs.writeFileSync('/tmp/interrogation-audit-check-results.json',JSON.stringify({scope:'Real server modules; mocked AI, DB, and TTS network. No live browser or provider test.',results},null,2));
  console.log(JSON.stringify(results,null,2));process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
