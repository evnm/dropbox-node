var pathLib = require('path')
  , querystring = require('querystring')
  , escapePath = require('./util/escape-path')
  , stringifyParams = require('./util/stringify-params')
  , EventEmitter = require('events').EventEmitter
  , OAuth = require('oauth').OAuth
  , API_URI = 'https://api.dropbox.com/1'
  , CONTENT_API_URI = 'https://api-content.dropbox.com/1';


// Returns a Dropbox Client, through which API calls can be made.
var DropboxClient = exports.DropboxClient =
  function(consumer_key, consumer_secret, access_token, access_token_secret) {
    this.consumer_key = consumer_key;
    this.consumer_secret = consumer_secret;
    this.access_token = access_token || undefined;
    this.access_token_secret = access_token_secret || undefined;
    this.oauth = new OAuth(API_URI + '/oauth/request_token'
                           , API_URI + '/oauth/access_token'
                           , consumer_key, consumer_secret
                           , '1.0', null, 'HMAC-SHA1');
  }


// Fetches an access token and access token secret pair based on the user's
// email and password. As well as being stored internally, the key pair is
// returned to the callback in case the application developer requires it.
DropboxClient.prototype.getAccessToken = function(email, pwd, cb) {
  // Validate email and pwd.
  if (typeof email === 'function') cb = email, email = undefined;
  else if (typeof pwd === 'function') cb = pwd, pwd = undefined;
  if (!email || !pwd) return cb(Error('Invalid arguments. Please provide ' +
                                      'a valid email and password.'));

  var self = this;
  this.oauth.get(API_URI + '/token?' +
                 querystring.stringify({email: email, password: pwd})
                 , null, null, function(err, data, res) {
                   if (err) return cb(err);
                   // Store the key pair and fire callback.
                   self.access_token = JSON.parse(data).token;
                   self.access_token_secret = JSON.parse(data).secret;
                   cb(null, self.access_token, self.access_token_secret);
                 });
}


// Retrieves information about the user's account as a JSON response.
DropboxClient.prototype.getAccountInfo = function(optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  this.oauth.get(API_URI + '/account/info/' +
                 (optargs.status_in_response ? '?status_in_response=' +
                  optargs.status_in_response : '')
                 , optargs.token || this.access_token
                 , optargs.secret || this.access_token_secret
                 , function(err, data, res) {
                   if (err) return cb(err);
                   cb(null, JSON.parse(data));
                 });
}


// Create a new Dropbox account.
DropboxClient.prototype.createAccount = function(email, first_name, last_name
                                                 , password, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  var params = {
    email: email
    , first_name: first_name
    , last_name: last_name
    , password: password
    , status_in_response: optargs.status_in_response
  }
  this.oauth.get(API_URI + '/account?' +
                 querystring.stringify(params)
                 , null, null, function(err, data, res) {
                   if (err) return cb(err);
                   cb(null, data);
                 });
}


// Retrieves contents of a file specified by path argument, relative to
// user's Dropbox root.
DropboxClient.prototype.getFile = function(path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  path = escapePath(path);
  this.oauth.get(CONTENT_API_URI + '/files/dropbox/' + path
                 , optargs.token || this.access_token
                 , optargs.secret || this.access_token_secret
                 , function(err, data, res) {
                   cb(err, data);
                 });
}


// Sets up a streaming connection to fetch a file specified by path argument.
// Returns a request EventEmitter object.
DropboxClient.prototype.getFileStream = function(path, optargs) {
  optargs = optargs || {};
  path = escapePath(path);
  return this.oauth.get(CONTENT_API_URI + '/files/dropbox/' + path
                        , optargs.token || this.access_token
                        , optargs.secret || this.access_token_secret);
}


// Uploads contents of a file specified by path argument, relative to
// application's directory.
DropboxClient.prototype.putFile = function(file, path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  var boundary = 'sAxIqse3tPlHqUIUI9ofVlHvtdt3tpaG'
    , content_type = 'multipart/form-data; boundary=' + boundary
    , self = this;

  require('fs').readFile(file, function(err, data) {
    if (err) return cb(err);
    // Build request body.
    path = escapePath(path);
    var body = ['--' + boundary
                , 'Content-Disposition: form-data; name=file; filename="' + file + '"'
                , 'Content-Type: application/octet-stream'
                , '', data.toString('binary'), '--' + boundary + '--', ''
               ].join('\r\n');

    self.oauth.post(CONTENT_API_URI + '/files/dropbox/' + path +
                    '?file=' + encodeURIComponent(file)
                    , optargs.token || self.access_token
                    , optargs.secret || self.access_token_secret
                    , body, content_type
                    , function(err, data, res) {
                      if (err) return cb(err);
                      cb(null, JSON.parse(data));
                    });
  });
}


// Uploads contents to the specified path
DropboxClient.prototype.put = function(content, path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  var boundary = 'sAxIqse3tPlHqUIUI9ofVlHvtdt3tpaG'
    , content_type = 'multipart/form-data; boundary=' + boundary
    , self = this;

  // Build request body.
  var file = pathLib.basename(path);
  path = escapePath(pathLib.dirname(path));
  var body = ['--' + boundary
              , 'Content-Disposition: form-data; name=file; filename="' + file + '"'
              , 'Content-Type: application/octet-stream'
              , '', content, '--' + boundary + '--', ''
             ].join('\r\n');

  self.oauth.post(CONTENT_API_URI + '/files/dropbox/' + path +
                  '?file=' + encodeURIComponent(file)
                  , optargs.token || self.access_token
                  , optargs.secret || self.access_token_secret
                  , body, content_type
                  , function(err, data, res) {
                    if (err) return cb(err);
                    cb(null, JSON.parse(data));
                  });
}


// Gets metadata of file/folder specified by path relative to user's
// Dropbox root.
DropboxClient.prototype.getMetadata = function(path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  path = escapePath(path);
  this.oauth.get(API_URI + '/metadata/dropbox/' + path + '?' +
                 stringifyParams(optargs)
                 , optargs.token || this.access_token
                 , optargs.secret || this.access_token_secret
                 , function(err, data, res) {
                   if (err) return cb(err);
                   cb(null, JSON.parse(data));
                 });
}


// Downloads a minimized jpeg thumbnail for a photo. See
// https://www.dropbox.com/developers/docs#thumbnails for a list of
// valid size specifiers.
DropboxClient.prototype.getThumbnail = function(path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  path = escapePath(path);
  this.oauth.get(CONTENT_API_URI + '/thumbnails/dropbox/' + path + '?' +
                 stringifyParams(optargs)
                 , optargs.token || this.access_token
                 , optargs.secret || this.access_token_secret
                 , function(err, data, res) {
                   cb(err, data);
                 });
}


// Copies a file or folder to a new location.
// See https://www.dropbox.com/developers/docs#fileops-copy for explanation
// of arguments.
DropboxClient.prototype.copy = function(from_path, to_path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  this.oauth.get(API_URI + '/fileops/copy?' +
                 querystring.stringify({root: 'dropbox'
                                        , from_path: from_path
                                        , to_path: to_path})
                 , optargs.token || this.access_token
                 , optargs.secret || this.access_token_secret
                 , function(err, data, res) {
                   if (err) return cb(err);
                   cb(null, JSON.parse(data));
                 });
}


// Creates a folder relative to the user's Dropbox root.
// See https://www.dropbox.com/developers/docs#fileops-create-folder
// for explanation of arguments.
DropboxClient.prototype.createFolder = function(path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  this.oauth.get(API_URI + '/fileops/create_folder?' +
                 querystring.stringify({root: 'dropbox'
                                        , path: path})
                 , optargs.token || this.access_token
                 , optargs.secret || this.access_token_secret
                 , function(err, data, res) {
                   if (err) return cb(err);
                   cb(null, JSON.parse(data));
                 });
}


// Deletes a file or folder.
// See https://www.dropbox.com/developers/docs#fileops-delete for
// explanation of arguments.
DropboxClient.prototype.deleteItem = function(path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  this.oauth.get(API_URI + '/fileops/delete?' +
                 querystring.stringify({root: 'dropbox', path: path})
                 , optargs.token || this.access_token
                 , optargs.secret || this.access_token_secret
                 , function(err, data, res) {
                   if (err) return cb(err);
                   cb(null, JSON.parse(data));
                 });
}


// Moves a file or folder.
// See https://www.dropbox.com/developers/docs#fileops-move for
// explanation of arguments.
DropboxClient.prototype.move = function(from_path, to_path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  this.oauth.get(API_URI + '/fileops/move?' +
                 querystring.stringify({root: 'dropbox'
                                        , from_path: from_path
                                        , to_path: to_path})
                 , optargs.token || this.access_token
                 , optargs.secret || this.access_token_secret
                 , function(err, data, res) {
                   if (err) return cb(err);
                   cb(null, JSON.parse(data));
                 });
}


// Searches a folder
// See https://www.dropbox.com/developers/reference/api#search
DropboxClient.prototype.search = function(path, query, optargs, cb) {
  if (typeof optargs === 'function') cb = optargs, optargs = {};
  this.oauth.get(API_URI + '/search/dropbox/' + path + '?' +
                 querystring.stringify({query: query})
                 , optargs.token || this.access_token
                 , optargs.secret || this.access_token_secret
                 , function(err, data, res) {
                   if (err) return cb(err);
                   cb(null, JSON.parse(data));
                 });
}


// Keep up with changes.
// See https://www.dropbox.com/developers/reference/api#delta
DropboxClient.prototype.delta = function(cursor, optargs, cb) {
  var cursorType = typeof cursor;
  if (cursorType === 'function') cb = cursor, optargs = {};
  else if (typeof optargs === 'function') {
    cb = optargs;
    if (cursorType === 'object') {
      optargs = cursor;
      cursor = null;
    } else {
      optargs = {}
    }
  }

  this.oauth.post(API_URI + '/delta' +
                 (cursor ?
                   '?' + querystring.stringify({cursor: cursor}) : '')
                 , optargs.token || this.access_token
                 , optargs.secret || this.access_token_secret
                 , ''
                 , function(err, data, res) {
                   if (err) return cb(err);
                   cb(null, JSON.parse(data));
                 });
}


// Continously stream changes through DropboxClient#delta
DropboxClient.prototype.stream = function(cursor, optargs) {
  optargs = optargs || {};
  var ee = new EventEmitter();
  var iid;
  var self = this;

  function getDelta() {
    self.delta(cursor, optargs, function(err, data) {
      if (err) { return ee.emit('error', err); }

      // only emit changes if cursor was given
      if (cursor) {
        if (data.reset) {
          ee.emit('reset');
        }

        for (var i = 0, len = data.entries.length; i < len; i++) {
          var e = data.entries[i];
          ee.emit('data', { path: e[0], metadata: e[1] });
        }
      }

      cursor = data.cursor;
      if (data.has_more) {
        ee.resume();
      }
    });
  }

  ee.resume = function() {
    getDelta();
    clearInterval(iid);
    iid = setInterval(getDelta, 300000); // 5 minutes
  };
  ee.resume();

  ee.pause = function() {
    clearInterval(iid);
  };

  return ee;
}
