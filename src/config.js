import Getopt from 'node-getopt'

let getopt = new Getopt([
    ['s', 'host=HOST',  'kcsp server host'],
    ['p', 'port=8099',  'kcsp server port'],
    ['r', 'retry=40',   'maximum retry times'],
    ['t', 'timeout=10', 'timeout in seconds'],
    ['l', 'local=8099', 'kcsp client local port'],
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
    retry: opts.options['retry'] || 40,
    timeout: opts.options['timeout'] || 10,
    local: opts.options['local'] || 8099,
}
