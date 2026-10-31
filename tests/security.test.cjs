const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const root = path.resolve(__dirname,'..');
function load(file,mocks={},env={}) {
 const ctx={module:{exports:{}},require:n=>n in mocks?mocks[n]:require(n),process:{env},console:{log(){},error(){}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});return ctx.module.exports;
}
const response=()=>({statusCode:200,status(n){this.statusCode=n;return this;},json(value){this.data=value;return this;}});
const security={secret:'x'.repeat(48),jwtOptions:{algorithm:'HS256',issuer:'techseed',audience:'techseed-web'}};
test('missing/weak JWT secret fails closed',()=>{
 for(const value of [undefined,'changeme','short']) assert.throws(()=>load('backend/src/config/security.js',{}, {JWT_SECRET:value}));
});
for(const [name,mode,user,item,expected] of [
 ['student cannot read another request','read',{id:1,email:'a',role:'STUDENT'},{owner_user_id:2},403],
 ['owner reads own request','read',{id:1,email:'a',role:'STUDENT'},{owner_user_id:1},200],
 ['student cannot approve','manage',{id:1,email:'a',role:'STUDENT'},{owner_user_id:1,assigned_to:'a'},403],
 ['unassigned coordinator cannot approve','manage',{id:1,email:'a',role:'COORD'},{assigned_to:'b'},403],
 ['assigned coordinator can manage','manage',{id:1,email:'a',role:'COORD'},{assigned_to:'a',estado:'En Revisión'},200],
 ['closed request cannot be managed','manage',{id:1,email:'a',role:'COORD'},{assigned_to:'a',estado:'Aprobado'},409],
 ['owner cannot replay resubmit','resubmit',{id:1,email:'a',role:'STUDENT'},{owner_user_id:1,estado:'Aprobado'},403],
 ['owner can resubmit observed','resubmit',{id:1,email:'a',role:'STUDENT'},{owner_user_id:1,estado:'Observado'},200],
]) test(name,async()=>{
 const access=load('backend/src/middleware/solicitud-access.js',{'../config/db':{query:async()=>[[{id:9,...item}]]}});
 const res=response();let passed=false;await access(mode)({params:{id:'9'},user,body:{}},res,err=>{assert.ifError(err);passed=true;});
 assert.equal(res.statusCode,expected);assert.equal(passed,expected===200);
});
test('token role is replaced by current database role',async()=>{
 const middleware=load('backend/src/middleware/auth.middleware.js',{'../config/security':security,'../config/db':{query:async sql=>sql.startsWith('UPDATE')?[{affectedRows:1}]:[[{id:1,email:'a',role:'STUDENT',is_active:1}]]}});
 const token=jwt.sign({id:1,role:'COORD'},security.secret,{...security.jwtOptions,jwtid:'fixture-session',expiresIn:'1h'});
 const req={headers:{authorization:'Bearer '+token}};let passed=false;await middleware.authRequired(req,response(),()=>passed=true);
 assert.ok(passed);assert.equal(req.user.role,'STUDENT');
});
test('inactive user rejected with otherwise valid token',async()=>{
 const middleware=load('backend/src/middleware/auth.middleware.js',{'../config/security':security,'../config/db':{query:async()=>[[{id:1,is_active:0}]]}});
 const token=jwt.sign({id:1},security.secret,{...security.jwtOptions,expiresIn:'1h'});const res=response();
 await middleware.authRequired({headers:{authorization:'Bearer '+token}},res,()=>assert.fail());assert.equal(res.statusCode,401);
});
test('revoked or idle session rejected even with valid token',async()=>{
 const middleware=load('backend/src/middleware/auth.middleware.js',{'../config/security':security,'../config/db':{query:async sql=>sql.startsWith('UPDATE')?[{affectedRows:0}]:[[{id:1,email:'a',role:'STUDENT',is_active:1}]]}});
 const token=jwt.sign({id:1},security.secret,{...security.jwtOptions,jwtid:'revoked-fixture',expiresIn:'1h'});const res=response();
 await middleware.authRequired({headers:{authorization:'Bearer '+token}},res,()=>assert.fail());assert.equal(res.statusCode,401);
});
test('mock login still returns code and signs token for active fixture',async()=>{
 const auth=load('backend/src/controllers/auth.controller.js',{'../config/security':security,'../config/db':{query:async()=>[[{id:1,email:'a@example.invalid',role:'STUDENT',is_active:1}]]}});
 const code=response();await auth.requestMockOtp({body:{email:'a@example.invalid'}},code);assert.match(code.data.code,/^\d{6}$/);
 const res=response();await auth.verifyMockOtp({body:{email:'a@example.invalid',code:code.data.code}},res);assert.ok(res.data.token);
});
test('AI without credentials returns 503 without constructing client',async()=>{
 const ai=load('backend/src/controllers/ai.controller.js',{openai:class {constructor(){assert.fail();}}});const res=response();
 await ai.redactarAyuda({body:{}},res);assert.equal(res.statusCode,503);
});
test('connection failure reaches controller error handler',async()=>{
 const controller=load('backend/src/controllers/solicitud.controller.js',{'../config/db':{getConnection:async()=>{throw Error('fixture unavailable');}}});
 const res=response();await controller.returnSolicitudWithFlags({params:{id:1},user:{email:'a'},body:{observation:'x',editableFlags:{proyecto:true}}},res);assert.equal(res.statusCode,500);
});
test('status change and history commit together; failure rolls back',async()=>{
 for (const fail of [false,true]) {
  const calls=[];
  const conn={beginTransaction:async()=>calls.push('begin'),commit:async()=>calls.push('commit'),rollback:async()=>calls.push('rollback'),release:()=>calls.push('release'),query:async sql=>{
   if(sql.includes('FOR UPDATE')) return [[{assigned_to:'a',estado:'En Revisión'}]];
   if(sql.includes('INFORMATION_SCHEMA')) return [[{COLUMN_NAME:'codigo_aprobacion'}]];
   if(sql.includes('INSERT INTO solicitud_history') && fail) throw Error('fixture history failure');
   return [[]];
  }};
  const controller=load('backend/src/controllers/solicitud.controller.js',{'../config/db':{getConnection:async()=>conn}});const res=response();
  await controller.updateStatus({params:{id:1},body:{status:'Rechazado'},user:{id:1,email:'a',role:'COORD'}},res);
  assert.equal(res.statusCode,fail?500:200);assert.ok(calls.includes(fail?'rollback':'commit'));assert.equal(calls.at(-1),'release');
 }
});
test('closed resubmission rejected under transaction lock',async()=>{
 let rolledBack=false;const conn={beginTransaction:async()=>{},query:async()=>[[]],rollback:async()=>{rolledBack=true;},release(){}};
 const controller=load('backend/src/controllers/solicitud.controller.js',{'../config/db':{getConnection:async()=>conn}});const res=response();
 await controller.resubmitSolicitud({params:{id:1},body:{},user:{email:'a'}},res);assert.equal(res.statusCode,403);assert.ok(rolledBack);
});
test('CSV formula prefixes are neutralized before export',()=>{
 const source=fs.readFileSync(path.join(root,'src/pages/ReportsPage.jsx'),'utf8');
 const code=source.slice(source.indexOf('function exportToCSV'));
 let output;vm.runInNewContext(code+';exportToCSV([{Proyecto:"=1+1"}],"test.csv");', {Blob:class{constructor(parts){output=parts.join('');}},URL:{createObjectURL(){return 'fixture';},revokeObjectURL(){}},document:{createElement(){return {setAttribute(){},click(){}};},body:{appendChild(){},removeChild(){}}}});
 assert.ok(output.includes('"\'=1+1"'));
});
