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

function loadAvatar(index) {
    console.info('got index ' + index);
    console.info('Loading Avatars');
    let avatars = JSON.parse(fs.readFileSync('./resources/avatars.json'));
    console.info(`Loaded ${avatars.length} avatars`);
    let avatar;
    if (index) {
        console.info("User selected character");
    avatar = avatars[index];
    } else {
        console.info("No character selected using random");
    avatar = avatars[getRandomInt(0,avatars.length)];
    }
    console.info(`Anonna will respond as ${avatar.username}`);
    return avatar;
}

function listAvatars() {
    console.info('Listing Avatars');
    let avatars = JSON.parse(fs.readFileSync('./resources/avatars.json'));
    console.info(`Loaded ${avatars.length} avatars`);
    let avatarlist = "character list, select the number next to the character with the !speakas command\n";
    for (let index in avatars) {
        avatarlist += index + " : " + avatars[index].username + "\n";
    }
    return avatarlist;
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

    let txtCommand = event.text.split(" ", 1);
    
    console.info("command is " + txtCommand);
    
    switch (txtCommand.toString().toLowerCase()) {
        case "!list":
            console.info("!list selected")
            let list = listAvatars();
            console.info(list);
            callback(null,JSON.stringify({text: list}));
            break;
        case "!speakas":
            console.info("$speak selected")
            let aindex = event.text.split(" ", 2)[1];
            if (Number.isInteger(parseInt(aindex))) {
                postToWebhook(formatResponse(loadAvatar(aindex),event.text.replace(/!speakas [0-9]+\s/,"")),function(err,data){
                if(err) {
                    console.error('There has been an error');
                    console.error(new Error(err));
                    callback(JSON.stringify({text: 'Something went wrong, please try again.'}));
                }
                callback(null,data);
                });
            } else {
                callback(null,JSON.stringify({text: 'Valid character not selected. Please use !list subcommand and put character number not name in format /anon !speakas <character number> <your message>\n example: /anon !speakas 10 I have an important question'}));
            }
            
            break;
        default:
            postToWebhook(formatResponse(loadAvatar(),event.text),function(err,data){
            if(err) {
                console.error('There has been an error');
                console.error(new Error(err));
                callback(JSON.stringify({text: 'Something went wrong, please try again.'}));
            }
            callback(null,data);
            
            });
           
            break;
    }
    
    
};

