const { ipcRenderer } = require('electron');
var loaded = false;

document.addEventListener('click', function(event) {
  ipcRenderer.sendToHost("click");
});

//disable youtube autoplay
document.addEventListener("yt-navigate-finish", function() {
  waitForElementToDisplay("paper-toggle-button#toggle", 1000, function() {
    var autoplayButton = document.querySelector("paper-toggle-button#toggle");
    console.log(autoplayButton.getAttribute("checked"));
    if (autoplayButton.getAttribute("checked") == "") {
      autoplayButton.click();
    } else {}
  });

  waitForElementToDisplay("ytd-topbar-logo-renderer#logo", 1000, function() {
    document.querySelector("ytd-topbar-logo-renderer#logo").removeAttribute("use-yoodle")
  });
});

document.addEventListener("yt-navigate-start", function() {
  location.reload();
});

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