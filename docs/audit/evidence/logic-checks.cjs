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
let writes=[];let embeds=[];
const db = { from: () => ({
  upsert: (row) => { writes.push(row);return Promise.resolve({error:null}); },
  insert: () => ({select: () => ({single: async () => ({
    data: dbFails ? null : {id:'test',score:1},
    error: dbFails ? new Error('simulated DB failure') : null,
  })})}),
})};
const mocks = {
  [path.join(root,'src/lib/db.ts')]: {__esModule:true,default:db,getSupabaseClient:()=>db},
  [path.join(root,'src/lib/mistral/index.ts')]: {
    interrogate:async()=>({...aiResponse}),
    evaluateWin:async()=>({correct:true,reveal_the_lie:'mocked secret'}),
    generateLossSummary:async()=>({the_lie_revealed:'mocked secret'}),
    evaluateAccusation:async()=>{if(judgeFails)throw new Error('simulated provider failure');return {correct:false,confession:'No.'};},
  },
};
mocks[path.join(root,'src/lib/mistral/embeddings.ts')]={embedOne:async(text)=>{embeds.push(text);return [0,0];}};
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
const evaluateRoute=load(path.join(root,'app/api/evaluate/route.ts'));
const patternRoute=load(path.join(root,'app/api/patterns/route.ts'));
// A current session with no successful accusation can be finalized as a win.
const fresh=session();const ev=await evaluateRoute.POST(request('evaluate',{sessionId:fresh.id,type:'win'}));
const evBody=await ev.json();assert(ev.status===200&&evBody.reveal_the_lie&&!sessions.getSession(fresh.id),'premature evaluation not reproduced');
note('Unearned win evaluation accepted and session deleted',{status:ev.status,disclosedMockSecret:true,sessionDeleted:true});
// Real terminal marker is followed by assistant reply, so last-message inference misclassifies loss.
const lost=session();sessions.addMessage(lost.id,'user','[Time is up. The interrogation is over.]');sessions.addMessage(lost.id,'assistant','You ran out of time.');
await evaluateRoute.POST(request('evaluate',{sessionId:lost.id,type:'lose'}));
assert(writes.at(-1).outcome==='lose_accusations','outcome misclassification not reproduced');
note('Timeout export misclassified as exhausted accusations',{storedOutcome:writes.at(-1).outcome});
// Repeat clue contributes to count, while client deduplicates strings.
const dup=session();dup.currentStress=7;for(let i=0;i<3;i++)sessions.addMessage(dup.id,'user','Explain the security records for that evening.');
aiResponse={spoken_response:'I was busy elsewhere.',stress_level:8,clue_unlocked:'The badge number needs checking.'};
let displayed=[];for(let i=0;i<2;i++){const r=await(await questionRoute.POST(request('interrogate',{sessionId:dup.id,playerQuestion:'Explain the security records for that evening.'}))).json();if(r.clue_unlocked&&!displayed.includes(r.clue_unlocked))displayed.push(r.clue_unlocked);}
assert(dup.cluesCollected===2&&displayed.length===1,'duplicate clue not reproduced');
note('Repeated clue reaches server cap while client has only one clue',{server:dup.cluesCollected,clientRuleCount:displayed.length});
// No validated result required for the learning store.
const poison=session();const pattern=await patternRoute.POST(request('patterns',{sessionId:poison.id,setting:'bank',difficulty:'expert',outcome:'win',questions:['fabricated successful question'],effectiveQuestions:['fabricated successful question']}));
assert(pattern.status===200&&writes.at(-1).outcome==='win'&&poison.cluesCollected===0,'pattern forgery not reproduced');
note('Fresh easy session can submit an expert win learning record',{status:pattern.status,storedDifficulty:writes.at(-1).difficulty,storedOutcome:writes.at(-1).outcome});
// Terminal accusation endpoint ignores server wall deadline.
const expired=session();expired.cluesCollected=2;expired.startTime=Date.now()-7200000;
const late=await accuseRoute.POST(request('accuse',{sessionId:expired.id,accusation:'You lied about the duplicate key.'}));
assert(late.status===200,'late accusation not reproduced');note('Accusation remains accepted two hours after start',{status:late.status,remaining:expired.accusationsLeft});
// A language detector based on script will allow ASCII non-English and deny benign tech detail.
const cleanDenial=sanitize.containsSecretLeak('I never accessed the vault at midnight.',[caseData.the_lie]);
assert(cleanDenial,'cover story block not reproduced');note('Truth-leak filter flags exact cover story denial',{blocked:true});
// Validator permits empty truth and unsupported difficulty.
const empty={case_number:'',setting:'',crime:'',briefing:'',suspect_name:'',suspect_gender:'',suspect_role:'',suspect_true_story:'',suspect_cover_story:'',the_lie:'',the_truth:'',the_contradiction:'',difficulty:'impossible',stress_triggers:[1],deflection_tactics:[]};
assert(sanitize.validateCaseData(empty),'weak case validation not reproduced');note('Case schema accepts blank fields and unsupported difficulty',{accepted:true});
// Use the real judge parser with a mocked malformed provider output.
mocks[path.join(root,'src/lib/mistral/client.ts')]={getClient:()=>({chat:{complete:async()=>({choices:[{message:{content:'not json'}}]})}}),extractContent:x=>x};
const realJudge=load(path.join(root,'src/lib/mistral/evaluate.ts'));
mocks[path.join(root,'src/lib/mistral/index.ts')].evaluateAccusation=realJudge.evaluateAccusation;
const parseSession=session();parseSession.cluesCollected=2;
const parseRes=await accuseRoute.POST(request('accuse',{sessionId:parseSession.id,accusation:'You lied about accessing the duplicate key.'}));
const parseBody=await parseRes.json();
assert(parseRes.status===200&&parseBody.correct===false&&parseSession.accusationsLeft===2,'malformed judge attempt consumption not reproduced');
note('Malformed judge response spends a real accusation as wrong',{status:parseRes.status,correct:parseBody.correct,attemptsLeft:parseSession.accusationsLeft});
// Prefix validation is also bypassable without the detective role.
const speak=session();const approved='This is the already approved suspect dialogue. '.repeat(3);sessions.addMessage(speak.id,'assistant',approved);
const restoreFetch=global.fetch;let sent='';global.fetch=async(url,opts)=>{sent=JSON.parse(opts.body).text;return new Response(new Uint8Array([0,1]));};
const ttsRes=await ttsRoute.POST(request('tts',{sessionId:speak.id,text:approved.slice(0,80)+' Arbitrary unapproved appended speech.'},{'x-elevenlabs-api-key':'audit-placeholder'}));global.fetch=restoreFetch;
assert(ttsRes.status===200&&sent.includes('unapproved'),'prefix bypass not reproduced');note('Suspect TTS validates only prefix and accepts appended arbitrary text',{status:ttsRes.status,mockedProviderReceivedSuffix:true});

fs.writeFileSync('/tmp/interrogation-logic-check-results.json',JSON.stringify({scope:'Actual route/session modules with AI/DB/embedding mocks; no network or browser',results},null,2));
console.log(JSON.stringify(results,null,2));process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
