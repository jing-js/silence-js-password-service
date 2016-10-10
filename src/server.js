const crypto = require('crypto');

class Password {
  constructor(ts, value) {
    this.ts = ts;
    this.value = value;
  }
}

class PasswordService {
  constructor(config, logger) {
    this.logger = logger;
    this._loop = this._loopHandler.bind(this);
    this._passLength = config.length;
    this._passExpire = config.expire;
    this._offset = config.offset;
    this._lastLoopTime = Date.now();
    this._passwords = new Array(config.count);
    this._info = {
      expire: this._passExpire,
      offset: this._offset,
      passwords: this._passwords
    };
    this._interval = config.interval;
    this._prevTS = 0;
  }
  init() {
    this._prevTS = Math.floor((this._lastLoopTime - this._offset) / this._passExpire);
    let i = 0 - Math.floor(this._passwords.length / 2);
    let e = i + this._passwords.length;
    let k = 0;
    for(; i < e; i++) {
      this._passwords[k++] = new Password(this._prevTS + i, crypto.randomBytes(this._passLength).toString('base64'));
    }
    this.logger.debug('Generate init passwords', this._passwords);
    setInterval(this._loop, this._interval);
    return Promise.resolve();
  }
  _gen() {
    this._lastLoopTime = Date.now();
    let t = Math.floor((this._lastLoopTime - this._offset) / this._passExpire);
    this.logger.debug('Password Loop', this._lastLoopTime, this._prevTS, t);
    if (t === this._prevTS) {
      return;
    }
    
    let len = this._passwords.length;
    let newPasswords = new Array(len);
    let i = 0 - Math.floor(len / 2);
    let e = i + len;
    let k = 0;
    for(;i < e; i++) {
      let found = false;
      for(let j = 0; j < len; j++) {
        if (this._passwords[j].ts === t + i) {
          newPasswords[k] = this._passwords[j];
          found = true;
          break;
        }
      }
      if (!found) {
        newPasswords[k] = new Password(t + i, crypto.randomBytes(this._passLength).toString('base64'));
      }
      k++;
    }
    this._passwords = newPasswords;
    this._prevTS = t;
    this.logger.info('Refresh new password', this._prevTS, t);
    this.logger.debug(newPasswords);
  }
  _loopHandler() {
    try {
      this._gen();
    } catch(ex) {
      this.logger.error(ex);
    }
  }
  get info() {
    return this._info;
  }
}


class Server {
  constructor(config) {
    this.logger = config.logger;
    this.passwordService = new PasswordService(config.password, config.logger);
  }
  init() {
    return this.logger.init().then(() => {
      return this.passwordService.init();
    }, err => {
      console.error(err);
    });
  }
  handle(request, response) {
    this.logger.debug(request.url);
    let url = request.url;
    if (url === '/time') {
      response.end(Date.now().toString());
    } else if (url === '/password') {
      response.end(JSON.stringify(this.passwordService.info));
    } else {
      response.end();
    }
  }
}

module.exports = Server;
