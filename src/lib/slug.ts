export function slugify(text: string): string {
  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "-")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug.length > 50) {
    // Try to truncate on a word boundary
    const truncated = slug.substring(0, 50);
    const lastHyphen = truncated.lastIndexOf("-");
    if (lastHyphen > 30) {
      slug = truncated.substring(0, lastHyphen);
    } else {
      slug = truncated.replace(/-$/, "");
    }
  }

  return slug;
}
