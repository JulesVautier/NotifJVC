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
// @require https://raw.githubusercontent.com/carhartl/jquery-cookie/master/src/jquery.cookie.js
// ==/UserScript==

function getPageNumber(title) {
    return Number(title.split('-')[3])
}

function decodeHTMLEntities(text) {
    var html = $("<textarea/>").html(text)
//    return html[0].innerHTML
    return html.text();
}


class Notification {
    constructor(topicUrl, message, messageUrl) {
        this.topicUrl = topicUrl;
        this.message = message;
        this.messageUrl = messageUrl
    }

    exists() {
        return getNotifs().find(element => {
            if (element.topicUrl == this.topicUrl && element.message == this.message) {
                return true
            } else {
                return false
            }
        })
    }
}

class Post {
    constructor(topicUrl, text) {
        this.topicUrl = topicUrl.split("#")[0];
        this.messages = text;
        this.pagesChecked = getPageNumber(topicUrl)
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
                let position = response.search(message)
                if(position != -1) {
                    var notif = new Notification(this.topicUrl, message, "")
                    if (!notif.exists()) {
                        console.log('new_notif')
                        addNotif(notif)
                    }
                }
            })
        }
    }
}

var COOKIE_POSTS = "COOKIE_POSTS"
var COOKIE_NOTIFS = "COOKIE_NOTIFS"
var notifs = []
var posts = []

function getPosts() {
    cook = $.cookie(COOKIE_POSTS)
    if (cook == undefined) {
        posts = []
        return posts
    }
    var posts_tmp = $.parseJSON(cook)
    var posts_list = []
    posts_tmp.forEach(post_tmp => {
        console.log('get_posts', post_tmp)
        posts_list.push(new Post(post_tmp.topicUrl, post_tmp.messages))
    })
    posts = posts_list
    return posts
}

function addPost(post) {
    posts = getPosts()
    posts.push(post)
    $.cookie(COOKIE_POSTS, JSON.stringify(posts));
    return posts
}


function getNotifs() {
    cook = $.cookie(COOKIE_NOTIFS)
    if (cook == undefined) {
        notifs = []
        return notifs
    }
    var notifs_tmp = $.parseJSON(cook)
    var notifs_list = []
    notifs_tmp.forEach(notif_tmp => {
        console.log(notif_tmp)
        notifs_list.push(new Notification(notif_tmp.topicUrl, notif_tmp.message, notif_tmp.messageUrl))
    })
    notifs = notifs_list
    return notifs
}

function addNotif(notif) {
    notifs = getNotifs()
    notifs.push(notif)
    $.cookie(COOKIE_NOTIFS, JSON.stringify(notifs));
    return notifs
}


function resetCookies() {
    $.cookie(COOKIE_NOTIFS, JSON.stringify([]));
    $.cookie(COOKIE_POSTS, JSON.stringify([]));
}


function savePost(topicUrl, text) {
    var post = new Post(topicUrl, [text])
    addPost(post)
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
    checkQuotes()
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
    $("#DebugNotifJVC").append("<button id='Ent' data-toggle='tooltip' title='DebugNotifJVC' class='btn btn-jv-editor-toolbar' type='button' value='RandomIssou' style='color: #FF0000; padding-top: 10px'>COKIES</button>")
    document.getElementById("RandomIssouReload").onclick = readPost
    document.getElementById("Ent").onclick = resetCookies
}


addDebug()
catchSubmit();

function checkQuotes() {
    console.log(getPosts(), getNotifs())
    var last10Posts = posts.slice(-10);
    last10Posts.forEach(post => {post.checkQuotedMessages()})
}
checkQuotes()
//setInterval(checkQuotes, 5000)
