import test from 'node:test';
import assert from 'node:assert/strict';
import { readNavigation } from './navigation.ts';

test('opening the site or an unknown view starts on activities', () => {
  for (const hash of ['', '#', '#view=unknown']) assert.equal(readNavigation(hash).tab, 'activities');
});
test('activity pages survive a refresh and other views clear the selected activity', () => {
  assert.equal(readNavigation('#view=activities&activity=show%201').activityId, 'show 1');
  assert.equal(readNavigation('#view=bands&activity=show1').activityId, null);
});
test('existing venue and hidden directory links stay accessible', () => {
  assert.deepEqual(readNavigation('#livehouse=starry'), {tab:'livehouses',venueId:'starry',shopViewId:null,activityId:null});
  assert.equal(readNavigation('#view=artists').tab, 'artists');
  assert.equal(readNavigation('#view=shops&shop=shop1').shopViewId, 'shop1');
});
