import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import {Types} from 'mongoose';
import {User} from '../apps/api/src/modules/auth/user.model.ts';
import {buyItem,equipItem} from '../apps/api/src/modules/market/market.service.ts';
const id=new Types.ObjectId(), user={characterId:'knight',xp:0,gold:200,ownedItems:[],equippedWeapon:null,equippedArmor:null,equippedCharm:null};
test('purchase atomically checks balance and ownership, then debits server price',async()=>{try{mock.method(User,'findOneAndUpdate',async(filter,update)=>{
assert.equal(filter._id,id);assert.deepEqual(filter.gold,{$gte:60});assert.deepEqual(filter.ownedItems,{$ne:'oak-staff'});assert.deepEqual(update,{$inc:{gold:-60},$addToSet:{ownedItems:'oak-staff'}});return{...user,gold:140,ownedItems:['oak-staff']};});const result=await buyItem(id,'oak-staff');assert.equal(result.balance.gold,140);assert.deepEqual(result.ownedIds,['oak-staff']);}finally{mock.restoreAll();}});
for(const [name,current,code] of [['duplicate',{...user,ownedItems:['oak-staff']},'ITEM_ALREADY_OWNED'],['insufficient gold',{...user,gold:0},'INSUFFICIENT_GOLD']])test(name,async()=>{try{mock.method(User,'findOneAndUpdate',async()=>null);mock.method(User,'findById',async()=>current);await assert.rejects(buyItem(id,'oak-staff'),e=>e.code===code);}finally{mock.restoreAll();}});
test('unknown item is rejected before touching the balance',async()=>{await assert.rejects(buyItem(id,'free-admin-item'),e=>e.code==='ITEM_NOT_FOUND');});
test('equipment requires ownership and replaces only the chosen slot',async()=>{try{mock.method(User,'findOneAndUpdate',async(filter,update)=>{assert.equal(filter.ownedItems,'steel-sword');assert.deepEqual(update,{$set:{equippedWeapon:'steel-sword'}});return{...user,ownedItems:['steel-sword'],equippedWeapon:'steel-sword'};});assert.equal((await equipItem(id,'weapon','steel-sword')).equipped.weapon,'steel-sword');}finally{mock.restoreAll();}});
test('unowned equipment is refused',async()=>{try{mock.method(User,'findOneAndUpdate',async()=>null);mock.method(User,'findById',async()=>user);await assert.rejects(equipItem(id,'weapon','steel-sword'),e=>e.code==='ITEM_NOT_OWNED');}finally{mock.restoreAll();}});
test('wrong slot is refused',async()=>{await assert.rejects(equipItem(id,'armor','steel-sword'),e=>e.code==='INVALID_EQUIPMENT');});
test('removing equipment costs no gold and needs no inventory item',async()=>{try{mock.method(User,'findOneAndUpdate',async(filter,update)=>{assert.equal(filter.ownedItems,undefined);assert.deepEqual(update,{$set:{equippedCharm:null}});return user;});assert.equal((await equipItem(id,'charm',null)).equipped.charm,null);}finally{mock.restoreAll();}});
