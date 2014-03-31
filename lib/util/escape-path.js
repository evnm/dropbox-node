// Escape URI-sensitive chars, but leave forward slashes alone.
module.exports = function escapePath(p) {
  var p = encodeURIComponent(p)
    .replace(/%2F/g, '/')
    .replace(/\)/g, '%29')
    .replace(/\(/g, '%28')
	.replace(/!/g,'%21');
  if (p[0] === '/') { p = p.slice(1); }
  return p;
}
