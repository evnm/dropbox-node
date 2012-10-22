# dropbox-node

An OAuth-enabled Node.js client for working with the Dropbox API.

## DISCLAIMER

This project has been deprecated in favor of [Dropbox's official JavaScript library](https://github.com/dropbox/dropbox-js).

## Installation

dropbox-node depends on [node-oauth](http://github.com/ciaranj/node-oauth).

To install via npm

    npm install dropbox-node

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
      dropbox.putFile('foo.txt', 'foo.txt', function (err, data) {
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

### Optional arguments

Optional arguments (as specified in the [Dropbox API documentation](https://www.dropbox.com/developers/docs)) can be given to API methods via an argument object.

For example, here we call `getAccountInfo` and direct the API to include the HTTP status code in the response.

    dropbox.getAccountInfo({ status_in_response: true }, callback)

Each method (except `getAccessToken`) can optionally take an access token and an access token secret as strings. This is the one way to get around having to call `getAccessToken` in cases where a valid key pair is known.

For example, here we fetch the metadata about the Dropbox root directory, passing in an explicit key pair stored in variables.

    dropbox.getMetadata('', { token: token, secret: secret }, callback)

## API

### new DropboxClient()

### DropboxClient#getAccessToken(email, password, callback(err, access_token, access_token_secret))

Fetches an access token and secret based on the email and password given. Stores the token and secret in the DropboxClient instance and calls the callback them.

### DropboxClient#getAccountInfo([optargs], callback(err, accountInfo))
https://www.dropbox.com/developers/reference/api#account-info

Gets account information from the client.

### DropboxClient#createAccount(email, first_name, last_name, password, [optargs], callback(err, accountInfo))

Creates a new Dropbox account.

### DropboxClient#getFile(path, [optargs], [callback(err, body)])
https://www.dropbox.com/developers/reference/api#files-GET

Retrieves a file specified by the path. `callback` will be called with a possible error and the buffer of the contents of the file. This method also returns a readable stream that can be used to pipe the contents.

```js
dropboxClient('mybigfile.mpeg').pipe(fs.createWriteStream('localbigfile.mpeg');
```

`optargs` can also have a `rev` field to specify the revision of the file to download, and `range` for [HTTP Range Retrieval Requests](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.35.2).

```js
// download the first 1024 byte
dropboxClient('file.zip', { range: 'bytes=0-1024'}, function(err, data) {
  console.log(data.length); // 1024. that is if the file is at least 1024 bytes
});
```

### DropboxClient#putFile(filepath, remotepath, [optargs], callback(err, metadata))
https://www.dropbox.com/developers/reference/api#files_put

Uploads a file specified by `filepath` to `remotepath` on Dropbox. Dropbox currently does not support streaming uploads, and the max upload is 150 MB. `optargs` can also take additional fields `overwrite` and `parent_rev`.

### DropboxClient#put(contents, remotepath, [optargs], callback(err, metadata))
o
Similar to `putFile()` but places `contents` into a created file at `remotepath`. `contents` can be a buffer or string.

### DropboxClient#getMetadata(path, [optargs], callback(err, metadata))
https://www.dropbox.com/developers/reference/api#metadata

Gets metadata of file/folder specified by `path`. `optargs` can have fields `hash`, `list`, `include_deleted` and `rev`.

### DropboxClient#delta([cursor], [optargs], callback(err, changes))
https://www.dropbox.com/developers/reference/api#delta

Keeps up with changes from a client's Dropbox. `changes` is an array of arrays with first element as the path and second as metadata.

### DropboxClient#changesStream([startingCursor], [optargs])
Convenient method that provides a more friendly API to `delta()`. Returns an event emitter that emits `data` events with `path` and `metadata` parameters on changes to the client's Dropbox. Also can emit `reset` and `error` events. The returned event emitter also has a `pause()` and `resume()` methods.

### DropboxClient#search(folderpath, query, [optargs], callback(err, results))
https://www.dropbox.com/developers/reference/api#search

Searches `folderpath` for files matching `query`. `results` is an array of metadata. `optargs` can take `file_limit` and `include_deleted`.

### DropboxClient#getThumbnail(filepath, [optargs], [callback(err, body, metadata)])
https://www.dropbox.com/developers/reference/api#thumbnails

Downloads a thumbnail image located at `filepath`. Like `getFile()`, the `callback` can get buffered data or the returned readable stream can be piped. `optargs` can take `format` and `size` fields.

### DropboxClient#copy(from_path, to_path, [optargs], callback)
https://www.dropbox.com/developers/reference/api#fileops-copy

Copies a file. `from_copy_ref` field can be given in `optargs` to use it instead of `from_path`.

### DropboxClient#createFolder(path, [optargs], callback(err, metadata))
https://www.dropbox.com/developers/reference/api#fileops-create-folder

Creates a folder at the given path.

### DropboxClient#deleteItem(path, [optargs], callback(err, metadata))
https://www.dropbox.com/developers/reference/api#fileops-delete

Deletes file or folder from path.

### DropboxClient#move(from_path, to_path, [optargs], callback(err, metadata))
https://www.dropbox.com/developers/reference/api#fileops-move

Moves a file to another path.


## Testing

dropbox-node depends on [jasmine-node](http://github.com/mhevery/jasmine-node) for testing. Note that the currently-implemented tests are trivial, due to a lack of a way to effectively mock the Dropbox API.

Run specs with `node specs.js` from the root `dropbox-node` directory.

## TODO
* Improve test coverage.
* Improve documentation.
* Add ability to interact with application sandboxes.
