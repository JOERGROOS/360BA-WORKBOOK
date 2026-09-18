// ponytail: reine Funktionen, keine Imports — so kann scripts/check-mail-html.mjs sie ohne
// Supabase-/Resend-Umgebung importieren.
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]!);
}

export function html(text: string): string {
  const abs = escapeHtml(text)
    .split(/\n\n+/)
    .map((a) => `<p style="margin:0 0 16px;line-height:1.6">${a.replace(/\n/g, '<br>').replace(/(https?:\/\/\S+)/g, '<a href="$1" style="color:#ED7A02">$1</a>')}</p>`)
    .join('');
  return `<div style="font-family:Montserrat,Arial,sans-serif;font-size:16px;color:#0F1B23;max-width:600px;margin:0 auto;padding:32px 24px">${abs}<p style="font-size:12px;color:#878D91;margin-top:32px">JOERG ROOS · Zum Stadtgraben 5 · 45721 Haltern am See · joerg-roos.com</p></div>`;
}
