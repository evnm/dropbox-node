var querystring = require('querystring')
  , escapePath = require('./util/escape-path')
  , stringifyParams = require('./util/stringify-params')
  , OAuth = require('oauth').OAuth
  , API_URI = 'http://api.dropbox.com/0'
  , CONTENT_API_URI = 'https://api-content.dropbox.com/0'
  , AUTHORIZE_URI = 'http://www.dropbox.com/0/oauth/authorize';


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

// Connect middleware to provide OAuth based authorization to Dropbox
// on the specified path. Requires connect-session middleware.
// After successful authorization, user's session will contain
// access_token and access_token_secret
DropboxClient.prototype.login = function(mount, success) {
  var self = this
    , url = require('url')
    , mount = mount || '/dbauth';

  return function handle(req, res, next) {
    var path = url.parse(req.url, true);

    // Only handle requests to the exact path
    if(path.pathname !== mount) return next();

    // Set the oauth_callback based on this request if we don't have it
    if(!self.oauth._authorize_callback) {
      var scheme = req.socket.secure ? "https://" : "http://"
        , callback_uri = url.parse(scheme + req.headers.host + req.url, true);
      self.oauth._authorize_callback = callback_uri.href;
    }

    // Get the info in the user's session
    var dbauth = req.session.dbauth;

    // User is already authenticated, but in the wrong place
    if(dbauth && dbauth.access_token_secret) {
      res.writeHead(302, {'Location': success || '/'});
      res.end();
      return;

    // User is returning from Dropbox with oauth_token
    } else if(path.query && path.query.oauth_token && path.query.uid
              && dbauth && dbauth.oauth_token_secret) {
      self.oauth.getOAuthAccessToken(
              path.query.oauth_token, dbauth.oauth_token_secret
            , path.query.oauth_verifier
            , function(error, access_token, access_token_secret, params) {
              if(error) {
                return next(error);
              } else {
                req.session.dbauth = {
                  uid: path.query.uid,
                  access_token: access_token,
                  access_token_secret: access_token_secret
                };
                res.writeHead(302, {'Location': success || '/'});
                res.end();
                return;
              }
            })
    // Begin OAuth transaction if we have no session or access_token_secret
    } else if(!(dbauth && dbauth.access_token_secret)) {
      self.oauth.getOAuthRequestToken(
              function(error, oauth_token, oauth_token_secret, params) {
                if(error) {
                  return next(error);
                } else {
                  req.session.dbauth = {
                    oauth_token: oauth_token,
                    oauth_token_secret: oauth_token_secret
                  };
                  res.writeHead(302, {
                    'Location': AUTHORIZE_URI + '?'
                      + stringifyParams({
                        oauth_token: oauth_token,
                        oauth_callback: self.oauth._authorize_callback
                      })
                  });
                  res.end();
                  return;
                }
              });
    // Invalid data in session, clear session data and restart process
    } else {
      delete req.session.dbauth;
      res.writeHead(302, {'Location': mount});
      res.end();
      return;
    }
  }
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
                , 'Content-Disposition: form-data; name=file; filename=' + file
                , 'Content-Type: application/octet-stream'
                , '', data.toString('binary'), '--' + boundary + '--', ''
               ].join('\r\n');

    self.oauth.post(CONTENT_API_URI + '/files/dropbox/' + path +
                    '?file=' + escapePath(file)
                    , optargs.token || self.access_token
                    , optargs.secret || self.access_token_secret
                    , body, content_type
                    , function(err, data, res) {
                      if (err) return cb(err);
                      cb(null, JSON.parse(data));
                    });
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
  from_path = escapePath(from_path);
  to_path = escapePath(to_path);
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
  path = escapePath(path);
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
  path = escapePath(path);
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
  from_path = escapePath(from_path);
  to_path = escapePath(to_path);
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
