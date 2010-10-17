var http = require('http'),
    sys = require('sys'),
    API_URI = 'http://api.dropbox.com/',
    CONTENT_API_URI = 'https://api-content.dropbox.com/',
    API_VERSION = '0'

// Returns a Dropbox Client, through which API calls can be made.
var DropboxClient = exports.DropboxClient =
  function(oauth, access_token, access_token_secret) {
    this.oauth = oauth
    this.access_token = access_token
    this.access_token_secret = access_token_secret
  }

// Retrieves information about the user's account as a JSON response.
DropboxClient.prototype.getAccountInfo = function(callback) {
  this.oauth.getProtectedResource(
    API_URI + API_VERSION + '/account/info/',
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}

// Retrieves contents of a file specified by path argument, relative to
// user's Dropbox root.
DropboxClient.prototype.getFile = function(path, callback) {
  this.oauth.getProtectedResource(
    CONTENT_API_URI + API_VERSION + '/files/dropbox/' + path,
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}

// Uploads contents of a file specified by path argument, relative to
// application's directory.
// TODO: Make this work!
DropboxClient.prototype.putFile = function(file, path, callback) {
  var signed_filename = this.oauth.signUrl(file, this.access_token,
                                      this.access_token_secret, 'POST')
  console.log('signed_filename: ' + signed_filename)
  console.log('uri: ' + CONTENT_API_URI + API_VERSION + '/files/dropbox/' + path + '?file=' + file)
  this.oauth.getProtectedResource(
    CONTENT_API_URI + API_VERSION + '/files/dropbox/' + path + '?file=' + file,
    'POST', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}

// Gets metadata of file/folder specified by path relative to user's
// Dropbox root.
// TODO: Add file_limit param, others?
DropboxClient.prototype.getMetadata = function(path, callback) {
  this.oauth.getProtectedResource(
    API_URI + API_VERSION + '/metadata/dropbox/' + path,
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}

// Downloads a minimized jpeg thumbnail for a photo. See
// https://www.dropbox.com/developers/docs#thumbnails for a list of
// valid size specifiers.
DropboxClient.prototype.getThumbnail = function(path, size, callback) {
  if (typeof(size) == 'function') callback = size, size = null
  this.oauth.getProtectedResource(
    CONTENT_API_URI + API_VERSION + '/thumbnails/dropbox/' + path +
      ((size) ? '?size=' + size : ''),
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}

// Copies a file or folder to a new location.
// See https://www.dropbox.com/developers/docs#fileops-copy for explanation
// of arguments.
DropboxClient.prototype.copy = function(from_path, to_path, callback) {
  this.oauth.getProtectedResource(
    API_URI + API_VERSION + '/fileops/copy?from_path=' + from_path +
      '&root=dropbox&to_path=' + to_path,
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}

// Creates a folder relative to the user's Dropbox root.
// See https://www.dropbox.com/developers/docs#fileops-create-folder
// for explanation of arguments.
DropboxClient.prototype.createFolder = function(path, callback) {
  this.oauth.getProtectedResource(
    API_URI + API_VERSION + '/fileops/create_folder?path='
      + path +'&root=dropbox',
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}

// Deletes a file or folder.
// See https://www.dropbox.com/developers/docs#fileops-delete for
// explanation of arguments.
DropboxClient.prototype.delete = function(path, callback) {
  this.oauth.getProtectedResource(
    API_URI + API_VERSION + '/fileops/delete?path=' + path + '&root=dropbox',
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}

// Moves a file or folder.
// See https://www.dropbox.com/developers/docs#fileops-move for
// explanation of arguments.
DropboxClient.prototype.move = function(from_path, to_path, callback) {
  this.oauth.getProtectedResource(
    API_URI + API_VERSION + '/fileops/move?from_path=' + from_path +
      '&root=dropbox&to_path=' + to_path,
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}