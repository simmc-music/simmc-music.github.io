import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommunityMutation, communityPermissions } from './community-state.ts';
const user={id:'pre-player',gameId:'Player_1',role:'user'};
const bands=[{id:'a',captainId:'other',members:[{id:'pre-player',gameId:'Player_1',registered:false}],isMember:false,canManage:false},{id:'b',captainId:'pre-player',members:[],isMember:false,canManage:false}];
const activity={id:'event',ownerId:'other',livehouseId:'starry',signupCount:0};
const data={bands,activities:[activity],activitySignups:[],events:[{id:'old-show',livehouseId:'starry'}]};
test('previously added identities join multiple bands on login and clear rights on logout',()=>{
 const permissions=communityPermissions(data,user);
 assert.ok(permissions.bands.every(b=>b.isMember));assert.equal(permissions.bands[0].canManage,false);assert.equal(permissions.bands[1].canManage,true);
 assert.ok(communityPermissions({...data,...permissions},null).bands.every(b=>!b.isMember&&!b.canManage));
});
test('confirmed signup and cancellation update counts without duplicates or affecting performances',()=>{
 const signup={id:'1',activityId:'event',kind:'individual',playerId:'Player_1',displayName:'Player_1'};
 let next=applyCommunityMutation(data,'/api/activities/event/signups','POST',signup);
 next=applyCommunityMutation(next,'/api/activities/event/signups','POST',signup);
 assert.equal(next.activitySignups.length,1);assert.equal(next.activities[0].signupCount,1);assert.deepEqual(next.events,data.events);
 next=applyCommunityMutation(next,'/api/activity-signups/1','DELETE',{ok:true});assert.equal(next.activitySignups.length,0);assert.equal(next.activities[0].signupCount,0);
});
test('deleting an activity preserves pre-existing Livehouse performances',()=>{
 const next=applyCommunityMutation(data,'/api/activities/event','DELETE',{ok:true});assert.equal(next.activities.length,0);assert.deepEqual(next.events,data.events);
});

test('band members can manage their programs and lose editing rights on logout',()=>{
 const sample={...data,activitySignups:[{id:'1',activityId:'event',kind:'band',bandId:'a',playerId:'Other'},{id:'2',activityId:'event',kind:'individual',playerId:'Player_1'},{id:'3',activityId:'event',kind:'individual',playerId:'Other'}]};
 const next=communityPermissions(sample,user);assert.equal(next.activitySignups[0].canEdit,true);assert.equal(next.activitySignups[0].canDelete,true);assert.equal(next.activitySignups[1].canEdit,true);assert.equal(next.activitySignups[2].canEdit,false);
 assert.ok(communityPermissions({...sample,...next},null).activitySignups.every(s=>!s.canEdit&&!s.canDelete));
 const updated=applyCommunityMutation(sample,'/api/activity-signups/1','PATCH',{activitySignups:[{...sample.activitySignups[0],sortOrder:2,programName:'Revised'},{...sample.activitySignups[1],sortOrder:1}]});
 assert.equal(updated.activitySignups.length,3);assert.equal(updated.activitySignups[0].programName,'Revised');assert.equal(updated.activitySignups[1].sortOrder,1);assert.deepEqual(updated.events,data.events);
});
