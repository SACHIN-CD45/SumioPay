import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ReconciliationService } from '../backend/src/services/reconciliation.service';

describe('Reconciliation Engine Multi-Rule Matching', () => {
  test('parses CSV bank statements into structured minor units entries', () => {
    const sampleCsv = `Date,UTR,Amount,Sender
2026-11-25,432198765432,499.42,Ramesh Kumar
2026-11-25,987654321098,1250.00,Sneha Sharma
2026-11-25,112233445566,0.50,Test User`;

    const entries = ReconciliationService.parseCsvStatement(sampleCsv);
    assert.equal(entries.length, 3);

    assert.equal(entries[0].utrNumber, '432198765432');
    assert.equal(entries[0].amountInPaise, 49942); // Exact integer paise

    assert.equal(entries[1].utrNumber, '987654321098');
    assert.equal(entries[1].amountInPaise, 125000);

    assert.equal(entries[2].utrNumber, '112233445566');
    assert.equal(entries[2].amountInPaise, 50);
  });

  test('parses simplified UTR,Amount two-column CSV formats', () => {
    const simpleCsv = `432198765432,499.42\n987654321098,100.00`;
    const entries = ReconciliationService.parseCsvStatement(simpleCsv);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].amountInPaise, 49942);
    assert.equal(entries[1].amountInPaise, 10000);
  });
});
