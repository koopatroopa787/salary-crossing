/**
 * Asset URLs, filled in by the build.
 *
 * style.css is content-hashed. Without it, a stylesheet cached for a week in
 * a visitor's browser survives a redeploy and they see the new HTML with the
 * old CSS — which is exactly what happened once and is invisible from the
 * server, because the origin and the CDN were both serving the new file. A
 * new filename per build makes the whole class of bug impossible, and lets
 * the file be cached hard rather than timidly.
 */
export const assets = {
  style: "/style.css",
  /** Modules live in a content-versioned directory so their relative imports
   *  of each other stay correct while the whole tree cache-busts together.
   *  Fingerprinting individual module filenames cannot work: they import one
   *  another by name. */
  js: "/js",
};
