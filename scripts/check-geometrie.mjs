import assert from 'node:assert/strict';
const { radGeometrie } = await import('../lib/erfolgsrad-geometrie.ts');
const g = radGeometrie([{ titel: 'A', punkte: 100 }, { titel: 'B', punkte: 0 }, { titel: 'C', punkte: 50 }], 520);
assert.equal(g.segmente.length, 3); assert.equal(g.ringe.length, 10);
assert.equal(g.cx, 260); assert.ok(g.R > 150 && g.R < 220);
assert.ok(g.segmente[0].pfad.startsWith('M260,260'), 'Pfad beginnt in der Mitte');
assert.equal(g.segmente[1].pfad, '', 'Wert 0 → kein Pfad');
assert.ok(g.segmente[0].deckkraft === 1 && g.segmente[2].deckkraft > 0.5 && g.segmente[2].deckkraft < 1);
// erstes Segment beginnt bei 12 Uhr: Label liegt rechts oben von der Mitte
assert.ok(g.segmente[0].labelY < 260 && g.segmente[0].labelX > 260);
// ein einzelnes Segment überspannt ~356° → großer Bogen (Flag 1)
assert.ok(radGeometrie([{ titel: 'Solo', punkte: 80 }], 520).segmente[0].pfad.includes(' 0 1 1 '), 'ein Segment → large-arc-flag 1');
assert.ok(g.segmente[0].pfad.includes(' 0 0 1 '), 'drei Segmente → large-arc-flag 0');
console.log('ok');
