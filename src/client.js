"use strict"

import http from 'http';
import net from 'net';
import url from 'url';
import request from 'request';
import config from './config'
import logger from './logger'

let PROXY, RETRY, TIMEOUT;


function makeRequest(opts) {
    return new Promise((resolve, reject) => {
        request(opts, (err, res, body) => {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        })
    })
}

function delay(ms) {
    return new Promise((resolve, reject) => {
        if (ms <= 0) {
            resolve()
        } else {
            setTimeout(resolve, ms)
        }
    })
}


function filterHeaders(origin) {
    let headers = {}
    for (let key in origin) {
        if (! ['connection', 'proxy-connection', 'cache-token', 'request-uri'].includes(key)) {
            headers[key] = origin[key]
        }
    }
    return headers
}

function getRequestId(req) {
    return Date.now().toString(36)
}

function isGameAPI(req) {
    let urlp = url.parse(req.url)
    return (urlp.hostname === 'osapi.dmm.com' ||
            urlp.pathname.startsWith('/kcsapi/') ||
            urlp.pathname.startsWith('/gadget/js/kcs_'))
}

async function onRequest(req, resp) {
    let closed = false
    let body = new Buffer(0)
    req.on('data', (chunk) => {
        body = Buffer.concat([body, chunk])
    })
    req.on('close', () => {
        closed = true
    })
    req.on('end', async () => {
        let stime = Date.now()

        let opts = {
            method:  req.method,
            url:     req.url,
            body:    (body.length > 0) ? body : null,
            headers: filterHeaders(req.headers),
            proxy:   PROXY,
            timeout: TIMEOUT,
            encoding: null,
            followRedirect: false,
        }
        let desc = null
        let isGameAPI_ = isGameAPI(req)
        if (isGameAPI_) {
            let token = getRequestId(req)
            opts.headers['request-uri'] = opts.url
            opts.headers['cache-token'] = token

            let urlp = url.parse(opts.url)
            desc = `API ${urlp.pathname} ${token}`
        } else {
            desc = `${req.method} ${req.url}`
        }

        let rr = null
        for (let i of Array(RETRY).keys()) {
            (i > 0 ? logger.warn : logger.log)(desc, `Try # ${i}`)
            let rtime = Date.now()
            try {
                rr = await makeRequest(opts)
            } catch (e) {
                // 'ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN'
                if (! ['ESOCKETTIMEDOUT', 'ETIMEDOUT'].includes(e.code)) {
                    logger.error(e)
                }
            }
            if (isGameAPI_ && (rr == null || rr.statusCode === 503)) {
                await delay(rtime + TIMEOUT - Date.now())
                if (closed) {
                    break
                }
            } else {
                break
            }
        }

        if (rr) {
            resp.writeHead(rr.statusCode, filterHeaders(rr.headers))
            resp.end(rr.body)
        } else {
            resp.socket.destroy()
        }
        logger.log(desc, `Fin ${(Date.now() - stime) / 1000}s (${closed ? 'closed' : rr.statusCode})`)
    })
}

async function onConnect(req, sock) {
    let desc = `CONNECT ${req.url}`
    logger.log(desc, 'accepted')

    let rSock = net.createConnection({
        host: config.host,
        port: config.port,
    })
    rSock.on('connect', () => {
        logger.log(desc, `connect`)
        rSock.write(`CONNECT ${req.url} HTTP/${req.httpVersion}\r\n\r\n`)
        sock.pipe(rSock)
        rSock.pipe(sock)
    })
    rSock.on('error', (err) => {
        logger.log(desc, `error\n\t${err}`)
        sock.end()
        rSock.end()
    })
    sock.on('close', () => rSock.end())
    rSock.on('close', () => sock.end())
}

let httpd = http.createServer()
httpd.on('request', onRequest)
httpd.on('connect', onConnect)
httpd.listen(config.local, '127.0.0.1', () => {
    PROXY = `http://${config.host}:${config.port}/`
    RETRY = config.retry
    TIMEOUT = config.timeout * 1000

    let port = httpd.address().port
    logger.log(`Upstream proxy server: ${PROXY}`)
    logger.log(`Retry: ${RETRY}, Timeout: ${TIMEOUT}`)
    logger.log(`Local proxy server listen at port ${port}...`)
})

module.exports = httpd;
