export function fontWaitScript(timeoutMs: number = 5000): string {
  return `
    new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve("Font readiness timed out after ${timeoutMs}ms. Google Fonts may not be embedded if network access failed.");
      }, ${timeoutMs});

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          clearTimeout(timeout);
          resolve(null);
        }).catch(() => {
          clearTimeout(timeout);
          resolve("Font readiness promise rejected. Google Fonts may not be fully loaded.");
        });
      } else {
        clearTimeout(timeout);
        resolve("document.fonts API not available in this browser. Font readiness could not be confirmed.");
      }
    })
  `;
}
