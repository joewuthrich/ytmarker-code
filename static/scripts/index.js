var currentURL = "";
var currentID = "";
var currentList;
var secondList;
var oldInput = "List 1"
var loadingLists = false;
var firstCode = "KeyZ";
var secondCode = "KeyX"
var listNum = 0;
var player;
var keyAdded = false;
var cleared = false;

var storage = {
  video : {},
  lists : {},
  settings: {
    "delayed-setting" : "5",
    "first-key-setting" : "KeyZ",
    "second-key-setting" : "KeyX"
  }
};

if (localStorage.getItem('video') !== null) {
  storage = JSON.parse(localStorage.getItem('video'));
}


$(document).ready(function() {
  $('[data-toggle="tooltip"]').tooltip();
});


window.YT.ready(function() {
  loadYTPlayer();
});


function loadYTPlayer()
{
  if (typeof(YT) === undefined || typeof(YT.Player) === undefined)
  {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYoutubePlayerAPIReady = function() {
      createYoutubePlayer();
    };
  }
  else
  {
    createYoutubePlayer();
  }
}


function createYoutubePlayer()
{
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


function onPlayerReady(event)
{
  loadStoredLists();
}


function onPlayerStateChange(event) {}


function setStorage(info)
{
  storage = info;

  localStorage.setItem('video', JSON.stringify(storage));
}


function loadStoredLists()
{
  if (Object.keys(storage['video']).length !== 0)
    {
      loadingLists = true;
      loadVideo();
    }
}


function loadVideo()
{
  var video = storage["video"];
  showVideo(video["url"], parseFloat(video["time"]));
  player.playVideo();
}


function loadNewVideo(info)
{
  deleteOldVideo();

  storage = info;

  localStorage.setItem('video', JSON.stringify(storage));

  loadingLists = true;
  loadVideo();
  addList();
}


function loadLists(lists = storage['lists'])
{
  for (var key in lists)
  {
    addList(key);

    listNum++;

    for (var i = 0; i < lists[key].length; i++)
    {
      addTime(parseInt(lists[key][i]["seconds"]), lists[key][i]["name"], key);
    }
  }

  loadSettings();

  loadingLists = false;
}


function loadSettings()
{
  var settings = storage["settings"];

  for (var key in settings)
  {
    $('#' + key).val(settings[key]);
  }
}


function showNewVideo()
{
  var url = $('#new-video-input').val();

  if (!isValidURL(url))
  {
    $('#new-video-input').attr("style", "box-shadow: 0px 0px 5px 3px #960000");
    return;
  }

  $('#new-video-input').attr("style", "box-shadow: none");

  $('#new-video-input').val("");

  deleteOldVideo();

  $('#current-name').val("");

  showVideo(url);
}


function deleteOldVideo() {
  $('tbody').remove();
  $('.time-dropdown-item').remove();

  $('.time-dropdown-divider').attr('style', 'display: none');

  storage['video'] = {};
  storage['lists'] = {};

  listNum = 0;

  localStorage.setItem('video', JSON.stringify(storage));
}


function showVideo(url = $('#video-input').val(), time = 0)
{
  if (document.readyState != 'complete') {
    return;
  }

  //url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

  var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  var match = url.match(regExp);

  var id;

  if (match && match[2].length == 11)
  {
    id = match[2];
  }
  else
  {
    //  Invalid input
    $('#video-input').attr("style", "box-shadow: 0px 0px 5px 3px #960000");
    return false;
  }

  if (!loadingLists)
  {
    addList();
  }
  else
  {
    loadLists(storage['lists']);
  }

  $("#share-list-div").show();
  $("#input-list-div").hide();

  $('#yt-cover').remove();
  $('.video-input').remove();

  $('#add-time').attr("style", "background-color: #88b07b");
  $('#add-time-late').attr("style", "background-color: #5d8560");
  $('#add-list-dropdown').attr("disabled", false);

  var video = {
    url: url,
    id: id,
    time: time.toString()
  };

  currentURL = url;
  currentID = id;

  storage["video"] = video;

  localStorage.setItem('video', JSON.stringify(storage));

  player.loadVideoById(id, time);
  saveTime();
}


function seekTo(seconds)
{
  player.seekTo(seconds, true);
  player.playVideo();
}


function saveTime() {
    setTimeout(function()
    {
      if (player.getCurrentTime() != undefined)
      {
        var video = {
          url: currentURL,
          id: currentID,
          time: player.getCurrentTime().toString()
        };

        storage["video"] = video;

        localStorage.setItem('video', JSON.stringify(storage));


        if (cleared)
        {
          allowTime();
          localStorage.clear();
          return;
        }

        saveTime();
      }
    }, 1000);
}


function allowTime()
{
  setTimeout(function()
  {
    cleared = false;
  }, 3000);
}

function addTime(delay = 0, name = "", list = currentList)
{
  if (player === undefined)
  {
    loadYTPlayer();
  }

  if (player.getVideoData()['video_id'] === null)
  {
    if (!loadingLists)
    {
      return
    }
  }

  var time = player.getCurrentTime();

  time = Math.round(time + delay);

  if (time < 0) {
    time = 0;
  }
  else if (time > 86399) {
    time = 86399;
  }

  if (!loadingLists)
  {
    var timesList = storage['lists'][currentList];

    var element = {
      seconds: time.toString(),
      name: ""
    };

    timesList.push(element);

    storage['lists'][currentList] = timesList;

    localStorage.setItem('video', JSON.stringify(storage));
  }

  var formattedTime = new Date(time * 1000).toISOString().substr(11, 8);

  document.getElementById(list).insertRow(0).innerHTML = `
  <tr>
      <div class="time-element">
          <a class="time-time" href="#" onClick="seekTo(` + time + `)">` + formattedTime + `</a>
          <input autocomplete="off" autofocus class="form-control time-name" placeholder="Name" type="text" value="` + name + `">
          <a class="time-delete" href="#">Delete</a>
      </div>
  </tr>`;

  if (keyAdded)
  {
    keyAdded = false;
    return;
  }

  if (list === currentList && !loadingLists)
  {
    $('.time-name:visible').eq(0).focus();
  }
}


function addTimeDelay()
{
  var delay = $('#delayed-setting').val();

  addTime(-delay);
}


function addList(name = '')
{
  if (player === undefined)
  {
    loadYTPlayer();
  }

  if (player.getVideoData()['video_id'] === null)
  {
    return;
  }

  $("[id='"+ currentList + "']").hide();

  secondList = currentList;

  if (listNum === 1)
    $('.time-dropdown-divider').attr('style', 'display: block');

  if (loadingLists)
  {
    currentList = name;
  }
  else
  {
    do {
      listNum++;

      currentList = "List " + listNum;
    }
    while ($('#' + createValidID(currentList)).length);
  }

  $('#current-name').val(getNameFromID(currentList));

  currentList = createValidID(currentList);

  if (secondList === undefined)
  {
    secondList = currentList;
  }

  oldInput = currentList;

  if (storage['lists'][currentList] === undefined)
  {
    storage['lists'][currentList] = [];
  }

  localStorage.setItem('video', JSON.stringify(storage));

  $('#time-table').append('<tbody id="' + currentList + '" class="time-list"></tbody>');

  $('a.disabled').attr('style', 'display: block');
  $('a.disabled').removeClass("disabled");

  $('#current-name').attr('title', 'Secondary List: ' + getNameFromID(secondList)).tooltip('_fixTitle').tooltip('show').tooltip('hide');

  $('.time-dropdown-divider').before('<a class="dropdown-item time-dropdown-item disabled" href="#" style="display: none">' + getNameFromID(currentList) + '</a>');
}


$(document).on('click', '.time-delete', function() {
  var row = $(this.closest('tr'));

  var index = row.index();

  var body = storage['lists'][row.closest('tbody').attr('id')];

  var length = body.length;

  body.splice((length - 1) - index, 1);

  localStorage.setItem('video', JSON.stringify(storage));

  $(this).parent().remove();
});


$('#current-name').on('focusout', function() {
  //  Person changes list name
  var input = $(this).val();

  if (input == '' || $('#' + createValidID(input)).length)
  {
    input = getNameFromID(oldInput);

    $(this).val(input);
    return;
  }

  var validInput = createValidID(input);

  renameKey(oldInput, validInput);

  $('#' + currentList).attr("id", validInput);

  $('a.disabled').html(input);

  currentList = validInput;

  oldInput = input;
});


$('#first-key-setting').keydown(function(event) {
  $('#first-key-setting').val(event.code);

  firstCode = event.code;

  storage["settings"]["first-key-setting"] = firstCode;

  localStorage.setItem('video', JSON.stringify(storage))

  $('#first-key-setting').blur();
});


$('#second-key-setting').keydown(function(event) {
  $('#second-key-setting').val(event.code);

  secondCode = event.code;

  storage["settings"]["second-key-setting"] = secondCode;

  localStorage.setItem('video', JSON.stringify(storage))

  $('#second-key-setting').blur();
});


$(document).keydown(function(event) {
  if (!(document.activeElement == document.body))
    return;

  if (event.code === firstCode)
  {
    keyAdded = true;
    listAnimation();
    if ($('#first-key-delay').is(":checked"))
    {
      addTime(-storage["settings"]["delayed-setting"]);
    }
    else
      addTime();
  }
  else if (event.code === secondCode)
  {
    keyAdded = true;
    listAnimation();
    if ($('#second-key-delay').is(":checked"))
      addTime(-storage["settings"]["delayed-setting"], "", secondList);
    else
      addTime(0, "", secondList);
  }
  return;
});


$(document).on('focusout', '.time-name', function() {
  //  Person changes time name
  if (player.getVideoData()['video_id'] === null)
  {
    $(this).val("");
    return;
  }

  var row = $(this.closest('tr'));

  var index = row.index();

  var body = storage['lists'][row.closest('tbody').attr('id')];

  var length = body.length;

  body[(length - 1) - index]["name"] = $(this).val();

  localStorage.setItem('video', JSON.stringify(storage));
});


$(document).on('focusout', '#delayed-setting', function() {
  //  Person changes delay
  var input = document.getElementById('delayed-setting');

  if (!input.validity.valid)
  {
    $(this).val('1');
  }

  storage['settings']["delayed-setting"] = input.value;

  localStorage.setItem('video', JSON.stringify(storage));
});


$(document).on('click', '.time-dropdown-item', function() {
  //  Person changes lists
  $('tbody[id="' + currentList + '"]').hide();

  $('a.disabled').attr('style', 'display: block');
  $('a.disabled').removeClass("disabled");

  secondList = currentList;

  $('#current-name').attr('title', 'Secondary List: ' + getNameFromID(secondList)).tooltip('_fixTitle').tooltip('show').tooltip('hide');

  currentList = createValidID($(this).html());

  oldInput = currentList;

  $(this).addClass("disabled");
  $(this).hide();

  $('#current-name').val(getNameFromID(currentList));

  $("[id='"+ currentList + "']").show();
});


$(document).on('focusout', '#new-video-input', function() {
  $('#new-video-input').attr("style", "none");
});


$('#add-time').hover(function() {
  if (currentURL != '') {
    $('#add-time').attr("style", "background-color: #789c6d");
  }
}, function () {
  if (currentURL != '') {
    $('#add-time').attr("style", "background-color: #88b07b");
  }
});


$('#add-time-late').hover(function() {
  if (currentURL != '') {
    $('#add-time-late').attr("style", "background-color: #4b6b4d");
  }
}, function () {
  if (currentURL != '') {
    $('#add-time-late').attr("style", "background-color: #5d8560");
  }
});


$('.dropdown').on('show.bs.dropdown', function() {
  $(this).find('.dropdown-menu').first().stop(true, true).slideDown();
});

$('.dropdown').on('hide.bs.dropdown', function() {
  $(this).find('.dropdown-menu').first().stop(true, true).slideUp();
});


function saveVideo()
{
  $.post( "/save", {
    video: JSON.stringify(storage),
    id: currentID
  }, function(data) {

  });
}

function removeSavedVideo(info)
{
  $.post( "/unsave", {
    video: JSON.stringify(info)
  }, function(data) {

  });
}

function createValidID(id)
{
  return id.replace(/ /g, '⛕');
}

function getNameFromID(id)
{
  return id.replace(/⛕/g, ' ');
}

function renameKey(oldKey, newKey)
{
  storage['lists'][newKey] = storage['lists'][oldKey];
  delete storage['lists'][oldKey];

  localStorage.setItem('video', JSON.stringify(storage));
}

function clearStorage()
{
  cleared = true;
  localStorage.clear();
}

function isValidURL(url)
{
  var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  var match = url.match(regExp);

  if (match && match[2].length == 11)
  {
    return true;
  }
  else
  {
    return false;
  }
}

function listAnimation()
{
  var elem = document.getElementById("aspect-container");
  var pos = 0;
  var id = setInterval(forwardFrame, 45);
  function forwardFrame()
  {
    if (pos == 8)
    {
      clearInterval(id)
      pos = 6;
      setTimeout(function() {
        id = setInterval(backFrame, 45);
      }, 100);
    }
    else
    {
      if (pos == 0)
      {
        elem.classList.add("time-animation-" + pos);
        pos++;
        return;
      }
      elem.classList.remove("time-animation-" + (pos - 1));
      elem.classList.add("time-animation-" + pos);
      pos++;
    }
  }

  function backFrame()
  {
    if (pos == -1)
    {
      clearInterval(id)
    }
    else
    {
      elem.classList.remove("time-animation-" + (pos + 1));
      elem.classList.add("time-animation-" + pos);
      pos--;
    }
  }
}

function generateList()
{
  lists = storage['lists']
  var text = "";
  for (var key in lists)
  {
    text += getNameFromID(key) + ':\n'
    for (var i = 0; i < lists[key].length; i++)
    {
      var formattedTime = new Date(lists[key][i]["seconds"] * 1000).toISOString().substr(11, 8);
      text += '\t' + formattedTime + "  :  " + lists[key][i]["name"] + '\n';
    }
  }

  text += "\nMade Using YoutubeMarker.com"

  console.log(text)
}
