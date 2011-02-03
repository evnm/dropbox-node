// read dropbox key and secret from the command line:
var consumer_key = process.argv[2];
var consumer_secret = process.argv[3];

if (consumer_key == undefined || consumer_secret == undefined) {
	console.log("Please invoke with node server.js <dropbox key> <dropbox secret>");
	process.exit(1);
}

var sys = require('sys'),
  DropboxClient = require('../../lib/dropbox-node').DropboxClient,
  express = require('express'),
  app = express.createServer();

// "static" will contain the static resources
var pub = __dirname + '/static';

// create and configure an express server
var app = express.createServer(
  express.compiler({ src: pub, enable: ['sass'] }),
  express.staticProvider(pub),						
  express.logger(),									
  express.bodyDecoder(),								
  express.cookieDecoder(),
  express.session({key: 'skey',
                         secret: '1ts-s3cr3t!'})
);
	
// use Jade as our default template engine
app.set('view engine', 'jade');	

// further app configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
});

// Login page.
app.get('/', function (req, res) {
  res.render('login', {
	locals: {
    	title: 'Dropbox File Browser'
	}
  })
})

// Dropbox credential processing.
app.post('/process_creds', function (req, res) {
  // Create a DropboxClient and initialize it with an access token pair.
  req.session.db = new DropboxClient(consumer_key, consumer_secret)
  req.session.db.getAccessToken(req.body.email, req.body.password, function (err) {
    if (err) return console.log('Error: ' + sys.inspect(err))
    res.redirect('/file_browser')
  })
})

// File browser page.
app.get('/file_browser(/*)?', function (req, res) {
  // Fetch target metadata and render the page.
  if (req.session.db) {
    req.session.db.getMetadata(req.params[1] || '', function (err, metadata) {
      if (err) return console.log('Error: ' + sys.inspect(err))
      // NOTE: Use this to strip leading path(s): str.replace(/^.*\//g, '')
      res.render('file_browser', {
		locals: {
			title: 'Dropbox File Browser',
			current_dir: (metadata.path.length > 0) ? metadata.path : 'root',
			items: metadata.contents
		}
      })
    })
  } else res.redirect('home')
})

app.listen(3000);
console.log('Dropbox browser server running on port ' + app.address().port);