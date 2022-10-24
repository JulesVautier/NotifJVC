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
    return Number(title.split('-')[5])
}

function decodeHTMLEntities(text) {
    var html = $("<textarea/>").html(text)
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
    constructor(topicUrl, message, position, clicked) {
        this.topicUrl = topicUrl;
        this.message = message;
        this.position = position;
        this.clicked = clicked
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

var refreshCounters = [60 * 2, 60 * 5, 60 * 10, 60 * 15, 60 * 60, 60 * 60 * 24]
refreshCounters = [1, 30, 60, 60 * 15, 60 * 60, 60 * 60 * 24, 60 * 60 * 24, 60 * 60 * 24, 60 * 60 * 24, 60 * 60 * 24]
//refreshCounters = [10, 10]

class Post {
    constructor(topicUrl, text, lastTopicRefreshDate, nextRefreshCounter, pagesChecked) {
        this.topicUrl = this.fixTopicUrl(topicUrl)
        this.messages = text;
        this.lastTopicRefreshDate = lastTopicRefreshDate
        this.nextRefreshCounter = nextRefreshCounter
        this.pagesChecked = pagesChecked
        if (this.nextRefreshCounter >= refreshCounters.length) {
            this.nextRefreshCounter = refreshCounters.length - 1
        }

    }

    getNextRefreshDate() {
        return new Date(this.lastTopicRefreshDate.getTime() + refreshCounters[this.nextRefreshCounter] * 1000);
    }

    setNextRefreshDate() {
        this.nextRefreshCounter = this.nextRefreshCounter + 1
        if (this.nextRefreshCounter >= refreshCounters.length) {
            this.nextRefreshCounter = refreshCounters.length - 1
        }
    }

    restartRefreshDate() {
        this.nextRefreshCounter = 0
        this.lastTopicRefreshDate = new Date()
    }

    canRefresh() {
        let diff = new Date(this.getNextRefreshDate().getTime()- new Date().getTime())
        console.log("next refresh in ", diff.getHours(), diff.getMinutes(), diff.getSeconds())
        if (new Date().getTime() > this.getNextRefreshDate().getTime()) {
            this.setNextRefreshDate()
            console.log("refresh")
            return true
        }
        return false
    }

    addMessage(text){
        this.messages.push(text)
    }

    fixTopicUrl(topicUrl) {
        topicUrl = topicUrl.split('#')[0]
        var tab = topicUrl.split('-')
        tab[3] = 1
        return tab.join('-')
    }

    getUrl(pagesChecked) {
        var tab = this.topicUrl.split('-')
        tab[3] = pagesChecked
        return tab.join('-')
    }

    checkQuotedMessages() {
        if (!this.canRefresh()) {
            return false
        }
        var newUrl = this.getUrl(this.pagesChecked)
        return this.checkQuotedMessagesFromPage(newUrl)
    }

    checkQuotedMessagesFromPage(url) {
        var req = new XMLHttpRequest();

        req.open('GET', url, false);
        req.send(null);

        if(req.status == 200) {
            this.messages.forEach(message => {
//                console.log(req.response)
                var response = decodeHTMLEntities(req.response)
                let position = response.search(message)
                searchAllOccurences(response, message).forEach(position => {
                    if (position != -1 && response[position + message.length + 0] != '\n') {
                        let notif = new Notification(this.topicUrl, message, position, false)
                        if (!notif.exists()) {
                            addNotif(notif)
                        }
                    }
                })
            })
            if (req.response.search("pagi-suivant-actif") != -1) {
                this.restartRefreshDate()
                this.pagesChecked = this.pagesChecked + 1
            }
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
    cook = localStorage.COOKIE_POSTS
    if (cook == undefined) {
        posts = []
        return posts
    }
    var posts_tmp = $.parseJSON(cook)
    var posts_list = []
    posts_tmp.forEach(post_tmp => {
        posts_list.push(new Post(post_tmp.topicUrl, post_tmp.messages, new Date(Date.parse(post_tmp.lastTopicRefreshDate)), post_tmp.nextRefreshCounter, post_tmp.pagesChecked))
    })
    posts = posts_list
    return posts
}


function savePost(topicUrl, text) {
    var post = new Post(topicUrl, [text], new Date(), 0, getPageNumber(topicUrl))
    addPost(post)
}

function addPost(post) {
    posts = getPosts()
    var existingPost = posts.find(element => {
        console.log(element.topicUrl, post.topicUrl, element.topicUrl == post.topicUrl)
        return element.topicUrl == post.topicUrl
    })
    if (existingPost == undefined) {
        posts.push(post)
    } else {
        let new_msg = post.messages.at(-1)
        if (existingPost.messages.find(msg => msg == new_msg) == undefined) {
            existingPost.messages.push(new_msg)
        }
        existingPost.nextRefreshCounter = post.nextRefreshCounter
    }
    localStorage.COOKIE_POSTS = JSON.stringify(posts);
    return posts
}


function getNotifs() {
    cook = localStorage.COOKIE_NOTIFS
    if (cook == undefined) {
        notifs = []
        return notifs
    }
    var notifs_tmp = $.parseJSON(cook)
    var notifs_list = []
    notifs_tmp.forEach(notif_tmp => {
        notifs_list.push(new Notification(notif_tmp.topicUrl, notif_tmp.message, notif_tmp.position, notif_tmp.clicked))
    })
    notifs = notifs_list
    return notifs
}

function addNotif(notif) {
    notifs = getNotifs()
    notifs.push(notif)
    localStorage.COOKIE_NOTIFS = JSON.stringify(notifs)
    return notifs
}

function deleteNotif(position) {
    console.log("deleteNotif")
    let notif = getNotifs().find(notif => notif.position == position)
    notif.clicked = true
    localStorage.COOKIE_NOTIFS = JSON.stringify(notifs)
    showNotifs()
    return notifs
}

function resetCookies() {
    localStorage.COOKIE_NOTIFS = JSON.stringify([])
    localStorage.COOKIE_POSTS = JSON.stringify([])
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
//        readPost()
    })
    $(".icon-bell-off").click(function() {
        showNotifs()
    })
}

function addDebug() {
    $(".jv-editor-toolbar").append("<div id='DebugNotifJVC' class='btn-group'></div>")
    $(".jv-editor-toolbar").append("<div id='DebugNotifJVC2' class='btn-group'></div>")
//    $("#DebugNotifJVC").append("<button id='RandomIssouReload' data-toggle='tooltip' title='DebugNotifJVC' class='btn btn-jv-editor-toolbar' type='button' value='RandomIssou' style='color: #FF0000; padding-top: 10px'>YAYAYAY</button>")
    $("#DebugNotifJVC").append("<button id='Ent' data-toggle='tooltip' title='DebugNotifJVC' class='btn btn-jv-editor-toolbar' type='button' value='RandomIssou' style='color: #FF0000;'>Reset all notifs</button>")
    $("#DebugNotifJVC2").append("<button id='Notif' data-toggle='tooltip' title='DebugNotifJVC' class='btn btn-jv-editor-toolbar' type='button' value='RandomIssou' style='color: #FF0000;'>Refresh notifs manually</button>")
//    document.getElementById("RandomIssouReload").onclick = readPost
    document.getElementById("Ent").onclick = resetCookies
    document.getElementById("Notif").onclick = checkNotifs
}

addDebug()

function initNotifs() {
    $(".js-header-dropdown-content").last().append("<ul class=NotifList></ul>")
}
initNotifs()

function showNotifsIcon() {
    let nbNotifs = getNotifs().filter(e => e.clicked == false).length
    let issou = $('.headerAccount__notif')
    issou.removeClass("headerAccount__notif js-header-menu-dropdown js-header-notif")
    issou.addClass("headerAccount__pm js-header-menu-dropdown js-header-mp headerAccount__pm--hasNotif")
    issou.attr("data-val",nbNotifs)
}

function showNotifs() {
    $(".NotifList").empty()
    getNotifs().filter(e => e.clicked == false).forEach(notif => {
        if($("#" + notif.position).length == 0) {
            var notifButtonStr = `<li ><a id="${notif.position}" class=Notif href="${notif.topicUrl}">${notif.message.substring(0, 50)}</a></li>`
            $(".NotifList").prepend(notifButtonStr)
            $("#" + notif.position).bind("click", function() {
                deleteNotif(notif.position)
            })
        }
    })
    console.log(getPosts(), getNotifs())
}


function checkNotifs() {
    console.log(getPosts(), getNotifs())
    var last10Posts = posts.slice(-1);
    last10Posts.forEach(post => {
        post.checkQuotedMessages()
    })
    localStorage.COOKIE_POSTS = JSON.stringify(posts);
    showNotifsIcon()
}

setInterval(checkNotifs, 10000)
catchSubmit();
