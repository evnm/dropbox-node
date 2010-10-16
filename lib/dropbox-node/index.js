/*
  TODO: Write header.
 */

// TODO: Figure out how to order these vars.
var http = require('http'),
    sys = require('sys'),
    events = require('events'),
    API_URI = 'http://api.dropbox.com/',
    CONTENT_API_URI = 'https://api-content.dropbox.com/',
    API_VERSION = '0',
    access_token = '',
    access_token_secret = ''

// 
var DropboxClient = exports.DropboxClient = function(oauth,
                                                     access_token,
                                                     access_token_secret) {
  this.oauth = oauth
  this.access_token = access_token
  this.access_token_secret = access_token_secret
}

// Retrieves information about the user's account.
DropboxClient.prototype.getAccountInfo = function(callback) {
  this.oauth.getProtectedResource(
    API_URI + API_VERSION + '/account/info/',
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}

// Get contents of a file specified by path parameter, relative to
// user's Dropbox root.
DropboxClient.prototype.getFile = function(path, callback) {
  this.oauth.getProtectedResource(
    CONTENT_API_URI + API_VERSION + '/files/dropbox/' + path,
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}

// Uploads contents of a file specified by path parameter, relative to
// application's directory.
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
DropboxClient.prototype.getMetadata = function(path, callback) {
  this.oauth.getProtectedResource(
    API_URI + API_VERSION + '/metadata/dropbox/' + path,
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}

// Downloads a minimized thumbnail for a photo. See
// https://www.dropbox.com/developers/docs#thumbnails for a list of
// valid size specifiers.
// NOTE: Returned thumbnail is in jpeg format.
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