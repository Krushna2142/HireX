'use client';
export default function PreloadThemeScript() {
  const js = `
    try {
      var t = localStorage.getItem('ji-theme');
      if (!t) {
        t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      if (t === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } catch {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}