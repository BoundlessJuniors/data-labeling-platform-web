/**
 * BaseSelect Component Tests
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseSelect from '@/components/ui/BaseSelect.vue';

describe('BaseSelect', () => {
  const options = [
    { value: '', label: 'Select...' },
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ];

  it('renders with label', () => {
    const wrapper = mount(BaseSelect, {
      props: { id: 'test-select', label: 'Choose', modelValue: '', options },
    });
    expect(wrapper.find('label').text()).toBe('Choose');
  });

  it('binds id to select and label', () => {
    const wrapper = mount(BaseSelect, {
      props: { id: 'my-select', modelValue: '', options },
    });
    expect(wrapper.find('select').attributes('id')).toBe('my-select');
  });

  it('renders all options', () => {
    const wrapper = mount(BaseSelect, {
      props: { id: 'test', modelValue: '', options },
    });
    const optionElements = wrapper.findAll('option');
    expect(optionElements).toHaveLength(3);
  });

  it('displays correct option labels', () => {
    const wrapper = mount(BaseSelect, {
      props: { id: 'test', modelValue: '', options },
    });
    expect(wrapper.text()).toContain('Option 1');
    expect(wrapper.text()).toContain('Option 2');
  });

  it('emits update:modelValue on change', async () => {
    const wrapper = mount(BaseSelect, {
      props: { id: 'test', modelValue: '', options },
    });
    await wrapper.find('select').setValue('option1');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['option1']);
  });

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseSelect, {
      props: { id: 'test', modelValue: '', options, disabled: true },
    });
    expect(wrapper.find('select').attributes('disabled')).toBeDefined();
  });
});
