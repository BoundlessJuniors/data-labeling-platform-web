/**
 * BaseInput Component Tests
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseInput from '@/components/ui/BaseInput.vue';

describe('BaseInput', () => {
  it('renders with label', () => {
    const wrapper = mount(BaseInput, {
      props: { id: 'test-input', label: 'Email', modelValue: '' },
    });
    expect(wrapper.find('label').text()).toBe('Email');
  });

  it('binds id to input and label', () => {
    const wrapper = mount(BaseInput, {
      props: { id: 'email-input', label: 'Email', modelValue: '' },
    });
    expect(wrapper.find('input').attributes('id')).toBe('email-input');
    expect(wrapper.find('label').attributes('for')).toBe('email-input');
  });

  it('displays modelValue', () => {
    const wrapper = mount(BaseInput, {
      props: { id: 'test', modelValue: 'hello@test.com' },
    });
    expect(wrapper.find('input').element.value).toBe('hello@test.com');
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(BaseInput, {
      props: { id: 'test', modelValue: '' },
    });
    await wrapper.find('input').setValue('new value');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['new value']);
  });

  it('shows error message', () => {
    const wrapper = mount(BaseInput, {
      props: { id: 'test', modelValue: '', error: 'Invalid email' },
    });
    expect(wrapper.text()).toContain('Invalid email');
  });

  it('applies error styling when error is present', () => {
    const wrapper = mount(BaseInput, {
      props: { id: 'test', modelValue: '', error: 'Invalid' },
    });
    expect(wrapper.find('input').classes()).toContain('border-red-500');
  });

  it('applies correct type attribute', () => {
    const wrapper = mount(BaseInput, {
      props: { id: 'test', modelValue: '', type: 'password' },
    });
    expect(wrapper.find('input').attributes('type')).toBe('password');
  });

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseInput, {
      props: { id: 'test', modelValue: '', disabled: true },
    });
    expect(wrapper.find('input').attributes('disabled')).toBeDefined();
  });

  it('applies required attribute', () => {
    const wrapper = mount(BaseInput, {
      props: { id: 'test', modelValue: '', required: true },
    });
    expect(wrapper.find('input').attributes('required')).toBeDefined();
  });
});
