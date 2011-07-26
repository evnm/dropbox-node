// Read dropbox key and secret from the command line.
var consumer_key = process.argv[2]
  , consumer_secret = process.argv[3];

if (consumer_key == undefined || consumer_secret == undefined) {
  console.log("Usage: node app.js <dropbox key> <dropbox secret>");
  process.exit(1);
}

var sys = require('sys')
  , DropboxClient = require('../../lib/dropbox-node').DropboxClient
  ,  express = require('express')
  ,  app = express.createServer();

// Create and configure an Express server.
var app = express.createServer();
app.configure(function () {
  app.use(express.static(__dirname + '/public'))
  , app.use(express.logger())
  , app.use(express.bodyParser())
  , app.use(express.cookieParser())
  , app.use(express.session({ key: 'skey', secret: '1ts-s3cr3t!'} ));
});

// Login page.
app.get('/', function (req, res) {
  res.render('login.jade', {
    locals: {
      title: 'Dropbox File Browser'
    }
  });
});

// Dropbox credential processing.
app.post('/process_creds', function (req, res) {
  // Create a DropboxClient and initialize it with an access token pair.
  req.session.db = new DropboxClient(consumer_key, consumer_secret);
  req.session.db.getAccessToken(req.body.email, req.body.password, function (err) {
    if (err) return console.log('Error: ' + sys.inspect(err));
    res.redirect('/file_browser');
  });
});

// File browser page.
app.get('/file_browser(/*)?', function (req, res) {
  // Fetch target metadata and render the page.
  if (req.session.db) {
    req.session.db.getMetadata(req.params[1] || '', function (err, metadata) {
      if (err) return console.log('Error: ' + sys.inspect(err));
      res.render('file_browser.jade', {
	locals: {
	  title: 'Dropbox File Browser'
	  , current_dir: (metadata.path.length > 0) ? metadata.path : 'root'
	  , items: metadata.contents
	}
      });
    });
  } else res.redirect('home');
});

app.listen(3000);
console.log('Dropbox browser running on port ' + app.address().port);
