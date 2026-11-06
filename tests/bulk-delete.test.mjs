import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { Task } from '../apps/api/src/modules/tasks/task.model.ts';
import { deleteAllTasks } from '../apps/api/src/modules/tasks/task.service.ts';
for(const count of [0,5])test(`bulk delete returns ${count} and scopes soft deletion to the owner`,async()=>{
try{const id=new Types.ObjectId();mock.method(Task,'updateMany',async(filter,change,options)=>{
 assert.deepEqual(filter,{userId:id,deletedAt:null});assert.ok(change.$set.deletedAt instanceof Date);assert.deepEqual(Object.keys(change.$set),['deletedAt']);assert.equal(options.runValidators,true);return{modifiedCount:count};
});assert.equal(await deleteAllTasks(id),count);}finally{mock.restoreAll();}
});
