var jasmine = require('jasmine'),
    util = require('util');

for (var key in jasmine) {
  global[key] = jasmine[key];
}

var isVerbose = false,
    showColors = true;
process.argv.forEach(function(arg) {
  switch (arg) {
  case '--color': showColors = true; break;
  case '--noColor': showColors = false; break;
  case '--verbose': isVerbose = true; break;
  }
});


jasmine.executeSpecsInFolder(__dirname + '/spec', function(runner, log) {
  process.exit(runner.results().failedCount);
}, isVerbose, showColors);