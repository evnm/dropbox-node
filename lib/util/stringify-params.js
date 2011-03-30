var querystring = require('querystring');

// Stringify the valid params in optargs (excluding token and secret).
module.exports = function stringifyParams(optargs) {
  var params = {};
  Object.keys(optargs).filter(function (k) {
    return k !== 'token' && k !== 'secret';
  }).forEach(function (k) {
    params[k] = optargs[k];
  });
  return querystring.stringify(params);
}
