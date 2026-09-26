import assert from 'node:assert/strict';
import test from 'node:test';
import { limitBoardHistory } from '../lib/boards/client/history-persistence.ts';

const object = (id) => ({ id, kind:'stroke', version:1, zIndex:1, minX:0, minY:0, maxX:1, maxY:1, payload:{ color:'#fffdf8', size:5, points:[{x:0,y:0,pressure:.5,time:0},{x:1,y:1,pressure:.5,time:1}] }, createdBy:'qa', createdAt:1, updatedAt:1 });

test('keeps the latest board undo and redo records within a bounded durable history', () => {
  const undo=Array.from({length:48},(_,i)=>({kind:'create',object:object(`obj_${String(i).padStart(24,'0')}`)}));
  const redo=Array.from({length:43},(_,i)=>({kind:'delete',object:object(`obj_${String(i).padStart(24,'1')}`)}));
  const result=limitBoardHistory({undo,redo});
  assert.equal(result.undo.length,40);assert.equal(result.redo.length,40);
  assert.equal(result.undo[0].object.id,undo[8].object.id);
  assert.equal(result.redo[0].object.id,redo[3].object.id);
});
