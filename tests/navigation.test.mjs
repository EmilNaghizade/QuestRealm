import{register}from'node:module';
register('./css-loader.mjs',import.meta.url);
import{test}from'node:test';import assert from'node:assert/strict';import React from'react';import{renderToStaticMarkup}from'react-dom/server';
globalThis.React=React;globalThis.window={location:{hash:'#dashboard'},matchMedia:()=>({matches:false})};
const{default:Dashboard}=await import('../apps/web/src/features/dashboard/Dashboard.tsx');
const{default:MobileNavigation}=await import('../apps/web/src/components/MobileNavigation.tsx');
const{FocusContext}=await import('../apps/web/src/features/focus/focus-context.ts');
const user={id:'test',displayName:'Adventurer',email:'test@example.test',timeZone:'UTC',language:'en',characterId:'knight',xp:0,gold:0,progression:{level:0,xpIntoLevel:0,xpForNextLevel:500,xpRemaining:500}};
function links(html,label){const block=html.match(new RegExp(`<nav[^>]*aria-label="${label}"[^>]*>([\\s\\S]*?)</nav>`));assert.ok(block,`${label} exists`);return[...block[1].matchAll(/href="(#[^"]+)"/g)].map(match=>match[1]);}
test('desktop navigation keeps Settings last after library and achievements',()=>{const html=renderToStaticMarkup(React.createElement(FocusContext.Provider,{value:{timer:null,remainingMs:0,error:'',isBusy:false,completionEvent:null}},React.createElement(Dashboard,{user,onSessionExpired(){},onBalanceChanged(){},onProfileChanged(){}})));const routes=links(html,'Main navigation');assert.equal(routes.at(-1),'#settings');assert.equal(routes.filter(route=>route==='#settings').length,1);assert.ok(routes.includes('#library'));assert.ok(routes.includes('#achievements'));});
test('mobile navigation uses the same last Settings position',()=>{const routes=links(renderToStaticMarkup(React.createElement(MobileNavigation)),'Mobile navigation');assert.equal(routes.at(-1),'#settings');assert.equal(routes.filter(route=>route==='#settings').length,1);});
