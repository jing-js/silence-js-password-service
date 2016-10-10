const LOG_LEVEL = process.env['LOG_LEVEL'] || 'info';
const LOGGER = process.env['LOGGER'] || 'file';

module.exports = {
  listen: {
    port: Number(process.env['PORT'] || 12000),
    host: process.env['HOST'] || '127.0.0.1'
  },
  logger: LOGGER,
  logLevel: LOG_LEVEL,
  logPath: process.env['LOG_PATH'] || '/var/log/silence-password-server',
  password: {
    count: Number(process.env['PASSWORD_COUNT'] || 7),  // 密码数量为 7
    length: Number(process.env['PASSWORD_LENGTH'] || 64), // 密码长度为 64 位
    expire: Number(process.env['EXPIRE'] || 8 * 60 * 60 * 1000), // 密码时间为 8 个小时
    offset: Number(process.env['OFFSET'] || 0),
    interval: Number(process.env['INTERVAL'] || 5 * 60 * 1000) // 刷新检查频率为 5 分钟
  }
};
