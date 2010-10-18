# dropbox-node

An OAuth-enabled node.js client for working with the Dropbox API.

## Installation

dropbox-node depends on [`node-oauth`](http://github.com/ciaranj/node-oauth).

To install, download the module and create a symlink in `~/.node_libraries`:

    $ ln -s /path/to/dropbox-node/ ~/.node_libraries/dropbox-node

## Usage

To start, you'll need to grab a consumer key and secret from [developers.dropbox.com](developers.dropbox.com).

### OAuth credentials and object construction

First construct an OAuth client and acquire a valid access token and access token secret pair.

    var sys = require('sys'),
        DropboxClient = require('dropbox-node').DropboxClient,
        OAuth = require('oauth').OAuth,
        oauth = new OAuth('http://api.dropbox.com/0/oauth/request_token',
                          'http://api.dropbox.com/0/oauth/access_token',
                          consumer_key, consumer_secret,
                          '1.0', null, 'HMAC-SHA1')

Now create a DropboxClient object.

    var dropbox = new DropboxClient(oauth, access_token, access_token_secret)

### Calling API methods

`dropbox-node` provides methods covering [each of the Dropbox API methods](https://www.dropbox.com/developers/docs), excluding access token acquisition and account creation. 

For example, to fetch and print the display name and email address associated with your account:

    dropbox.getAccountInfo(function(err, data) {
      if (err) console.log('Error: ' + sys.inspect(err))
      else {
        var data_json = eval('(' + data + ')')
        console.log(data_json.display_name + ', ' + data_json.email)
      }
    })

Here's an example where we upload a file and remotely move it around before deleting it.

    // Upload foo.txt to the Dropbox root directory.
    dropbox.putFile('foo.txt', '', function(err, data) {
      if (err) console.log('Error: ' + sys.inspect(err))
    })
    
    // Move it into the Public directory.
    dropbox.move('foo.txt', 'Public/foo.txt', function(err, data) {
      if (err) console.log('Error: ' + sys.inspect(err))
    })
    
    // Delete the file.
    dropbox.delete('Public/foo.txt', function(err, data) {
      if (err) console.log('Error: ' + sys.inspect(err))
    })

## Testing

`dropbox-node` depends on [`jasmine-node`](http://github.com/mhevery/jasmine-node) for testing. Note that the currently-implemented tests are trivial at best.

Run specs with `node specs.js` from the root `dropbox-node` directory.

## TODO
* Improve test coverage.
* Add ability to interact with application sandboxes.
