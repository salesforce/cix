const winston = require('winston');

winston.configure({
  transports: [
    new winston.transports.Console({
      level: 'info',
      silent: true,
      format: winston.format.combine(
        winston.format.timestamp({format: 'YYYY-MM-DDTHH:mm:ssZ'}),
        winston.format((info) => {
          info.level = info.level.toUpperCase();
          return info;
        })(),
        winston.format.colorize(),
        winston.format.align(),
        winston.format.printf((info) => `${info.timestamp}  ${info.level} ${info.message}`),
      ),
    }),
  ],
});
