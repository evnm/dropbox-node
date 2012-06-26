var pathLib = require('path')
  , querystring = require('querystring')
  , fs = require('fs')
  , escapePath = require('./util/escape-path')
  , stringifyParams = require('./util/stringify-params')
  , errors = require('./errors')
  , EventEmitter = require('events').EventEmitter
  , request = require('request')
  , API_URI = 'https://api.dropbox.com/1'
  , CONTENT_API_URI = 'https://api-content.dropbox.com/1';


// Returns a Dropbox Client, through which API calls can be made.
var DropboxClient = exports.DropboxClient =
  function(consumer_key, consumer_secret, access_token, access_token_secret, options) {
    options = options || {};
    this.consumer_key = consumer_key;
    this.consumer_secret = consumer_secret;
    this.access_token = access_token || undefined;
    this.access_token_secret = access_token_secret || undefined;
    this.root = options.sandbox ? 'sandbox' : 'dropbox';
  }


// Creates a request to the API with OAuth credentials
DropboxClient.prototype.request =
  function(method, uri, optargs, body, callback) {
    if (typeof body === 'function') callback = body, body = undefined;
    optargs = optargs || {};
    var oauth = {
      consumer_key: this.consumer_key
    , consumer_secret: this.consumer_secret
    , token: optargs.token || this.access_token
    , token_secret: optargs.secret || this.access_token_secret
    };

    var requestOptions = { uri: uri, oauth: oauth };
    if (body) {
      if (method === 'get') {
        requestOptions.headers = { Range: body };
      } else {
        requestOptions.body = body;
      }
    }

    return request[method](requestOptions, callback ?
      function(err, res, body) {
        if (err) return callback(err);
        var contentType = res.headers['content-type'];

        // check if the response body is in JSON format
        if (contentType === 'application/json' ||
            contentType === 'text/javascript') {
          body = JSON.parse(body);
          if (body.error) {
            var err = new Error(body.error);
            err.statusCode = res.statusCode;
            return callback(err);
          }

        } else if (errors[res.statusCode]) {
          var err = new Error(errors[res.statusCode]);
          err.statusCode = res.statusCode;
          return callback(err);
        }

        // check for metadata in headers
        if (res.headers['x-dropbox-metadata']) {
          var metadata = JSON.parse(res.headers['x-dropbox-metadata']);
        }

        callback(null, body, metadata);
      } : undefined);
};


// Convenience methods
['get', 'post', 'put'].forEach(function(method) {
  DropboxClient.prototype['_' + method] = function(uri, optargs, body, callback) {
    return this.request(method, uri, optargs, body, callback);
  };
});


// Fetches an access token and access token secret pair based on the user's
// email and password. As well as being stored internally, the key pair is
// returned to the callback in case the application developer requires it.
DropboxClient.prototype.getAccessToken = function(email, pwd, cb) {
  // Validate email and pwd.
  if (!email || !pwd) return cb(Error('Invalid arguments. Please provide ' +
                                      'a valid email and password.'));

  var uri = API_URI + '/token?' +
    querystring.stringify({email: email, password: pwd});
  var self = this;
  this._get(uri, {}, function(err, data) {
    if (err) return cb(err);
    // Store the key pair and fire callback.
    self.access_token = data.token;
    self.access_token_secret = data.secret;
    cb(null, data.token, data.secret);
  });
}


// Retrieves information about the user's account as a JSON response.
DropboxClient.prototype.getAccountInfo = function(optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  var uri = API_URI + '/account/info/' +
    (optargs.status_in_response ? '?status_in_response=' +
    optargs.status_in_response : '');
  this._get(uri, optargs, cb);
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
  var uri = API_URI + '/account?' +
    querystring.stringify(params);
  this._get(uri, {}, cb);
}


// Retrieves contents of a file specified by path argument, relative to
// user's Dropbox root.
DropboxClient.prototype.getFile = function(path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  else if (!optargs) optargs = {};
  var uri = CONTENT_API_URI + '/files/' + this.root + '/' + escapePath(path) +
    (optargs.rev ? '?rev=' + optargs.rev : '');
  return this._get(uri, optargs, optargs.range, cb);
}


// Uploads contents of a file specified by file to the remote path
DropboxClient.prototype.putFile = function(file, path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  var uri = CONTENT_API_URI + '/files_put/' + this.root + '/' + escapePath(path) +
    '?' + stringifyParams(optargs);
  var self = this;
  fs.readFile(file, function(err, data) {
    if (err) return cb(err);
    self.request('put', uri, optargs, data, cb);
  });
}


// Uploads contents to the specified path
DropboxClient.prototype.put = function(content, path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  var uri = CONTENT_API_URI + '/files_put/' + this.root + '/' + escapePath(path) +
    '?' + stringifyParams(optargs);
  this._put(uri, optargs, content, cb);
}


// Gets metadata of file/folder specified by path relative to user's
// Dropbox root.
DropboxClient.prototype.getMetadata = function(path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  var uri = API_URI + '/metadata/' + this.root + '/' + escapePath(path) + '?' +
    stringifyParams(optargs);
  this._get(uri, optargs, cb);
}


// Downloads a minimized jpeg thumbnail for a photo. See
// https://www.dropbox.com/developers/docs#thumbnails for a list of
// valid size specifiers.
DropboxClient.prototype.getThumbnail = function(path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  optargs = optargs || {};
  var uri = CONTENT_API_URI + '/thumbnails/' + this.root + '/' + escapePath(path) + '?' +
    stringifyParams(optargs);
  return this._get(uri, optargs, cb);
}


// Copies a file or folder to a new location.
// See https://www.dropbox.com/developers/docs#fileops-copy for explanation
// of arguments.
DropboxClient.prototype.copy = function(from_path, to_path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  optargs.root = this.root;
  if (!optargs.from_copy_ref) optargs.from_path = from_path;
  optargs.to_path = to_path;
  var uri = API_URI + '/fileops/copy?' + stringifyParams(optargs);
  this._get(uri, optargs, cb);
}


// Creates a folder relative to the user's Dropbox root.
// See https://www.dropbox.com/developers/docs#fileops-create-folder
// for explanation of arguments.
DropboxClient.prototype.createFolder = function(path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  var uri = API_URI + '/fileops/create_folder?' +
    querystring.stringify({root: this.root
                          , path: path});
  this._get(uri, optargs, cb);
}


// Deletes a file or folder.
// See https://www.dropbox.com/developers/docs#fileops-delete for
// explanation of arguments.
DropboxClient.prototype.deleteItem = function(path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  var uri = API_URI + '/fileops/delete?' +
    querystring.stringify({root: this.root, path: path});
  this._get(uri, optargs, cb);
}


// Moves a file or folder.
// See https://www.dropbox.com/developers/docs#fileops-move for
// explanation of arguments.
DropboxClient.prototype.move = function(from_path, to_path, optargs, cb) {
  if (typeof optargs == 'function') cb = optargs, optargs = {};
  var uri = API_URI + '/fileops/move?' +
    querystring.stringify({root: this.root
                          , from_path: from_path
                          , to_path: to_path});
  this._get(uri, optargs, cb);
}


// Searches a folder
// See https://www.dropbox.com/developers/reference/api#search
DropboxClient.prototype.search = function(path, query, optargs, cb) {
  if (typeof optargs === 'function') cb = optargs, optargs = {};
  optargs.query = query;
  var uri = API_URI + '/search/' + this.root + '/' + escapePath(path) + '?' +
    stringifyParams(optargs);
  this._get(uri, optargs, cb);
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

  var uri = API_URI + '/delta' +
    (cursor ? '?' + querystring.stringify({cursor: cursor}) : '')
  this._post(uri, optargs, cb);
}


// Continously stream changes through DropboxClient#delta
// Returns an event emitter that has `pause()` and `resume()` methods.
// It emits `reset` events on detta resets, and `data` events with
// parameters `path` and `metadata` on new delta changes.
DropboxClient.prototype.changesStream = function(cursor, optargs) {
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
          ee.emit('data', e[0], e[1]);
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
