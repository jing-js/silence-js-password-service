#!/usr/bin/env node

const program = require('commander');
const pkg = require('../package.json');
const FileLogger = require('silence-js-log-file');
const ConsoleLogger = require('silence-js-log-console');
const http = require('http');
const { Client } = require('../index');

function mergeConfig(target, source) {
  for(let k in target) {
    if (typeof target[k] === 'object' && target[k] !== null && typeof source[k] === 'object' && source[k] !== null) {
      mergeConfig(target[k], source[k]);
    } else if (typeof source[k] !== 'undefined' && source[k] !== null) {
      target[k] = source[k];
    }
  }
}

program
  .version(pkg.version)
  .option('-H, --host [host]', 'Server host include port, default is 127.0.0.1:12000')
  .option('--log-level [logLevel]', 'Log level, default is info')
  .option('--logger [logger]', 'File or Console logger, default is file')
  .option('--log-path [logPath]', 'Path for store file logs, default is /var/log/silence-js-password-server')
  .option('--interval [interval]', 'Password interval time in msec, default is five minutes', parseInt)
  .parse(process.argv);


const client = new Client();

client.init().then(() => {
  test();
  setInterval(test, 10 * 1000);
}, err => {
  console.error(err);
});


function test() {
  console.log(client.now);
  console.log(client.passwords);
}