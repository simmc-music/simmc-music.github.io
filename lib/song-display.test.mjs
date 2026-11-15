import test from 'node:test';
import assert from 'node:assert/strict';
import { songArtist } from './song-display.ts';

test('missing original artists display the player ID without changing the original record', () => {
  for (const artist of ['', '未知', '原作者未知', '未注明', 'unknown', ' Unknown Artist ']) {
    const song = { artist, owner: 'Player_42' };
    assert.equal(songArtist(song), 'Player_42');
    assert.equal(song.artist, artist);
  }
});

test('real artist names remain visible even if they contain the word unknown', () => {
  for (const artist of ['周杰伦', 'Unknown Mortal Orchestra', '未知世界']) assert.equal(songArtist({ artist, owner: 'Player_42' }), artist);
});
