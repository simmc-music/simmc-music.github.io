import type { Data, User } from "../app/ui";
import type { Band, Activity, ActivitySignup } from "../app/community-types";

const upsert = <T extends {id:string}>(items:T[],item:T) => items.some(x=>x.id===item.id)?items.map(x=>x.id===item.id?item:x):[...items,item];
export function communityPermissions(data:Data,user:User|null) {
  const bands=(data.bands??[]).map(b=>({...b,isMember:!!user&&(b.captainId===user.id||b.members.some(m=>m.id===user.id)),canManage:!!user&&(user.role==='admin'||b.captainId===user.id)}));
  const activities=(data.activities??[]).map(a=>({...a,canManage:!!user&&(user.role==='admin'||a.ownerId===user.id)}));
  const activitySignups=(data.activitySignups??[]).map(s=>({...s,canDelete:!!user&&(user.role==='admin'||activities.some(a=>a.id===s.activityId&&a.ownerId===user.id)||(s.kind==='individual'&&s.playerId.toLowerCase()===user.gameId.toLowerCase()))}));
  return {bands,activities,activitySignups};
}

export function applyCommunityMutation(data:Data,path:string,method:string,response:Record<string,unknown>):Data|null {
  const [,kind,id,action]=path.split('/').filter(Boolean);
  if(kind==='bands'&&(method==='POST'||method==='PATCH'))return {...data,bands:upsert(data.bands??[],response as Band)};
  if(kind==='activities'&&action==='signups'&&method==='POST') {
    const signup={...response,id:String(response.id)} as ActivitySignup;
    const activitySignups=upsert(data.activitySignups??[],signup);
    return {...data,activitySignups,activities:(data.activities??[]).map(a=>a.id===signup.activityId?{...a,signupCount:activitySignups.filter(s=>s.activityId===a.id).length}:a)};
  }
  if(kind==='activity-signups'&&method==='DELETE') {
    const activitySignups=(data.activitySignups??[]).filter(s=>s.id!==id);
    return {...data,activitySignups,activities:(data.activities??[]).map(a=>({...a,signupCount:activitySignups.filter(s=>s.activityId===a.id).length}))};
  }
  if(kind==='activities') {
    if(method==='DELETE')return {...data,activities:(data.activities??[]).filter(a=>a.id!==id),activitySignups:(data.activitySignups??[]).filter(s=>s.activityId!==id)};
    if(method==='POST'||method==='PATCH')return {...data,activities:upsert(data.activities??[],response as Activity)};
  }
  return null;
}
