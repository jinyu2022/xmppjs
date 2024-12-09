
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Log {
  private level: string;
  constructor(level: string) {
    this.level = level;
  }
   debug() {
    if (this.level === 'debug') {
      console.log(...arguments);
    }}
}