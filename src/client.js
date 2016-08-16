"use strict"

import http from 'http'
import net from 'net'
import url from 'url'
import request from 'request'
import HttpProxyAgent from 'http-proxy-agent'
import config from './config'
import logger from './logger'
import fs from 'fs'


let pacPath = '../lib/proxy.pac'
let pac = fs.readFileSync(pacPath,'utf8')

let PROXY_AGENT = null

function getProxyAgent() {
    if (PROXY_AGENT == null) {
        PROXY_AGENT = new HttpProxyAgent(`http://${config.host}:${config.port}/`)
    }
    return PROXY_AGENT
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
    for (var key in origin) {
        headers[key] = origin[key]
    }
    delete headers['connection']
    delete headers['proxy-connection']
    delete headers['proxy-authenticate']
    delete headers['proxy-authorization']
    delete headers['host']
    delete headers['content-length']
    delete headers['cache-token']
    return headers
}

function getRequestId(req) {
    return Date.now().toString(36)
}

function isGameAPI(req) {
    let urlp = url.parse(req.url)
    return (
        urlp.hostname === 'osapi.dmm.com' ||
        urlp.pathname.startsWith('/kcsapi/') ||
        urlp.pathname.startsWith('/gadget/js/kcs_')
    )
}


async function onRequest(req, res) {
    if (isGameAPI(req)) {
        return onAPIRequest(req, res)
    }



    let urlp = url.parse(req.url)

    if (urlp.pathname === '/proxy.pac') {
        let PAC = pac.replace('127.0.0.1:8099',req.headers.host);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(PAC)
        return
    }
    logger.info(`${req.method} ${req.url}`)
    let opts = {
        method: req.method,
        protocol: urlp.protocol,
        hostname: urlp.hostname,
        port: urlp.port,
        path: urlp.path,
        headers: filterHeaders(req.headers),
        agent: getProxyAgent(),
    }

    let rReq = http.request(opts, (rRes) => {
        res.writeHead(rRes.statusCode, filterHeaders(rRes.headers))
        rRes.pipe(res)
    })
    rReq.on('error', () => res.socket.destroy())
    req.on('error', () => rReq.socket.destroy())
    req.pipe(rReq)
}

async function onAPIRequest(req, res) {
    let closed = false
    req.on('close', () => {
        closed = true
    })

    let body = Buffer.alloc(0)
    req.on('data', (chunk) => {
        body = Buffer.concat([body, chunk])
    })
    req.on('end', async() => {
        let stime = Date.now()

        let urlp = url.parse(req.url)
        let opts = {
            method: req.method,
            url: req.url,
            body: (body.length > 0) ? body : null,
            headers: filterHeaders(req.headers),
            agent: getProxyAgent(),
            timeout: (config.timeout * 1000),
            encoding: null,
            followRedirect: false,
        }

        let token = getRequestId(req)
        opts.headers['cache-token'] = token

        let description = `API ${urlp.pathname} ${token}`
        let rr
        for (let i = 0; i < config.retry; i++) {
            (i > 0 ? logger.warn : logger.info)(`${description} # ${i}`)
            let rtime = Date.now() + (config.timeout * 1000)
            try {
                rr = await new Promise((resolve, reject) => {
                    request(opts, (err, res) => {
                        err ? reject(err) : resolve(res)
                    })
                })
            } catch (err) {
                if (!['ESOCKETTIMEDOUT', 'ETIMEDOUT'].includes(err.code)) {
                    logger.error(description, err)
                }
            }
            if (rr == null || rr.statusCode == 503) {
                await delay(rtime - Date.now())
                if (closed) {
                    break
                }
            } else {
                break
            }
        }

        let ftime = (Date.now() - stime) / 1000
        if (rr) {
            res.writeHead(rr.statusCode, filterHeaders(rr.headers))
            res.end(rr.body)
            logger.info(`${description} ${rr.statusCode} (in ${ftime}s)`)
        } else {
            res.socket.destroy()
            logger.error(`${description} ${closed ? 'close' : 'timeout'} (in ${ftime}s)`)
        }
    })
}

async function onConnect(req, sock) {
    let desc = `CONNECT ${req.url}`
    logger.info(desc, 'accepted')

    let rSock = net.createConnection({
        host: config.host,
        port: config.port,
    })
    rSock.on('connect', () => {
        logger.info(desc, `connect`)
        rSock.write(`CONNECT ${req.url} HTTP/${req.httpVersion}\r\n\r\n`)
        sock.pipe(rSock)
        rSock.pipe(sock)
    })
    rSock.on('error', (err) => {
        logger.info(desc, `error\n\t${err}`)
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
    let port = httpd.address().port
    logger.info(`Upstream proxy server: ${config.host}:${config.port}`)
    logger.info(`Retry: ${config.retry}, Timeout: ${config.timeout}`)
    logger.info(`Local proxy server listen at port ${port}...`)
})

module.exports = httpd;
