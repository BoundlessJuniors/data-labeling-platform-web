import { ref, computed } from 'vue';

type Theme = 'light' | 'dark';

// Global state to keep it reactive across multiple layout instances if needed
const theme = ref<Theme>('light');

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark');

  const applyTheme = (newTheme: Theme) => {
    theme.value = newTheme;
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const toggleTheme = () => {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark');
  };

  const initTheme = () => {
    if (typeof window === 'undefined') return;
    
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme === 'light' || storedTheme === 'dark') {
      applyTheme(storedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  };

  return {
    theme,
    isDark,
    applyTheme,
    toggleTheme,
    initTheme,
  };
}
