export function ThemeScript() {
  const script = `
    (function() {
      const savedTheme = localStorage.getItem('theme');
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const theme = savedTheme || systemTheme;
      // Apply both class and data attribute for maximum compatibility (Tailwind/media/custom CSS)
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      root.setAttribute('data-theme', theme);
      // Hint native form controls and UA styling
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      root.style.colorScheme = theme;
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}