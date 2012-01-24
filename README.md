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

Before calling any Dropbox API methods, an access token pair must be obtained. This can be done one of two ways:

  1. If the access token and secret are known a priori, they can be passed directly into the DropboxClient constructor.

        var dropbox = new DropboxClient(consumer_key, consumer_secret,
                                        access_token, access_token_secret)

  2. Otherwise, `getAccessToken` must be called in order to initialize the OAuth credentials.

        dropbox.getAccessToken(dropbox_email, dropbox_password, callback)

The callback given to `getAccessToken` takes an error object, an access token, and an access token secret (see example below). **Please note that users' passwords should never be stored.** It is best to acquire a token once and then use it for all subsequent requests.

### Calling API methods

dropbox-node provides methods covering [each of the Dropbox API methods](https://www.dropbox.com/developers/docs). For example, to fetch and print the display name and email address associated with your account:

    dropbox.getAccountInfo(function (err, data) {
      if (err) console.log('Error: ' + err)
      else console.log(data.display_name + ', ' + data.email)
    })

Note that (at least at the start of a user's session) a valid access token pair must be obtained prior to interacting with the rest of the Dropbox API. This means that the API methods must be invoked within the callback passed to `getAccessToken` unless it is guaranteed that `getAccessToken` was called previously. As an example of this latter case, if building a web app, one could call API methods directly in a route that can only be accessed after going through a sign-in phase in which a call to `getAccessToken` is made.

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

### Stream-based file-downloading

As of v0.3.1, dropbox-node exposes a method `getFileStream` that allows stream-based file-downloading. This is useful when downloading large files that wouldn't easily fit in memory and thus don't play nicely with `getFile`.

`getFileStream` returns an EventEmitter representing the request. The target file will be downloaded in chunks and dealt with according to the callbacks you register. Here we fetch a large file and write it to disk:

    var request = dropbox.getFileStream("path/to/huge/file")
      , write_stream = require('fs').createWriteStream("out")

    request.on('response', function (response) {
      response.on('data', function (chunk) { write_stream.write(chunk) })
      response.on('end', function () { write_stream.end() })
    })
    request.end()

### Optional arguments

Optional arguments (as specified in the [Dropbox API documentation](https://www.dropbox.com/developers/docs)) can be given to API methods via an argument object.

For example, here we call `getAccountInfo` and direct the API to include the HTTP status code in the response.

    dropbox.getAccountInfo({ status_in_response: true }, callback)

Each method (except `getAccessToken`) can optionally take an access token and an access token secret as strings. This is the one way to get around having to call `getAccessToken` in cases where a valid key pair is known.

For example, here we fetch the metadata about the Dropbox root directory, passing in an explicit key pair stored in variables.

    dropbox.getMetadata('', { token: token, secret: secret }, callback)

## Testing

dropbox-node depends on [jasmine-node](http://github.com/mhevery/jasmine-node) for testing. Note that the currently-implemented tests are trivial, due to a lack of a way to effectively mock the Dropbox API.

Run specs with `node specs.js` from the root `dropbox-node` directory.

## TODO
* Improve test coverage.
* Improve documentation.
* Add ability to interact with application sandboxes.
