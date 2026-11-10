import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem('df_theme') as ThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch (e) {
    // fallback
  }
  return 'system';
}

export function applyTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  try {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    localStorage.setItem('df_theme', theme);
  } catch (e) {
    console.error('Erro ao aplicar tema:', e);
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        applyTheme('system');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setAppTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return { theme, setTheme: setAppTheme };
}
