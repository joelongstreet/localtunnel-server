var http = require('http');
var url = require('url');
var assert = require('assert');

var localtunnel_server = require('../server')();
var localtunnel_client = require('localtunnel');

var lt_server_port

test('setup localtunnel server', function(done) {
    var server = localtunnel_server.listen(function() {
        lt_server_port = server.address().port;
        console.log('lt server on:', lt_server_port);
        done();
    });
});

test('setup local http server', function(done) {
    var server = http.createServer();
    server.on('request', function(req, res) {
        res.write('foo');
        res.end();
    });
    server.listen(function() {
        var port = server.address().port;

        test._fake_port = port;
        console.log('local http on:', port);
        done();
    });
});

test('setup localtunnel client', function(done) {
    var client = localtunnel_client.connect({
        host: 'http://localhost:' + lt_server_port,
        port: test._fake_port
    });

    client.on('url', function(url) {
        assert.ok(new RegExp('^http:\/\/.*localhost:' + lt_server_port + '$').test(url));
        test._fake_url = url;
        done();
    });

    client.on('error', function(err) {
        console.error(err);
    });
});

test('query localtunnel server w/ ident', function(done) {
    var uri = test._fake_url;
    var hostname = url.parse(uri).hostname;

    var opt = {
        host: 'localhost',
        port: lt_server_port,
        headers: {
            host: hostname
        },
        path: '/'
    }

    var req = http.request(opt, function(res) {
        res.setEncoding('utf8');
        var body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            assert.equal('foo', body);

            // TODO(shtylman) shutdown client
            done();
        });
    });

    req.end();
});

test('request specific domain', function(done) {
    var client = localtunnel_client.connect({
        host: 'http://localhost:' + lt_server_port,
        port: test._fake_port,
        subdomain: 'abcd'
    });

    client.on('url', function(url) {
        assert.ok(new RegExp('^http:\/\/abcd.localhost:' + lt_server_port + '$').test(url));
        done();
    });

    client.on('error', function(err) {
        console.error(err);
    });
});

test('shutdown', function() {
    localtunnel_server.close();
});

