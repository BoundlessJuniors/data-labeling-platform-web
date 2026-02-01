/**
 * BaseModal Component Tests
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseModal from '@/components/ui/BaseModal.vue';

describe('BaseModal', () => {
  it('is not rendered when open is false', () => {
    const wrapper = mount(BaseModal, {
      props: { open: false, title: 'Test Modal' },
    });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('is rendered when open is true', () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'Test Modal' },
      global: {
        stubs: { teleport: true },
      },
    });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
  });

  it('displays the title', () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'My Title' },
      global: {
        stubs: { teleport: true },
      },
    });
    expect(wrapper.text()).toContain('My Title');
  });

  it('renders default slot content', () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'Test' },
      slots: {
        default: '<p>Modal Content</p>',
      },
      global: {
        stubs: { teleport: true },
      },
    });
    expect(wrapper.text()).toContain('Modal Content');
  });

  it('renders footer slot content', () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'Test' },
      slots: {
        footer: '<button>Save</button>',
      },
      global: {
        stubs: { teleport: true },
      },
    });
    expect(wrapper.text()).toContain('Save');
  });

  it('emits close event when close button clicked', async () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'Test' },
      global: {
        stubs: { teleport: true },
      },
    });
    await wrapper.find('button[aria-label]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('applies correct size class', () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'Test', size: 'lg' },
      global: {
        stubs: { teleport: true },
      },
    });
    expect(wrapper.html()).toContain('max-w-lg');
  });
});
