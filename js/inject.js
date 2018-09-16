const { ipcRenderer } = require('electron');
const pace = require('../vendor/pace.min.js');
const Readability = require('../vendor/Readability.js');
const url = require('url');
const maxThreshold = 6;
// 3 for Mac
const vertScrollThreshold = 3;
var threshold = maxThreshold
var timer = null;

document.addEventListener('mouseup', function(event) {
  ipcRenderer.sendToHost("click");
});

pace.start();
const protocol = url.parse(window.location.href).protocol;
var scrollActive = false;
var indicatorStatus = "hidden";
pace.on("update", function(percent) {
  if (protocol == "https:" || protocol == "http:") {
    // some websites never fully load
    if (percent > 98) {
      ipcRenderer.sendToHost("page-load-progress", 100);
      pace.stop();
    } else {
      ipcRenderer.sendToHost("page-load-progress", percent);
    }
  } else {
    ipcRenderer.sendToHost("page-load-progress", 0);
  }
});

//disable youtube autoplay
// document.addEventListener("yt-navigate-finish", function() {
//   waitForElementToDisplay("paper-toggle-button#toggle", 1000, function() {
//     var autoplayButton = document.querySelector("paper-toggle-button#toggle");
//     console.log(autoplayButton.getAttribute("checked"));
//     if (autoplayButton.getAttribute("checked") == "") {
//       autoplayButton.click();
//     }
//   });

//   waitForElementToDisplay("ytd-topbar-logo-renderer#logo", 1000, function() {
//     document.querySelector("ytd-topbar-logo-renderer#logo").removeAttribute("use-yoodle")
//   });
// });

// document.addEventListener("yt-navigate-start", function() {
//   location.reload();
// });

function waitForElementToDisplay(selector, time, callback) {
  if (document.querySelector(selector) != null) {
    callback();
    return;
  } else if (!loaded) {
    setTimeout(function() { waitForElementToDisplay(selector, time, callback); }, time);
  }
};

document.addEventListener("DOMContentLoaded", function() {
  loaded = true;
  // var docClone = document.cloneNode(true);
  // const article = new Readability(docClone).parse();
  // if (article && article.title && article.byline) {
  //   ipcRenderer.sendToHost("show-reader", article);
  // }
});

window.addEventListener('online', function () {
  ipcRenderer.sendToHost("network-online");
});

document.addEventListener("mousemove", function(e) {
  // console.log(e.target.contains())
  var x = e.target;
  var found = false;
  if (x.hasAttribute("href")) {
    found = true;
  } else {
    while (x = x.parentElement) {
      if (x == null) break;
      if (x.hasAttribute("href")) {
        found = true;
        break;
      }
    }
  }

  if (found) {
    ipcRenderer.sendToHost("href-mouseover", x.getAttribute("href"));
  } else {
    ipcRenderer.sendToHost("href-mouseout");
  }
});

// custom event detection for two finger swipe to go back
document.addEventListener("wheel", function(e) {
  if (indicatorStatus == "hidden" && Math.abs(e.wheelDeltaY) >= vertScrollThreshold) {
    scrollActive = true;
  }

  if (window.pageXOffset === 0) {
    if (!scrollActive) {
      threshold = threshold - e.wheelDeltaX * 0.01
      if (threshold < maxThreshold && indicatorStatus != "forward") {
        var percent = -(threshold / maxThreshold) * 100
        percent = percent < -100 ? -100 : percent
        percent = percent > 0 ? 0 : percent
        ipcRenderer.sendToHost("show-back-arrow", percent);
        indicatorStatus = "back";
      } else if (indicatorStatus != "back") {
        var percent = ((threshold - maxThreshold) / maxThreshold) * 100
        percent = percent > 100 ? 100 : percent
        percent = percent < 0 ? 0 : percent
        ipcRenderer.sendToHost("show-forward-arrow", percent);
        indicatorStatus = "forward";
      }
    }
  } else {
    scrollActive = true;
  }

  if (timer !== null) {
    clearTimeout(timer);
  }
  timer = setTimeout(function() {
    if (threshold <= 0) {
      ipcRenderer.sendToHost("go-back");
    } else if (threshold - maxThreshold > maxThreshold) {
      ipcRenderer.sendToHost("go-forward");
    }
    threshold = maxThreshold;
    scrollActive = false;
    indicatorStatus = "hidden";
    ipcRenderer.sendToHost("hide-indicators");
  }, 150);
});

//press backwards key to go back in history; taken from https://github.com/j-delaney/back-to-backspace
const tagBlacklist = [
  'input',
  'textarea',
  'select',
  'option',
  'datalist',
  'keygen'
];

document.addEventListener("keydown", function(event) {
  // Check if key pressed was backspace.
  if (event.key === "Backspace" || event.keyCode == 8) {
    // Get the active element.
    // Check to see if the user has focus on a blacklisted element.
    console.log(document.activeElement.nodeName);
    if (tagBlacklist.indexOf(document.activeElement.nodeName.toLowerCase()) === -1 &&
      document.activeElement.contentEditable !== "true" &&
      document.activeElement.contentEditable !== "plaintext-only") {
      // If backspace is pressed on a site like Google Search, Google
      // will move the focus to the input field. Causing you to see
      // the last character of the input field to be removed before
      // going back (or forward) a page.
      // This disables that behavior.
      event.stopImmediatePropagation();

      // Go forward in history if the shift key is being held down.
      // Go backwards in history if the shift key is not being held down.
      history.go(event.shiftKey ? 1 : -1);
    }
  }
}, true);
