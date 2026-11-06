import {test,mock} from 'node:test';import assert from 'node:assert/strict';
import {Types} from 'mongoose';
import {User} from '../apps/api/src/modules/auth/user.model.ts';
import {getMarket,buyItem,equipItem} from '../apps/api/src/modules/market/market.service.ts';
const id=new Types.ObjectId(),user={characterId:'knight',xp:500,gold:500,ownedItems:[]};
test('catalog contains general items and only the selected class signature',async()=>{try{mock.method(User,'findById',async()=>user);const state=await getMarket(id);assert.equal(state.items.length,7);assert.ok(state.items.some(i=>i.id==='knight-oathblade'));assert.ok(!state.items.some(i=>i.id==='mage-grimoire'));}finally{mock.restoreAll();}});
test('signature purchase condition requires its class atomically',async()=>{try{mock.method(User,'findOneAndUpdate',async(filter)=>{assert.equal(filter.characterId,'knight');assert.deepEqual(filter.gold,{$gte:260});return{...user,gold:240,ownedItems:['knight-oathblade']};});assert.equal((await buyItem(id,'knight-oathblade')).balance.gold,240);}finally{mock.restoreAll();}});
for(const action of ['buy','equip'])test(`${action} refuses another class even with sufficient gold or ownership`,async()=>{try{mock.method(User,'findOneAndUpdate',async filter=>{assert.equal(filter.characterId,'mage');return null;});mock.method(User,'findById',async()=>({...user,ownedItems:['mage-grimoire']}));await assert.rejects(action==='buy'?buyItem(id,'mage-grimoire'):equipItem(id,'charm','mage-grimoire'),error=>error.code==='CLASS_RESTRICTED');}finally{mock.restoreAll();}});
