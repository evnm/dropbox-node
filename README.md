# dropbox-node

An OAuth-enabled Node.js client for working with the Dropbox API.

## Installation

dropbox-node depends on [node-oauth](http://github.com/ciaranj/node-oauth).

To install via npm

    npm install dropbox

To install by hand, download the module and create a symlink in `~/.node_libraries`

    $ ln -s /path/to/dropbox-node/ ~/.node_libraries/dropbox-node

## Usage

To start, grab a consumer key and secret from [dropbox.com/developers](https://dropbox.com/developers).

### Object construction and access key pair retrieval
First construct a DropboxClient object, passing in the consumer key and secret.

    var dropbox = new DropboxClient(consumer_key, consumer_secret)

Before calling any Dropbox API methods, `getAccessToken` must be called in order to initialize the OAuth credentials.

    dropbox.getAccessToken(dropbox_email, dropbox_password, callback)

The callback given to `getAccessToken` takes an error object, an access token, and an access token secret (see example below).

### Calling API methods

dropbox-node provides methods covering [each of the Dropbox API methods](https://www.dropbox.com/developers/docs), excluding account creation.

For example, to fetch and print the display name and email address associated with your account:

    dropbox.getAccountInfo(function (err, data) {
      if (err) console.log('Error: ' + err)
      else console.log(data.display_name + ', ' + data.email)
    })

Note that (in most cases) `getAccessToken` must be called prior to interacting with the rest of the Dropbox API. This means that the API methods must be invoked within the callback passed to `getAccessToken` unless it is guaranteed that `getAccessToken` was called previously. As an example of this latter case, if building a web app, one could call API methods directly in a route that can only be accessed after going through a sign-in phase in which a call to `getAccessToken` is made.

Here we upload a file and remotely move it around before deleting it.

    dropbox.getAccessToken(email, pwd, function (err, token, secret) {
      // Upload foo.txt to the Dropbox root directory.
      dropbox.putFile('foo.txt', '', function (err, data) {
        if (err) return console.error(err)

        // Move it into the Public directory.
        dropbox.move('foo.txt', 'Public/foo.txt', function (err, data) {
          if (err) return console.error(err)

          // Delete the file.
          dropbox.deleteItem('Public/foo.txt', function (err, data) {
            if (err) console.error(err.stack)
          })
        })
      })
    })

For a more practical example, check out this [walkthrough of building a simple Dropbox file browser](http://evanmeagher.net/2010/10/dropbox-file-browser).

### API method optional argument

Optional arguments (as specified in the [Dropbox API documentation](https://www.dropbox.com/developers/docs)) can be given to API methods via an argument object.

For example, here we call `getAccountInfo` and direct the API to include the HTTP status code in the response.

    dropbox.getAccountInfo({ status_in_response: true }, callback)

Each API method (except `getAccessToken`) can take as optional arguments an access token and an access token secret as strings. This is the one way to get around having to call `getAccessToken` in cases where a valid key pair is known.

For example, here we fetch the metadata about the Dropbox root directory, passing in an explicit key pair stored in variables.

    dropbox.getMetadata('', { token: token, secret: secret }, callback)

## Testing

dropbox-node depends on [jasmine-node](http://github.com/mhevery/jasmine-node) for testing. Note that the currently-implemented tests are trivial at best.

Run specs with `node specs.js` from the root `dropbox-node` directory.

## TODO
* Improve test coverage.
* Improve documentation.
* Add ability to interact with application sandboxes.
