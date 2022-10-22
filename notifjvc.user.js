// ==UserScript==
// @name         NotifJVC
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Get notification when someone quote your message
// @author       PoissonVache
// @downloadURL  https://github.com/JulesVautier/NotifJVC/raw/master/notifjvc.user.js
// @updateURL    https://github.com/JulesVautier/NotifJVC/raw/master/notifjvc.user.js
// @match        https://www.jeuxvideo.com/forums/*
// @grant       GM_setValue
// @grant       GM_getValue
// @require http://code.jquery.com/jquery-latest.js
// @require https://cdnjs.cloudflare.com/ajax/libs/js-cookie/2.2.1/js.cookie.min.js
// ==/UserScript==

function getPageNumber(title) {
    return Number(title.split('-')[3])
}
function decodeHTMLEntities(text) {
    var html = $("<textarea/>").html(text)
//    return html[0].innerHTML
    return html.text();
}

var notifications = []

class Notification {
    constructor(topicUrl, message, messageUrl) {
        this.topicUrl = topicUrl;
        this.message = message;
        this.messageUrl = messageUrl
    }
}

class Post {
    constructor(topicUrl, text) {
        this.topicUrl = topicUrl.split("#")[0];
        this.messages = [text];
        this.pagesChecked = getPageNumber(text)
    }

    addMessage(text){
        this.messages.push(text)
    }

    checkQuotedMessages() {
        var url = this.topicUrl
        var req = new XMLHttpRequest();

        req.open('GET', url, false);
        req.send(null);

        if(req.status == 200) {
            this.messages.forEach(message => {
                var response = decodeHTMLEntities(req.response)
                console.log(message)
                console.log(response)
                let position = response.search(message)
                if(position != -1) {
                    var notif = new Notification(this.topicUrl, message, "")
                    notifications.push(notif)
                }
                console.log(position)
                console.log(notifications)
            })
        }
    }
}

function savePost(topicUrl, text) {
    var post = new Post(topicUrl, text)
    console.log(post)
    post.checkQuotedMessages()
}

function getMessage() {
    var textArea = $("[name='message_topic']");
    if (textArea.val() === undefined) {
        textArea = $("[name='message']");
    }
    var text = textArea.val()
    return decodeHTMLEntities(text)
}

function readPost() {
    var topicUrl = window.location.href
    var textArea = $(".previsu-editor p")
    var text = textArea.text()
    if (text === undefined || text === "") {
        postOuCancer()
    } else {
        savePost(topicUrl, text)
    }
}

function postOuCancer() {
    alert("post ou cancer\n Le script de notif a besoin de la prévisualition pour fonctionner, tapez moi vie ahi")
    return true
}

function catchSubmit() {
    $(".js-post-message").click(function() {
        readPost()
    })
    $(".js-post-topic").click(function() {
        readPost()
    })
}

function addDebug() {
    $(".jv-editor-toolbar").append("<div id='DebugNotifJVC' class='btn-group'></div>")
    $("#DebugNotifJVC").append("<button id='RandomIssouReload' data-toggle='tooltip' title='DebugNotifJVC' class='btn btn-jv-editor-toolbar' type='button' value='RandomIssou' style='color: #FF0000; padding-top: 10px'>YAYAYAY</button>")
    document.getElementById("RandomIssouReload").onclick = readPost
}

addDebug()
catchSubmit();