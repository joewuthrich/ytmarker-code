//  JAVASCRIPT FOR INDEX.HTML

//  Setup variables
var currentList;
var oldInput = "List 1";
var loadingLists;
var listNum = 0;
var player;
var stopTime = false;
var modalConfirmFunc = {
    func: null,
    arg: []
};


//  Setup storage
var storage = {
    video: {},
    lists: {},
    settings: {
        "delayed-setting": "5",
        "focus-time-setting": "true",
        "key-list-current-setting": 'KeyZ'
    },
    darkmode: 'true',
    footer: 'true'
};


//  When the DOM is ready
$(document).ready(function () {

    //  Create tooltips
    $('[data-toggle="tooltip"]').tooltip({
        trigger: 'hover'
    });

    //  If sessionstorage exists, set the storage to it
    if (sessionStorage.getItem('video') != null) {
        storage = JSON.parse(sessionStorage.getItem('video'));
    }
    
    syncStorage();

    if (storage['footer'] == 'false')
        $('.footer').attr("style", "display:none !important;") 

    //  Dark mode on page load if the browser is in dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && storage['darkmode'] == 'true') {
        if (document.body.classList.contains("enabled"))
            document.body.classList.remove("enabled");
    }
    else
    {
        if (!document.body.classList.contains("enabled"))
            document.body.classList.add("enabled");
    }

    resizeWindow();
});


//  When the YT player is ready, load the player
window.YT.ready(function () {
    loadYTPlayer();
});


//  Load the Youtube player
function loadYTPlayer() {
    //  If the YT player doesn't exist yet
    if (typeof (YT) === undefined || typeof (YT.Player) === undefined) {

        //  Create iFrame
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        //  When the playerAPI is ready create the actual player
        window.onYoutubePlayerAPIReady = function () {
            createYoutubePlayer();
        };
    }
    else
        createYoutubePlayer();
}

//  Create the Youtube player
function createYoutubePlayer() {
    player = new YT.Player('player', {
        height: '390',
        width: '640',
        videoId: '',
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}


//  Load video in storage when player is ready
function onPlayerReady(event) {
    if (sessionStorage.getItem('video') != null)
        loadVideo(storage);
}


//  Unused for now
function onPlayerStateChange(event) {} 


//  Show a video
function showVideo(url, time = 0, loading = false) {

    if (url === 'top')
        url = $('#top-video-input').val();
    else if (url === 'middle')
        url = $('#middle-video-input').val();

    //  If the youtube ID is valid
    var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);

    var id;

    if (match && match[2].length == 11) {
        //  Valid input
        id = match[2];
    }
    else {
        //  Invalid input
        $('#video-input').attr("style", "box-shadow: 0px 0px 5px 3px #960000");
        return false;
    }

    $('#top-video-input').val("");
    $('#top-video-input').attr("placeholder", url);

    //  Delete old video if it exists
    deleteOldVideo(true);

    //  Create the first list if the video isn't loading from storage
    if (!loading)
        addList();

    //  If there was no video there before
    if ($('#yt-cover').is(':visible')) {
        $('#yt-cover').hide();
        $('.video-input').remove();

        $('#add-time').addClass('add-time-enabled');
        $('#add-time-late').addClass('add-time-late-enabled');

        
        $('#add-list-dropdown').removeClass('disabled');
    }

    //  Make the storage for the video
    var video = {
        url: url,
        id: id,
        time: time.toString()
    };

    storage["video"] = video;
    syncStorage();

    player.loadVideoById(id, time);

    //  Start the counter for the time
    saveVideoTime();
}


//  Save the time of the video
function saveVideoTime() {

    //  Called after 1000 milliseconds (1 second)
    setTimeout(function () {
        if (player.getCurrentTime() != undefined) {

            if (storage['video']['url'] == undefined)
                return;

            storage["video"]["time"] = player.getCurrentTime().toString();
            syncStorage();

            if (stopTime) {
                stopTime = false;
                return;
            }

            saveVideoTime();
        }
    }, 1000);
}


//  Add a list
function addList(name = '', loading = false) {

    //  Hide the current list
    $("[id='" + currentList + "-named-list']").hide();

    //  If this is the first list, add a divider to the dropdown between times and add-time button
    if (listNum === 1)
        $('.time-dropdown-divider').attr('style', 'display: block');

    if (loading)
        currentList = getNameFromID(name);
    else {
        //  Keep going through list names until you find a valid list name
        do {
            listNum++;

            currentList = "List " + listNum;
        }
        while ($('#' + createValidID(currentList) + '-named-list').length);

        storage['lists'][createValidID(currentList)] = [];
        syncStorage();
    }

    //  Set the list name on the page to the new list name
    $('#current-name').val(currentList);

    //  Turn the current list into a valid ID for storage
    currentList = createValidID(currentList);

    oldInput = currentList;

    //  Add the current list to the table of lists
    $('#time-table').append('<tbody id="' + currentList + '-named-list" class="time-list"></tbody>');

    //  If there is a list already there but hidden in the dropdown, allow it to be shown
    $('a.disabled').parent().attr('style', 'display: block');
    $('a.disabled').removeClass("disabled");

    //  Add the list to the dropdown, but make it disabled
    $('.time-dropdown-divider').before(`<div style="display: none" class="` + currentList + `-named-list-div"><a class="dropdown-item ` +
    `time-dropdown-item disabled ` + currentList + `-named-list" href="#">` + getNameFromID(currentList) + 
        `</a><button type="button" class="close list-delete" onclick="openModal('Would you like to delete ` + 
        getNameFromID(currentList) + `?', 'deleteList', '` + currentList + `')">×</button></div>`);

    //  Add the list to the key list dropdowns
    $('.key-list').append(`<a class="dropdown-item key-list-dropdown-item ` + currentList + `-named-list-dropdown" href="#">` + 
    getNameFromID(currentList) + `</a>`);

    if (loading && currentList == storage['settings'][storage['settings']['key-list-current-setting'] + '-key-setting']) {
        $('.' + currentList + '-named-list-dropdown').addClass('key-list-selected');
    }
}

//  Add a time to the list
function addTime(isDelayed = false, name = '', list = currentList, loading = false, delayTime = 0) {
    var time = 0;

    if (player.getCurrentTime() != undefined)
        time = player.getCurrentTime();

    //  Get the delay
    var delay;
    if (isDelayed)
        delay = -($('#delayed-setting').val());
    else
        delay = delayTime;

    time = Math.round(time + delay);

    //  If the time is below 0, or above 24 hours, round it to closest allowed value
    if (time < 0) {
        time = 0;
    }
    else if (time > 86399) {
        time = 86399;
    }

    if (!loading) {
        //  Get the current list of times for the list added to
        var timesList = storage['lists'][list];

        var element = {
            seconds: time.toString(),
            name: ""
        };

        //  Add the element to the list and sync the lists, storage and sessionstorage
        timesList.push(element);
        storage['lists'][currentList] = timesList;
        syncStorage();
    }

    //  Get the time in a hh:mm:ss format
    var formattedTime = new Date(time * 1000).toISOString().substr(11, 8);

    //  Switch to list that's been added to
    if (list != currentList)
        $('.' + list + "-named-list").trigger("click");

    //  Insert the element HTML into the document
    document.getElementById(list + '-named-list').insertRow(0).innerHTML = `
    <tr>
        <div class="time-element">
            <a class="time-time" href="#" onClick="seekTo(` + time + `)">` + formattedTime + `</a>
            <input autocomplete="off" class="form-control time-name" placeholder="Name" type="text" value="` + name + `">
            <a class="time-delete" href="#">Delete</a>
        </div>
    </tr>`;

    //  If you've just added a time to the current list with the button, auto-focus the list's name
    if (!loading && storage['settings']['focus-time-setting'] == 'true') {
        $('.time-name:visible').eq(0).focus();
    }
}


//  When someone deletes a time (needs to be jQuery becuase it's dynamic)
$(document).on('click', '.time-delete', function () {

    //  Get the table row it's in
    var row = $(this.closest('tr'));
    var index = row.index();

    // Remove the time from the storage
    var body = storage['lists'][row.closest('tbody').attr('id').slice(0, -11)];
    var length = body.length;
    body.splice((length - 1) - index, 1);
    syncStorage();

    //  Remove the time element from the DOM
    $(this).parent().remove();
});


//   When a person changes the list name
$('#current-name').on('focusout', function () {
    var input = $(this).val();

    if (player.getVideoData()['video_id'] === undefined) {
        $(this).val("List Name");
        return;
    }

    //  If the input is blank or doesn't already exist or contains the special ID character
    if (input == '' || $('#' + createValidID(input)).length || input.indexOf('⛕') > -1) {

        //  Set the input back to what it was before
        $(this).val(getNameFromID(oldInput));
        return;
    }

    var validInput = createValidID(input);

    //  Move the list to a new key in the storage, and delete the old key
    storage['lists'][validInput] = storage['lists'][oldInput];
    delete storage['lists'][oldInput];

    //  Replace the input name for the list keys for adding times
    var keys = Object.keys(storage['settings']);

    for (key in keys){
        if (keys[key].search('key-setting') != -1) {
            if (storage['settings'][key] == oldInput) {
                storage['settings'][key] = validInput;

                document.getElementById(key).value = input;
            }
        }
    }
    syncStorage();

    //  Set the ID of the list table to the new id
    $('#' + currentList + '-named-list').attr("id", validInput + '-named-list');

    //  Replaces class and name of list in both normal and key dropdown
    $('.' + currentList + '-named-list').addClass(validInput + '-named-list').removeClass(currentList + '-named-list').html(input);
    $('.' + currentList + '-named-list-dropdown').addClass(validInput + '-named-list-dropdown').removeClass(currentList + '-named-list-dropdown').html(input);

    //  Set the name in the dropdown to the new name
    $('a.disabled').html(input);
    $('a.disabled').removeClass(currentList);
    $('a.disabled').addClass(validInput);

    currentList = validInput;
    oldInput = input;
});


//  When a person changes their current list
$(document).on('click', '.time-dropdown-item', function () {
    //  Hide the current list
    $('tbody[id="' + currentList + '-named-list"]').hide();

    //  Show the current list in the dropdown menu
    $('a.disabled').parent().attr('style', 'display: block');
    $('a.disabled').removeClass("disabled");

    currentList = createValidID($(this).html());
    oldInput = currentList;

    //  Hide this list in the dropdown menu
    $(this).addClass("disabled");
    $(this).parent().hide();

    //  Set the name in the input box to the new list name
    $('#current-name').val(getNameFromID(currentList));

    //  Show the new list's times
    $('[id="' + currentList + '-named-list"]').show();
});


//  Remove the red line from around the video input if you click out of it
$(document).on('focusout', '#new-video-input', function () {
    $('#new-video-input').attr("style", "none");
});


//  When a person changes the name of the time
$(document).on('focusout', '.time-name', function() {

    //  Get the time element
    var row = $(this.closest('tr'));
    var index = row.index();
    var body = storage['lists'][row.closest('tbody').attr('id').slice(0, -11)];
    var length = body.length;

    //  Set the name in storage and sync it
    body[(length - 1) - index]["name"] = $(this).val();
    syncStorage();
});


//  When a person changes the delay in settings
$(document).on('focusout', '#delayed-setting', function() {
    //  Get the input from the input box
    var input = document.getElementById('delayed-setting');

    //  If the input is tagged as invalid (less than 1 or more than 20) set it to 5
    if (!input.validity.valid) {
        $(this).val('5');
    }

    //  If the person is not premium
    $.ajax({
        type: 'GET',
        url: '/getIsPremium',
        success: function (premium) {
            console.log(premium);
            if (premium == 'False') 
                return;
        }});

    //  Set storage
    storage['settings']["delayed-setting"] = input.value;
    syncStorage();
});


//  Register keyboard input for adding lists
$(document).keypress(function (event) {
    //  If the person is focused in an input or select box or the key dropdown menu OR the model is open OR they're hovering over the key list dropdown
    if ($(event.target).closest("input, select, .all-key-dropdown-menu")[0] || document.getElementById('confirmation-modal').style.display != "" || $(".all-key-dropdown-menu").is(":hover"))
        return;

    //  If the video doesn't exist
    if (player.getVideoData()['video_id'] === undefined)
        return;

    //  Add time to key if it exists
    var keys = Object.keys(storage['settings']);

    for (key in keys) {
        if (keys[key].search(event.code + '-key-setting') != -1) 
            addTimeWithKey(event.code);
    }
});


//  Youtube keyboard controls
$(document).keydown(function (event) {
    if ($(event.target).closest("input, select")[0])
        return;

    if (player.getVideoData()['video_id'] === undefined)
        return;

    if (event.key.toUpperCase() === 'M') {
        //  Mute YouTube Video
        if (player.isMuted())
            player.unMute()
        else
            player.mute()
    }
    else if (event.key.toUpperCase() === 'K') {
        //  Pause YouTube Video
        if (player.getPlayerState() == 1)
            player.pauseVideo()
        else if (player.getPlayerState() == 2 || player.getPlayerState() == -1)
            player.playVideo()
    }
    else if (event.key === 'ArrowLeft') {
        //  Skip Backward
        player.seekTo(Math.max(0, (player.getCurrentTime() - 5)));
    }
    else if (event.key === 'ArrowRight') {
        //  Skip Forward
        player.seekTo(player.getCurrentTime() + 5);
    }
}); 


//  Add a time with a key
function addTimeWithKey(keyCode) {

    //  Add the animation and the time to the list
    listAnimation();

    if (storage['settings'][keyCode + '-key-delay'] == 'true') {
        addTime(true, '', storage['settings'][keyCode + '-key-setting']);
    }
    else
        addTime(false, '', storage['settings'][keyCode + '-key-setting']);
}


//  Register keyboard input exiting out of input focus
$(document).keydown(function (event) {

    //  If the person is not focused in an input or select box 
    inputBox = $(event.target).closest("input, select")[0];
    if (!inputBox)
        return;

    if (!(event.key === 'Escape' || event.key === 'Enter'))
        return;

    inputBox.blur();

    return;
});


//  Make the dropdown open on hover rather than click
$(document).ready(function () {
    $('.dropdown').hover(function () {
        $(this).find('.dropdown-menu').first().stop(true, true).delay(200).slideDown();
    },
        function () {
            $(this).find('.dropdown-menu').first().stop(true, true).delay(200).slideUp();
        });
});


//  Create the animation for when a time is added by keyboard and green flashes on the YT video
function listAnimation() {

    //  Setup the variables
    var elem = document.getElementById("aspect-container");
    var pos = 0;

    //  Call the forward frame every 45 milliseconds
    var id = setInterval(forwardFrame, 45);

    //  Alert is expanding
    function forwardFrame() {

        //  If the position is the max
        if (pos == 8) {

            //  Stop running this function every 45 milliseconds
            clearInterval(id);

            //  Set the position back to a lower number
            pos = 6;

            //  Run the back frame every 45 milliseconds after a 100 millisecond delay
            setTimeout(function () {
                id = setInterval(backFrame, 45);
            }, 100);
        }
        else {

            //  If this is the first frame (no need to remove an old frame)
            if (pos == 0) {
                //  Add a new frame
                elem.classList.add("time-animation-" + pos);
                pos++;
                return;
            }

            //  Add the new frame and remove the old one
            elem.classList.remove("time-animation-" + (pos - 1));
            elem.classList.add("time-animation-" + pos);
            pos++;
        }
    }

    //  Alert is contracting
    function backFrame() {

        //  If the animation is finished
        if (pos == -1) {

            //  Cancel the continuous calling
            clearInterval(id);
        }
        else {

            //  Add the new frame and remove the old old
            elem.classList.remove("time-animation-" + (pos + 1));
            elem.classList.add("time-animation-" + pos);
            pos--;
        }
    }
}


//  Load a video from storage
function loadVideo(info = '') {

    //  Delete old video if it exists
    deleteOldVideo();

    //  If no new input it =provided load from storage
    if (info === '')
        info = storage;

    storage = info;

    //  Show the video
    if (storage['video']['url'] !== undefined)
        showVideo(storage['video']['url'], storage['video']['time'], true);

    //  For each list
    for (var key in storage['lists']) {
        addList(key, true);

        listNum++;

        //  For each time in the list
        for (var i = 0; i < storage['lists'][key].length; i++)
            addTime(false, storage['lists'][key][i]["name"], currentList, true, parseInt(storage['lists'][key][i]["seconds"]));
    }

    //  Load the settings
    $('#delayed-setting').val(storage["settings"]["delayed-setting"]);

    if (storage['settings']['focus-time-setting'] == 'true')
        $('#focus-time-setting').addClass('autofocus-enabled');

    if ($('#all-key-delay').length){
        $('#key-list-current-setting').val(storage["settings"]["key-list-current-setting"]);

        document.getElementById('all-key-delay').checked = (storage["settings"][storage["settings"]["key-list-current-setting"] + "-key-delay"] == 'true');
    }
    else {
        var keys = Object.keys(storage['settings']);

        for (key in keys) {
            if (keys[key].search('-key-setting') != -1) {
                $('#' + keys[key]).val(getNameFromID(storage['settings'][keys[key]]));

                document.getElementById(keys[key].slice(0, -12) + "-key-delay").checked = (storage["settings"][keys[key].slice(0, -12) + "-key-delay"] == 'true');
            }
        }
    }
}


//  Remove the storage and video for old video
function deleteOldVideo(blank = false) {
    if (player.getVideoData()['video_id'] === undefined)
        return;

    //  Remove all the lists
    $('tbody').remove();
    $('.time-dropdown-item').remove();

    //  Set the top video input to clear
    $('#top-video-input').val("");
    $('#top-video-input').attr("placeholder", "Enter Youtube Video URL");

    //  Hide the dropdown divider
    $('.time-dropdown-divider').attr('style', 'display: none');

    $('#current-name').val('');

    //  If you want it to be completly blank (not replacing video)
    if (blank) {
        sessionStorage.clear();
        $('#yt-cover').show();
    }

    player.loadVideoById('', 0);
    player.seekTo(0);
    player.stopVideo();

    //  Remove the lists from the key dropdown
    $('.key-list-dropdown-item').each(function () {
        $(this).remove();
    });

    //  Set the buttons back to grayed out
    $('#add-time').removeClass('add-time-enabled');
    $('#add-time-late').removeClass('add-time-late-enabled');

    //  Disable the list dropdown and list name
    $('#add-list-dropdown').addClass('disabled');

    //  Turn the autofocus button back on
    $('#focus-time-setting').addClass('autofocus-enabled');

    //  Set the currentList to nothing
    currentList = ""

    //  Reset variables
    storage['video'] = {};
    storage['lists'] = {};
    storage['settings'] = {
        "delayed-setting": "5",
        "focus-time-setting": 'true',
    };

    listNum = 0;

    syncStorage();
}


//  Generate a the lists in a text format for copying and pasting
function generateList() {
    var text = "";

    //  For each list in the list of lists
    for (var key in storage['lists']) {

        //  Add the name of the list to the text and go to a new line
        text += getNameFromID(key) + ':\n'

        //  For each time in that list
        for (var i = 0; i < storage['lists'][key].length; i++) {

            //  Get the formatted time of that list in hh:mm:ss
            var formattedTime = new Date(storage['lists'][key][i]["seconds"] * 1000).toISOString().substr(11, 8);

            //  Add that time to the text but indented, then it's name, and then a new line
            text += '\t' + formattedTime + "  :  " + storage['lists'][key][i]["name"] + '\n';
        }
    }

    //  Add a tag 
    text += "\nMade Using YTMarker.com"

    //  Create an object to copy
    var elem = document.createElement("textarea");
    document.body.appendChild(elem);
    elem.value = text;
    elem.select();

    //  Copy text to clipboard
    document.execCommand("copy");

    //  Remove object
    document.body.removeChild(elem);
}


//  Load the saved video after switching to the main page
function loadVideoFromSaved(info) {
    stopTime = true;
    storage = info;
    syncStorage();

    window.location.href = "http://www.ytmarker.com/";
}


//  Seek to a specific time
function seekTo(seconds) {
    player.seekTo(seconds, true);
    player.playVideo();
}


//  Save a video into the database
function saveVideo() {

    //  Call the python function
    $.post("/save", {
        info: JSON.stringify(storage),
        videoID: storage["video"]["id"]
    }, function (data) {
        //  Reload the page
            window.location.reload();
    });
}


//  Delete a saved video from the database
function deleteVideo(info) {

    //  Call the python function
    $.post("/deleteVideo", {
        info: JSON.stringify(info)
    }, function (data) {
        //  Reload the page
        window.location.href = "http://www.ytmarker.com/";
    });
}


//  Copy link text to clipboard
$(document).on('click', '.link-saved-video', function () {

    //  Using [0] to get the Javascript object rather than the jQuery one
    var text = $(this)[0].innerHTML;

    //  Create an object to copy
    var elem = document.createElement("textarea");
    document.body.appendChild(elem);
    elem.value = text;
    elem.select();

    //  Copy text to clipboard
    document.execCommand("copy");

    //  Remove object
    document.body.removeChild(elem);
});


//  Register the input of a key for premium key list selections through key input
$('#key-list-current-setting').keypress(function (event) {
    registerPremiumKeyChange(event);
});


//  Register the input of a key for premium key list seclections through mouseover
$('#key-list-current-setting, .all-key-dropdown-menu').on('mouseenter', function () {
    $(window).on('keypress', function (event) {
        registerPremiumKeyChange(event);
    });
});
$('#key-list-current-setting, .all-key-dropdown-menu').on('mouseleave', function () {
    $(window).off('keypress');
});


//  Actually register input of key for premium key list
function registerPremiumKeyChange(event) {
    //  Unfocus the input and cancel the event
    $('#key-list-current-setting').blur();
    event.preventDefault();

    //  Get the code
    var code = event.code;

    //  Change the input to the keycode
    $('#key-list-current-setting').val(code);

    //  Update the settings
    storage['settings']['key-list-current-setting'] = code;
    syncStorage();

    //  Update the checkbox to match the key
    document.getElementById('all-key-delay').checked = (storage["settings"][storage["settings"]["key-list-current-setting"] + "-key-delay"] == 'true');

    //  Update the selected list
    $('.key-list-selected').removeClass('key-list-selected');

    $('.' + storage['settings'][code + '-key-setting'] + '-named-list-dropdown').addClass('key-list-selected');
}


//  Change the list for a key
$(document).on('click', '.key-list-dropdown-item', function () {
    var key = $(this).closest('.input-group').find('input').last().attr('id');

    //  If they don't have premium
    if (!(key === 'key-list-current-setting')) {
        $(this).closest('.input-group').find('input').last().val($(this).html());

        storage['settings'][key] = createValidID($(this).html());
        syncStorage();
    } 
    else {
        //  Remove highlight around old link
        $('.key-list-selected').removeClass('key-list-selected');
        
        //  Update storage
        storage["settings"][storage["settings"]["key-list-current-setting"] + "-key-setting"] = createValidID($(this).html());
        syncStorage();

        //  Add highlight to currently selectd item
        $(this).addClass('key-list-selected');
    }
});


//  Update the storage when a delay checkbox is ticked
$(".checkbox").change(function () {

    //  Update the storage based on if they're using premium or not
    if ($(this).attr('id') == 'all-key-delay')
        storage["settings"][storage["settings"]["key-list-current-setting"] + "-key-delay"] = $(this)[0].checked.toString();
    else
        storage["settings"][$(this).attr('id')] = $(this)[0].checked.toString();

    syncStorage();
});


//  Toggle on/off time name autofocus
function autofocusTime() {
    var id = 'focus-time-setting'

    if (storage['settings'][id] == 'false') {
        storage['settings'][id] = 'true';
        $('#' + id).addClass('autofocus-enabled');
    }
    else {
        storage['settings'][id] = 'false';
        $('#' + id).removeClass('autofocus-enabled');
    }
}


//  Toggle dark mode on or off
function toggleDarkMode() {
    document.body.classList.toggle("enabled");

    //  Fix the storage
    if (storage['darkmode'] == 'true')
        storage['darkmode'] = 'false';
    else
        storage['darkmode'] = 'true';

    syncStorage();
}


//  Resort the menus so they they fit on the screen for both wide and narrow screens
$(window).resize(function () { resizeWindow(); });

function resizeWindow() {
    //  If the window is smaller than 900px (matches @media query for css)
    if (window.innerWidth < 900) {
        //  If the menus are not place for the screen size
        if ($.contains($('#big-menus')[0], $('.menus')[0])) {
            //  Move them
            $('#big-menus > .menus').each(function () {
                $(this).detach().appendTo('#small-menus');
            });
            $('.settings-menu').removeClass('dropdown-menu-right');
        }
    }
    else {
        if ($.contains($('#small-menus')[0], $('.menus')[0])) {
            $('#small-menus > .menus').each(function () {
                $(this).detach().appendTo('#big-menus');
            });
            $('.settings-menu').addClass('dropdown-menu-right');
        }
    }
}

//  Open the modal with custom confirmation dialogue
function openModal(text, callFunction, arg) {
    //  Change the modal text
    $('#modal-content').html(text);
    //  Remove old modal click function and add new one 
    modalConfirmFunc['func'] = callFunction;
    modalConfirmFunc['arg'] = arg;

    //  Display the modal
    document.getElementById('confirmation-modal').style.display = "block";
}


//  Listen for modal confirmation
$('#modal-confirm-button').click(function() {
    var func = window[modalConfirmFunc['func']];

    //  Ensure the function is real and run it
    if (typeof func === "function")
        func(modalConfirmFunc['arg']);

    closeModal();
});


//  Close the modals
function closeModal() {
    $('#modal-content').html('');

    document.getElementById('confirmation-modal').style.display = "none";
}


//  Listen for click on window
window.onclick = function (event) {
    //  If person clicks on outer modal layer
    var modal = document.getElementById('confirmation-modal');
    if (event.target == modal) {
        closeModal();
    }
} 


//  Delete a list with the list name as ID
function deleteList(list) {
    //  Remove it from storage
    storage['lists'][list] = undefined;

    //  Delete it from zxcv key dropdown
    $('.' + list + '-named-list-dropdown').remove();

    //  Delete the normal dropdown
    $('.' + list + '-named-list-div').remove();

    //  Delete it from the table of lists
    $('#' + list + '-named-list').remove();

    //  If the list is currently open (should never happen), delete it
    if (list == currentList)
        currentList = '';
}


//  Determine if video exists when clicking add list
function addListKey() {
    if (player.getVideoData()['video_id'] === undefined) 
        return;

    addList();
}


//  Close the footer
function hideFooter() { 
    $('.footer').attr("style", "display:none !important;") 

    storage['footer'] = 'false';
}


//  Create a valid ID from a name or get a name from an ID (spaces can't be used in ID name)
function createValidID(id) {
    return id.replace(/ /g, '⛕');
}
function getNameFromID(id) {
    if (typeof (id) != "string")
        return;

    return id.replace(/⛕/g, ' ');
}

//  Sync the sessionstorage up with the storage
function syncStorage() {
    sessionStorage.setItem('video', JSON.stringify(storage));
}
