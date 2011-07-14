/*
*   Module Dependancies
*/
var querystring     = require('querystring'),
    fs              = require('fs'),
    nodePath        = require('path'),
    util            = require('util'),
    _               = require('underscore'),
    OAuth           = require('node-oauth').OAuth,
    API_URI         = 'http://api.dropbox.com/0',
    CONTENT_API_URI = 'https://api-content.dropbox.com/0',
    EOL             = "\r\n",
    toString        = {}.toString,
    isFunction      = function( fn ) {
        return toString.call( fn ) == '[object Function]';
    },
    isObject        = function( fn ) {
        return toString.call( fn ) == '[object Object]';
    }
    OAuthCallback   = function( callback ) {
        return function( err, data, res ) {
            if ( err ) {
                console.log( err.statusCode + " - " + JSON.parse( err.data ).error );
            }
            callback( err, data && JSON.parse( data ));
        };
    };

querystring.escape = function( p ) {
    return p.replace(/([!|\:|\*|'|\(|\)|;|@|&|=|\+|\$|,|\/|\?|#|\[|\]|~|\%])/gi, function( char ) {
        return '%' + char.charCodeAt(0).toString(16).toUpperCase();;
    });
};


// Dropbox constructor
var Dropbox = function( options ) {

    this.consumerKey        = options.consumerKey;
    this.consumerSecret     = options.consumerSecret;
    this.accessToken        = options.accessToken;
    this.accessTokenSecret  = options.accessTokenSecret;
    this.boxType            = options.sandbox ? 'sandbox' : 'dropbox';
    this.OAuth              = new OAuth(
        API_URI + '/oauth/request_token',
        API_URI + '/oauth/access_token',
        this.consumerKey,
        this.consumerSecret, 
        '1.0',
        null,
        'HMAC-SHA1'
    );
}

_.extend( Dropbox.prototype, {

    _OAuthPost : function( uri, body, contentType, params, callback ) {


        // Normalize parameters
        if ( isFunction( params )) { 
            callback = params;
            params = {};
        } else if ( isObject( params )) {
            uri += "?" + querystring.stringify( params );
        }
        
        this.OAuth.post( uri, params.accessToken || this.accessToken, params.accessTokenSecret || this.accessTokenSecret, body, contentType, OAuthCallback( callback ));
    },

    _OAuthGet : function( uri, params, callback ) {

        // Normalize parameters
        if ( isFunction( params )) { 
            callback = params;
        } else if ( isObject( params )) {
            uri += "?" + querystring.stringify( params );
        }
        
        this.OAuth.get( uri, this.accessToken, this.accessTokenSecret, OAuthCallback( callback ));
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
    getFile : function( path, optargs, cb ) {
        this._OAuthGet( [ CONTENT_API_URI, 'files', this.boxType, path ].join("/"), params, callback );
    },

    // Uploads contents of a file specified by path argument, relative to
    // application's directory.
    putFile : function( file, path, params, callback ) {

        var self = this,
            boundary = 'sAxIqse3tPlHqUIUI9ofVlHvtdt3tpaG',
            contentType = 'multipart/form-data; boundary=' + boundary,
            filename = path.split("/").pop(),
            body; 
            
        nodePath.exists( file, function( exists ) {

            if ( exists ) {

                fs.readFile( file, OAuthCallback( function( err, data ) {
                    if ( ! err ) {
                        self.putFile( data, path, params, callback );
                    }
                }));

            } else { 

                body = [
                    '--' + boundary, 
                    'Content-Disposition: form-data; name=file; filename=' + filename,
                    'Content-Type: application/octet-stream', 
                    '', 
                    file.toString('binary'),
                    '--' + boundary + '--',
                    ''
                ].join('\r\n');

                if ( isFunction( params ) ) {
                    callback = params;
                }

                params = params ||  {};
                if ( isObject( params )) {
                    _.extend( params, {
                        file : filename
                    });
                }

                self._OAuthPost( [ CONTENT_API_URI, 'files', self.boxType, path ].join("/"), body, contentType, params, callback );
 
           }

        });
        
    },

    // Gets metadata of file/folder specified by path relative to user's
    // Dropbox root.
    getMetadata : function( path, params, callback ) {
        this._OAuthGet( [ API_URI, 'metadata', this.boxType, path ].join("/"), params, callback );
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
    createFolder : function( path, optargs, callback ) {
        this._OAuthGet( API_URI + '/fileops/create_folder', {
            root: this.boxType, 
            path: path
        }, callback )
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
exports.Dropbox = Dropbox;
