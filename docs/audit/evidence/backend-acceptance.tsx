import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { POST as accuse } from '../../../app/api/accuse/route';
import { POST as interrogate } from '../../../app/api/interrogate/route';
import { POST as evaluate } from '../../../app/api/evaluate/route';
import { POST as end } from '../../../app/api/session/end/route';
import { createSession, getSession, deleteSession } from '../../../src/lib/session/store';
import { beginSession, finishSession } from '../../../src/lib/session/transitions';
import { getSessionStats } from '../../../src/lib/session/stats';
import { validateEvaluation } from '../../../app/game/result/validation';
import CaseDetails from '../../../app/game/win/CaseDetails';
import { LossDetails } from '../../../app/game/lose/LossDetails';

const facts = { difficulty: 'easy', setting: 'office', suspect_name: 'Casey', suspect_role: 'Clerk',
 suspect_true_story: 'Returned at 18:42', suspect_cover_story: 'Stayed away', the_lie: 'Stayed away',
 the_truth: 'Returned at 18:42', the_contradiction: 'Visitor log timestamp', stress_triggers: ['log'], deflection_tactics: ['pause'] };
const ids: string[] = [];
const records: object[] = [];
function session(mode: 'countdown'|'unlimited'='unlimited') { const id=createSession(facts,[],0,mode); ids.push(id); const current=getSession(id)!; beginSession(current); return current; }
function request(route:string, sessionId:string, extra:object={}, requestId=randomUUID()) { return new NextRequest(`http://localhost/api/${route}`, { method:'POST', body:JSON.stringify({sessionId, requestId, ...extra}) }); }
function output(text:string) { return Response.json({status:'completed', output:[{type:'message',content:[{type:'output_text',text}]}]}); }
function check(name:string, detail:object={}) { records.push({name,pass:true,...detail}); }
async function main() {
 const originalFetch=globalThis.fetch; let calls=0;
 process.env.AI_PROVIDER='openai'; process.env.OPENAI_API_KEY='synthetic-acceptance'; process.env.AI_TIMEOUT_MS='1000';
 process.env.AI_RAG_ENABLED='false'; process.env.EXPORT_STORAGE='local';
 try {
  for (const mode of ['malformed','empty','null','timeout','provider-error','incorrect']) {
   const current=session(); const before=getSessionStats(current.id)!;
   globalThis.fetch=async (_url,init) => { calls++; if(mode==='provider-error') throw new Error('Controlled provider unavailable');
    if(mode==='timeout') await new Promise((resolve,reject)=>{ const timer=setTimeout(resolve,1500); init!.signal!.addEventListener('abort',()=>{clearTimeout(timer);reject(init!.signal!.reason);},{once:true}); });
    return output(mode==='malformed'?'not json':mode==='empty'?'{}':mode==='null'?'null':JSON.stringify({correct:false,confession:'No.',explanation:'Unsupported claim.'})); };
   const id=randomUUID(); const first=await accuse(request('accuse',current.id,{accusation:'You returned after six.'},id)); const firstData=await first.json();
   assert.equal(first.status,mode==='incorrect'?200:502);
   const after=getSessionStats(current.id)!;
   assert.equal(current.accusationsUsed,mode==='incorrect'?1:0); assert.equal(current.accusationsLeft,mode==='incorrect'?2:3);
   if(mode!=='incorrect') { assert.equal(after.score,before.score); assert.equal(current.conversationHistory.length,0); }
   const count=calls; const replay=await accuse(request('accuse',current.id,{accusation:'You returned after six.'},id));
   assert.deepEqual(await replay.json(),firstData); assert.equal(calls,count); assert.equal(current.accusationsUsed,mode==='incorrect'?1:0);
   check(`LOGIC-06 ${mode}`,{status:first.status,attemptsUsed:current.accusationsUsed,replayCalls:0});
  }
  globalThis.fetch=async()=>{throw new Error('Unexpected provider invocation');};
  const early=session(); assert.equal((await evaluate(request('evaluate',early.id,{type:'win'}))).status,409); assert.equal(early.outcome,null); check('LOGIC-03 early win refused');
  const expired=session('countdown'); expired.startTime=Date.now()-301000;
  assert.equal((await accuse(request('accuse',expired.id,{accusation:'You returned.'}))).status,409); assert.equal(expired.outcome,'lose_time'); assert.equal(expired.accusationsUsed,0); check('LOGIC-03 expired accusation');
  for(const outcome of ['win','lose_lawyer'] as const) {
   const current=session(); finishSession(current,outcome); const before=JSON.stringify(current.conversationHistory);
   const response=await interrogate(request('interrogate',current.id,{playerQuestion:'One more question?'})); assert.equal(response.status,200); assert.equal((await response.json()).outcome,outcome); assert.equal(JSON.stringify(current.conversationHistory),before); check(`LOGIC-03 interrogation after ${outcome}`);
  }
  const concurrent=session(); let entered!:()=>void, release!:()=>void;
  const started=new Promise<void>(resolve=>{entered=resolve;}); const pending=new Promise<void>(resolve=>{release=resolve;});
  globalThis.fetch=async()=>{entered();await pending;return output(JSON.stringify({spoken_response:'I left at six.',internal_state:'Guarded',stress_level:1,clue_unlocked:null,caught:false}));};
  const question=interrogate(request('interrogate',concurrent.id,{playerQuestion:'When did you leave?'})); await started;
  assert.equal((await end(request('session/end',concurrent.id,{reason:'giveup'}))).status,409);
  assert.equal((await evaluate(request('evaluate',concurrent.id,{type:'lose'}))).status,409);
  release(); assert.equal((await question).status,200);
  globalThis.fetch=async()=>{throw new Error('Provider unavailable during debrief');};
  const finished=await end(request('session/end',concurrent.id,{reason:'giveup'})); assert.equal(finished.status,200);
  const first=await (await evaluate(request('evaluate',concurrent.id,{type:'lose'}))).json();
  const repeated=await (await evaluate(request('evaluate',concurrent.id,{type:'lose'}))).json();
  assert.deepEqual(repeated,first); assert.equal(concurrent.questionsAsked,1); assert.equal(concurrent.outcome,'lose_giveup');
  check('LOGIC-03 concurrent question/finalize and repeated finalize',{acceptedQuestions:1,terminalOutcome:concurrent.outcome});
  const loss=validateEvaluation(first,'lose'); assert.equal(loss.closest_moment,'I left at six.');
  const lossHtml=renderToStaticMarkup(<LossDetails result={{caseData:facts} as never} evaluation={loss}/>);
  for(const text of [facts.the_lie,facts.the_truth,facts.the_contradiction,'I left at six.']) assert.ok(lossHtml.includes(text));
  check('LOGIC-19 loss facts and exact transcript rendered with provider unavailable');
  const won=session(); globalThis.fetch=async()=>output(JSON.stringify({correct:true,confession:'I returned.',explanation:'The visitor record contradicts the denial.'}));
  assert.equal((await accuse(request('accuse',won.id,{accusation:'You returned after six.'}))).status,200);
  globalThis.fetch=async()=>{throw new Error('Provider unavailable during debrief');};
  const winData=await(await evaluate(request('evaluate',won.id,{type:'win'}))).json();
  assert.equal(winData.correct,true); assert.equal((await evaluate(request('evaluate',won.id,{type:'lose'}))).status,409);
  const win=validateEvaluation(winData,'win'); const winHtml=renderToStaticMarkup(<CaseDetails suspectName="Casey" suspectRole="Clerk" evaluation={win}/>);
  for(const text of [facts.the_lie,facts.the_truth,facts.the_contradiction]) assert.ok(winHtml.includes(text));
  assert.deepEqual(await(await evaluate(request('evaluate',won.id,{type:'win'}))).json(),winData);
  check('LOGIC-19 accepted win immutable and canonical facts rendered with provider unavailable');
  console.log(JSON.stringify({executedAt:new Date().toISOString(),scope:'Actual route modules, isolated real filesystem, controlled provider transport; server-rendered result components. No network/provider calls or browser interaction.',checks:records},null,2));
 } finally {globalThis.fetch=originalFetch; for(const id of ids)deleteSession(id);}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
