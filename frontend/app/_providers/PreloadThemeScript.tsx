export function PreloadThemeScript() {
  const themeScript = `
    (function() {
      try {
        var stored = localStorage.getItem('theme');
        var theme = stored ? JSON.parse(stored) : null;
        if (!theme) {
          theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  );
}
