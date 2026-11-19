export type ShareResult = "shared" | "copied" | null;

/** System share sheet where there is one, otherwise the clipboard. null when cancelled or unavailable. */
export async function shareLink(url: string, title: string): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch {
      return null;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return null;
  }
}
