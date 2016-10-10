const http = require('http');

function log() {
  console.log.apply(console, arguments);
}
const SimpleLogger = {
  log,
  error: log,
  info: log,
  debug: log,
  warn: log
};


class Password {
  constructor(ts, value) {
    this.ts = ts;
    this.value = value;
  }
}


class Client {
  constructor(config = {}) {
    this.logger = config.logger || SimpleLogger;
    this.offset = 0;
    this.expire = 0;
    this.delta = 0;
    this.passwords = [];
    this.host = config.host || '127.0.0.1:12000';
    this._loop = this._doLoop.bind(this);
    this._int = setInterval(this._loop, config.interval || 10 * 60 * 1000);
    this._ended = false;
  }
  _doLoop() {
    this._syncTime().then(() => {
      return this._fetchPassword();
    }, err => {
      this._fetchPassword();
    });
  }
  init() {
    return this._syncTime().then(() => {
      return this._fetchPassword();
    });
  }
  close() {
    this._ended = true;
    clearInterval(this._int);
  }
  _fetchTime() {
    return new Promise((resolve, reject) => {
      let startTime = Date.now();
      http.get(`http://${this.host}/time`, res => {
        if (this._ended) {
          return resolve(0);
        }
        let deal = false;
        res.on('data', chunk => {
          if (deal || this._ended) {
            return;
          }
          deal = true;
          let endTime = Date.now();
          let expectTime = Math.round((startTime + endTime) / 2);
          let responseTime = Number(chunk.toString());
          this.logger.debug('Sync Time start:', startTime, ', end:', endTime, ', delay:', endTime - startTime);
          this.logger.debug('Sync Time expect:', expectTime, ', response:', responseTime, ', delta:', responseTime - expectTime);
          resolve(responseTime - expectTime);
        });
      }).on('error', reject);
    });
  }
  _syncTime() {
    let p = Promise.resolve(0);
    let total = 0;
    let c = -1;

    for(let i = 0; i < 3; i++) {
      p = p.then(delta => {
        total += delta;
        c++;
        return this._fetchTime();
      });
    }

    return p.then(delta => {
      if (this._ended) {
        return;
      }
      total += delta;
      c++;
      this.delta = Math.round(total / c);
      this.logger.debug('Sync Time Delta:', total, c, this.delta);
    }, err => {
      this.logger.error('Sync Time error', err);
    });
  }
  _syncPassword() {
    return this._fetchPassword().then(() => {
      this.logger.info('Password Refreshed.');
    }, err => {
      this.logger.error('Password Refresh Error:', err);
    });
  }
  _fetchPassword() {
    return new Promise((resolve, reject) => {
      http.get(`http://${this.host}/password`, res => {
        if (this._ended) {
          return resolve();
        }
        let deal = false;
        res.on('data', chunk => {
          if (deal) {
            return;
          }
          deal = true;
          let obj = null;
          try {
            obj = JSON.parse(chunk.toString());
          } catch(ex) {
            reject(ex);
            return;
          }
          this.offset = obj.offset;
          this.expire = obj.expire;
          let newPasswords = new Array(obj.passwords.length);
          for(let i = 0; i < obj.passwords.length; i++) {
            let found = false;
            let p = obj.passwords[i];
            for(let j = this.passwords.length - 1; j >= 0; j--) {
              if (p.ts > this.passwords[j].ts) {
                break;
              } else if (p.ts === this.passwords[j].ts) {
                newPasswords[i] = this.passwords[j];
                found = true;
                break;
              }
            }
            if (!found) {
              newPasswords[i] = new Password(p.ts, p.value);
            }
          }
          this.passwords = newPasswords;
          this.logger.debug(obj);
          resolve();
        });
      }).on('error', reject);
    });
  }
  get now() {
    return Date.now() + this.delta;
  }
  calcTS(timestamp) {
    return Math.floor((timestamp - this.offset) / this.expire);
  }
  getByTime(timestamp) {
    return this.getByTS(this.calcTS(timestamp));
  }
  getByTS(ts) {
    let len = this.passwords.length;
    if (ts > this.passwords[len - 1].ts || ts < this.passwords[0].ts) {
      return null;
    }
    for(let i = 0; i < len; i++) {
      if (ts === this.passwords[i].ts) {
        return this.passwords[i].value;
      }
    }
    return null;
  }
}

module.exports = Client;
