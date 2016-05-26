import Getopt from 'node-getopt'

let getopt = new Getopt([
    ['s', 'host=HOST',  'kcsp server host'],
    ['p', 'port=8099',  'kcsp server port'],
    ['r', 'retry=100',  'maximum retry times'],
    ['d', 'delay=2',    'delay x seconds on retry'],
    ['t', 'timeout=20', 'timeout in seconds'],
    ['h', 'help',       'show this help']
]).bindHelp()
let opts = getopt.parseSystem()

if (opts.options['host'] == null) {
    getopt.showHelp()
    process.exit()
}

module.exports = {
    host: opts.options['host'],
    port: opts.options['port'] || 8099,
    retry: opts.options['retry'] || 100,
    delay: opts.options['delay'] || 2,
    timeout: opts.options['timeout'] || 20,
}