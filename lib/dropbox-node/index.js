var http = require('http'),
    sys = require('sys'),
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
DropboxClient.prototype.getAccountInfo = function(status_in_res,
                                                  callback) {
  if (typeof status_in_res == 'function')
    callback = status_in_res, status_in_res = undefined;
  this.oauth.get(API_URI + API_VERSION + '/account/info/' +
                 (status_in_res ? '?status_in_response=true' : ''),
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   callback(err, JSON.parse(data));
                 });
}

// Retrieves contents of a file specified by path argument, relative to
// user's Dropbox root.
DropboxClient.prototype.getFile = function(path, callback) {
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
  this.oauth.post(CONTENT_API_URI + API_VERSION + '/files/dropbox/' + path +
                  '?file=' + file,
                  this.access_token, this.access_token_secret,
                  body, content_type,
                  function(err, data, res) {
                    callback(err, JSON.parse(data));
                  });
}

// Gets metadata of file/folder specified by path relative to user's
// Dropbox root.
// TODO: Add file_limit param, others?
DropboxClient.prototype.getMetadata = function(path, callback) {
  this.oauth.get(API_URI + API_VERSION + '/metadata/dropbox/' + path,
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   callback(err, JSON.parse(data));
                 });
}

// Downloads a minimized jpeg thumbnail for a photo. See
// https://www.dropbox.com/developers/docs#thumbnails for a list of
// valid size specifiers.
DropboxClient.prototype.getThumbnail = function(path, size, callback) {
  if (typeof(size) == 'function') callback = size, size = null;
  this.oauth.get(CONTENT_API_URI + API_VERSION + '/thumbnails/dropbox/' +
                 path + ((size) ? '?size=' + size : ''),
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   callback(err, data);
                 });
}

// Copies a file or folder to a new location.
// See https://www.dropbox.com/developers/docs#fileops-copy for explanation
// of arguments.
DropboxClient.prototype.copy = function(from_path, to_path, callback) {
  this.oauth.get(API_URI + API_VERSION + '/fileops/copy?from_path=' +
                 from_path + '&root=dropbox&to_path=' + to_path,
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   callback(err, JSON.parse(data));
                 });
}

// Creates a folder relative to the user's Dropbox root.
// See https://www.dropbox.com/developers/docs#fileops-create-folder
// for explanation of arguments.
DropboxClient.prototype.createFolder = function(path, callback) {
  this.oauth.get(API_URI + API_VERSION + '/fileops/create_folder?path='
                 + path +'&root=dropbox',
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   callback(err, JSON.parse(data));
                 });
}

// Deletes a file or folder.
// See https://www.dropbox.com/developers/docs#fileops-delete for
// explanation of arguments.
DropboxClient.prototype.deleteItem = function(path, callback) {
  this.oauth.get(API_URI + API_VERSION + '/fileops/delete?path=' +
                 path + '&root=dropbox',
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   callback(err, JSON.parse(data));
                 });
}

// Moves a file or folder.
// See https://www.dropbox.com/developers/docs#fileops-move for
// explanation of arguments.
DropboxClient.prototype.move = function(from_path, to_path, callback) {
  this.oauth.get(API_URI + API_VERSION + '/fileops/move?from_path=' +
                 from_path + '&root=dropbox&to_path=' + to_path,
                 this.access_token, this.access_token_secret,
                 function(err, data, res) {
                   callback(err, JSON.parse(data));
                 });
}