// Response error codes
module.exports = {
  '304': 'The folder contents have not changed'
, '400': 'The extension is on Dropbox\'s ignore list.'
, '403': 'An invalid copy operation was attempted (e.g. there is already a file at the given destination, or copying a shared folder into a shared folder).'
, '404': 'The requested file or revision was not found.'
, '406': 'There are too many file entries to return.'
, '411': 'Chunked encoding was attempted for this upload, but is not supported by Dropbox.'
, '415': 'The image is invalid and cannot be converted to a thumbnail.'
}
