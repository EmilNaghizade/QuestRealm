import { test,mock } from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { updateTask } from '../apps/api/src/modules/tasks/task.service.ts';
import { Task } from '../apps/api/src/modules/tasks/task.model.ts';
import { User } from '../apps/api/src/modules/auth/user.model.ts';
import { TaskCompletion } from '../apps/api/src/modules/tasks/task-completion.model.ts';
const userId=new Types.ObjectId(),id=new Types.ObjectId();
for(const scenario of ['once completed','daily completed','daily new day','completion race','other owner'])test(scenario,async()=>{
 try{
 const current={_id:id,kind:scenario.startsWith('once')?'once':'daily',title:'Quest',difficulty:'easy',completionVersion:1,createdAt:new Date()};
 mock.method(User,'findById',()=>({select:()=>({lean:async()=>({timeZone:'UTC'})})}));
 mock.method(Task,'findOne',filter=>{assert.equal(filter.userId,userId);assert.equal(filter.deletedAt,null);return{lean:async()=>scenario==='other owner'?null:current};});
 mock.method(TaskCompletion,'exists',async filter=>{assert.equal(filter.occurrenceKey,current.kind==='once'?'once':new Date().toISOString().slice(0,10));return scenario.endsWith('completed')?{_id:id}:null;});
 let writes=0;mock.method(Task,'findOneAndUpdate',async filter=>{writes++;assert.equal(filter.completionVersion,1);return scenario==='completion race'?null:current;});
 const promise=updateTask(userId,String(id),{title:'Edited',kind:current.kind,difficulty:'easy'});
 if(scenario.endsWith('completed')){await assert.rejects(promise,e=>e.code==='TASK_COMPLETED');assert.equal(writes,0);}
 else if(scenario==='other owner'){await assert.rejects(promise,e=>e.code==='TASK_NOT_FOUND');assert.equal(writes,0);}
 else if(scenario==='completion race')await assert.rejects(promise,e=>e.code==='TASK_CHANGED');
 else assert.equal((await promise).isCompleted,false);
 }finally{mock.restoreAll();}
});
