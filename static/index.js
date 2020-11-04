//  JAVASCRIPT FOR INDEX.HTML

//  Setup variables
var currentList;
var secondList;
var oldInput = "List 1";
var loadingLists;
var listNum = 0;
var player;
var stopTime = false;


//  Setup localstorage
var storage = {
    video: {},
    lists: {},
    settings: {
        "delayed-setting": "5",
        "z-key-setting": "",
        "x-key-setting": "",
        "c-key-setting": "",
        "v-key-setting": "",
        "z-key-delay": 'false',
        "x-key-delay": 'false',
        "c-key-delay": 'false',
        "v-key-delay": 'false'
    }
};


//  When the DOM is ready
$(document).ready(function () {

    //  Create tooltips
    $('[data-toggle="tooltip"]').tooltip({
        trigger: 'hover'
    });

    //  If localstorage exists, set the storage to it
    if (localStorage.getItem('video') != null) {
        storage = JSON.parse(localStorage.getItem('video'));
    }
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
    if (localStorage.getItem('video') != null)
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

        $('#add-time').attr("style", "background-color: #88b07b");
        $('#add-time-late').attr("style", "background-color: #5d8560");
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
    $("[id='" + currentList + "']").hide();

    secondList = currentList;

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
        while ($('#' + createValidID(currentList)).length);

        storage['lists'][createValidID(currentList)] = [];
        syncStorage();
    }

    //  Set the list name on the page to the new list name
    $('#current-name').val(currentList);

    //  Turn the current list into a valid ID for storage
    currentList = createValidID(currentList);

    //  If this is the first list
    if (secondList === undefined)
        secondList = currentList;

    oldInput = currentList;

    //  Add the current list to the table of lists
    $('#time-table').append('<tbody id="' + currentList + '" class="time-list"></tbody>');

    //  Set the tooltip of the input to show what the secondary list is
    $('#current-name').attr('title', 'Secondary List: ' + getNameFromID(secondList)).tooltip('_fixTitle').tooltip('show').tooltip('hide');

    //  If there is a list already there but hidden in the dropdown, allow it to be shown
    $('a.disabled').attr('style', 'display: block');
    $('a.disabled').removeClass("disabled");

    //  Add the list to the dropdown, but make it disabled
    $('.time-dropdown-divider').before('<a class="dropdown-item time-dropdown-item disabled ' + currentList + '" href="#" style="display: none">' + getNameFromID(currentList) + '</a>');

    //  Add the list to the key list dropdowns
    $('.key-list').append('<a class="dropdown-item key-list-dropdown-item" href="#">' + getNameFromID(currentList) + '</a>');
}

//  Add a time to the list
function addTime(isDelayed = false, name = '', list = currentList, loading = false, delayTime = 0) {

    /*
    if (player === undefined) {
        loadYTPlayer();
    }

    if (player.getVideoData()['video_id'] === null) {
        if (!loadingLists) {
            return
        }
    }*/

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

        //  Add the element to the list and sync the lists, storage and localstorage
        timesList.push(element);
        storage['lists'][currentList] = timesList;
        syncStorage();
    }

    //  Get the time in a hh:mm:ss format
    var formattedTime = new Date(time * 1000).toISOString().substr(11, 8);

    //  Switch to list that's been added to
    if (list != currentList)
        $('.' + list).trigger("click");

    //  Insert the element HTML into the document
    document.getElementById(list).insertRow(0).innerHTML = `
    <tr>
        <div class="time-element">
            <a class="time-time" href="#" onClick="seekTo(` + time + `)">` + formattedTime + `</a>
            <input autocomplete="off" class="form-control time-name" placeholder="Name" type="text" value="` + name + `">
            <a class="time-delete" href="#">Delete</a>
        </div>
    </tr>`;

    //  If you've just added a time to the current list with the button, auto-focus the list's name
    if (!loading) {
        $('.time-name:visible').eq(0).focus();
    }
}


//  When someone deletes a time (needs to be jQuery becuase it's dynamic)
$(document).on('click', '.time-delete', function () {

    //  Get the table row it's in
    var row = $(this.closest('tr'));
    var index = row.index();

    // Remove the time from the storage
    var body = storage['lists'][row.closest('tbody').attr('id')];
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

    //  Fix the list keys for adding times
    if (storage['settings']['z-key-setting'] == oldInput) {
        storage['settings']['z-key-setting'] = validInput;

        document.getElementById('z-key-setting').value = input;
    }

    if (storage['settings']['x-key-setting'] == oldInput){
        storage['settings']['x-key-setting'] = validInput;

        document.getElementById('x-key-setting').value = input;
    }
    if (storage['settings']['c-key-setting'] == oldInput){
        storage['settings']['c-key-setting'] = validInput;

        document.getElementById('c-key-setting').value = input;
    }
    if (storage['settings']['v-key-setting'] == oldInput){
        storage['settings']['v-key-setting'] = validInput;

        document.getElementById('v-key-setting').value = input;
    }
    syncStorage();

    $('.key-list-dropdown-item').each(function () {
        if ($(this).html() == oldInput)
            $(this).html(input);
    });

    //  Set the ID of the DOM element to the new name
    $('#' + currentList).attr("id", validInput);

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
    $('tbody[id="' + currentList + '"]').hide();

    //  Show the current list in the dropdown menu
    $('a.disabled').attr('style', 'display: block');
    $('a.disabled').removeClass("disabled");

    secondList = currentList;

    //  Set the tooltip of the input box to the new secondary list
    $('#current-name').attr('title', 'Secondary List: ' + getNameFromID(secondList)).tooltip('_fixTitle').tooltip('show').tooltip('hide');

    currentList = createValidID($(this).html());
    oldInput = currentList;

    //  Hide this list in the dropdown menu
    $(this).addClass("disabled");
    $(this).hide();

    //  Set the name in the input box to the new list name
    $('#current-name').val(getNameFromID(currentList));

    //  Show the new list
    $("[id='" + currentList + "']").show();
});


//  Remove the red line from around the video input if you click out of it
$(document).on('focusout', '#new-video-input', function () {
    $('#new-video-input').attr("style", "none");
});


//  When a person changes the name of the time
$(document).on('focusout', '.time-name', function() {
    /*
    if (player.getVideoData()['video_id'] === null) {
        $(this).val("");
        return;
    }*/

    //  Get the time element
    var row = $(this.closest('tr'));
    var index = row.index();
    var body = storage['lists'][row.closest('tbody').attr('id')];
    var length = body.length;

    //  Set the name in storage and sync it
    body[(length - 1) - index]["name"] = $(this).val();
    syncStorage();
});


//  When a person changes the delay in settings
$(document).on('focusout', '#delayed-setting', function() {
    //  Get the input from the input box
    var input = document.getElementById('delayed-setting');

    //  If the input is tagged as invalid (less than 1 or more than 20) set it to 1
    if (!input.validity.valid) {
        $(this).val('1');
    }

    //  Set storage
    storage['settings']["delayed-setting"] = input.value;
    syncStorage();
});


//  When a person hovers over the add time button (first is hover, second is mouse leaves)
$('#add-time, #add-time-late').hover(function() {
    if (storage['video']['url'] === undefined)
        return;

    //  Get correct background color
    var backgroundColor = "#789c6d";
    if ($(this).attr('id') === 'add-time-late')
        backgroundColor = "#4b6b4d";

    if (storage['video']['url'] != '') {
        $(this).attr("style", "background-color: " + backgroundColor);
    }
}, function () {
        if (storage['video']['url'] === undefined)
            return;

        //  Get correct background color
        var backgroundColor = "#88b07b";
        if ($(this).attr('id') === 'add-time-late')
            backgroundColor = "#5d8560";

        if (storage['video']['url'] != '') {
            $(this).attr("style", "background-color: " + backgroundColor);
    }
});


//  Register keyboard input for adding lists
$(document).keypress(function (event) {
    //  If the person is focused in an input or select box
    if ($(event.target).closest("input, select")[0])
        return;
    
    //  If the video doesn't exist
    if (player.getVideoData()['video_id'] === undefined)
        return;

    //  If the key matches one of the keys
    if (event.key === 'Z') {
        addTimeWithKey('z')
    }
    else if (event.key === 'X') {
        addTimeWithKey('x')
    }
    else if (event.key === 'C') {
        addTimeWithKey('c')
    }
    else if (event.key === 'V') {
        addTimeWithKey('v')
    }
    return;
});


function addTimeWithKey(key) {

    //  Add the animation and the time to the list
    listAnimation();

    if (storage['settings'][key + '-key-delay'] == 'true') {
        addTime(true, '', storage['settings'][key + '-key-setting']);
    }
    else
        addTime(false, '', storage['settings'][key + '-key-setting']);
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

    //  If no new input it provided load from storage
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
            addTime(false, storage['lists'][key][i]["name"], currentList, true, false, parseInt(storage['lists'][key][i]["seconds"]));
    }

    //  Load the settings
    $('delayed-setting').val(storage["settings"]["delayed-setting"]);

    keys = ['z', 'x', 'c', 'v']

    for (var key in keys) {
        $('#' + keys[key] + '-key-setting').val(getNameFromID(storage['settings'][keys[key] + '-key-setting']));

        if (storage['settings'][keys[key] + '-key-delay'] == 'true')
            $('#' + keys[key] + '-key-delay').prop('checked', true);
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
        localStorage.clear();
        $('#yt-cover').show();
    }

    player.stopVideo();

    $('.key-list-dropdown-item').each(function () {
        $(this).remove();
    });

    keys = ['z','x','c','v']

    for (var key in keys) {
        $('#' + keys[key] + '-key-setting').val('');

        $('#' + keys[key] + '-key-delay').prop('checked', false);
    }

    //  Set the buttons back to grayed out
    $('#add-time').attr("style", "background-color: #333832");
    $('#add-time-late').attr("style", "background-color: #2c302b");

    //  Disable the list dropdown and list name
    $('#add-list-dropdown').addClass('disabled');

    //  Set the tooltip, currentList and secondList to nothing
    $('#current-name').attr('title', 'Secondary List: ').tooltip('_fixTitle').tooltip('show').tooltip('hide');
    secondList = ""
    currentList = ""

    //  Reset variables
    storage['video'] = {};
    storage['lists'] = {};
    storage['settings'] = {
        "delayed-setting": "5",
        "z-key-setting": "",
        "x-key-setting": "",
        "c-key-setting": "",
        "v-key-setting": "",
        "z-key-delay": 'false',
        "x-key-delay": 'false',
        "c-key-delay": 'false',
        "v-key-delay": 'false'
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
    }, function (data) {});
}


//  Delete a saved video from the database
function deleteVideo(info) {

    //  Call the python function
    $.post("/deleteVideo", {
        info: JSON.stringify(info)
    }, function (data) {
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


//  Change the list for a key
$(document).on('click', '.key-list-dropdown-item', function () {
    var key = $(this).closest('.input-group').find('input').last().attr('id');

    $(this).closest('.input-group').find('input').last().val($(this).html());

    storage['settings'][key] = createValidID($(this).html());
    syncStorage();
});


//  Update the storage when a delay checkbox is ticked
$(".checkbox").change(function () {

    //  Change the storage - using string rather than bool as it will all have to be tranformed to string anyway
    if (this.checked) {
        storage["settings"][$(this).attr('id')] = 'true';
    }
    else {
        storage["settings"][$(this).attr('id')] = 'false';
    }

    syncStorage();
});


//  Create a valid ID from a name or get a name from an ID (spaces can't be used in ID name)
function createValidID(id) {
    return id.replace(/ /g, '⛕');
}
function getNameFromID(id) {
    if (typeof (id) != "string")
        return;

    return id.replace(/⛕/g, ' ');
}

//  Sync the localstorage up with the storage
function syncStorage() {
    localStorage.setItem('video', JSON.stringify(storage));
}
