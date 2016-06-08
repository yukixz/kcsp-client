function FindProxyForURL(url, host) {
    if (host == 'osapi.dmm.com' ||
        /:\/\/[\d.]+\/kcsapi\//.test(url) ||
        /:\/\/[\d.]+\/gadget\/js\/kcs_/.test(url)) {
        return 'PROXY 127.0.0.1:8099';
    } else {
        return 'DIRECT';
    }
}
