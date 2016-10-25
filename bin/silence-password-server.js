#!/usr/bin/env node

const program = require('commander');
const FileLogger = require('silence-js-log-file');
const ConsoleLogger = require('silence-js-log-console');

process.title = 'SILENCE_PASSWORD_SERVER';

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
  .version(require('../package.json').version || '1.0.0')
  .option('-p, --port [port]', 'Server listen port, default is 12000', parseInt)
  .option('-H, --host [host]', 'Server listen host, default is 127.0.0.1')
  .option('--log-level [logLevel]', 'Log level, default is info')
  .option('--logger [logger]', 'File or Console logger, default is file')
  .option('--log-path [logPath]', 'Path for store file logs, default is /var/log/silence-js-password-server')
  .option('--config [configFile]', 'config file')
  .option('--password-count [passwordCount]', 'Password count, default is 7', parseInt)
  .option('--passowrd-length [passwordLength]', 'Password length, default is 64 bytes', parseInt)
  .option('--expire [expire]', 'Expire time for each password in msec, default is eight hours', parseInt)
  .option('--offset [offset]', 'Password expire time offset in msec, default is 0')
  .option('--interval [interval]', 'Password interval time in msec, default is five minutes', parseInt)
  .parse(process.argv);

const defaultConfig = require('../config');

let customConfig = {};

if (program.configFile) {
  customConfig = require(program.configFile);
  mergeConfig(defaultConfig, customConfig);
}

mergeConfig(defaultConfig, {
  listen: {
    port: program.port,
    host: program.host
  },
  logger: program.logger,
  logLevel: program.logLevel,
  logPath: program.logPath,
  password: {
    count: program.passwordCount,
    length: program.passowrdLength, // 密码长度为 64 位
    expire: program.expire, // 密码时间为 8 个小时
    offset: program.offset,
    interval: program.interval
  }
});

if (defaultConfig.password.offset) {
  if (/^\d+$/.test(defaultConfig.password.offset)) {
    defaultConfig.password.offset = parseInt(defaultConfig.password.offset);
  } else {
    defaultConfig.password.offset = new Date(defaultConfig.password.offset).getTime();
  }
}

defaultConfig.logger = defaultConfig.logger.toLowerCase() !== 'file' ? new ConsoleLogger({
  level: defaultConfig.logLevel
}) : new FileLogger({
  level: defaultConfig.logLevel,
  path: defaultConfig.logPath
});


const http = require('http');
const { Server } = require('../index');


const app = new Server(defaultConfig);
const server = http.createServer((request, response) => {
  app.handle(request, response);
});

app.init().then(() => {

  server.listen(defaultConfig.listen.port, defaultConfig.listen.host, () => {
    app.logger.info(`Silence Password Server listen at ${defaultConfig.listen.host}:${defaultConfig.listen.port}`);
    app.logger.info('Password config:', JSON.stringify(defaultConfig.password, null, 2));
  });

  process.on('uncaughtException', err => {
    app.logger.error(err)
  });
  
}, err => {
  console.log(err);
});
