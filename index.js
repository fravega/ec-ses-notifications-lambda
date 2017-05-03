'use strict';

console.log('Loading function');

var AWS = require('aws-sdk');

var path = require('path');

var creds = new AWS.EnvironmentCredentials('AWS');

var esDomain = {
    endpoint: ES_DOMAIN,
    region: 'us-east-1',
    index: 'ES_INDEX',
    doctype: 'ES_TYPE'
};

var esEndpoint =  new AWS.Endpoint(esDomain.endpoint);

exports.handler = (event, context) => {
    var message = event.Records[0].Sns.Message;
    console.log('From SNS:', message);
    
    var messageJson = JSON.parse(message);
    var headersArray = messageJson.mail.headers;
    messageJson.mail.headers = {};
    headersArray.forEach(function(entry) { messageJson.mail.headers[entry.name] = entry.value });

    postDocumentToES(messageJson, context);
    
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

