import { describe, expect, it } from 'vitest'
import { getAvailableOrderActions, isTerminalOrderStatus, orderStatusClass, orderStatusLabel } from '~/utils/order'

const t = (key: string) => key

describe('orderStatusLabel — all 4 real backend statuses (см. domain/order)', () => {
  it('resolves each status through the status.order.* i18n namespace', () => {
    expect(orderStatusLabel('planned', t)).toBe('status.order.planned')
    expect(orderStatusLabel('in_progress', t)).toBe('status.order.in_progress')
    expect(orderStatusLabel('completed', t)).toBe('status.order.completed')
    expect(orderStatusLabel('cancelled', t)).toBe('status.order.cancelled')
  })
})

describe('orderStatusClass', () => {
  it('returns the raw status for BEM modifier classes', () => {
    expect(orderStatusClass('in_progress')).toBe('in_progress')
  })
})

describe('isTerminalOrderStatus', () => {
  it('completed and cancelled are terminal; planned and in_progress are not', () => {
    expect(isTerminalOrderStatus('completed')).toBe(true)
    expect(isTerminalOrderStatus('cancelled')).toBe(true)
    expect(isTerminalOrderStatus('planned')).toBe(false)
    expect(isTerminalOrderStatus('in_progress')).toBe(false)
  })
})

describe('getAvailableOrderActions — mirrors domain/order.go transitions, never invents a transition', () => {
  it('planned: Начать работу (-> in_progress) + Отменить (-> cancelled)', () => {
    const actions = getAvailableOrderActions('planned')
    expect(actions.map(a => a.action)).toEqual(['start', 'cancel'])
    expect(actions.map(a => a.targetStatus)).toEqual(['in_progress', 'cancelled'])
  })

  it('in_progress: Завершить (-> completed) + Отменить (-> cancelled)', () => {
    const actions = getAvailableOrderActions('in_progress')
    expect(actions.map(a => a.action)).toEqual(['complete', 'cancel'])
    expect(actions.map(a => a.targetStatus)).toEqual(['completed', 'cancelled'])
  })

  it('completed: no actions (terminal)', () => {
    expect(getAvailableOrderActions('completed')).toEqual([])
  })

  it('cancelled: no actions (terminal)', () => {
    expect(getAvailableOrderActions('cancelled')).toEqual([])
  })

  it('never offers "planned" as a target status (no reopen path on the backend)', () => {
    const all = [
      ...getAvailableOrderActions('planned'),
      ...getAvailableOrderActions('in_progress'),
      ...getAvailableOrderActions('completed'),
      ...getAvailableOrderActions('cancelled'),
    ]
    for (const a of all) expect(a.targetStatus).not.toBe('planned')
  })

  it('irreversible actions (complete, cancel) carry a confirm title/message i18n key; start does not need one to be meaningful but still has copy', () => {
    const cancelAction = getAvailableOrderActions('planned').find(a => a.action === 'cancel')!
    expect(cancelAction.confirmTitleKey).toBe('orders.actions.cancel.confirmTitle')
    expect(cancelAction.danger).toBe(true)

    const completeAction = getAvailableOrderActions('in_progress').find(a => a.action === 'complete')!
    expect(completeAction.confirmTitleKey).toBe('orders.actions.complete.confirmTitle')
    expect(completeAction.danger).toBe(false)
  })
})
