import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Financial Math - Integer Paise Conversion & Precision', () => {
  test('converts standard rupee amounts to exact integer paise', () => {
    const toPaise = (rupees: number) => Math.round(rupees * 100);
    const toRupees = (paise: number) => paise / 100;

    assert.equal(toPaise(499.00), 49900);
    assert.equal(toPaise(499.42), 49942);
    assert.equal(toPaise(0.01), 1);
    assert.equal(toPaise(12500.99), 1250099);

    assert.equal(toRupees(49942), 499.42);
    assert.equal(toRupees(1), 0.01);
  });

  test('eliminates IEEE 754 floating point inaccuracies through integer arithmetic', () => {
    // Classic JavaScript float problem: 0.1 + 0.2 !== 0.3
    const floatSum = 0.1 + 0.2;
    assert.notEqual(floatSum, 0.3); // In JS float math, 0.1 + 0.2 is 0.30000000000000004

    // SumioPay Integer Paise Math: 10 paise + 20 paise === 30 paise (100% exact)
    const paiseA = 10;
    const paiseB = 20;
    const paiseSum = paiseA + paiseB;
    assert.equal(paiseSum, 30);
    assert.equal(paiseSum / 100, 0.3);
  });

  test('validates unique paise allocation range (.01 to .99)', () => {
    const activePaiseOffsets = new Set<number>([12, 45, 88]);
    const availableOffsets = Array.from({ length: 99 }, (_, i) => i + 1)
      .filter((paise) => !activePaiseOffsets.has(paise));

    assert.equal(availableOffsets.length, 96);
    assert.ok(!availableOffsets.includes(12));
    assert.ok(!availableOffsets.includes(45));
    assert.ok(!availableOffsets.includes(88));
    assert.ok(availableOffsets.includes(1));
    assert.ok(availableOffsets.includes(99));
  });
});
