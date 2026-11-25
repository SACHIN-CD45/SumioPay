import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachineService } from '../src/services/stateMachine.service';

describe('Payment State Machine Transitions', () => {
  test('allows legal forward transitions', () => {
    assert.ok(StateMachineService.canTransition('CREATED', 'PENDING'));
    assert.ok(StateMachineService.canTransition('PENDING', 'PROCESSING'));
    assert.ok(StateMachineService.canTransition('PENDING', 'PAID'));
    assert.ok(StateMachineService.canTransition('PROCESSING', 'PAID'));
    assert.ok(StateMachineService.canTransition('PAID', 'REFUNDED'));
    assert.ok(StateMachineService.canTransition('PAID', 'PARTIALLY_REFUNDED'));
    assert.ok(StateMachineService.canTransition('PAID', 'DISPUTED'));
    assert.ok(StateMachineService.canTransition('PENDING', 'EXPIRED'));
    assert.ok(StateMachineService.canTransition('PENDING', 'CANCELLED'));
  });

  test('rejects illegal transitions to protect financial integrity', () => {
    // Terminal / invalid states cannot jump directly to PAID
    assert.equal(StateMachineService.canTransition('EXPIRED', 'PAID'), false);
    assert.equal(StateMachineService.canTransition('CANCELLED', 'PAID'), false);
    assert.equal(StateMachineService.canTransition('FAILED', 'PAID'), false);
    assert.equal(StateMachineService.canTransition('CREATED', 'REFUNDED'), false);

    // Terminal REFUNDED cannot transition anywhere
    assert.equal(StateMachineService.canTransition('REFUNDED', 'PAID'), false);
  });

  test('validates transition execution with idempotent handling and error rejection', async () => {
    const mockOrder = {
      orderId: 'ord_mock_123',
      merchantId: 'merch_456',
      status: 'EXPIRED',
      save: async () => {},
    };

    // Attempting EXPIRED -> PAID must throw
    await assert.rejects(
      async () => {
        await StateMachineService.transitionOrder({
          order: mockOrder,
          targetState: 'PAID',
          trigger: 'SYSTEM',
        });
      },
      /Invalid payment state transition/
    );

    // Idempotent transition to same state returns true without error
    const sameStateMock = { ...mockOrder, status: 'PAID' };
    const idempotentResult = await StateMachineService.transitionOrder({
      order: sameStateMock,
      targetState: 'PAID',
      trigger: 'SYSTEM',
    });
    assert.equal(idempotentResult, true);
  });
});
