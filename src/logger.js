require('colors')

function stringify(str) {
  if (typeof str == 'string') {
    return str
  }
  if (str instanceof Object) {
    return JSON.stringify(str)
  }
  return str.toString()
}

function log(...args) {
  console.log(...args.map(str => stringify(str)))
}

function info(...args) {
  console.log(...args.map(str => stringify(str)))
}

function warn(...args) {
  console.warn(...args.map(str => stringify(str).yellow))
}

function error(...args) {
  console.error(...args.map(str => stringify(str).bold.red))
}

module.exports = {log, info, warn, error}
