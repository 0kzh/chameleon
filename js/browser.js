const path = require('path');
const unusedFilename = require('unused-filename');
const { ipcRenderer, shell } = window.require('electron');
const { dialog } = window.require('electron').remote;
const app = window.require('electron').remote.app;
const searchInPage = require('electron-in-page-search').default;
const fs = require('fs');

window.onresize = doLayout;
var isLoading = false;
var el = document.querySelector('.chrome-tabs');
var chromeTabs = new ChromeTabs();
var win = remote.getCurrentWindow();
var dragging = false;
var offsets = { x: 0, y: 0 };
var winSize = { width: win.getSize()[0], height: win.getSize()[1] };
const { width, height } = remote.screen.getPrimaryDisplay().workAreaSize;
var dir;
const bufferPixels = 5;
var snapped = false;
var startTime = 0;
var timer;
var pendingRefreshOnConnect;
const downloadItemTemplate = `<div class="download-item">
                                  <div class="download-content">
                                    <div class="download-icon"></div>
                                    <div class="download-title"></div>
                                    <div class="download-details"></div>
                                  </div>
                                  <div class="download-actions">
                                    <div class="download-folder action"></div>
                                    <div class="download-close action"></div>
                                  </div>
                              </div>`;
const defaultSettings = {
  theme: 'light',
  controlsStyle: 'auto',
  downloadsDirectory: app.getPath('downloads'),
  navbarAlign: 'left'
};
let loadedSettings;

//load settings
settings.onLoad(loadSettings);

addBorder();

chromeTabs.init(el, { tabOverlapDistance: 14, minWidth: 45, maxWidth: 248 });

//create default tab
chromeTabs.addTab({
  title: 'New Tab',
  favicon: 'img/default-favicon.png'
});

if ($(".download-item:not(.last)").length == 0) {
  $("#download-manager").hide();
}

function scrollHorizontally(e) {
  e = window.event || e;
  var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
  document.getElementById('download-manager').scrollLeft -= (delta * 20); // Multiplied by 40
  e.preventDefault();
}

if (document.getElementById('download-manager').addEventListener) {
  // IE9, Chrome, Safari, Opera
  document.getElementById('download-manager').addEventListener("mousewheel", scrollHorizontally, false);
  // Firefox
  document.getElementById('download-manager').addEventListener("DOMMouseScroll", scrollHorizontally, false);
} else {
  // IE 6/7/8
  document.getElementById('download-manager').attachEvent("onmousewheel", scrollHorizontally);
}

document.querySelector('#location-form').onsubmit = function(e) {
  e.preventDefault();
  //special redirects
  navigateTo(document.querySelector('#location').value);
};

document.addEventListener("tabAdd", function(e) {
  setupWebview(e.detail.tabId);
});

document.addEventListener("activeTabChange", function(e) {
  var webview = document.querySelector('webview[tab-id="' + e.detail.tabEl.getAttribute("tab-id") + '"]');
  $('.ripple-effect').remove();
  $("#location").prop('disabled', true);
  $('#border-active').remove();
  //TODO: check if webContents ready; using empty catch is bad practice
  try {
    //if page loaded, set omnibar url
    console.log("tab change:" + stripURL(webview.getURL()));
    document.querySelector('#location').value = stripURL(webview.getURL());
  } catch (err) {
    //no page loaded
    document.querySelector('#location').value = stripURL("about:blank");
  }

  //TODO: check if webContents ready; using empty catch is bad practice
  try {
    updateBackButton(webview);
  } catch (err) {

  }

  if ($("#location").val() == "Search or enter address") {
    selectNavbar(false, null);
  } else {
    if (loadedSettings.navbarAlign === 'center') {
      $('#location').css("transition", "none");
      $("#location").css("transform", "translateX(" + getNavbarOffset() + "px)");
      $("#navbarIcon").css("opacity", "0");
    }
    $('#border-active').remove();
    $('#border-match-width').remove();
    // $('#location').css("transition", "transform 0.5s");

    // if ($("#add-tab").hasClass("no-border")) {
    //     $(".ripple").css("border-right", "1px solid transparent");
    // }
  }
});

document.addEventListener("closeWindow", function(e) {
  window.close();
});

function maximizeWindow(fullscreen) {
  if (process.platform === "darwin" && fullscreen) {
    win.setFullScreen(true);
  } else {
    win.maximize();
    snapped = true;
  }
  removeBorder();
  $(".icon-unmaximize").show();
  $(".icon-maximize").hide();
}

function unmaximizeWindow(fullscreen) {
  if (process.platform === "darwin" && fullscreen) {
    win.setFullScreen(false);
  } else {
    win.unmaximize();
  }
  addBorder();
  $(".icon-unmaximize").hide();
  $(".icon-maximize").show();
}

//titlebar actions
$(".titlebar-close, .close").click(function() {
  win.close();
});

$(".titlebar-minimize, .minimize").click(function() {
  win.minimize();
});

$(".titlebar-fullscreen, .maximize").click(function() {
  if (win.isMaximized()) {
    unmaximizeWindow(true);
  } else {
    maximizeWindow(true);
  }
});

$(".titlebar-mac").dblclick(function() {
  if (win.isMaximized()) {
    unmaximizeWindow(true);
  } else {
    maximizeWindow(true);
  }
});

$(".ripple").mousedown(function(e) {
  if ($(this).find(".ripple-effect").length == 0) {
    if (Math.abs(win.getSize()[0] - width) < bufferPixels || Math.abs(win.getSize()[1] - height) < bufferPixels) {
      //if maximized, take percentage offset
      offsets.x = Math.ceil(e.clientX * (winSize.width / width));
      offsets.y = Math.ceil(e.clientY * (winSize.height / height));
      $('#location').css("transition", "transform 0s");
    } else {
      offsets.x = e.clientX;
      offsets.y = e.clientY;
    }
    if (!snapped && !win.isMaximized()) {
      winSize.width = win.getSize()[0];
      winSize.height = win.getSize()[1];
    }

    var mouseX;
    var mouseY;

    $(window).mousemove(function(event) {
      dragging = true;
      if (!snapped) {
        win.setBounds({
          width: winSize.width,
          height: winSize.height,
          x: event.screenX - offsets.x,
          y: event.screenY - offsets.y
        });
      }

      if (snapped) {
        mouseX = mouseX || event.screenX;
        mouseY = mouseY || event.screenY;
        const deltaX = event.screenX - mouseX;
        const deltaY = event.screenY - mouseY;
        // Add buffer so that screen doesn't unsnap when mouse if moved 1px
        if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 25) {
          snapped = false;
          addBorder();
        }
        unmaximizeWindow(false);
        $(".icon-maximize").show();
        $(".icon-unmaximize").hide();
      }
    });

    $(window).mouseup(function(event) {
        $(window).unbind('mousemove');
        $(window).unbind('mouseup');
        dragging = false;

        //implement custom window snapping
        if (Math.abs(event.screenX - width) < bufferPixels) {
          //right snap
          win.setPosition(width / 2, 0);
          win.setSize(width / 2, height);
          snapped = true;
        } else if (Math.abs(event.screenX - 0) < bufferPixels) {
          //left snap
          win.setPosition(0, 0);
          win.setSize(width / 2, height);
          snapped = true;
        } else if (Math.abs(event.screenY - 0) < bufferPixels) {
          //top snap
          maximizeWindow(false);
          snapped = true;
          removeBorder();
        }
      });
  }
});



$(".ripple").mouseup(function() {
  selectNavbar(true, event);
});

$("#add-tab").click(function() {
  chromeTabs.addTab({
    title: 'New Tab',
    favicon: 'img/default-favicon.png'
  });
});

$("#back").click(function() {
  var webview = getCurrentWebview();
  if (webview.canGoBack()) {
    webview.goBack();
    $('#border-match-width').remove();
  }
});

$("#refresh").click(function() {
  getCurrentWebview().reload();
});

function setupWebview(webviewId) {
  var webview = document.querySelector('webview[tab-id="' + webviewId + '"]');
  webview.addEventListener('close', handleExit);
  webview.addEventListener('did-start-loading', function(e) { handleLoadStart(e, webview) });
  webview.addEventListener('did-stop-loading', handleLoadStop);
  webview.addEventListener('did-fail-load', handleLoadError);
  webview.addEventListener('did-get-redirect-request', handleLoadRedirect);
  webview.addEventListener('did-finish-load', function() { handleLoadCommit(webview) });
  webview.addEventListener('page-title-updated', function(e) { handleTitleUpdate(e, webview) }); //this is when the DOM becomes visible
  webview.addEventListener('enter-html-full-screen', handleEnterHTMLFullscreen);
  webview.addEventListener('leave-html-full-screen', handleLeaveHTMLFullscreen);
  webview.addEventListener('new-window', (e) => {
    //get current tab index
    var i = $('.chrome-tabs .chrome-tab-current').index();

    const protocol = require('url').parse(e.url).protocol
    if (protocol === 'http:' || protocol === 'https:') {
      chromeTabs.addTab({
        title: 'New Tab',
        favicon: 'img/default-favicon.png',
        url: e.url,
        index: i
      });
      $('.ripple-effect').remove();
      $("#location").val(stripURL(e.url));
      // $("#location").css("-webkit-app-region", "drag");
      $("#location").prop('disabled', true);
      if (loadedSettings.navbarAlign === 'center') {
        $("#location").css("transform", "translateX(" + getNavbarOffset() + "px)");
        $("#navbarIcon").css("opacity", "0");
      }
      $('#border-active').remove();
      $('#border-match-width').remove();
      // if ($("#add-tab").hasClass("no-border")) {
      //     $(".ripple").css("border-right", "1px solid transparent");
      // }
    }
  });
  webview.addEventListener('ipc-message', (e) => {
    if (e.channel == "click") {
      $('.ripple-effect').remove();
      console.log("click:" + stripURL(webview.getURL()));
      $("#location").val(stripURL(webview.getURL()));
      // $("#location").css("-webkit-app-region", "drag");
      $("#location").prop('disabled', true);
      if (loadedSettings.navbarAlign === 'center') {
        $("#location").css("transform", "translateX(" + getNavbarOffset() + "px)");
        $("#navbarIcon").css("opacity", "0");
      }
      $('#border-active').remove();
      // if ($("#add-tab").hasClass("no-border")) {
      //     $(".ripple").css("border-right", "1px solid transparent");
      // }
    } else if (e.channel == "href-mouseover") {
      var url = e.args[0];
      var webviewURL = webview.getURL().replace(/\/+$/, "");
      if (url.startsWith("/")) {
        url = webviewURL + url;
      } else if (url.startsWith("#")) {
        url = webviewURL + "/" + url;
      }
      url = processURL(url);
      $("#href-dest").html(url);
      $("#href-dest").show();
    } else if (e.channel == "href-mouseout") {
      $("#href-dest").html();
      $("#href-dest").hide();
    } else if (e.channel == "page-load-progress") {
      const progress = e.args[0];
      const bottomBarWidth = $("#ripple-container").width();
      $('#border-match-width').remove();
      $('<style id="border-match-width">#ripple-container:after { width: ' + (progress / 100 * bottomBarWidth) + 'px; background:#117AF3; transition: width .5s ease, background-color .5s ease;}</style>').appendTo('head');
      if (progress == 100) {
        $('<style id="border-fade-out">#ripple-container:after { width: 100%; background:transparent; transition: background-color .5s ease;}</style>').appendTo('head');
        setTimeout(() => {
          $('#border-match-width').remove();
          $('#border-fade-out').remove();
          $('#border-active').remove();
        }, 500);
        updateNavbarIcon();
      }
    } else if (e.channel == "show-reader") {
      navigateTo("file://" + app.getAppPath() + "\\pages\\reader\\reader.html");
      const article = e.args[0];
      db.articles.add({ title: article.title, byline: article.byline, content: article.content, length: article.length, url: getCurrentWebview().getURL() });
    } else if (e.channel == "show-back-arrow") {
      const percent = e.args[0];
      $("#back-indicator").css("display", "block");
      $("#back-indicator").css("transform", "translateY(-50%) translateX(" + percent + "%)");
    } else if (e.channel == "show-forward-arrow") {
      const percent = e.args[0];
      $("#forward-indicator").css("display", "block");
      $("#forward-indicator").css("transform", "translateY(-50%) translateX(" + - (percent - 100) + "%)");
    } else if (e.channel == "go-back") {
      if (webview.canGoBack()) {
        webview.goBack();
        $('#border-match-width').remove();
      }
    } else if (e.channel == "go-forward") {
      if (webview.canGoForward()) {
        webview.goForward();
        $('#border-match-width').remove();
      }
    } else if (e.channel == "hide-indicators") {
      $("#back-indicator").css("display", "none");
      $("#forward-indicator").css("display", "none");
    } else if (e.channel == "network-online") {
      if (pendingRefreshOnConnect) {
        // timeout is needed because network isn't available immediately
        setTimeout(() => {
          getCurrentWebview().reload();
          pendingRefreshOnConnect = false;
          $("#webview-overlay").css("visibility", "hidden");
        }, 2000);
      }
    }
  });

  window.addEventListener('keydown', handleKeyDown);

  // Test for the presence of the experimental <webview> zoom and find APIs.
  if (typeof(webview.setZoom) == "function" &&
    typeof(webview.find) == "function") {
    var findMatchCase = false;

    // document.querySelector('#find-text').oninput = function(e) {
    // }

    // document.querySelector('#find-text').onkeydown = function(e) {
    //   if (event.ctrlKey && event.keyCode == 13) {
    //     e.preventDefault();
    //     webview.stopFinding('activate');
    //     closeFindBox();
    //   }
    // }

    // document.querySelector('#match-case').onclick = function(e) {
    //   e.preventDefault();
    //   findMatchCase = !findMatchCase;
    //   var matchCase = document.querySelector('#match-case');
    //   if (findMatchCase) {
    //     matchCase.style.color = "blue";
    //     matchCase.style['font-weight'] = "bold";
    //   } else {
    //     matchCase.style.color = "black";
    //     matchCase.style['font-weight'] = "";
    //   }
    //   webview.find(document.forms['find-form']['find-text'].value, { matchCase: findMatchCase });
    // }

    // document.querySelector('#find-backward').onclick = function(e) {
    //   e.preventDefault();
    //   webview.find(document.forms['find-form']['find-text'].value, { backward: true, matchCase: findMatchCase });
    // }

    // document.querySelector('#find-form').onsubmit = function(e) {
    //   e.preventDefault();
    //   webview.find(document.forms['find-form']['find-text'].value, { matchCase: findMatchCase });
    // }
  }
}

onload = function() {
  setupWebview(0);
  doLayout();
};

function navigateTo(url) {
  resetExitedState();
  //select current visible webview
  var webview = getCurrentWebview();
  webview.src = processURL(url);

  $('.ripple-effect').remove();
  // $("#location").css("-webkit-app-region", "drag");
  $("#location").prop('disabled', true);
  if (loadedSettings.navbarAlign === 'center') {
    $("#location").css("transform", "translateX(" + getNavbarOffset() + "px)");
    $("#navbarIcon").css("opacity", "0");
  }
  $('#border-active').remove();
  $('#border-match-width').remove();
  // if ($("#add-tab").hasClass("no-border")) {
  //     $(".ripple").css("border-right", "1px solid transparent");
  // }
}

function processURL(url) {
  var pattern = new RegExp(/[`\^\{}|\\"<> ]/);
  var ipAddress = new RegExp(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(:[0-9]{1,4})?$/);
  var processedURL;
  if (ipAddress.test(url)) {
    //if ip address, add port if necessary
    if (!url.includes(":")) {
      //add default port
      processedURL += ":80";
    }
  }

  if(url.startsWith("about://")) {
    var target = url.split("about://")[1];
    console.log(target);
    switch(target) {
      case "settings":
        processedURL = app.getAppPath() + "\\pages\\settings\\settings.html";
        break;
      case "history":
        processedURL = app.getAppPath() + "\\pages\\history\\history.html";
        break;
    }
    // console.log(processedURL)
  } else if (url.includes("://")) {
    processedURL = url;
  } else if (url.includes(".") && !pattern.test(url)) {
    processedURL = "http://" + url;
  } else if (url.startsWith("localhost")) {
    processedURL = "http://" + url;
  } else {
    processedURL = "https://google.com/search?q=" + url;
  }
  return processedURL;
}

function doLayout() {
  document.querySelectorAll("webview").forEach(function(webview) {
    var controls = document.querySelector('#controls');
    var controlsHeight = controls.offsetHeight;
    var windowWidth = document.documentElement.clientWidth;
    var windowHeight = document.documentElement.clientHeight;
    var webviewWidth = windowWidth;
    var webviewHeight = windowHeight - controlsHeight;

    webview.style.width = webviewWidth + 'px';
    webview.style.height = webviewHeight + 'px';

    var overlayWebview = document.querySelector('#webview-overlay');
    overlayWebview.style.width = webviewWidth + 'px';
    overlayWebview.style.height = webviewHeight + 'px';

    // settings not loaded yet, use callback
    settings.get('navbarAlign', (value) => {
      if (value === 'center' && $(".ripple").find(".ripple-effect").length === 0) {
        $("#navbarIcon").css("opacity", "0");
        $("#location").css("transform", "translateX(" + getNavbarOffset() + "px)");
      }
    });
  });
}

function handleExit(event) {
  console.log(event.type);
  document.body.classList.add('exited');
  if (event.type == 'abnormal') {
    document.body.classList.add('crashed');
  } else if (event.type == 'killed') {
    document.body.classList.add('killed');
  }
}

function resetExitedState() {
  document.body.classList.remove('exited');
  document.body.classList.remove('crashed');
  document.body.classList.remove('killed');
}

ipcRenderer.on('shortcut', function(event, data) {
  if (data.action == "closeTab") {
    chromeTabs.removeTab(el.querySelector('.chrome-tab-current'));
    if ($('#location').val() != "") {
      $('#location').blur();
      $("#location").prop('disabled', true);
      if (loadedSettings.navbarAlign === 'center') {
        $("#navbarIcon").css("opacity", "0");
      }
      // if ($("#add-tab").hasClass("no-border")) {
      //     $(".ripple").css("border-right", "1px solid transparent");
      // }
    }
  } else if (data.action == "reloadPage") {
    //TODO: check if webContents ready; using empty catch is bad practice
    try {
      getCurrentWebview().reload();
    } catch (exp) {

    }
  } else if (data.action == "addTab") {
    chromeTabs.addTab({
      title: 'New Tab',
      favicon: 'img/default-favicon.png'
    });
    // selectNavbar(false, null);
  } else if (data.action == "toggleDevTools") {
    //get current webview
    getCurrentWebview().openDevTools();
  } else if (data.action == "savePage") {
    //if pdf, download
    if (getCurrentWebview().getURL().endsWith(".pdf")) {
      const url = getCurrentWebview().getURL().replace("chrome://pdf-viewer/index.html?src=", "");
      getCurrentWebview().getWebContents().downloadURL(url);
      return;
    }

    var savePath = dialog.showSaveDialog(remote.getCurrentWindow(), {});
    if (savePath) {
      //null if cancelled
      if (!savePath.endsWith('.html')) {
        savePath = savePath + '.html'
      }

      getCurrentWebview().getWebContents().savePage(savePath, 'HTMLComplete', function() {});
    }
  } else if (data.action == "printPage") {
    getCurrentWebview().print();
  } else if (data.action == "viewHistory") {
    navigateTo("file:///" + app.getAppPath() + "\\pages\\history\\history.html");
  } else if (data.action == "viewSettings") {
    navigateTo("file:///" + app.getAppPath() + "\\pages\\settings\\settings.html");
  }
});

remote.getCurrentWebContents().session.on('will-download', (event, item, webContents) => {

  var tempItem = item;
  var downloadState;
  let filePath;
  const filename = tempItem.getFilename();
  const savePath = tempItem.getSavePath();
  const name = path.extname(filename) ? filename : getFilenameFromMime(filename, tempItem.getMimeType());
  filePath = unusedFilename.sync(path.join(dir, name));
  tempItem.setSavePath(filePath);

  var downloadItem = $(downloadItemTemplate);
  downloadItem.find(".download-title").html(tempItem.getFilename());
  var totalBytes = formatBytes(tempItem.getTotalBytes());
  downloadItem.find(".download-details").html("0.0/" + totalBytes);
  $("#download-manager").prepend(downloadItem);
  downloadState = "started";

  //show download bar
  $("#download-manager").show();

  tempItem.on('updated', (event, state) => {
    if (state === 'interrupted') {
      downloadItem.find(".download-details").html("Waiting for network");
      downloadState = "interrupted";
    } else if (state === 'progressing') {
      //TODO: check if object is destroyed; using empty catch is bad practice
      try {
        if (tempItem.isPaused()) {
          downloadItem.find(".download-details").html("Paused");
          downloadState = "paused";
        } else {
          downloadItem.find(".download-details").html(formatBytes(tempItem.getReceivedBytes()) + "/" + totalBytes);
          downloadState = "downloading";
        }
      } catch (err) {

      }
    }
  });

  tempItem.once('done', (event, state) => {
    if (state === 'completed') {
      console.log('Download successfully')
      downloadItem.find(".download-details").html("");
      downloadState = "completed";
    } else {
      if (state == "cancelled") {
        downloadItem.find(".download-details").html("Cancelled");
        //delete file if still exists
        setTimeout(function() {
          if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => { if (err) throw err; });
          }
        }, 10000);
      } else {
        downloadItem.find(".download-details").html(`Download failed: ${state}`);
      }
      downloadState = "failed";
    }
  });

  downloadItem.find(".download-content").click(function() {
    if (downloadState == "downloading") {
      tempItem.pause();
    } else if (downloadState == "paused") {
      tempItem.resume();
    } else if (downloadState == "completed") {
      shell.openItem(savePath);
    }
  });

  downloadItem.find(".download-close").click(function() {
    if (downloadState == "downloading" || downloadState == "paused") {
      tempItem.pause();
      var choice = dialog.showMessageBox(win, {
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Confirm',
        message: 'Cancel current download?'
      });

      if (choice == 0) {
        tempItem.cancel();
      } else {
        tempItem.resume();
        return;
      }
    }

    //remove item from downloads bar
    downloadItem.remove();
    //hide downloads bar
    if ($(".download-item").length == 1) {
      $("#download-manager").hide();
    }
  });

  downloadItem.find(".download-folder").click(function() {
    shell.showItemInFolder(filePath);
  });
});

$(".close-download").click(function() {
  $("#download-manager").hide();
});

// ipcRenderer.on("download", function(event, data){
//   if(data.action == "start"){
//     var downloadItem = $(downloadItemTemplate);
//     downloadItem.find(".download-title").html(data.name);
//     downloadItem.find(".download-details").html("0.0/"+formatBytes(data.totalSize));
//     $("#download-manager").prepend(downloadItem);
//   }else if(data.action == "progress"){

//   }
// });

function handleKeyDown(event) {
  if (event.keyCode == 27) {
    if (win.isFullScreen()) {
      win.setFullScreen(false);
      //TODO: check if webContents ready; using empty catch is bad practice
      try {
        //inject javascript to exit fullscreen
        var id = el.querySelector('.chrome-tab-current').getAttribute("tab-id");
        var webview = document.querySelector('webview[tab-id="' + id + '"]');
        webview.executeJavaScript("document.exitFullscreen?document.exitFullscreen():document.webkitExitFullscreen?document.webkitExitFullscreen():document.mozCancelFullScreen?document.mozCancelFullScreen():document.msExitFullscreen&&document.msExitFullscreen();");
      } catch (err) {
        //no page loaded
      }
      return;
    } else {
      //if navbar selected, deselect
      var selected = getCurrentWebview();
      $('.ripple-effect').remove();
      if ($(".ripple").find(".ripple-effect").length == 0) {
        //TODO: check if webContents ready; using empty catch is bad practice
        try {
          console.log("title update:" + stripURL(selected.getURL()));
          document.querySelector('#location').value = stripURL(selected.getURL());
        } catch (err) {
          document.querySelector('#location').value = stripURL("about:blank");
        }
        // $("#location").css("-webkit-app-region", "drag");
        $("#location").prop('disabled', true);
        if (loadedSettings.navbarAlign === 'center') {
          $("#location").css("transform", "translateX(" + getNavbarOffset() + "px)");
          $("#navbarIcon").css("opacity", "0");
        }
        $('#border-active').remove();
        $('#border-match-width').remove();
        // if ($("#add-tab").hasClass("no-border")) {
        //     $(".ripple").css("border-right", "1px solid transparent");
        // }
      }
    }
  }

  if (event.ctrlKey || event.metaKey) {
    switch (event.keyCode) {
      // Ctrl+F.
      case 70:
        event.preventDefault();
        const search = searchInPage(getCurrentWebview());
        if ($('.electron-in-page-search-window').hasClass('search-active')) {
          console.log('ayy');
          search.closeSearchWindow();
          search.finalize();
        } else {
          search.openSearchWindow();
        }
        break;

        // Ctrl + Y
      case 89: //87 for W
        event.preventDefault();
        chromeTabs.removeTab(el.querySelector('.chrome-tab-current'));
        break;

        // Ctrl++.
      case 107:
      case 187:
        event.preventDefault();
        increaseZoom();
        break;

        // Ctrl+-.
      case 109:
      case 189:
        event.preventDefault();
        decreaseZoom();
    }
  }
}

function handleLoadCommit(webview) {
  resetExitedState();
  setFavicon(webview, webview.getTitle(), webview.getURL());
  var selected = getCurrentWebview();
  //only update location if webview in focus
  if ($(".ripple").find(".ripple-effect").length == 0 && selected == webview) {
    console.log("finish load:" + stripURL(webview.getURL()));
    document.querySelector('#location').value = stripURL(webview.getURL());
    updateNavbarIcon();
    $("#location").prop('disabled', true);
    if (loadedSettings && loadedSettings.navbarAlign === 'center') {
      $("#location").css("transform", "translateX(" + getNavbarOffset() + "px)");
      $("#navbarIcon").css("opacity", "0");
    }
    $('#border-active').remove();
  }
  updateBackButton(webview);

  //update history
  //check if exists; if true, get numVisits
  const protocol = require('url').parse(webview.getURL()).protocol;
  if (protocol == "https:" || protocol == "http:") {
    var fav = "https://www.google.com/s2/favicons?domain=" + stripURL(webview.getURL());
    db.sites.where("url").equalsIgnoreCase(webview.getURL()).first().then(function(site) {
      if (site == null) {
        //doesn't exist, so add
        db.sites.add({ url: webview.getURL(), favicon: fav, title: webview.getTitle(), lastVisit: Date.now(), numVisits: 1 });
      } else {
        db.sites.where("url").equalsIgnoreCase(webview.getURL()).modify({
          url: webview.getURL(),
          favicon: fav,
          title: webview.getTitle(),
          lastVisit: Date.now(),
          numVisits: site.numVisits + 1
        });
      }
    });
  }
}

function handleLoadStart(event, webview) {
  event.preventDefault();
  var url = $(event.target.outerHTML).attr("src");
  if (webview.getURL() == "") {
    setFavicon(webview, url, url);
  }
  document.body.classList.add('loading');
  $('#navbarIcon').html(svgLoading);

  isLoading = true;
  resetExitedState();
  if (!event.isTopLevel) {
    return;
  }
}

function updateNavbarIcon() {
  //update icon if https
  const protocol = require('url').parse(getCurrentWebview().getURL()).protocol
  if (protocol === 'https:') {
    $('#navbarIcon').html(httpsSecure);
  } else if (protocol === 'http:'){
    $('#navbarIcon').html(notSecure);
  } else {
    $('#navbarIcon').html(svgSearch);
  }
}

function handleTitleUpdate(event, webview) {
  setFavicon(webview, webview.getTitle(), webview.getURL());

  let fileContents = fs.readFile("./filters.json", "utf8", (err, data) => {
    if (err) throw err;
    //for each website, check for regex and insert css
    $.each(JSON.parse(data), function(index, val) {
      var pattern = new RegExp(val.url);
      if (pattern.test(webview.getURL()) && val.enabled) {
        //hidden elements
        webview.insertCSS(val.hidden + " { display: none !important } ");
        //custom CSS (if specified)
        webview.insertCSS(val.customCSS);
      }
    })
  });

  var pattern = new RegExp("https?:\/\/(www.)?youtube.com\/watch\\?v=*");

  updateNavbarIcon();

  var selected = getCurrentWebview();
  //only update location if webview in focus
  if ($(".ripple").find(".ripple-effect").length == 0 && selected == webview) {
    console.log("title update:" + stripURL(webview.getURL()));
    document.querySelector('#location').value = stripURL(webview.getURL());
    // $("#location").css("-webkit-app-region", "drag");
    $("#location").prop('disabled', true);
    if (loadedSettings.navbarAlign === 'center') {
      $("#location").css("transform", "translateX(" + getNavbarOffset() + "px)");
      $("#navbarIcon").css("opacity", "0");
    }
    $('#border-active').remove();
    $('#border-match-width').remove();
    // if ($("#add-tab").hasClass("no-border")) {
    //     $(".ripple").css("border-right", "1px solid transparent");
    // }
  }

  updateBackButton(webview);
}

function handleLoadStop(event) {
  // We don't remove the loading class immediately, instead we let the animation
  // finish, so that the spinner doesn't jerkily reset back to the 0 position.
  isLoading = false;
}



function handleLoadError(event) {
  // if error code is valid
  if (errorCodes[event.errorCode] != null) {
    // show error page
    $("#webview-overlay").css("visibility", "visible");
    const innerDoc = $($('#webview-overlay object')[0].contentDocument);
    const currentUrl = getCurrentWebview().getURL();
    innerDoc.find("#title").html(errorCodes[event.errorCode].title);
    innerDoc.find("#description").html(errorCodes[event.errorCode].description.replace("%s", currentUrl));
    innerDoc.find("#error-code").html(event.errorDescription);
    innerDoc.find("#try-again").on('click', () => {
      if (event.errorCode == '-501') { // if trying to connect securely to a site without ssl certificate, use http instead
        navigateTo(currentUrl.replace('https://', 'http://'));
      } else {
        getCurrentWebview().reload()
      }
      $("#webview-overlay").css("visibility", "hidden");
    });
  
    if (errorCodes[event.errorCode].retryOnReconnect) {
      pendingRefreshOnConnect = true;
    }
  }
}

function handleLoadRedirect(event) {
  resetExitedState();
  if (event.newUrl != null) {
    console.log("redirect:" + stripURL(event.newUrl));
    document.querySelector('#location').value = stripURL(event.newUrl);
  }
}

function handleEnterHTMLFullscreen() {
  //hide toolbar
  $("#controls").css("display", "none");
  $("#tab-bar").css("display", "none");
  $("#download-manager").css("display", "none");
}

function handleLeaveHTMLFullscreen() {
  $('#location').css("transition", "none");
  $("#controls").css("display", "");
  console.log(chromeTabs.tabEls.length);
  if (chromeTabs.tabEls.length > 1) {
    $("#tab-bar").css("display", "");
  }

  //todo: if not closed, show downloads
  $("#download-manager").css("display", "")
}

function getNextPresetZoom(zoomFactor) {
  var preset = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2,
    2.5, 3, 4, 5
  ];
  var low = 0;
  var high = preset.length - 1;
  var mid;
  while (high - low > 1) {
    mid = Math.floor((high + low) / 2);
    if (preset[mid] < zoomFactor) {
      low = mid;
    } else if (preset[mid] > zoomFactor) {
      high = mid;
    } else {
      return { low: preset[mid - 1], high: preset[mid + 1] };
    }
  }
  return { low: preset[low], high: preset[high] };
}

function increaseZoom() {
  var webview = document.querySelector('webview');
  webview.getZoom(function(zoomFactor) {
    var nextHigherZoom = getNextPresetZoom(zoomFactor).high;
    webview.setZoom(nextHigherZoom);
  });
}

function decreaseZoom() {
  var webview = document.querySelector('webview');
  webview.getZoom(function(zoomFactor) {
    var nextLowerZoom = getNextPresetZoom(zoomFactor).low;
    webview.setZoom(nextLowerZoom);
  });
}

function loadSettings() {
  //if required, set default settings
  setDefaultSettings();
  loadedSettings = settings.list;

  settings.get('downloadsDirectory', (value) => {
    if (value == '') {
      //if not set, set to default downloads folder
      settings.set('downloadsDirectory', app.getPath('downloads'));
    }
    dir = (value != "") ? value : app.getPath('downloads');
  });

  settings.get('theme', (value) => {
    if (value == 'dark') {
      $('head').append('<link rel="stylesheet" href="css/darkmode.css" type="text/css" />');
      if (el.classList.contains('chrome-tabs-dark-theme')) {
        document.documentElement.classList.remove('dark-theme')
        el.classList.remove('chrome-tabs-dark-theme')
      } else {
        document.documentElement.classList.add('dark-theme')
        el.classList.add('chrome-tabs-dark-theme')
      }
    }
  });

  settings.get('controlsStyle', (value) => {
    switch(value) {
      case "mac":
        $(".titlebar-windows").hide();
        $(".titlebar-mac").show();
        break;
      case "windows":
        $(".titlebar-windows").show();
        $(".titlebar-mac").hide();
        break;
      default:
        if (process.platform === "win32") {
          $(".titlebar-windows").show();
          $(".titlebar-mac").hide();
        } else {
          $(".titlebar-windows").hide();
          $(".titlebar-mac").show();
        }
    }
  });

  doLayout();
}

function setDefaultSettings() {
  const length = Object.keys(settings.list).length;
  if (length == 0) {
    for (var key in defaultSettings) {
      settings.set(key, defaultSettings[key]);
    }
  }
}

function setFavicon(webview, title, url) {
  let fav;
  const protocol = require('url').parse(url).protocol
  if (protocol === 'http:' || protocol === 'https:') {
    fav = "https://www.google.com/s2/favicons?domain=" + stripURL(url);
  } else {
    fav = "img/default-favicon.png";
  }

  var tabProperties = { title: title, favicon: fav };
  var id = webview.getAttribute("tab-id");
  chromeTabs.updateTab(el.querySelector('.chrome-tab[tab-id="' + id + '"]'), tabProperties);
}

function extractHostname(url) {
  var hostname;
  //find & remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf("://") > -1) {
    hostname = url.split('/')[2];
  } else {
    hostname = url.split('/')[0];
  }

  //find & remove port number
  hostname = hostname.split(':')[0];
  //find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
}

function stripURL(url) {
  if (url.startsWith("about:blank")) {
    document.documentElement.classList.add('home');
    if ($(".ripple").find(".ripple-effect").length == 0) {
      $("#navbarIcon").html(svgSearch);
      return "Search or enter address";
    } else {
      return "";
    }
  } else {
    document.documentElement.classList.remove('home');
    $(getCurrentWebview()).css('background', '');
  }

  //if ip address, don't strip
  var ipAddress = new RegExp(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(:[0-9]{1,4})?$/);
  if (ipAddress.test(extractHostname(url))) {
    return extractHostname(url);
  }

  //if pdf or file, leave file name
  if (url.startsWith("chrome://pdf-viewer/index.html?src=") || url.startsWith("file:///")) {
    return decodeURI(url.split("/")[url.split("/").length - 1]);
  }

  //if search, leave search term


  var domain = extractHostname(url),
    splitArr = domain.split('.'),
    arrLen = splitArr.length;

  //extracting the root domain here
  //if there is a subdomain
  if (arrLen > 2) {
    domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
    //check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
    if (splitArr[arrLen - 2].length == 2 && splitArr[arrLen - 1].length == 2) {
      //this is using a ccTLD
      domain = splitArr[arrLen - 3] + '.' + domain;
    }
  }
  return domain;
}

function getCurrentWebview() {
  var tabId = el.querySelector('.chrome-tab-current').getAttribute("tab-id");
  return document.querySelector('webview[tab-id="' + tabId + '"]');
}

function getCurrentUrl() {
  return $("#location").val();
}

function getNavbarOffset() {
  var controls_x = document.querySelector("#controls").getBoundingClientRect().right / 2;
  var location_x = document.querySelector("#location-form").getBoundingClientRect().left;
  var text_width = $("#location").textWidth() / 2;
  if (text_width == 0) {
    $("#location").val("Search or enter address");
    text_width = $("#location").textWidth() / 2;
  }
  var offset_width = controls_x - location_x - text_width;

  return offset_width;
}

function updateBackButton(webview) {
  if (webview.canGoBack()) {
    $("#back").prop("disabled", false);
  } else {
    if (!$("#back").is(":disabled")) {
      $("#back").prop("disabled", true);
    }
  }
}

function removeBorder() {
  document.documentElement.classList.remove('border')
}

function addBorder() {
  if (process.platform !== "win32" && process.platform !== "darwin") {
    document.documentElement.classList.add('border')
  }
}

$.fn.textWidth = function(text, font) {
  if (!$.fn.textWidth.fakeEl) $.fn.textWidth.fakeEl = $('<span>').hide().appendTo(document.body);
  $.fn.textWidth.fakeEl.text(text || this.val() || this.text()).css('font', font || this.css('font'));
  return $.fn.textWidth.fakeEl.width();
};

function selectNavbar(animate, event) {
  if (animate) {
    $('#location').css("transition", "transform 0.5s");
  } else {
    $('#location').css("transition", "transform 0s");
  }
  if ($(".ripple").find(".ripple-effect").length == 0 && !dragging) {
    var $div = $('<div/>');
    var btnOffset = $(".ripple").offset();
    var xPos, yPos;
    if (event != null) {
      event.preventDefault();
      xPos = event.pageX - btnOffset.left;
      yPos = event.pageY - btnOffset.top;
    } else {
      xPos = 0;
      yPos = 0;
    }

    $div.addClass('ripple-effect');
    var $ripple = $(".ripple-effect");

    $ripple.css("height", $(this).height());
    $ripple.css("width", $(this).height());

    if (!animate) {
      $div.css({ animation: "ripple-animation 0s", animationFillMode: "forwards" });
    }

    $div.css({
        top: yPos - ($ripple.height() / 2),
        left: xPos - ($ripple.width() / 2),
        background: $(".ripple").data("ripple-color")
      })
      .appendTo($("#location-form"));
    $("#location").css("transform", "translateX(0%)");
    // $("#location").css("-webkit-app-region", "no-drag");
    $("#location").prop('disabled', false);
    $("#navbarIcon").css("opacity", "1");
    if (loadedSettings.theme == 'dark') {
      $('<style id="border-active">#ripple-container:before, #add-tab-container:after{background:#222222}</style>').appendTo('head');
    } else if (loadedSettings.theme == 'light') {
      $('<style id="border-active">#ripple-container:before, #add-tab-container:after{background:#dedede}</style>').appendTo('head');
    }

    var webview = getCurrentWebview();
    if ($('#location').val() == "Search or enter address") {
      $('#location').val("");
    } else {
      $('#location').val(webview.getURL());
    }
    $("#location").select();
  }
}

function formatBytes(bytes, decimals) {
  if (bytes == 0) return '0 Bytes';
  var k = 1024,
    dm = decimals || 2,
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFilenameFromMime(name, mime) {
  const exts = extName.mime(mime);
  if (exts.length !== 1) {
    return name;
  }

  return `${name}.${exts[0].ext}`;
}

//svgs
const svgSearch = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M23.822 20.88l-6.353-6.354c.93-1.465 1.467-3.2 1.467-5.059.001-5.219-4.247-9.467-9.468-9.467s-9.468 4.248-9.468 9.468c0 5.221 4.247 9.469 9.468 9.469 1.768 0 3.421-.487 4.839-1.333l6.396 6.396 3.119-3.12zm-20.294-11.412c0-3.273 2.665-5.938 5.939-5.938 3.275 0 5.94 2.664 5.94 5.938 0 3.275-2.665 5.939-5.94 5.939-3.274 0-5.939-2.664-5.939-5.939z"/></svg>';
const svgBookmark = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/></svg>';
const svgSettings = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M24 14v-4h-3.23c-.229-1.003-.624-1.94-1.156-2.785l2.286-2.286-2.83-2.829-2.286 2.286c-.845-.532-1.781-.928-2.784-1.156v-3.23h-4v3.23c-1.003.228-1.94.625-2.785 1.157l-2.286-2.286-2.829 2.828 2.287 2.287c-.533.845-.928 1.781-1.157 2.784h-3.23v4h3.23c.229 1.003.624 1.939 1.156 2.784l-2.286 2.287 2.829 2.829 2.286-2.286c.845.531 1.782.928 2.785 1.156v3.23h4v-3.23c1.003-.228 1.939-.624 2.784-1.156l2.286 2.286 2.828-2.829-2.285-2.286c.532-.845.928-1.782 1.156-2.785h3.231zm-12 2c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z"/></svg>';
const svgArrowLeft = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M16.67 0l2.83 2.829-9.339 9.175 9.339 9.167-2.83 2.829-12.17-11.996z"/></svg>';
const svgArrowRight = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M7.33 24l-2.83-2.829 9.339-9.175-9.339-9.167 2.83-2.829 12.17 11.996z"/></svg>';
const notSecure = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 10v-4c0-3.313-2.687-6-6-6s-6 2.687-6 6v3h2v-3c0-2.206 1.794-4 4-4s4 1.794 4 4v4h-4v14h18v-14h-12z"/></svg>';
const httpsSecure = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#28C940" d="M18 10v-4c0-3.313-2.687-6-6-6s-6 2.687-6 6v4h-3v14h18v-14h-3zm-10 0v-4c0-2.206 1.794-4 4-4s4 1.794 4 4v4h-8z"/></svg>';
const svgRefresh = '<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 41 41" style="enable-background:new 0 0 41 41;" xml:space="preserve"> <path class="st0" d="M19.5,7c-9.3,0.5-16.6,8.5-16,18.1c0.5,8.5,7.5,15.4,16,15.9c9.8,0.5,17.9-7.3,17.9-17h-6 c0,6.5-5.6,11.7-12.3,10.9c-4.9-0.6-9-4.5-9.6-9.4c-0.9-6.4,3.8-11.9,9.9-12.5v6.8l9.9-9.9l-9.9-9.9V7z"/></svg>';
const svgAdd = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M24 10h-10v-10h-4v10h-10v4h10v10h4v-10h10z"/></svg>';
const svgLoading= '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M18.513 7.119c.958-1.143 1.487-2.577 1.487-4.036v-3.083h-16v3.083c0 1.459.528 2.892 1.487 4.035l3.086 3.68c.567.677.571 1.625.009 2.306l-3.13 3.794c-.936 1.136-1.452 2.555-1.452 3.995v3.107h16v-3.107c0-1.44-.517-2.858-1.453-3.994l-3.13-3.794c-.562-.681-.558-1.629.009-2.306l3.087-3.68zm-4.639 7.257l3.13 3.794c.652.792.996 1.726.996 2.83h-1.061c-.793-2.017-4.939-5-4.939-5s-4.147 2.983-4.94 5h-1.06c0-1.104.343-2.039.996-2.829l3.129-3.793c1.167-1.414 1.159-3.459-.019-4.864l-3.086-3.681c-.66-.785-1.02-1.736-1.02-2.834h12c0 1.101-.363 2.05-1.02 2.834l-3.087 3.68c-1.177 1.405-1.185 3.451-.019 4.863z"/></svg>';
const svgBackIndicator = '<img src="img/back.svg">';
const svgForwardIndicator = '<img src="img/forward.svg">';

$('#navbarIcon').html(svgSearch);
$('#bookmark').html(svgBookmark);
$('#settings').html(svgSettings);
$('#back').html(svgArrowLeft);
$('#refresh').html(svgRefresh);
$('#add-tab').html(svgAdd);
$('#back-indicator').html(svgBackIndicator);
$('#forward-indicator').html(svgForwardIndicator);
// $('#forward').html(svgArrowRight);
