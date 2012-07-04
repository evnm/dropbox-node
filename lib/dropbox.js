/*
*   Module Dependancies
*/
var querystring     = require('querystring'),
    fs              = require('fs'),
    nodePath        = require('path'),
    util            = require('util'),
    _               = require('underscore'),
    OAuth           = require('oauth'),
    API_URI         = 'http://api.dropbox.com/0',
    CONTENT_API_URI = 'https://api-content.dropbox.com/0',
    EOL             = "\r\n",
    toString        = {}.toString,
    OAuthCallback   = function( callback ) {
        return function( err, data, res ) {
          var json;
          if ( err ) { 
            
            try {
              json = JSON.parse( err.data );
            } catch( e ){}
            callback({
              statusCode : err.statusCode,
              message : (json && json.error) || data,
              oauth : err.oauth
            }, data );
          } else {
            try {
              json = JSON.parse( data );
            } catch( e ){}
            callback( null, json || data );
          }
        };
    };
_.extend(_, require("underscore.Deferred"));

querystring.escape = function( p ) {
    return p.replace(/([!|\:|\*|'|\(|\)|;|@|&|=|\+|\$|,|\?|#|\[|\]|~|\%|\s])/gi, function( char ) {
        return '%' + char.charCodeAt(0).toString(16).toUpperCase();
    });
};


// Dropbox constructor
var Dropbox = function( options ) {

    this.consumerKey        = options.consumerKey;
    this.consumerSecret     = options.consumerSecret;
    this.accessToken        = options.accessToken;
    this.accessTokenSecret  = options.accessTokenSecret;
    this.boxType            = options.sandbox ? 'sandbox' : 'dropbox';
    this.OAuth              = new OAuth({
        requestUrl      : API_URI + '/oauth/request_token',
        accessUrl       : API_URI + '/oauth/access_token',
        consumerKey     : this.consumerKey,
        consumerSecret  : this.consumerSecret, 
        version         : '1.0',
        signatureMethod : 'HMAC-SHA1'
    });
    this.calls              = 0;
}

_.extend( Dropbox, {
    generateBoundary : function() {
        return ( Math.random() * 1e60 ).toString(36);
    }
});

_.extend( Dropbox.prototype, {
    

    _OAuthPost : function( uri, body, contentType, params, callback ) {

        // Normalize parameters
        if ( _.isFunction( params )) { 
            callback = params;
            params = {};
        }

        this.calls++;
        this.OAuth.request( "POST", uri, params, {
            token       : this.accessToken,
            tokenSecret : this.accessTokenSecret
        }, {
            body : body
        }, OAuthCallback( callback ));
    },

    _OAuthGet : function( uri, params, callback ) {

        this.calls++;
        if ( _.isFunction( params )) { 
            callback = params;
            params = {};
        }

        this.OAuth.request("GET", uri, params, {
            token       : this.accessToken,
            tokenSecret : this.accessTokenSecret
        }, callback );
    },

    _encodePath : function( dir ) {
        return dir.split("/").map( OAuth.percentEncode ).join("/");
    },

    // Fetches an access token and access token secret pair based on the user's
    // email and password. As well as being stored internally, the key pair is
    // returned to the callback in case the application developer requires it.
    // email:
    // password:
    getAccessToken : function( params, callback ) {

        var self = this;

        this._OAuthGet(API_URI + '/token?', params, function( err, data ) {
            if ( ! err ) {
                self.accessToken = data.token;
                self.accessTokenSecret = data.secret;
            }
            callback( err, self.accessToken, self.accessTokenSecret );
        });
    },


    // Retrieves information about the user's account as a JSON response.
    getAccountInfo : function( params, callback ) {
        this._OAuthGet( API_URI + '/account/info', params, callback );
    },


    // Create a new Dropbox account.
    /* {
        email: email
        , first_name: first_name
        , last_name: last_name
        , password: password
        , status_in_response: optargs.status_in_response
      }
    */
    createAccount : function( params, callback ) {
        this._OAuthGet( API_URI + '/account', params, callback );
    },

    // Retrieves contents of a file specified by path argument, relative to
    // user's Dropbox root.
    getFile : function( path, params, callback ) {
        this._OAuthGet( [ CONTENT_API_URI, 'files', this.boxType, path ].join("/"), params, callback );
    },

    putBuffer : function( data, path, params, callback ) {


        var boundary    = Dropbox.generateBoundary(),
            contentType = 'multipart/form-data; boundary=' + boundary,
            filename    = path.split("/").pop(),
            dir         = path.split("/").slice(0, -1).join("/"),
            body        = [
                '--' + boundary, 
                'Content-Disposition: form-data; name=file; filename=' + OAuth.encodeUTF8( filename ),
                'Content-Type: application/octet-stream', 
                '', 
                ( Buffer.isBuffer( data ) ? data : (new Buffer( data ))).toString('binary'),
                '--' + boundary + '--',
                ''
            ].join('\r\n');

 
            if ( _.isFunction( params ) ) {
                callback = params;
                params = {};
            }

            params = params ||  {};
            if ( _.isObject( params )) {
                _.extend( params, {
                    file : filename
                });
            }

            this._OAuthPost( [ CONTENT_API_URI, 'files', this.boxType, this._encodePath( dir ) ].join("/"), body, contentType, params, callback );
 
    },

    // Uploads contents of a file specified by path argument, relative to
    // application's directory.
    putFile : function( file, path, params, callback ) {

        var self = this;

        nodePath.exists( file, function( exists ) {

            if ( exists ) {
                /** /
                fs.stat( file, function( err, stats ) {
                    fs.open( file, 'r', function( err, fd ) {
                        var buf = new Buffer( stats.size );
                        fs.read( fd, buf, 0, stats.size, null, function( err, read, buf ) {
                            fs.close( fd, function() {
                                self.putBuffer( buf, path, params, callback );
                            });
                        });
                    });
                });
                
                /**/
                fs.readFile( file, function( err, data ) {
                    if ( ! err ) {
                        self.putBuffer( data, path, params, callback );
                    }
                });
                /**/
            } else {
                console.log( "node-dropbox: " + file + " does not exist." );
            }

        });
        
    },

    filesPut : function( buf, path, callback ) {
      var dfd = new _.Deferred(),
          uri = ['https://api-content.dropbox.com/1/files_put', this.boxType, this._encodePath( path ) ].join("/"),
          params = {
          //  overwrite: false
          };

      this.OAuth.request( "PUT", uri, params, {
          token       : this.accessToken,
          tokenSecret : this.accessTokenSecret
      }, {
          body : (Buffer.isBuffer( buf ) ? buf : new Buffer( buf )).toString("binary"),
          contentType : type || "text/plain"
      }, OAuthCallback( callback ));

    },

    // Gets metadata of file/folder specified by path relative to user's
    // Dropbox root.
    getMetadata : function( path, params, callback ) {
        this._OAuthGet( [ API_URI, 'metadata', this.boxType, this._encodePath( path ) ].join("/"), params, callback );
    },


    // Downloads a minimized jpeg thumbnail for a photo. See
    // https://www.dropbox.com/developers/docs#thumbnails for a list of
    // valid size specifiers.
    getThumbnail : function( path, params, callback ) {
        this._OAuthGet( [ CONTENT_API_URI, 'thumbnails/dropbox', path ].join("/"), params, callback );
    },


    // Copies a file or folder to a new location.
    // See https://www.dropbox.com/developers/docs#fileops-copy for explanation
    // of arguments.
    copy : function( from, to, params, callback ) {
        this._OAuthGet( API_URI + '/fileops/copy', {
            root: this.boxType, 
            from_path: from, 
            to_path: to
        }, callback );

    },


    // Creates a folder relative to the user's Dropbox root.
    // See https://www.dropbox.com/developers/docs#fileops-create-folder
    // for explanation of arguments.
    createFolder : function( path, params, callback ) {
        this._OAuthGet( API_URI + '/fileops/create_folder', _.extend(params, {
            root: this.boxType, 
            path: path
        }), callback )
    },


    // Deletes a file or folder.
    // See https://www.dropbox.com/developers/docs#fileops-delete for
    // explanation of arguments.
    deleteItem : function( path, params, callback ) {
        this._OAuthGet( API_URI + '/fileops/delete', {
            root: this.boxType,
            path: path
        }, callback );
    },


    // Moves a file or folder.
    // See https://www.dropbox.com/developers/docs#fileops-move for
    // explanation of arguments.
    move : function( from, to, params, callback ) {
        this._OAuthGet( API_URI + '/fileops/move', {
            root: this.boxType,
            from_path: from,
            to_path: to_path
        }, callback );
    }
});

// Expose the module
module.exports = Dropbox;

