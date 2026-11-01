// Turns a name into a URL-friendly slug. Shared by the exercises of this chapter; you don't
// need to edit this file. Like many npm packages, it has a single default export.

/** `slugify("Café Déjà Vu!")` is `"cafe-deja-vu"`. */
export default function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // drop the accents that NFKD split off the letters
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
