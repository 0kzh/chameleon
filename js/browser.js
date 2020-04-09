const path = require('path')
const unusedFilename = require('unused-filename')
const Config = require('electron-config')
const config = new Config()

const {
  ipcRenderer,
  shell,
  screen,
  clipboard
} = window.require('electron')
const {
  dialog
} = window.require('electron').remote
const app = window.require('electron').remote.app
const searchInPage = require('electron-in-page-search').default
const fs = require('fs')
const {
  Menu
} = remote

window.onresize = doLayout
var el = document.querySelector('.chrome-tabs')
var chromeTabs = new ChromeTabs()
var win = remote.getCurrentWindow()
var dragging = false
var offsets = {
  x: 0,
  y: 0
}
var winSize = {
  width: win.getSize()[0],
  height: win.getSize()[1]
}
const {
  width,
  height
} = remote.screen.getPrimaryDisplay().workAreaSize
const bufferPixels = 5
var snapped = false
var counter = 0
var oobTimer
var pendingRefreshOnConnect
var pendingReload = false
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
                              </div>`
const defaultSettings = {
  theme: 'light',
  controlsStyle: 'auto',
  downloadsDirectory: app.getPath('downloads'),
  navbarAlign: 'left',
  tabMoveConfirmation: true
}
let loadedSettings

// load settings
settings.onLoad(loadSettings)

wins = config.get('state')
console.log(wins)

addBorder()

chromeTabs.init(el, {
  tabOverlapDistance: 14,
  minWidth: 45,
  maxWidth: 248
})

const preloadURL = remote.getGlobal('draggingTab').url

if (preloadURL) {
  chromeTabs.addTab({
    title: 'New Tab',
    favicon: 'img/default-favicon.png',
    url: preloadURL
  })
  $('#ripple-container').css('clip-path', '')
  $('#location').val(stripURL(preloadURL))
  $('#location').prop('disabled', true)

  remote.getGlobal('draggingTab').url = null
} else {
  // don't load page
  chromeTabs.addTab({
    title: 'New Tab',
    favicon: 'img/default-favicon.png',
    url: remote.getGlobal('draggingTab').url ? remote.getGlobal('draggingTab').url : null
  })
}

// setup webview
setupWebview(0)

if ($('.download-item:not(.last)').length == 0) {
  $('#download-manager').hide()
}

function scrollHorizontally (e) {
  e = window.event || e
  var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)))
  document.getElementById('download-manager').scrollLeft -= (delta * 20) // Multiplied by 40
  e.preventDefault()
}

if (document.getElementById('download-manager').addEventListener) {
  // IE9, Chrome, Safari, Opera
  document.getElementById('download-manager').addEventListener('mousewheel', scrollHorizontally, false)
  // Firefox
  document.getElementById('download-manager').addEventListener('DOMMouseScroll', scrollHorizontally, false)
} else {
  // IE 6/7/8
  document.getElementById('download-manager').attachEvent('onmousewheel', scrollHorizontally)
}

document.querySelector('#location-form').onsubmit = function (e) {
  e.preventDefault()
  // special redirects
  $('#ripple-container').hide()
  navigateTo(document.querySelector('#location').value)
}

document.addEventListener('tabAdd', function (e) {
  setupWebview(e.detail.tabId)
})

document.addEventListener('activeTabChange', function (e) {
  var webview = document.querySelector('webview[tab-id="' + e.detail.tabEl.getAttribute('tab-id') + '"]')
  changeNavbarColor(false, false)

  try {
    // if page loaded, set omnibar url
    console.log('tab change:' + stripURL(webview.getURL()))
    document.querySelector('#location').value = stripURL(webview.getURL())
  } catch (err) {
    // no page loaded
    document.querySelector('#location').value = stripURL('about:blank')
  }

  // TODO: check if webContents ready; using empty catch is bad practice
  try {
    updateBackButton(webview)
  } catch (err) {

  }

  if (loadedSettings.navbarAlign === 'center') {
    $('#location').css('transition', 'none')
    $('#location').css('transform', 'translateX(' + getNavbarOffset() + 'px)')
    $('#navbarIcon').css('opacity', '0')
  }
})

document.addEventListener('openOmnibar', function (e) {
  selectNavbar(true, e)
})

document.addEventListener('closeWindow', function (e) {
  window.close()
})

function maximizeWindow (fullscreen) {
  if (process.platform === 'darwin' && fullscreen) {
    win.setFullScreen(true)
  } else {
    win.maximize()
    snapped = true
  }
  removeBorder()
  $('.icon-unmaximize').show()
  $('.icon-maximize').hide()
}

function unmaximizeWindow (fullscreen) {
  if (process.platform === 'darwin' && fullscreen) {
    win.setFullScreen(false)
  } else {
    win.unmaximize()
  }
  addBorder()
  $('.icon-unmaximize').hide()
  $('.icon-maximize').show()
}

// titlebar actions
$('.titlebar-close, .close').click(function () {
  win.close()
})

$('.titlebar-minimize, .minimize').click(function () {
  win.minimize()
})

$('.titlebar-fullscreen, .maximize').click(function () {
  if (win.isMaximized()) {
    unmaximizeWindow(true)
  } else {
    maximizeWindow(true)
  }
})

$('.titlebar-mac').dblclick(function () {
  if (win.isMaximized()) {
    unmaximizeWindow(true)
  } else {
    maximizeWindow(true)
  }
})

$('.titlebar').mousedown(function (e) {
  if (Math.abs(win.getSize()[0] - width) < bufferPixels || Math.abs(win.getSize()[1] - height) < bufferPixels) {
    // if maximized, take percentage offset
    offsets.x = Math.ceil(e.clientX * (winSize.width / width))
    offsets.y = Math.ceil(e.clientY * (winSize.height / height))
    $('#location').css('transition', 'transform 0s')
  } else {
    offsets.x = e.clientX
    offsets.y = e.clientY
  }
  if (!snapped && !win.isMaximized()) {
    winSize.width = win.getSize()[0]
    winSize.height = win.getSize()[1]
  }

  var mouseX
  var mouseY

  $(document).mousemove(function (event) {
    dragging = true
    if (!snapped) {
      win.setBounds({
        width: winSize.width,
        height: winSize.height,
        x: event.screenX - offsets.x,
        y: event.screenY - offsets.y
      })
    }

    if (snapped) {
      mouseX = mouseX || event.screenX
      mouseY = mouseY || event.screenY
      const deltaX = event.screenX - mouseX
      const deltaY = event.screenY - mouseY
      // Add buffer so that screen doesn't unsnap when mouse if moved 1px
      if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 25) {
        snapped = false
        addBorder()
      }
      unmaximizeWindow(false)
      $('.icon-maximize').show()
      $('.icon-unmaximize').hide()
    }
  })

  $(window).mouseup(function (event) {
    $(document).unbind('mousemove')
    $(document).unbind('mouseup')
    dragging = false

    // implement custom window snapping
    if (Math.abs(event.screenX - width) < bufferPixels) {
      // right snap
      win.setPosition(width / 2, 0)
      win.setSize(width / 2, height)
      snapped = true
    } else if (Math.abs(event.screenX - 0) < bufferPixels) {
      // left snap
      win.setPosition(0, 0)
      win.setSize(width / 2, height)
      snapped = true
    } else if (Math.abs(event.screenY - 0) < bufferPixels) {
      // top snap
      maximizeWindow(false)
      snapped = true
      removeBorder()
    }
  })
})

function handleClick () {
  $('#ripple-container').css('clip-path', '')
  webview = getCurrentWebview()
  console.log('click:' + stripURL(webview.getURL()))
  $('#location').val(stripURL(webview.getURL()))
  // $("#location").css("-webkit-app-region", "drag");
  $('#location').prop('disabled', true)
  if (loadedSettings.navbarAlign === 'center') {
    $('#location').css('transform', 'translateX(' + getNavbarOffset() + 'px)')
    $('#navbarIcon').css('opacity', '0')
  }
  $('#ripple-container').hide()
  $('body').off('click', '.chrome-tab')
}

$(document).mouseleave(function () {
  $('#href-dest').hide()
})

$('#add-tab').click(function () {
  chromeTabs.addTab({
    title: 'New Tab',
    favicon: 'img/default-favicon.png'
  })
  selectNavbar(false, null)
})

$('#back').click(function () {
  var webview = getCurrentWebview()
  if (webview.canGoBack()) {
    webview.goBack()
  }
})

$('#refresh').click(function () {
  getCurrentWebview().reload()
})

$(document).on('dragenter', function (e) {
  e.preventDefault()
  const windowID = remote.getCurrentWindow().id
  const status = remote.getGlobal('draggingTab').status
  console.log('enter:' + status)
  // if a tab is being dragged to a different window and a new tab isn't created yet
  console.log(windowID != remote.getGlobal('draggingTab').originWindowID)
  if (windowID != remote.getGlobal('draggingTab').originWindowID) {
    if (status == 'exited' || status == 'dragging') {
      console.log('new tab')
      remote.getGlobal('draggingTab').status = 'entered'
      var i = $('.chrome-tabs .chrome-tab-current').index()
      chromeTabs.addTab({
        title: remote.getGlobal('draggingTab').title,
        favicon: remote.getGlobal('draggingTab').favicon,
        url: remote.getGlobal('draggingTab').url,
        index: i
      })

      remote.getGlobal('draggingTab').createdTab = windowID

      var event = new MouseEvent('dragstart', {
        view: window,
        bubbles: true,
        cancelable: true,
        screenX: screen.getCursorScreenPoint().x,
        screenY: screen.getCursorScreenPoint().y,
        clientX: getClientPos().x,
        clientY: getClientPos().y
      })

      setTimeout(() => {
        document.querySelector('.chrome-tab-current').dispatchEvent(event)
      }, 100)
    }
  } else {
    if (status === 'exited') {
      remote.getGlobal('draggingTab').status = 'dragging'
    }
  }

  counter++
  $(this).addClass('in-bounds')

  // mouse re-entered
  if (counter === 1) {
    $('.is-dragging').animate({
      top: 0
    }, 'fast')
    // remote.getGlobal('draggingTab').status = "returned"
  }
})

$(document).on('dragleave', function (e) {
  counter--

  clearInterval(oobTimer)
  oobTimer = setTimeout(() => {
    if (counter == 0 && !isMouseInWindow()) {
      // drag tab to new window
      const status = remote.getGlobal('draggingTab').status
      if (status == 'entered') {
        ipcRenderer.send('broadcast', 'removetab')
      }
      remote.getGlobal('draggingTab').status = 'exited'

      remote.getGlobal('draggingTab').url = getCurrentWebview().getURL()
      remote.getGlobal('draggingTab').title = getCurrentWebview().getTitle()
      remote.getGlobal('draggingTab').favicon = 'https://www.google.com/s2/favicons?domain=' + stripURL(getCurrentWebview().getURL())
      $(this).removeClass('in-bounds')
      $('.is-dragging').animate({
        top: -50
      }, 'fast')
    }
  }, 100)
})

$(window).on('dragend', function () {
  const status = remote.getGlobal('draggingTab').status

  if (status == 'entered' || status == 'exited') {
    const options = {
      type: 'question',
      buttons: ['Cancel', 'Yes'],
      defaultId: 0,
      title: 'Refresh Tab',
      message: 'Moving this tab to another window will refresh the page. Are you sure you want to do this?',
      checkboxLabel: 'Do not show this message again',
      checkboxChecked: false
    }

    settings.get('tabMoveConfirmation', (shouldShow) => {
      if (pendingReload || shouldShow == false) {
        if (status == 'exited') {
          ipcRenderer.send('open-window', false)
        } else if (status == 'entered') {
          ipcRenderer.send('broadcast', 'dragend')
        }

        chromeTabs.removeTab(el.querySelector('.chrome-tab-current'))
      } else {
        dialog.showMessageBox(null, options, (response, checkboxChecked) => {
          if (response == 0) {
            $('.chrome-tab-current').animate({
              top: 0
            }, 'fast')
            if (status == 'entered') {
              ipcRenderer.send('broadcast', 'removetab')
            }
          } else if (response == 1) {
            if (status == 'exited') {
              ipcRenderer.send('open-window', false)
            } else if (status == 'entered') {
              ipcRenderer.send('broadcast', 'dragend')
            }

            chromeTabs.removeTab(el.querySelector('.chrome-tab-current'))
          }

          if (response == 1 && checkboxChecked) {
            // save response
            settings.set('tabMoveConfirmation', false)
            pendingReload = true
          }
        })
      }
    })
  }

  // reset variables
  remote.getGlobal('draggingTab').status = null
  remote.getGlobal('draggingTab').offset = 0
  remote.getGlobal('draggingTab').title = null
  remote.getGlobal('draggingTab').favicon = null

  clearInterval(oobTimer)
})

function setupWebview (webviewId) {
  var webview = document.querySelector('webview[tab-id="' + webviewId + '"]')

  webview.addEventListener('close', handleExit)
  webview.addEventListener('did-start-loading', function (e) {
    handleLoadStart(e, webview)
  })
  webview.addEventListener('did-stop-loading', handleLoadStop)
  webview.addEventListener('did-fail-load', handleLoadError)
  webview.addEventListener('did-get-redirect-request', handleLoadRedirect)
  webview.addEventListener('did-finish-load', function () {
    handleLoadCommit(webview)
  })
  webview.addEventListener('page-title-updated', function (e) {
    handleTitleUpdate(e, webview)
  }) // this is when the DOM becomes visible
  webview.addEventListener('enter-html-full-screen', handleEnterHTMLFullscreen)
  webview.addEventListener('leave-html-full-screen', handleLeaveHTMLFullscreen)
  webview.addEventListener('new-window', (e) => {
    // get current tab index
    var i = $('.chrome-tabs .chrome-tab-current').index()

    const protocol = require('url').parse(e.url).protocol
    if (protocol === 'http:' || protocol === 'https:') {
      chromeTabs.addTab({
        title: 'New Tab',
        favicon: 'img/default-favicon.png',
        url: e.url,
        index: i
      })
      $('#ripple-container').css('clip-path', '')
      $('#location').val(stripURL(e.url))
      // $("#location").css("-webkit-app-region", "drag");
      $('#location').prop('disabled', true)
      if (loadedSettings.navbarAlign === 'center') {
        $('#location').css('transform', 'translateX(' + getNavbarOffset() + 'px)')
        $('#navbarIcon').css('opacity', '0')
      }
    }
  })

  webview.addEventListener('ipc-message', (e) => {
    if (e.channel == 'click') {
      handleClick()
    } else if (e.channel == 'mousemove' || e.channel == 'dragover' || e.channel == 'mouseup' || e.channel == 'dragend' || e.channel == 'dragenter' || e.channel == 'dragleave') {
      if (e.channel == 'mousemove') {
        e.args[0] = e.args[0] + win.getBounds().x
        e.args[1] = e.args[1] + win.getBounds().y + $('#controls').height()
      }

      if (e.args[0] != null && e.args[1] != null) {
        var event = new MouseEvent(e.channel, {
          view: window,
          bubbles: true,
          cancelable: true,
          screenX: e.args[0],
          screenY: e.args[1],
          clientX: e.args[2],
          clientY: e.args[3]
        })

        if (win.isFocused()) {
          document.dispatchEvent(event)
        }
      }
    } else if (e.channel == 'webview-context-menu') {
      var href = e.args[0]
      var src = e.args[1]
      var selection = e.args[2]
      var cutpaste = e.args[3]
      var point = e.args[4]

      const hasText = selection != ''

      const defaultActions = {
        cut: decorateMenuItem({
          id: 'cut',
          label: 'Cut',
          enabled: cutpaste && hasText,
          visible: cutpaste && hasText,
          click (menuItem) {
            clipboard.writeText(selection)
            webview.delete()
          }
        }),
        copy: decorateMenuItem({
          id: 'copy',
          label: 'Copy',
          enabled: hasText,
          visible: hasText,
          click (menuItem) {
            clipboard.writeText(selection)
          }
        }),
        paste: decorateMenuItem({
          id: 'paste',
          label: 'Paste',
          enabled: cutpaste,
          visible: cutpaste,
          click (menuItem) {
            const clipboardContent = clipboard.readText()
            webview.insertText(clipboardContent)
          }
        }),
        inspect: () => ({
          id: 'inspect',
          label: 'Inspect Element',
          enabled: true,
          click () {
            webview.inspectElement(point.x, point.y)
          }
        }),
        separator: () => ({
          type: 'separator'
        }),
        saveImage: decorateMenuItem({
          id: 'save',
          label: 'Save Image',
          visible: src != '',
          click (menuItem) {
            getCurrentWebview().getWebContents().downloadURL(src)
          }
        }),
        saveImageAs: decorateMenuItem({
          id: 'saveImageAs',
          label: 'Save Image As...',
          visible: src != '',
          click (menuItem) {
            const fileName = src.replace(/^.*[\\\/]/, '')
            const validFilename = new RegExp(/^[a-z0-9_.@()-]+\.[a-z0-9_.@()-]+$/)
            dialog.showSaveDialog(null, {
              defaultPath: validFilename.test(fileName) ? fileName : null
            }, (path) => {
              ipcRenderer.send('set-save-image-path', path)
              getCurrentWebview().getWebContents().downloadURL(src)
            })
          }
        }),
        copyLink: decorateMenuItem({
          id: 'copyLink',
          label: 'Copy Link',
          visible: href != '',
          click (menuItem) {
            clipboard.write(href)
          }
        }),
        copyImageAddress: decorateMenuItem({
          id: 'copyImageAddress',
          label: 'Copy Image Address',
          visible: src != '',
          click (menuItem) {
            clipboard.write(src)
          }
        })
      }

      let menuTemplate = [
        defaultActions.separator(),
        defaultActions.cut(),
        defaultActions.copy(),
        defaultActions.paste(),
        defaultActions.separator(),
        defaultActions.saveImage(),
        defaultActions.saveImageAs(),
        defaultActions.copyImageAddress(),
        defaultActions.separator(),
        defaultActions.copyLink(),
        defaultActions.separator(),
        defaultActions.inspect(),
        defaultActions.separator()
      ]

      menuTemplate = removeUnusedMenuItems(menuTemplate)

      if (menuTemplate.length > 0) {
        const menu = Menu.buildFromTemplate(menuTemplate)
        menu.popup(remote.getCurrentWindow())
      }
    } else if (e.channel == 'href-mouseover') {
      var url = e.args[0]
      var webviewURL = webview.getURL().replace(/\/+$/, '')
      if (url.startsWith('/')) {
        url = webviewURL + url
      } else if (url.startsWith('#')) {
        url = webviewURL + '/' + url
      }
      url = processURL(url)
      $('#href-dest').html(url)
      $('#href-dest').show()
    } else if (e.channel == 'href-mouseout') {
      $('#href-dest').html()
      $('#href-dest').hide()
	} else if (e.channel == 'scroll'){
		console.log('scroll')
		changeNavbarColor(true, true);
	
    } else if (e.channel == 'page-load-progress') {
      const progress = e.args[0]
      const tabId = $(e.target).attr('tab-id')
      const bottomBarWidth = $('#ripple-container').width()

      // $(`<style id="border-match-width">.chrome-tab[tab-id="${tabId}"]:before { width: ${(progress / 100 * bottomBarWidth)}px; transition: width .5s ease, background-color .5s ease;}</style>`).appendTo('head');
      if (progress == 100) {
        updateNavbarIcon()
      }
    } else if (e.channel == 'show-reader') {
      navigateTo('file://' + app.getAppPath() + '\\pages\\reader\\reader.html')
      const article = e.args[0]
      db.articles.add({
        title: article.title,
        byline: article.byline,
        content: article.content,
        length: article.length,
        url: getCurrentWebview().getURL()
      })
    } else if (e.channel == 'dom-loaded') {
      changeNavbarColor(true, false)
    } else if (e.channel == 'show-back-arrow') {
      console.log("show back")
      const percent = e.args[0]
      $('#back-indicator').css('display', 'block')
      $('#back-indicator').css('transform', 'translateY(-50%) translateX(' + percent + '%)')
    } else if (e.channel == 'show-forward-arrow') {
      console.log("show forward")
      const percent = e.args[0]
      $('#forward-indicator').css('display', 'block')
      $('#forward-indicator').css('transform', 'translateY(-50%) translateX(' + -(percent - 100) + '%)')
    } else if (e.channel == 'go-back') {
      if (webview.canGoBack()) {
        webview.goBack()
      }
    } else if (e.channel == 'go-forward') {
      if (webview.canGoForward()) {
        webview.goForward()
      }
    } else if (e.channel == 'hide-indicators') {
      $('#back-indicator').css('display', 'none')
      $('#forward-indicator').css('display', 'none')
    } else if (e.channel == 'network-online') {
      if (pendingRefreshOnConnect) {
        // timeout is needed because network isn't available immediately
        setTimeout(() => {
          getCurrentWebview().reload()
          pendingRefreshOnConnect = false
          $('#webview-overlay').css('visibility', 'hidden')
        }, 2000)
      }
    }
  })

  window.addEventListener('keydown', handleKeyDown)

  // Test for the presence of the experimental <webview> zoom and find APIs.
  if (typeof (webview.setZoom) === 'function' &&
    typeof (webview.find) === 'function') {
    var findMatchCase = false

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

function navigateTo (url) {
  resetExitedState()
  // select current visible webview
  var webview = getCurrentWebview()
  webview.src = processURL(url)

  webview.removeAttribute('color')
  $('#ripple-container').css('clip-path', '')
  $('#border-match-width').remove()
  // $("#location").css("-webkit-app-region", "drag");
  $('#location').prop('disabled', true)
  if (loadedSettings.navbarAlign === 'center') {
    $('#location').css('transform', 'translateX(' + getNavbarOffset() + 'px)')
    $('#navbarIcon').css('opacity', '0')
  }
}

function processURL (url) {
  var pattern = new RegExp(/[`\^\{}|\\"<> ]/)
  var ipAddress = new RegExp(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(:[0-9]{1,4})?$/)
  var processedURL
  if (ipAddress.test(url)) {
    // if ip address, add port if necessary
    if (!url.includes(':')) {
      // add default port
      processedURL += ':80'
    }
  }

  if (url.startsWith('about://')) {
    var target = url.split('about://')[1]
    console.log(target)
    switch (target) {
      case 'settings':
        processedURL = app.getAppPath() + '\\pages\\settings\\settings.html'
        break
      case 'history':
        processedURL = app.getAppPath() + '\\pages\\history\\history.html'
        break
    }
    // console.log(processedURL)
  } else if (url.includes('://')) {
    processedURL = url
  } else if (url.includes('.') && !pattern.test(url)) {
    processedURL = 'http://' + url
  } else if (url.startsWith('localhost')) {
    processedURL = 'http://' + url
  } else {
    processedURL = 'https://google.com/search?q=' + url
  }
  return processedURL
}

function doLayout () {
  document.querySelectorAll('webview').forEach(function (webview) {
    var controls = document.querySelector('#controls')
    var controlsHeight = controls.offsetHeight
    var windowWidth = document.documentElement.clientWidth
    var windowHeight = document.documentElement.clientHeight
    var webviewWidth = windowWidth
    var webviewHeight = windowHeight - controlsHeight

    webview.style.width = webviewWidth + 'px'
    webview.style.height = webviewHeight + 'px'

    var overlayWebview = document.querySelector('#webview-overlay')
    overlayWebview.style.width = webviewWidth + 'px'
    overlayWebview.style.height = webviewHeight + 'px'

    // settings not loaded yet, use callback
    settings.get('navbarAlign', (value) => {
      if (value === 'center' && $('#ripple-effect').css('clip-path') != null) {
        $('#navbarIcon').css('opacity', '0')
        $('#location').css('transform', 'translateX(' + getNavbarOffset() + 'px)')
      }
    })
  })
}

function handleExit (event) {
  console.log(event.type)
  document.body.classList.add('exited')
  if (event.type == 'abnormal') {
    document.body.classList.add('crashed')
  } else if (event.type == 'killed') {
    document.body.classList.add('killed')
  }
}

function resetExitedState () {
  document.body.classList.remove('exited')
  document.body.classList.remove('crashed')
  document.body.classList.remove('killed')
}

ipcRenderer.on('shortcut', function (event, data) {
  if (data.action == 'closeTab') {
    chromeTabs.removeTab(el.querySelector('.chrome-tab-current'))
    if ($('#location').val() != '') {
      $('#location').blur()
      $('#location').prop('disabled', true)
      if (loadedSettings.navbarAlign === 'center') {
        $('#navbarIcon').css('opacity', '0')
      }
    }
  } else if (data.action == 'reloadPage') {
    // TODO: check if webContents ready; using empty catch is bad practice
    try {
      getCurrentWebview().reload()
    } catch (exp) {

    }
  } else if (data.action == 'addTab') {
    chromeTabs.addTab({
      title: 'New Tab',
      favicon: 'img/default-favicon.png'
    })
    selectNavbar(false, null)
  } else if (data.action == 'toggleDevTools') {
    // get current webview
    getCurrentWebview().openDevTools()
  } else if (data.action == 'savePage') {
    // if pdf, download
    if (getCurrentWebview().getURL().endsWith('.pdf')) {
      const url = getCurrentWebview().getURL().replace('chrome://pdf-viewer/index.html?src=', '')
      getCurrentWebview().getWebContents().downloadURL(url)
      return
    }

    var savePath = dialog.showSaveDialog(remote.getCurrentWindow(), {})
    if (savePath) {
      // null if cancelled
      if (!savePath.endsWith('.html')) {
        savePath = savePath + '.html'
      }

      getCurrentWebview().getWebContents().savePage(savePath, 'HTMLComplete', function () {})
    }
  } else if (data.action == 'newWindow') {
    ipcRenderer.send('open-window', false)
  } else if (data.action == 'printPage') {
    getCurrentWebview().print()
  } else if (data.action == 'viewHistory') {
    navigateTo('file:///' + app.getAppPath() + '\\pages\\history\\history.html')
  } else if (data.action == 'viewSettings') {
    navigateTo('file:///' + app.getAppPath() + '\\pages\\settings\\settings.html')
  }
})

ipcRenderer.on('dragend', function (event, data) {
  // trigger dragend on all windows except origin
  if (remote.getCurrentWindow().id != remote.getGlobal('draggingTab').originWindowID) {
    var event = new MouseEvent('dragend', {
      view: window,
      bubbles: true,
      cancelable: true,
      screenX: screen.getCursorScreenPoint().x,
      screenY: screen.getCursorScreenPoint().y,
      clientX: getClientPos().x,
      clientY: getClientPos().y
    })

    setTimeout(() => {
      document.querySelector('.chrome-tab-current').dispatchEvent(event)
    }, 100)
  }
})

ipcRenderer.on('removetab', function (event, data) {
  if (remote.getCurrentWindow().id == remote.getGlobal('draggingTab').createdTab) {
    $(window).unbind('dragover')
    chromeTabs.removeTab(document.querySelector('.chrome-tab-current'))
  }
})

ipcRenderer.on('savestate', function (event, data) {
  urls = []
  $('#tabs-content webview').each((e) => {
    urls.push(e.attr('src'))
  })
  config.set('state', urls)
})

win.webContents.session.on('will-download', (event, item, webContents) => {
  // don't bother if cancel was pressed
  if (item.isDestroyed()) {
    return
  }

  var downloadState
  let filePath
  const filename = item.getFilename()
  const saveImagePath = remote.getGlobal('dir').saveImagePath
  const name = path.extname(filename) ? filename : getFilenameFromMime(filename, item.getMimeType())
  filePath = saveImagePath != '' ? saveImagePath : unusedFilename.sync(path.join(remote.getGlobal('dir').downloads, name))

  var downloadItem = $(downloadItemTemplate)
  downloadItem.find('.download-title').html(filePath.replace(/^.*[\\\/]/, ''))
  var totalBytes = formatBytes(item.getTotalBytes())
  downloadItem.find('.download-details').html('0.0/' + totalBytes)
  $('#download-manager').prepend(downloadItem)
  downloadState = 'started'

  // show download bar
  $('#download-manager').show()

  item.on('updated', (event, state) => {
    if (state === 'interrupted') {
      downloadItem.find('.download-details').html('Waiting for network')
      downloadState = 'interrupted'
    } else if (state === 'progressing') {
      // TODO: check if object is destroyed; using empty catch is bad practice
      try {
        if (item.isPaused()) {
          downloadItem.find('.download-details').html('Paused')
          downloadState = 'paused'
        } else {
          downloadItem.find('.download-details').html(formatBytes(item.getReceivedBytes()) + '/' + totalBytes)
          downloadState = 'downloading'
        }
      } catch (err) {

      }
    }
  })

  item.once('done', (event, state) => {
    if (state === 'completed') {
      console.log('Download successfully')
      downloadItem.find('.download-details').html('')
      downloadState = 'completed'
    } else {
      if (state == 'cancelled') {
        downloadItem.find('.download-details').html('Cancelled')
        // delete file if still exists
        setTimeout(function () {
          if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
              if (err) throw err
            })
          }
        }, 10000)
      } else {
        downloadItem.find('.download-details').html(`Download failed: ${state}`)
      }
      downloadState = 'failed'
    }
  })

  downloadItem.find('.download-content').click(function () {
    if (downloadState == 'downloading') {
      item.pause()
    } else if (downloadState == 'paused') {
      item.resume()
    } else if (downloadState == 'completed') {
      shell.openItem(filePath)
    }
  })

  downloadItem.find('.download-close').click(function () {
    if (downloadState == 'downloading' || downloadState == 'paused') {
      item.pause()
      var choice = dialog.showMessageBox(win, {
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Confirm',
        message: 'Cancel current download?'
      })

      if (choice == 0) {
        item.cancel()
      } else {
        item.resume()
        return
      }
    }

    // remove item from downloads bar
    downloadItem.remove()
    // hide downloads bar
    if ($('.download-item').length == 1) {
      $('#download-manager').hide()
    }
  })

  downloadItem.find('.download-folder').click(function () {
    shell.showItemInFolder(filePath)
  })
})

$('.close-download').click(function () {
  $('#download-manager').hide()
})

function handleKeyDown (event) {
  if (event.keyCode == 27) {
    if (win.isFullScreen()) {
      win.setFullScreen(false)
      // TODO: check if webContents ready; using empty catch is bad practice
      try {
        // inject javascript to exit fullscreen
        var id = el.querySelector('.chrome-tab-current').getAttribute('tab-id')
        var webview = document.querySelector('webview[tab-id="' + id + '"]')
        webview.executeJavaScript('document.exitFullscreen?document.exitFullscreen():document.webkitExitFullscreen?document.webkitExitFullscreen():document.mozCancelFullScreen?document.mozCancelFullScreen():document.msExitFullscreen&&document.msExitFullscreen();')
      } catch (err) {
        // no page loaded
      }
      return
    } else {
      // if navbar selected, deselect
      var selected = getCurrentWebview()
      $('#ripple-container').css('clip-path', '')
      // TODO: check if webContents ready; using empty catch is bad practice
      try {
        console.log('title update:' + stripURL(selected.getURL()))
        document.querySelector('#location').value = stripURL(selected.getURL())
      } catch (err) {
        document.querySelector('#location').value = stripURL('about:blank')
      }
      // $("#location").css("-webkit-app-region", "drag");
      $('#location').prop('disabled', true)
      if (loadedSettings.navbarAlign === 'center') {
        $('#location').css('transform', 'translateX(' + getNavbarOffset() + 'px)')
        $('#navbarIcon').css('opacity', '0')
      }
	  $('#ripple-container').hide()
    }
  }

  if (event.ctrlKey || event.metaKey) {
    switch (event.keyCode) {
      // Ctrl+F.
      case 70:
        event.preventDefault()
        const search = searchInPage(getCurrentWebview())
        if ($('.electron-in-page-search-window').hasClass('search-active')) {
          search.closeSearchWindow()
          search.finalize()
        } else {
          search.openSearchWindow()
        }
        break

        // Ctrl + Y
      case 89: // 87 for W
        event.preventDefault()
        chromeTabs.removeTab(el.querySelector('.chrome-tab-current'))
        break

        // Ctrl++.
      case 107:
      case 187:
        event.preventDefault()
        increaseZoom()
        break

        // Ctrl+-.
      case 109:
      case 189:
        event.preventDefault()
        decreaseZoom()
    }
  }
}

function handleLoadCommit (webview) {
  changeNavbarColor(true, true)
  resetExitedState()

  setFavicon(webview, webview.getTitle(), webview.getURL())
  var selected = getCurrentWebview()
  // only update location if webview in focus
  if ($('#ripple-container').css('clip-path') == null && selected == webview) {
    console.log('finish load:' + stripURL(webview.getURL()))
    document.querySelector('#location').value = stripURL(webview.getURL())
    updateNavbarIcon()
    $('#location').prop('disabled', true)
    if (loadedSettings && loadedSettings.navbarAlign === 'center') {
      $('#location').css('transform', 'translateX(' + getNavbarOffset() + 'px)')
      $('#navbarIcon').css('opacity', '0')
    }
  }
  updateBackButton(webview)

  // update history
  // check if exists; if true, get numVisits
  const protocol = require('url').parse(webview.getURL()).protocol
  if (protocol == 'https:' || protocol == 'http:') {
    var fav = 'https://www.google.com/s2/favicons?domain=' + stripURL(webview.getURL())
    db.sites.where('url').equalsIgnoreCase(webview.getURL()).first().then(function (site) {
      if (site == null) {
        // doesn't exist, so add
        db.sites.add({
          url: webview.getURL(),
          favicon: fav,
          title: webview.getTitle(),
          lastVisit: Date.now(),
          numVisits: 1
        })
      } else {
        db.sites.where('url').equalsIgnoreCase(webview.getURL()).modify({
          url: webview.getURL(),
          favicon: fav,
          title: webview.getTitle(),
          lastVisit: Date.now(),
          numVisits: site.numVisits + 1
        })
      }
    })
  }
}

function handleLoadStart (event, webview) {
  event.preventDefault()

  // clear error page
  $(getCurrentWebview()).removeClass('error-active')
  hideErrorPage()

  var url = $(event.target.outerHTML).attr('src')
  if (webview.getURL() == '') {
    setFavicon(webview, url, url)
  }
  document.body.classList.add('loading')
  $('#navbarIcon').html(svgLoading)

  isLoading = true
  resetExitedState()
  if (!event.isTopLevel) {

  }
}

function changeNavbarColor (pageLoaded, overwriteExisting) {
  var webview = getCurrentWebview()
  console.log(webview.getAttribute('tab-id'))

  if (webview.hasAttribute('color') && !overwriteExisting) {
    // extract color array from rgb string
    var color = webview.getAttribute('color').match(/\d+/g)
    setColor(color)
  } else if (pageLoaded) {
    // capture page and extract first line of pixels
    // page contents start at navbar height
    remote.getCurrentWebContents().capturePage({
      x: 0,
      y: $('#controls').height() + 1,
      width: $('#controls').width(),
      height: 1
    }, (img) => {
      var source = new Image()
      source.src = img.toDataURL()
      console.log(source.src)
      var img = $(source, {
        attr: {
          src: el.path
        }
      }).on('load', function () {
        var palette = _getPalette(source)
        color = palette[0]
        if (!color) {
          color = [255, 255, 255]
        }
        setColor(color)
        webview.setAttribute('color', `rgb(${color[0]}, ${color[1]}, ${color[2]})`)
      })
      $('.hidden').append(img)
    })
  }
}

function setColor (color) {
  const contrast = getContrast(color[0], color[1], color[2])
  const contrastLighter = pSCB(0.2, getContrast(color[0], color[1], color[2]))
  const c = hexToRGB(getContrast(color[0], color[1], color[2]))
  const highlight = `rgba(${c.r}, ${c.g}, ${c.b}, 0.1)`

  const regular = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
  const darker = pSCB(-0.07, `rgb(${color[0]}, ${color[1]}, ${color[2]})`)
  const evenDarker = pSCB(-0.1, `rgb(${color[0]}, ${color[1]}, ${color[2]})`)
  const superDark = pSCB(-0.4, `rgb(${color[0]}, ${color[1]}, ${color[2]})`)

  const style = `
  <style id="chameleon">
    #controls, .titlebar, #back, #refresh {
      background: ${regular};
      transition: all 0.2s linear;
    }

    #ripple-container.ripple {
      background: ${evenDarker};
    }

    #controls svg:not(.stoplight-buttons), #add-tab svg:not(.stoplight-buttons) {
      fill: ${contrastLighter};
      transition: all 0.2s linear;
    }

    #location {
      color: ${contrast};
      transition: all 0.2s linear;
    }

    #add-tab {
      background-color: ${evenDarker};
    }

    .chrome-tabs {
      background: ${evenDarker};
      transition: all 0.2s linear;
    }

    .chrome-tabs .chrome-tab {
      background: ${darker};
      transition: all 0.2s linear;
    }

    // .chrome-tab:before {
    //   background: ${superDark};
    //   transition: all 0.2s linear;
    // }

    .chrome-tabs .chrome-tab.chrome-tab-current {
      background: ${regular};
      transition: all 0.2s linear;
    }

    .chrome-tabs .chrome-tab-title {
      color: ${contrast};
      transition: all 0.2s linear;
    }

    #back, #refresh, .titlebar-windows .control, .titlebar-mac {
      border-bottom: ${'3px solid ' + darker};
      transition: all 0.2s linear;
    }

    #refresh:hover, #back:not([disabled]):hover {
      background-color: ${highlight};
    }

    #back:not([disabled]):hover, #refresh:hover, .titlebar-windows .control:hover {
      border-bottom: 3px solid ${evenDarker};
    }

    #add-tab-container {
      background: ${regular};
    }

    #add-tab:hover {
      background-color: ${evenDarker};
    }

    #add-tab-container:hover:after {
      background: ${evenDarker};
    }
  </style>
  `

  $('.ripple').data('ripple-color', pSCB(-0.2, `rgb(${color[0]}, ${color[1]}, ${color[2]})`))
  $('#chameleon').remove()
  $(style).appendTo('head')
}

function updateNavbarIcon () {
  // update icon if https
  const protocol = require('url').parse(getCurrentWebview().getURL()).protocol
  if (protocol === 'https:') {
    $('#navbarIcon').html(httpsSecure)
  } else if (protocol === 'http:') {
    $('#navbarIcon').html(notSecure)
  } else {
    $('#navbarIcon').html(svgSearch)
  }
}

function handleTitleUpdate (event, webview) {
  setFavicon(webview, webview.getTitle(), webview.getURL())
  updateNavbarIcon()

  var selected = getCurrentWebview()
  // only update location if webview in focus
  if ($('#ripple-container').css('clip-path') != null && selected == webview) {
    console.log('title update:' + stripURL(webview.getURL()))
    document.querySelector('#location').value = stripURL(webview.getURL())
    // $("#location").css("-webkit-app-region", "drag");
    $('#location').prop('disabled', true)
    if (loadedSettings.navbarAlign === 'center') {
      $('#location').css('transform', 'translateX(' + getNavbarOffset() + 'px)')
      $('#navbarIcon').css('opacity', '0')
    }
  }

  updateBackButton(webview)
}

function handleLoadStop (event) {
  // We don't remove the loading class immediately, instead we let the animation
  // finish, so that the spinner doesn't jerkily reset back to the 0 position.
  isLoading = false
}

function showErrorPage () {
  $('#webview-overlay').css('visibility', 'visible')
}

function hideErrorPage () {
  $('#webview-overlay').css('visibility', 'hidden')
}

function handleLoadError (event) {
  // if error code is valid
  if (errorCodes[event.errorCode] != null) {
    console.log('load error:' + getCurrentUrl())
    // show error page
    showErrorPage()

    $(getCurrentWebview()).addClass('error-active')
    const innerDoc = $($('#webview-overlay object')[0].contentDocument)
    const currentUrl = getCurrentWebview().getURL()
    innerDoc.find('#title').html(errorCodes[event.errorCode].title)
    innerDoc.find('#description').html(errorCodes[event.errorCode].description.replace('%s', stripURL(currentUrl)))
    innerDoc.find('#error-code').html(event.errorDescription)
    innerDoc.find('body').on('click', () => {
      handleClick()
    })
    innerDoc.find('#try-again').on('click', () => {
      if (event.errorCode == '-501') { // if trying to connect securely to a site without ssl certificate, use http instead
        navigateTo(currentUrl.replace('https://', 'http://'))
      } else {
        getCurrentWebview().reload()
      }
      hideErrorPage()
    })

    innerDoc.find('body').on('click', () => {
      // from ipc-message click
      var webview = getCurrentWebview()
      $('#ripple-container').css('clip-path', '')
      console.log('click:' + stripURL(webview.getURL()))
      $('#location').val(stripURL(webview.getURL()))
      $('#location').prop('disabled', true)
      if (loadedSettings.navbarAlign === 'center') {
        $('#location').css('transform', 'translateX(' + getNavbarOffset() + 'px)')
        $('#navbarIcon').css('opacity', '0')
      }
    })

    if (errorCodes[event.errorCode].retryOnReconnect) {
      pendingRefreshOnConnect = true
    }
  }
}

function handleLoadRedirect (event) {
  resetExitedState()
  if (event.newUrl != null) {
    console.log('redirect:' + stripURL(event.newUrl))
    document.querySelector('#location').value = stripURL(event.newUrl)
  }
}

function handleEnterHTMLFullscreen () {
  // hide toolbar
  $('#controls').css('display', 'none')
  $('#tab-bar').css('display', 'none')
  $('#download-manager').css('display', 'none')
}

function handleLeaveHTMLFullscreen () {
  $('#location').css('transition', 'none')
  $('#controls').css('display', '')
  console.log(chromeTabs.tabEls.length)
  if (chromeTabs.tabEls.length > 1) {
    $('#tab-bar').css('display', '')
  }

  // todo: if not closed, show downloads
  $('#download-manager').css('display', '')
}

function getNextPresetZoom (zoomFactor) {
  var preset = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2,
    2.5, 3, 4, 5
  ]
  var low = 0
  var high = preset.length - 1
  var mid
  while (high - low > 1) {
    mid = Math.floor((high + low) / 2)
    if (preset[mid] < zoomFactor) {
      low = mid
    } else if (preset[mid] > zoomFactor) {
      high = mid
    } else {
      return {
        low: preset[mid - 1],
        high: preset[mid + 1]
      }
    }
  }
  return {
    low: preset[low],
    high: preset[high]
  }
}

function increaseZoom () {
  var webview = document.querySelector('webview')
  webview.getZoom(function (zoomFactor) {
    var nextHigherZoom = getNextPresetZoom(zoomFactor).high
    webview.setZoom(nextHigherZoom)
  })
}

function decreaseZoom () {
  var webview = document.querySelector('webview')
  webview.getZoom(function (zoomFactor) {
    var nextLowerZoom = getNextPresetZoom(zoomFactor).low
    webview.setZoom(nextLowerZoom)
  })
}

function loadSettings () {
  // if required, set default settings
  setDefaultSettings()
  loadedSettings = settings.list

  settings.get('downloadsDirectory', (value) => {
    if (value == '') {
      // if not set, set to default downloads folder
      settings.set('downloadsDirectory', app.getPath('downloads'))
    }
    const dir = (value != '') ? value : app.getPath('downloads')
    ipcRenderer.send('set-download-directory', dir)
  })

  settings.get('theme', (value) => {
    if (value == 'dark') {
      $('head').append('<link rel="stylesheet" href="css/darkmode.css" type="text/css" />')
      if (el.classList.contains('chrome-tabs-dark-theme')) {
        document.documentElement.classList.remove('dark-theme')
        el.classList.remove('chrome-tabs-dark-theme')
      } else {
        document.documentElement.classList.add('dark-theme')
        el.classList.add('chrome-tabs-dark-theme')
      }
    }
  })

  settings.get('controlsStyle', (value) => {
    switch (value) {
      case 'mac':
        $('.titlebar-windows').hide()
        $('.titlebar-mac').show()
        break
      case 'windows':
        $('.titlebar-windows').show()
        $('.titlebar-mac').hide()
        break
      default:
        if (process.platform === 'win32') {
          $('.titlebar-windows').show()
          $('.titlebar-mac').hide()
        } else {
          $('.titlebar-windows').hide()
          $('.titlebar-mac').show()
        }
    }
    chromeTabs.layoutTabs()
  })

  doLayout()
}

function setDefaultSettings () {
  const length = Object.keys(settings.list).length
  if (length == 0) {
    for (var key in defaultSettings) {
      settings.set(key, defaultSettings[key])
    }
  }
}

function setFavicon (webview, title, url) {
  let fav
  const protocol = require('url').parse(url).protocol
  if (protocol === 'http:' || protocol === 'https:') {
    fav = 'https://www.google.com/s2/favicons?domain=' + stripURL(url)
  } else {
    fav = 'img/default-favicon.png'
  }

  var tabProperties = {
    title: title,
    favicon: fav
  }
  var id = webview.getAttribute('tab-id')
  chromeTabs.updateTab(el.querySelector('.chrome-tab[tab-id="' + id + '"]'), tabProperties)
}

function extractHostname (url) {
  var hostname
  // find & remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf('://') > -1) {
    hostname = url.split('/')[2]
  } else {
    hostname = url.split('/')[0]
  }

  // find & remove port number
  hostname = hostname.split(':')[0]
  // find & remove "?"
  hostname = hostname.split('?')[0]

  return hostname
}

function stripURL (url) {
  if (url.startsWith('about:blank')) {
    document.documentElement.classList.add('home')
    return ''
  } else {
    document.documentElement.classList.remove('home')
    $(getCurrentWebview()).css('background', '')
  }

  // if ip address, don't strip
  var ipAddress = new RegExp(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(:[0-9]{1,4})?$/)
  if (ipAddress.test(extractHostname(url))) {
    return extractHostname(url)
  }

  // if pdf or file, leave file name
  if (url.startsWith('chrome://pdf-viewer/index.html?src=') || url.startsWith('file:///')) {
    return decodeURI(url.split('/')[url.split('/').length - 1])
  }

  // if search, leave search term

  var domain = extractHostname(url)
  var splitArr = domain.split('.')
  var arrLen = splitArr.length

  // extracting the root domain here
  // if there is a subdomain
  if (arrLen > 2) {
    domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1]
    // check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
    if (splitArr[arrLen - 2].length == 2 && splitArr[arrLen - 1].length == 2) {
      // this is using a ccTLD
      domain = splitArr[arrLen - 3] + '.' + domain
    }
  }
  return domain
}

function getCurrentWebview () {
  var tabId = el.querySelector('.chrome-tab-current').getAttribute('tab-id')
  return document.querySelector('webview[tab-id="' + tabId + '"]')
}

function getCurrentUrl () {
  return $('#location').val()
}

function getNavbarOffset () {
  var controls_x = document.querySelector('#controls').getBoundingClientRect().right / 2
  var location_x = document.querySelector('#location-form').getBoundingClientRect().left
  var text_width = $('#location').textWidth() / 2
  if (text_width == 0) {
    $('#location').val('')
    text_width = $('#location').textWidth() / 2
  }
  var offset_width = controls_x - location_x - text_width

  return offset_width
}

function updateBackButton (webview) {
  if (webview.canGoBack()) {
    $('#back').prop('disabled', false)
  } else {
    if (!$('#back').is(':disabled')) {
      $('#back').prop('disabled', true)
    }
  }
}

function removeBorder () {
  document.documentElement.classList.remove('border')
}

function addBorder () {
  if (process.platform !== 'win32' && process.platform !== 'darwin') {
    document.documentElement.classList.add('border')
  }
}

$.fn.textWidth = function (text, font) {
  if (!$.fn.textWidth.fakeEl) $.fn.textWidth.fakeEl = $('<span>').hide().appendTo(document.body)
  $.fn.textWidth.fakeEl.text(text || this.val() || this.text()).css('font', font || this.css('font'))
  return $.fn.textWidth.fakeEl.width()
}

function selectNavbar (animate, event) {
  if (animate) {
    $('#location').css('transition', 'transform 0.5s')
  } else {
    $('#location').css('transition', 'transform 0s')
  }
  if ($('#ripple-container').css('clip-path') != null && !dragging) {
    // var $div = $('<div/>');
    var btnOffset = $('.ripple').offset()
    var xPos, yPos
    if (event != null) {
      event.preventDefault()
      xPos = event.detail.x - btnOffset.left - $('#navigation').offset().left
      yPos = event.detail.y - btnOffset.top
    } else {
      xPos = 0
      yPos = 0
    }
    $('#ripple-container').show()
    $('#location').prop('disabled', false)
    if (animate) {
      $('#ripple-container').css('clip-path', `circle(0px at ${xPos}px ${yPos}px)`)
      setTimeout(() => {
        $('#ripple-container').css('clip-path', `circle(4000px at ${xPos}px ${yPos}px)`)
        $('#location').select()
      }, 100)
    } else {
      $('#ripple-container').css('clip-path', `circle(4000px at ${xPos}px ${yPos}px)`)
      $('#location').select()
    }

    $('#location').css('transform', 'translateX(0%)')
    $('#navbarIcon').css('opacity', '1')

    var webview = getCurrentWebview()
    if ($('#location').val() !== '') {
      $('#location').val(webview.getURL())
    }
  }
}

function formatBytes (bytes, decimals) {
  if (bytes == 0) return '0 Bytes'
  var k = 1024
  var dm = decimals || 2
  var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  var i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

function getFilenameFromMime (name, mime) {
  const exts = extName.mime(mime)
  if (exts.length !== 1) {
    return name
  }

  return `${name}.${exts[0].ext}`
}

function isMouseInWindow () {
  const cursorPos = screen.getCursorScreenPoint()
  const cursorX = cursorPos.x
  const cursorY = cursorPos.y
  if (cursorX > window.screenX && cursorY > window.screenY && cursorX < (window.screenX + window.outerWidth) && cursorY < (window.screenY + window.outerHeight)) {
    return true
  }
  return false
}

function getClientPos () {
  const cursorPos = screen.getCursorScreenPoint()
  const cursorX = cursorPos.x
  const cursorY = cursorPos.y
  return {
    x: cursorX - window.screenX,
    y: cursorY - window.screenY
  }
}

const decorateMenuItem = menuItem => {
  return (options = {}) => {
    if (options.transform && !options.click) {
      menuItem.transform = options.transform
    }

    return menuItem
  }
}

const removeUnusedMenuItems = menuTemplate => {
  let notDeletedPreviousElement

  return menuTemplate
    .filter(menuItem => menuItem !== undefined && menuItem.visible !== false)
    .filter((menuItem, index, array) => {
      const toDelete = menuItem.type === 'separator' && (!notDeletedPreviousElement || index === array.length - 1 || array[index + 1].type === 'separator')
      notDeletedPreviousElement = toDelete ? notDeletedPreviousElement : menuItem
      return !toDelete
    })
}

function pSCB (p, c0, c1, l) {
  let r; let g; let b; let P; let f; let t; let h; const i = parseInt
  const m = Math.round
  let a = typeof (c1) === 'string'
  if (typeof (p) !== 'number' || p < -1 || p > 1 || typeof (c0) !== 'string' || (c0[0] != 'r' && c0[0] != '#') || (c1 && !a)) return null
  if (!this.pSBCr) {
    this.pSBCr = (d) => {
      let n = d.length
      const x = {}
      if (n > 9) {
        [r, g, b, a] = d = d.split(','), n = d.length
        if (n < 3 || n > 4) return null
        x.r = i(r[3] == 'a' ? r.slice(5) : r.slice(4)), x.g = i(g), x.b = i(b), x.a = a ? parseFloat(a) : -1
      } else {
        if (n == 8 || n == 6 || n < 4) return null
        if (n < 6) d = '#' + d[1] + d[1] + d[2] + d[2] + d[3] + d[3] + (n > 4 ? d[4] + d[4] : '')
        d = i(d.slice(1), 16)
        if (n == 9 || n == 5) x.r = d >> 24 & 255, x.g = d >> 16 & 255, x.b = d >> 8 & 255, x.a = m((d & 255) / 0.255) / 1000
        else x.r = d >> 16, x.g = d >> 8 & 255, x.b = d & 255, x.a = -1
      }
      return x
    }
  }
  h = c0.length > 9, h = a ? c1.length > 9 ? true : c1 == 'c' ? !h : false : h, f = pSBCr(c0), P = p < 0, t = c1 && c1 != 'c' ? pSBCr(c1) : P ? {
    r: 0,
    g: 0,
    b: 0,
    a: -1
  } : {
    r: 255,
    g: 255,
    b: 255,
    a: -1
  }, p = P ? p * -1 : p, P = 1 - p
  if (!f || !t) return null
  if (l) r = m(P * f.r + p * t.r), g = m(P * f.g + p * t.g), b = m(P * f.b + p * t.b)
  else r = m((P * f.r ** 2 + p * t.r ** 2) ** 0.5), g = m((P * f.g ** 2 + p * t.g ** 2) ** 0.5), b = m((P * f.b ** 2 + p * t.b ** 2) ** 0.5)
  a = f.a, t = t.a, f = a >= 0 || t >= 0, a = f ? a < 0 ? t : t < 0 ? a : a * P + t * p : 0
  if (h) return 'rgb' + (f ? 'a(' : '(') + r + ',' + g + ',' + b + (f ? ',' + m(a * 1000) / 1000 : '') + ')'
  else return '#' + (4294967296 + r * 16777216 + g * 65536 + b * 256 + (f ? m(a * 255) : 0)).toString(16).slice(1, f ? undefined : -2)
}

_getPalette = (image) => {
  const canvas = document.createElement('canvas')
  const size = 16
  const maxPaletteSize = 10
  const context = canvas.getContext('2d')
  const pixelArray = [] // Contains arrays of [red, green, blue, freqency]
  const palette = [] // Contains arrays of [red, green, blue]

  canvas.width = size
  canvas.height = size
  context.imageSmoothingEnabled = false
  context.drawImage(image, 0, 0, size, size)

  // Format is [r,g,b,a,r,g,b,a,...]
  const pixels = context.getImageData(0, 0, size, size).data

  for (let i = 0; i < pixels.length / 4; i++) {
    const offset = i * 4
    const red = pixels[offset]
    const green = pixels[offset + 1]
    const blue = pixels[offset + 2]
    const alpha = pixels[offset + 3]
    let matchIndex

    // Skip this pixel if transparent or too close to white
    if (alpha === 0) {
      continue
    }

    // See if the color is already stored
    for (let j = 0; j < pixelArray.length; j++) {
      if (red === pixelArray[j][0] &&
        green === pixelArray[j][1] &&
        blue === pixelArray[j][2]) {
        matchIndex = j
        break
      }
    }

    // Add the color if it doesn't exist, otherwise increment frequency
    if (matchIndex === undefined) {
      pixelArray.push([red, green, blue, 1])
    } else {
      pixelArray[matchIndex][3]++
    }
  }

  // Sort pixelArray by color frequency
  pixelArray.sort(function (a, b) {
    return b[3] - a[3]
  })

  // Fill array with [red, green, blue] values until maxPaletteSize or
  // until there are no more colors, whichever happens first
  for (let i = 0; i < Math.min(maxPaletteSize, pixelArray.length); i++) {
    palette.push([pixelArray[i][0], pixelArray[i][1], pixelArray[i][2]])
  }

  return palette
}

function getContrast (r, g, b) {
  var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return (yiq >= 128) ? '#000000' : '#ffffff'
}

function hexToRGB (hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

// set svgs
$('#navbarIcon').html(svgSearch)
$('#bookmark').html(svgBookmark)
$('#settings').html(svgSettings)
$('#back').html(svgArrowLeft)
$('#refresh').html(svgRefresh)
$('#add-tab').html(svgAdd)
$('#back-indicator').html(svgBackIndicator)
$('#forward-indicator').html(svgForwardIndicator)
// $('#forward').html(svgArrowRight);
