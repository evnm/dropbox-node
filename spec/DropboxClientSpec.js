var DropboxClient = require('../lib/dropbox-node').DropboxClient,
    OAuth = require('oauth').OAuth

describe('dropbox-node', function() {
  oauth = new  OAuth(null, null, null, null,
                     null, null, 'HMAC-SHA1')
  
  it('sets oauth object', function() {
    var dropbox = new DropboxClient(oauth, null, null)
    expect(dropbox.oauth).toBe(oauth)
  })

  it('sets access token', function() {
    var dropbox = new DropboxClient(null, 'foo', null)
    expect(dropbox.access_token).toEqual('foo')
  })

  it('sets access token secret', function() {
    var dropbox = new DropboxClient(null, null, 'bar')
    expect(dropbox.access_token_secret).toEqual('bar')
  })
})