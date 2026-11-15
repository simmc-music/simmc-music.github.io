import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSongs, compareArtists, compareShops, compareVenues, comparePlayerCategory, paginate, createRandomSeed, randomSongRank } from './collection-order.ts';

test('ASCII game IDs include digits and underscores; mixed and non-Latin IDs follow on ties', () => {
  assert.equal(comparePlayerCategory('Se1mai_Dassa1', 'Bocchi_TheGlock'), 0);
  assert.ok(comparePlayerCategory('Player42', '玩家') < 0);
  assert.ok(comparePlayerCategory('Player42', 'Player玩家') < 0);
  assert.ok(comparePlayerCategory('Player42', 'Étoile') < 0);
});

test('price remains primary in both directions, with ID category used only at equal prices', () => {
  const songs = [
    { id: 'cn-cheap', owner: '画影', price: 10, customPrice: false },
    { id: 'cn-tie', owner: '奕晗', price: 20, customPrice: false },
    { id: 'en-tie', owner: 'Alpha_42', price: 20, customPrice: false },
    { id: 'cn-high', owner: '画影', price: 30, customPrice: false },
  ];
  assert.deepEqual([...songs].sort((a,b)=>compareSongs(a,b,'asc')).map(s=>s.id), ['cn-cheap','en-tie','cn-tie','cn-high']);
  assert.deepEqual([...songs].sort((a,b)=>compareSongs(a,b,'desc')).map(s=>s.id), ['cn-high','en-tie','cn-tie','cn-cheap']);
});

test('custom prices follow numeric prices, and use ID category within their own group', () => {
  const songs = [
    { id: 'cn-custom', owner: '画影', price: null, customPrice: true },
    { id: 'en-custom', owner: 'Alpha', price: null, customPrice: true },
    { id: 'cn-number', owner: '奕晗', price: 999999, customPrice: false },
  ];
  for (const order of ['asc','desc']) assert.deepEqual([...songs].sort((a,b)=>compareSongs(a,b,order)).map(s=>s.id), ['cn-number','en-custom','cn-custom']);
});

test('newness remains primary and equal timestamps preserve order within ID categories', () => {
  const songs = [
    { id:'new-cn', owner:'画影', createdAt: 300 },
    { id:'tie-cn', owner:'奕晗', createdAt: 200 },
    { id:'tie-en-z', owner:'Zulu', createdAt: 200 },
    { id:'tie-en-a', owner:'Alpha', createdAt: 200 },
    { id:'old-en', owner:'Alpha', createdAt: 100 },
  ];
  assert.deepEqual([...songs].sort(compareSongs).map(s=>s.id), ['new-cn','tie-en-z','tie-en-a','tie-cn','old-en']);
});

test('artist counts, shop names and venue dates stay ahead of the ID tiebreaker', () => {
  assert.ok(compareArtists({songCount:10,gameId:'画影'},{songCount:9,gameId:'Alpha'}) < 0);
  assert.ok(compareArtists({songCount:10,gameId:'画影'},{songCount:10,gameId:'Alpha'}) > 0);
  assert.ok(compareShops({name:'A',owner:'画影'},{name:'B',owner:'Alpha'}) < 0);
  assert.ok(compareShops({name:'A',owner:'画影'},{name:'A',owner:'Alpha'}) > 0);
  assert.ok(compareVenues({createdAt:1,owner:'画影'},{createdAt:2,owner:'Alpha'}) < 0);
  assert.ok(compareVenues({createdAt:1,owner:'画影'},{createdAt:1,owner:'Alpha'}) > 0);
});

test('pagination shows at most 20 items without dropping or duplicating records', () => {
  const records = Array.from({length:43},(_,id)=>({id}));
  const pages = [1,2,3].map(page=>paginate(records,page));
  assert.deepEqual(pages.map(page=>page.items.length), [20,20,3]);
  assert.deepEqual(pages.flatMap(page=>page.items), records);
  assert.ok(pages.every(page=>page.total===43 && page.pageCount===3));
});

test('empty results and deletion of the last page safely clamp page numbers', () => {
  assert.deepEqual(paginate([],5), {items:[],page:1,pageCount:1,total:0});
  assert.equal(paginate(Array(40).fill(0),3).page,2);
  assert.equal(paginate(Array(21).fill(0),-3).page,1);
});

test('filter and sort run before slicing, so secondary ordering crosses page boundaries correctly', () => {
  const songs = Array.from({length:45},(_,id)=>({id,owner:id<22?'画影':'Alpha',price:20,customPrice:false,genre:id===44?'古典':'流行'}));
  const results = songs.filter(song=>song.genre==='流行').sort((a,b)=>compareSongs(a,b,'asc'));
  assert.ok(paginate(results,1).items.every(song=>song.owner==='Alpha'));
  assert.equal(paginate(results,2).items.filter(song=>song.owner==='Alpha').length,2);
  assert.equal(paginate(results,3).total,44);
});

const randomRecords = () => Array.from({length:73},(_,index)=>({
  id:`song-${index}`, owner:index%2?'Alpha_42':'玩家', price:index, customPrice:index%3===0,
  genre:index%3===0?'古典':'流行', createdAt:index,
}));
const randomlySorted = (songs,seed) => [...songs].sort((a,b)=>compareSongs(a,b,'random',seed));

test('random ordering is stable for the same seed, including after source order changes', () => {
  const songs = randomRecords(), expected = randomlySorted(songs,12345);
  assert.deepEqual(randomlySorted(songs,12345),expected);
  assert.deepEqual(randomlySorted([...songs].reverse(),12345),expected);
  assert.notDeepEqual(randomlySorted(songs,67890).map(s=>s.id),expected.map(s=>s.id));
});

test('all random pages are complete and disjoint, while filtering preserves relative positions', () => {
  const sorted = randomlySorted(randomRecords(),8347);
  const pages = [1,2,3,4].map(page=>paginate(sorted,page));
  assert.deepEqual(pages.map(page=>page.items.length),[20,20,20,13]);
  assert.equal(new Set(pages.flatMap(page=>page.items.map(s=>s.id))).size,73);
  assert.deepEqual(pages.flatMap(page=>page.items),sorted);
  assert.deepEqual(randomlySorted(randomRecords().filter(s=>s.genre==='古典'),8347),sorted.filter(s=>s.genre==='古典'));
});

test('random rank stays primary even for non-English owners and custom prices', () => {
  const sorted = randomlySorted(randomRecords(),241);
  for (let index=1;index<sorted.length;index++) {
    assert.ok(randomSongRank(sorted[index-1].id,241)<=randomSongRank(sorted[index].id,241));
  }
  assert.ok(sorted.some((song,index)=>song.owner==='玩家'&&sorted.slice(index+1).some(next=>next.owner==='Alpha_42')));
  const unchangedIds=randomRecords().map(song=>({...song,price:0,customPrice:false,createdAt:0}));
  assert.deepEqual(randomlySorted(unchangedIds,241).map(s=>s.id),sorted.map(s=>s.id));
});

test('random seeds are usable unsigned integers', () => {
  for(let i=0;i<20;i++) {
    const seed=createRandomSeed();
    assert.ok(Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff);
  }
});
