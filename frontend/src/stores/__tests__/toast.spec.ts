/**
 * Toast Store Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useToastStore } from '@/stores/toast';

describe('useToastStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts with empty toasts', () => {
    const store = useToastStore();
    expect(store.toasts).toHaveLength(0);
  });

  it('adds a success toast', () => {
    const store = useToastStore();
    store.success('Operation successful');
    expect(store.toasts).toHaveLength(1);
    const toast = store.toasts[0]!;
    expect(toast.type).toBe('success');
    expect(toast.message).toBe('Operation successful');
  });

  it('adds an error toast', () => {
    const store = useToastStore();
    store.error('Something went wrong');
    expect(store.toasts).toHaveLength(1);
    const toast = store.toasts[0]!;
    expect(toast.type).toBe('error');
    expect(toast.message).toBe('Something went wrong');
  });

  it('adds an info toast', () => {
    const store = useToastStore();
    store.info('FYI');
    expect(store.toasts).toHaveLength(1);
    expect(store.toasts[0]!.type).toBe('info');
  });

  it('adds a warning toast', () => {
    const store = useToastStore();
    store.warning('Be careful');
    expect(store.toasts).toHaveLength(1);
    expect(store.toasts[0]!.type).toBe('warning');
  });

  it('removes a toast by id', () => {
    const store = useToastStore();
    store.success('Test toast');
    const toastId = store.toasts[0]!.id;
    store.remove(toastId);
    expect(store.toasts).toHaveLength(0);
  });

  it('generates unique ids for toasts', () => {
    const store = useToastStore();
    store.success('Toast 1');
    store.success('Toast 2');
    expect(store.toasts[0]!.id).not.toBe(store.toasts[1]!.id);
  });

  it('can add multiple toasts', () => {
    const store = useToastStore();
    store.success('Toast 1');
    store.error('Toast 2');
    store.info('Toast 3');
    expect(store.toasts).toHaveLength(3);
  });
});
