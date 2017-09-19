'use strict';

var fs = require('fs');
var http = require('https');
var url = require('url');

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

function formatResponse(avatar,text){
    let resp = {
        text: text,
        username: `${avatar.username}: ${avatar.default_text}`,
        icon_url: avatar.icon_url,
        response_type: 'in_channel',
        as_user: false,
        channel: process.env['SLACK_CHANNEL']
    };
    return resp;
}

function loadAvatar() {
    console.info('Loading Avatars');
    let avatars = JSON.parse(fs.readFileSync('./resources/avatars.json'));
    console.info(`Loaded ${avatars.length} avatars`);
    let avatar = avatars[getRandomInt(0,avatars.length)];
    console.info(`Anonna will respond as ${avatar.username}`);
    return avatar;
}

function postToWebhook(response,callback){
    let slack_url = url.parse(process.env['SLACK_WEBHOOK_URL']);
    let opts = {
        hostname: slack_url.hostname,
        path: slack_url.path,
        port: '443',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    let request = http.request(opts,function(res){
        res.setEncoding('utf8');
        res.on('data',function(chunk){
            if( chunk == 'ok'){
                callback(null,JSON.stringify({text: `Thank you. Your message: "${response.text}" will be posted in #${response.channel} as ${response.username.split(':')[0]}`}));
            } else {
                callback(JSON.stringify({text: 'Something went wrong, please try again.'}));
            }
        });

        res.on('error',function(err){
            callback(err);
        });
    });
    request.write(JSON.stringify(response));
    request.end();
}

exports.anonamize = (event,context,callback) => {
    console.info('Receiving Anonamization Request');

    postToWebhook(formatResponse(loadAvatar(),event.text),function(err,data){
        if(err) {
            console.error('There has been an error');
            console.error(new Error(err));
            callback(JSON.stringify({text: 'Something went wrong, please try again.'}));
        }
        callback(null,data);
    });
};
