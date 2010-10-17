# dropbox-node

An OAuth-enabled node.js client for working with the Dropbox API.

All API methods except file-uploading, account-creation, and token-acquisition are currently implemented. Does not support interaction with application sandboxes.

## Installation

dropbox-node depends on [node-oauth](http://github.com/ciaranj/node-oauth) and [jasmine-node](http://github.com/mhevery/jasmine-node) for testing.

Create a symlink in `~/.node_libraries`:

    $ ln -s /path/to/dropbox-node/ ~/.node_libraries/dropbox-node

## TODO
* Get file-uploading to work.
* Improve test coverage.
