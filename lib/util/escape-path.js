// Escape URI-sensitive chars, but leave forward slashes alone.
module.exports = function escapePath(p) {
  return encodeURIComponent(p).replace(/%2F/g, '/');
}
