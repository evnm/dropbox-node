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

// TODO: Write method header
var DropboxClient = exports.DropboxClient = function(options) {
  events.EventEmitter.call(this)
  if (!options) options = {}
  this.oauth = options.oauth
  this.access_token = options.access_token
  this.access_token_secret = options.access_token_secret
}

sys.inherits(DropboxClient, events.EventEmitter)

// Get metadata of file/folder specified by path relative to Dropbox
// root directory.
DropboxClient.prototype.getMetadata = function(path, callback) {
  var self = this
  this.oauth.getProtectedResource(
    API_URI + API_VERSION + '/metadata/dropbox/' + path,
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}

// Get contents of a file, specified by path parameter, relative to
// Dropbox root directory.
DropboxClient.prototype.getFile = function(path, callback) {
  var self = this
  this.oauth.getProtectedResource(
    CONTENT_API_URI + API_VERSION + '/files/dropbox/' + path,
    'GET', this.access_token, this.access_token_secret,
    function(err, data, res) {
      callback(err, data)
    })
}
