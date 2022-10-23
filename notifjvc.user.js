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

function searchAllOccurences(page, message) {
    var startingIndices = [];

    var indexOccurence = page.indexOf(message, 0);

    while(indexOccurence >= 0) {
        startingIndices.push(indexOccurence);

        indexOccurence = page.indexOf(message, indexOccurence + 1);
    }
    return startingIndices
}


class Notification {
    constructor(topicUrl, message, messageUrl) {
        this.topicUrl = topicUrl;
        this.message = message;
        this.messageUrl = messageUrl
    }

    exists() {
        var exist = getNotifs().find(element => {
            if (element.topicUrl == this.topicUrl && element.message == this.message && element.position == this.position) {
                return true
            } else {
                return false
            }
        })
        if (exist == undefined) {
            return false
        } else {
            return true
        }
    }
}


class Post {
    constructor(topicUrl, text, lastNotifDate) {
        this.topicUrl = topicUrl.split("#")[0];
        this.messages = text;
        this.pagesChecked = getPageNumber(topicUrl)
        this.lastNotifDate = lastNotifDate
    }

    addMessage(text){
        this.messages.push(text)
    }

    incrementPage(url) {
        var tab = url.split('-')
        var page = Number(tab[3])
        tab[3] = page + 1
        return tab.join('-')
    }

    checkQuotedMessages() {
        if (this.checkQuotedMessagesFromPage(this.topicUrl) == true) {
            var newUrl = this.incrementPage(this.topicUrl)
//            if (this.checkQuotedMessagesFromPage(this.topicUrl) == true) {
//                this.topicUrl = newUrl
//            }
        }
    }

    checkQuotedMessagesFromPage(url) {
        var req = new XMLHttpRequest();

        req.open('GET', url, false);
        req.send(null);

        if(req.status == 200) {
            this.messages.forEach(message => {
                var response = decodeHTMLEntities(req.response)
                let position = response.search(message)
                searchAllOccurences(response, message).forEach(position => {
                    if (position != -1 && response[position + message.length + 0] != '\n') {
                        var notif = new Notification(this.topicUrl, message, position)
                        if (!notif.exists()) {
                            addNotif(notif)
                        }
                    }
                })
            })
            return true
        }
        return false
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
        posts_list.push(new Post(post_tmp.topicUrl, post_tmp.messages, post_tmp.lastNotifDate))
    })
    posts = posts_list
    return posts
}

function addPost(post) {
    posts = getPosts()
    var existingPost = posts.find(element => {
        return String(element.topicUrl) == String(post.topicUrl)
    })
    if (existingPost == undefined) {
        posts.push(post)
    } else {
        existingPost.messages.concat(post.messages)
    }
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
    var post = new Post(topicUrl, [text], new Date().getTime())
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
}

function postOuCancer() {
    alert("post ou cancer\n Le script de notif a besoin de la prévisualition pour fonctionner, tapez moins vite ahi(ent)")
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
    $("#DebugNotifJVC").append("<button id='Notif' data-toggle='tooltip' title='DebugNotifJVC' class='btn btn-jv-editor-toolbar' type='button' value='RandomIssou' style='color: #FF0000; padding-top: 10px'>Notif</button>")
    document.getElementById("RandomIssouReload").onclick = readPost
    document.getElementById("Ent").onclick = resetCookies
    document.getElementById("Notif").onclick = checkQuotes
}


addDebug()
catchSubmit();

function checkQuotes() {
    console.log(getPosts(), getNotifs())
    var last10Posts = posts.slice(-10);
    last10Posts.forEach(post => {post.checkQuotedMessages()})
}
//setInterval(checkQuotes, 5000)
