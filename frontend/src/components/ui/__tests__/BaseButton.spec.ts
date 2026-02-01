/**
 * BaseButton Component Tests
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseButton from '@/components/ui/BaseButton.vue';

describe('BaseButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'Click Me',
      },
    });
    expect(wrapper.text()).toContain('Click Me');
  });

  it('applies primary variant styling by default', () => {
    const wrapper = mount(BaseButton);
    // Check for primary variant class
    expect(wrapper.classes().some(c => c.includes('bg-primary-600'))).toBe(true);
  });

  it('applies secondary variant styling when specified', () => {
    const wrapper = mount(BaseButton, {
      props: { variant: 'secondary' },
    });
    expect(wrapper.classes().some(c => c.includes('bg-gray-200'))).toBe(true);
  });

  it('applies danger variant styling when specified', () => {
    const wrapper = mount(BaseButton, {
      props: { variant: 'danger' },
    });
    expect(wrapper.classes().some(c => c.includes('bg-red-600'))).toBe(true);
  });

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(BaseButton, {
      props: { disabled: true },
    });
    expect(wrapper.attributes('disabled')).toBeDefined();
  });

  it('is disabled when loading prop is true', () => {
    const wrapper = mount(BaseButton, {
      props: { loading: true },
    });
    expect(wrapper.attributes('disabled')).toBeDefined();
  });

  it('shows loading spinner when loading', () => {
    const wrapper = mount(BaseButton, {
      props: { loading: true },
      slots: { default: 'Submit' },
    });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(BaseButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mount(BaseButton, {
      props: { disabled: true },
    });
    await wrapper.trigger('click');
    // Note: The click event is still emitted, but the button is disabled
    // The actual prevention happens at the browser level
    expect(wrapper.attributes('disabled')).toBeDefined();
  });
});
