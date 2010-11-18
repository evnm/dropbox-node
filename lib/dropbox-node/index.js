var http = require('http'),
    sys = require('sys'),
    querystring = require('querystring'),
    API_URI = 'http://api.dropbox.com/',
    CONTENT_API_URI = 'https://api-content.dropbox.com/',
    API_VERSION = '0';

// Returns a Dropbox Client, through which API calls can be made.
var DropboxClient = exports.DropboxClient =
  function(oauth, access_token, access_token_secret) {
    this.oauth = oauth;
    this.access_token = access_token;
    this.access_token_secret = access_token_secret;
  }

// Retrieves information about the user's account as a JSON response.
DropboxClient.prototype.getAccountInfo = function(optargs, callback) {
  if (typeof optargs == 'function') callback = optargs, optargs = {};
  this.oauth.get(API_URI + API_VERSION + '/account/info/' +
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
  this.oauth.get(CONTENT_API_URI + API_VERSION + '/files/dropbox/' + path,
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
  this.oauth.post(CONTENT_API_URI + API_VERSION + '/files/dropbox/' + path +
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
  this.oauth.get(API_URI + API_VERSION + '/metadata/dropbox/' + path +
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
  this.oauth.get(CONTENT_API_URI + API_VERSION + '/thumbnails/dropbox/' + path
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
  this.oauth.get(API_URI + API_VERSION + '/fileops/copy?from_path=' +
                 from_path + '&root=dropbox&to_path=' + to_path,
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
  this.oauth.get(API_URI + API_VERSION + '/fileops/create_folder?path='
                 + path +'&root=dropbox',
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
  this.oauth.get(API_URI + API_VERSION + '/fileops/delete?path=' +
                 path + '&root=dropbox',
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
  this.oauth.get(API_URI + API_VERSION + '/fileops/move?from_path=' +
                 from_path + '&root=dropbox&to_path=' + to_path,
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