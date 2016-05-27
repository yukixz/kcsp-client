import Getopt from 'node-getopt'

let getopt = new Getopt([
    ['s', 'host=HOST',  'kcsp server host'],
    ['p', 'port=8099',  'kcsp server port'],
    ['r', 'retry=100',  'maximum retry times'],
    ['d', 'delay=2',    'delay x seconds on retry'],
    ['t', 'timeout=20', 'timeout in seconds'],
    ['l', 'local=8099', 'kcsp client local port'],
    ['h', 'help',       'show this help']
]).bindHelp()
let opts = getopt.parseSystem()

if (opts.options['host'] == null) {
    getopt.showHelp()
    process.exit()
}

const kcIP = [
    '203.104.209.7',
    '203.104.209.71',
    '203.104.209.87',
    '125.6.184.16',
    '125.6.187.205',
    '125.6.187.229',
    '125.6.187.253',
    '125.6.188.25',
    '203.104.248.135',
    '125.6.189.7',
    '125.6.189.39',
    '125.6.189.71',
    '125.6.189.103',
    '125.6.189.135',
    '125.6.189.167',
    '125.6.189.215',
    '125.6.189.247',
    '203.104.209.23',
    '203.104.209.39',
    '203.104.209.55',
    '203.104.209.102',
]

module.exports = {
    host: opts.options['host'],
    port: opts.options['port'] || 8099,
    retry: opts.options['retry'] || 100,
    delay: opts.options['delay'] || 2,
    timeout: opts.options['timeout'] || 20,
    local: opts.options['local'] || 8099,
    kcIP: kcIP,
}
