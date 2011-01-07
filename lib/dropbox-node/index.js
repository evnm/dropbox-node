var http = require('http'),
    sys = require('sys'),
    querystring = require('querystring'),
    OAuth = require('oauth').OAuth,
    API_URI = 'http://api.dropbox.com/0',
    CONTENT_API_URI = 'https://api-content.dropbox.com/0'

// Returns a Dropbox Client, through which API calls can be made.
var DropboxClient = exports.DropboxClient =
  function(consumer_key, consumer_secret) {
    this.consumer_key = consumer_key;
    this.consumer_secret = consumer_secret;
    this.access_token = undefined;
    this.access_token_secret = undefined;
    this.oauth = new OAuth(
      API_URI + '/oauth/request_token',
      API_URI + '/oauth/access_token',
      consumer_key, consumer_secret,
      '1.0', null, 'HMAC-SHA1')
  }

// Retrieves access token and token secret pair, which are used to
// authenticate subsequent calls.
DropboxClient.prototype.init = function(email, pwd, callback) {
  var self = this;
  this.oauth.get(API_URI + '/token?' +
                 querystring.stringify({email: email, password: pwd}),
                 null, null,
                 function(err, data, res) {
                   if (err) callback(err);
                   else {
                     // Store the key pair and fire callback.
                     self.access_token = JSON.parse(data).token;
                     self.access_token_secret = JSON.parse(data).secret;
                     callback(null);
                   }
                 });
}

// Retrieves information about the user's account as a JSON response.
DropboxClient.prototype.getAccountInfo = function(optargs, callback) {
  if (typeof optargs == 'function') callback = optargs, optargs = {};
  this.oauth.get(API_URI + '/account/info/' +
                 (optargs.status_in_response ? '?status_in_response=' +
                  optargs.status_in_response : ''),
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   if (err) callback(err);
                   else callback(null, JSON.parse(data));
                 });
}

// Retrieves contents of a file specified by path argument, relative to
// user's Dropbox root.
DropboxClient.prototype.getFile = function(path, callback) {
  path = escapePath(path);
  this.oauth.get(CONTENT_API_URI + '/files/dropbox/' + path,
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   callback(err, data);
                 });
}

// Uploads contents of a file specified by path argument, relative to
// application's directory.
DropboxClient.prototype.putFile = function(file, path, callback) {
  var boundary = 'sAxIqse3tPlHqUIUI9ofVlHvtdt3tpaG',
      content_type = 'multipart/form-data; boundary=' + boundary,
      file_contents = require('fs').readFileSync(file);

  // Build request body.
  var body = '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name=file; filename=' + file + '\r\n' +
    'Content-type: application/octet-stream\r\n' +
    '\r\n' + file_contents + '\r\n' +
    '--' + boundary + '--';
  path = escapePath(path);
  this.oauth.post(CONTENT_API_URI + '/files/dropbox/' + path +
                  '?file=' + file,
                  this.access_token, this.access_token_secret,
                  body, content_type,
                  function(err, data, res) {
                    if (err) callback(err);
                    else callback(null, JSON.parse(data));
                  });
}

// Gets metadata of file/folder specified by path relative to user's
// Dropbox root.
DropboxClient.prototype.getMetadata = function(path, optargs, callback) {
  if (typeof optargs == 'function') callback = optargs, optargs = null;
  path = escapePath(path);
  this.oauth.get(API_URI + '/metadata/dropbox/' + path +
                 (optargs ? '?' + querystring.stringify(optargs) : ''),
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   if (err) callback(err);
                   else callback(null, JSON.parse(data));
                 });
}

// Downloads a minimized jpeg thumbnail for a photo. See
// https://www.dropbox.com/developers/docs#thumbnails for a list of
// valid size specifiers.
DropboxClient.prototype.getThumbnail = function(path, optargs, callback) {
  if (typeof optargs == 'function') callback = optargs, optargs = null;
  path = escapePath(path);
  this.oauth.get(CONTENT_API_URI + '/thumbnails/dropbox/' + path
                 + (optargs ? '?' + querystring.stringify(optargs) : ''),
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   callback(err, data);
                 });
}

// Copies a file or folder to a new location.
// See https://www.dropbox.com/developers/docs#fileops-copy for explanation
// of arguments.
DropboxClient.prototype.copy = function(from_path, to_path, callback) {
  from_path = escapePath(from_path);
  to_path = escapePath(to_path);
  this.oauth.get(API_URI + '/fileops/copy?' +
                 querystring.stringify({root: 'dropbox',
                                        from_path: from_path,
                                        to_path: to_path}),
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   if (err) callback(err);
                   else callback(null, JSON.parse(data));
                 });
}

// Creates a folder relative to the user's Dropbox root.
// See https://www.dropbox.com/developers/docs#fileops-create-folder
// for explanation of arguments.
DropboxClient.prototype.createFolder = function(path, callback) {
  path = escapePath(path);
  this.oauth.get(API_URI + '/fileops/create_folder?' +
                 querystring.stringify({root: 'dropbox',
                                        path: path}),
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   if (err) callback(err);
                   else callback(null, JSON.parse(data));
                 });
}

// Deletes a file or folder.
// See https://www.dropbox.com/developers/docs#fileops-delete for
// explanation of arguments.
DropboxClient.prototype.deleteItem = function(path, callback) {
  path = escapePath(path);
  this.oauth.get(API_URI + '/fileops/delete?' +
                 querystring.stringify({root: 'dropbox',
                                        path: path}),
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   if (err) callback(err);
                   else callback(null, JSON.parse(data));
                 });
}

// Moves a file or folder.
// See https://www.dropbox.com/developers/docs#fileops-move for
// explanation of arguments.
DropboxClient.prototype.move = function(from_path, to_path, callback) {
  from_path = escapePath(from_path);
  to_path = escapePath(to_path);
  this.oauth.get(API_URI + '/fileops/move?' +
                 querystring.stringify({root: 'dropbox',
                                        from_path: from_path,
                                        to_path: to_path}),
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   if (err) callback(err);
                   else callback(null, JSON.parse(data));
                 });
}

// Escape URI-sensitive chars, but leave forward slashes alone.
function escapePath(p) {
  return encodeURIComponent(p).replace(/%2F/g, '/');
}