/** Matches the observed Meta export block layout (following.html, 2026-11). */
export function exportHtml(usernames: string[]): string {
  const blocks = usernames
    .map(
      (name) =>
        `<div class="pam _3-95 _2ph- _a6-g uiBoxWhite nobottommargin">` +
        `<div class="_a6-h _a6-i">${name}</div>` +
        `<a href="https://www.instagram.com/_u/${name}">https://www.instagram.com/_u/${name}</a>` +
        `</div>`,
    )
    .join('');
  return `<!DOCTYPE html><html><body><h1>Following</h1>${blocks}</body></html>`;
}
