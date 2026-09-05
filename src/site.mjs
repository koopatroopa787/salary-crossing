/**
 * Everything that changes when the domain is bought.
 *
 * ponytail: one file, three lines to edit, then `node build.mjs`. Nothing else
 * in the codebase spells out a hostname or an email address.
 */

export const ORIGIN = "https://salarycrossing.com";
export const BASE = "";                        // the site owns its root now

export const SITE_NAME = "Salary Crossing";
export const CONTACT = "hello@salarycrossing.com";

/**
 * Google applies stricter standards to money advice than to anything else.
 * An attributed page outranks an anonymous one in this niche, so the author
 * is part of the product, not decoration.
 */
export const AUTHOR = {
  name: "",                                    // TODO: your name, or leave blank to omit
  bio: "",
  location: "United Kingdom",
};

export const url = (path = "/") =>
  ORIGIN + BASE + (path.startsWith("/") ? path : "/" + path);
