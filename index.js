'use strict';

console.log('Loading function');

var AWS = require('aws-sdk');

var path = require('path');

var creds = new AWS.EnvironmentCredentials('AWS');

var esDomain = {
    endpoint: process.env.ES_DOMAIN,
    region: 'us-east-1',
    index: process.env.ES_INDEX,
    doctype: process.env.ES_TYPE
};

var esEndpoint =  new AWS.Endpoint(esDomain.endpoint);

exports.handler = (event, context) => {
    var message = JSON.parse(event.Records[0].Sns.Message);
    console.log('From SNS:', message);
    
    var headersArray = message.mail.headers;
    if (typeof headersArray !== 'undefined') {
        message.mail.headers = {};
        headersArray.forEach(function(entry) { message.mail.headers[entry.name] = entry.value });
    }

    postDocumentToES(message, context);
    
};

/*
 * Add the given document to the ES domain.
 * If all records are successfully added, indicate success to lambda
 * (using the "context" parameter).
 */
function postDocumentToES(doc, context) {
    var req = new AWS.HttpRequest(esEndpoint);

    req.method = 'POST';
    req.path = path.join('/', esDomain.index, esDomain.doctype);
    req.region = esDomain.region;
    req.body = JSON.stringify(doc);
    req.headers['presigned-expires'] = false;
    req.headers['Host'] = esEndpoint.host;

    // Sign the request (Sigv4)
    var signer = new AWS.Signers.V4(req, 'es');
    signer.addAuthorization(creds, new Date());

    // Post document to ES
    var send = new AWS.NodeHttpClient();
    send.handleRequest(req, null, function(httpResp) {
        var str = '';
        httpResp.on('data', function (chunk) {
            str += chunk;
        });
        httpResp.on('end', function (chunk) {
            console.log('Elastic Search response:', str);
            context.succeed();
        });
    }, function(err) {
        console.log('Error: ' + err);
        context.fail();
    });
}
