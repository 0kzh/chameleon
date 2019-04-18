const { remote } = window.require('electron');
const { webContents } = require('electron').remote
const $ = require('jquery');
console.log(webContents)

const tabTemplate = `
  <div class="chrome-tab" draggable="true">
    <div class="chrome-tab-background">
      <svg x="0" y="0" width="100%" height="100%" version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"> <defs> <symbol id="topleft" viewBox="0 0 500 29" > <path d="M0 0.0 L500 0.0 500 29 0 29"/> </symbol> <symbol id="topright" viewBox="0 0 500 29"> <use xlink:href="#topleft"/> </symbol> <clipPath id="crop"> <rect class="mask" width="100%" height="100%" x="0"/> </clipPath> </defs> <svg x="0" y="0" width="50%" height="100%" transfrom="scale(-1, 1)" preserveAspectRatio="none"> <use xlink:href="#topleft" width="500" height="29" class="chrome-tab-background"/> </svg> <g transform="scale(-1, 1)"> <svg width="50%" height="100%" x="-100%" y="0" preserveAspectRatio="none"> <use xlink:href="#topright" width="500" height="29" class="chrome-tab-background"/> </svg> </g> </svg>
    </div>
    <div class="chrome-tab-favicon"></div>
    <div class="chrome-tab-title"></div>
    <div class="chrome-tab-close"></div>
  </div>
`;

const defaultTapProperties = {
  title: '',
  favicon: '',
  url: '',
  index: -1
};

let instanceId = 0;
let tabId = 0;
let mouseDownX = 0;
let mouseDownY = 0;
let mouseDownOffsetLeft = 0;

class ChromeTabs {

  init(el, options) {
    this.el = el;
    this.options = options;
    this.instanceId = instanceId;
    this.el.setAttribute('data-chrome-tabs-instance-id', this.instanceId);

    // addTabWidth = document.querySelector("#add-tab").offsetWidth;
    instanceId += 1;

    this.setupStyleEl();
    this.setupEvents();
    this.layoutTabs();
    this.fixZIndexes();
    this.setupDrag();
  }

  emit(eventName, data) {
    document.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  setupStyleEl() {
    this.animationStyleEl = document.createElement('style');
    this.el.appendChild(this.animationStyleEl);
  }

  setupEvents() {
    window.addEventListener('resize', event => this.layoutTabs());

    this.el.addEventListener('click', ({ target }) => {
      if (target.classList.contains('chrome-tab')) {
        this.setCurrentTab(target);
      } else if (target.classList.contains('chrome-tab-close')) {
        this.removeTab(target.parentNode);
      } else if (target.classList.contains('chrome-tab-title') || target.classList.contains('chrome-tab-favicon')) {
        this.setCurrentTab(target.parentNode);
      }
    })
  }

  get tabEls() {
    return Array.prototype.slice.call(this.el.querySelectorAll('.chrome-tab'));
  }

  get tabContentEl() {
    return this.el.querySelector('.chrome-tabs-content');
  }

  get tabWidth() {
    const tabsContentWidth = this.tabContentEl.clientWidth;
    const width = (tabsContentWidth / this.tabEls.length);
    return width;
  }

  get tabEffectiveWidth() {
    return this.tabWidth - this.options.tabOverlapDistance;
  }

  get tabPositions() {
    const tabEffectiveWidth = this.tabWidth;
    let left = 0;
    let positions = [];

    this.tabEls.forEach((tabEl, i) => {
      positions.push(left);
      left += tabEffectiveWidth;
    })
    return positions;
  }

  layoutTabs() {
    const tabWidth = this.tabWidth + 1; //adjust for borders

    this.cleanUpPreviouslyDraggedTabs();
    this.tabEls.forEach((tabEl) => tabEl.style.width = tabWidth + 'px');
    requestAnimationFrame(() => {
      let styleHTML = '';
      this.tabPositions.forEach((left, i) => {
        styleHTML += `
          .chrome-tabs[data-chrome-tabs-instance-id="${ this.instanceId }"] .chrome-tab:nth-child(${ i + 1 }) {
            transform: translate3d(${ left }px, 0, 0)
          }
        `;
      });
      this.animationStyleEl.innerHTML = styleHTML;
    });
  }

  fixZIndexes() {
    const bottomBarEl = this.el.querySelector('.chrome-tabs-bottom-bar');
    const tabEls = this.tabEls;

    tabEls.forEach((tabEl, i) => {
      let zIndex = tabEls.length - i;

      if (tabEl.classList.contains('chrome-tab-current')) {
        bottomBarEl.style.zIndex = tabEls.length + 1;
        zIndex = tabEls.length + 2;
      }
      tabEl.style.zIndex = zIndex;
    })
  }

  createNewTabEl() {
    const div = document.createElement('div');
    div.innerHTML = tabTemplate;
    return div.firstElementChild;
  }

  createNewWebView(url) {
    if (url) {
      $('#tabs-content').append('<webview plugins ' + 'src=' + url + ' preload="./js/inject.js"></webview>');
    } else {
      $('#tabs-content').append('<webview plugins src="about:blank" preload="./js/inject.js"></webview>');
    }
    return document.querySelector('#tabs-content').lastElementChild;
  }

  addTab(tabProperties) {
    const tabEl = this.createNewTabEl();
    const webview = this.createNewWebView(tabProperties.url);
    let templateWebview = document.querySelector('#tabs-content').firstElementChild;
    webview.style.width = templateWebview.style.width;
    webview.style.height = templateWebview.style.height;

    tabEl.classList.add('chrome-tab-just-added');
    setTimeout(() => tabEl.classList.remove('chrome-tab-just-added'), 500);

    tabProperties = Object.assign({}, defaultTapProperties, tabProperties);

    tabEl.setAttribute('tab-id', tabId);
    webview.setAttribute('tab-id', tabId);
    //insert tab at index; if index not specified, append instead
    if (tabProperties.index != -1) {
      $(".chrome-tabs-content > div:nth-child(" + (tabProperties.index + 1) + ")").after(tabEl);
    } else {
      this.tabContentEl.appendChild(tabEl);
    }
    this.updateTab(tabEl, tabProperties);
    this.emit('tabAdd', { tabId });
    this.emit('activeTabChange', { tabEl });
    this.setCurrentTab(tabEl);
    this.layoutTabs();
    this.fixZIndexes();
    this.setupDrag();
    tabId++;
    //simulate omnibar focus
    $("#location").trigger('click');

    const tabEls = document.querySelectorAll(".chrome-tab");
    if (tabEls.length == 0) {
      //close window if last tab closed
      this.emit('closeWindow', null);
    } else if (tabEls.length == 1) {
      //hide toolbar if only one tab
      document.querySelector("#tab-bar").style.display = "none";
      $("#add-tab").detach().removeClass("no-border").appendTo("#add-tab-container");
      $(".ripple").css("margin-right", "0");
      // if (settings.darkMode) {
      //     $(".ripple").css("border-right", "1px solid #121212");
      // } else {
      //     $(".ripple").css("border-right", "1px solid #DAD9DA");
      // }
    } else {
      var element = $('#add-tab').detach().addClass("no-border");
      $('.chrome-tabs').after(element);
      document.querySelector("#tab-bar").style.display = "";
      $(".ripple").css("margin-right", "-1px");
      this.layoutTabs();
      this.fixZIndexes();
      this.setupDrag();
    }
  }

  setCurrentTab(tabEl) {
    const currentTab = this.el.querySelector('.chrome-tab-current');
    if (currentTab) currentTab.classList.remove('chrome-tab-current');
    tabEl.classList.add('chrome-tab-current');

    // hide all other webviews
    document.querySelectorAll("webview").forEach(function(webview) {
      if (webview.getAttribute("tab-id") == tabEl.getAttribute("tab-id")) {
        webview.classList.remove("hidden");
        
        // show or hide error page
        if ($(webview).hasClass("error-active")) {
          $("#webview-overlay").css("visibility", "visible");
        } else {
          $("#webview-overlay").css("visibility", "hidden");
        }
      } else {
        webview.classList.add("hidden");
      }
    });

    this.fixZIndexes();
    this.emit('activeTabChange', { tabEl });
  }

  removeTab(tabEl) {
    if (tabEl.classList.contains('chrome-tab-current')) {
      if (tabEl.previousElementSibling) {
        this.setCurrentTab(tabEl.previousElementSibling);
      } else if (tabEl.nextElementSibling) {
        this.setCurrentTab(tabEl.nextElementSibling);
      }
    }
    tabEl.parentNode.removeChild(tabEl);
    //remove associated webview
    var id = tabEl.getAttribute("tab-id");
    var webview = document.querySelector('webview[tab-id="' + id + '"]');
    webview.remove();

    this.emit('tabRemove', { tabEl })
    this.layoutTabs();
    this.fixZIndexes();
    this.setupDrag();


    const tabEls = document.querySelectorAll(".chrome-tab");
    if (tabEls.length == 0) {
      //close window if last tab closed
      this.emit('closeWindow', null);
    } else if (tabEls.length == 1) {
      //hide toolbar if only one tab
      document.querySelector("#tab-bar").style.display = "none";
      $("#add-tab").detach().removeClass("no-border").appendTo("#add-tab-container");
      $(".ripple").css("margin-right", "0");
      // if (settings != null) {
      //     if (settings.darkMode) {
      //         $(".ripple").css("border-right", "1px solid #121212");
      //     } else {
      //         $(".ripple").css("border-right", "1px solid #DAD9DA");
      //     }
      // }
    } else {
      //move add tab button to chrome-tabs
      var element = $('#add-tab').detach().addClass("no-border");
      $('.chrome-tabs').after(element);
      document.querySelector("#tab-bar").style.display = "";
      $(".ripple").css("margin-right", "-1px");
      this.layoutTabs();
      this.fixZIndexes();
      this.setupDrag();
    }
  }

  updateTab(tabEl, tabProperties) {
    tabEl.querySelector('.chrome-tab-title').textContent = tabProperties.title;
    tabEl.querySelector('.chrome-tab-favicon').style.backgroundImage = `url('${tabProperties.favicon}')`;
  }

  getTabIcon(tabEl) {
    var img = tabEl.querySelector(".chrome-tab-favicon");
    var style = img.currentStyle || window.getComputedStyle(img, false);
    return style.backgroundImage.slice(4, -1).replace(/"/g, "");
  }

  cleanUpPreviouslyDraggedTabs() {
    this.tabEls.forEach((tabEl) => tabEl.classList.remove('chrome-tab-just-dragged'));
  }

  setupDrag() {
    const tabEls = this.tabEls;
    const tabEffectiveWidth = this.tabEffectiveWidth;
    const tabPositions = this.tabPositions;
    
    tabEls.forEach((tabEl, originalIndex) => {
      $("body").unbind('mousemove');
      $("body").unbind('mouseup');
      $(tabEl).unbind('dragstart');
      const id = tabEl.getAttribute("tab-id");
      const webview = document.querySelector('webview[tab-id="' + id + '"]');

      const originalTabPositionX = tabPositions[originalIndex];

      $(tabEl).on('dragstart', (e) => {
        e.preventDefault();
        mouseDownX = e.clientX;
        mouseDownY = e.clientY;
        mouseDownOffsetLeft = $(tabEl).position().left;
        let deltaX;

        $(window).on('mousemove', (e) => {
          $(tabEl).addClass("is-dragging")
          deltaX = e.clientX - mouseDownX;
          // console.log("translate3d(" + deltaX + ", 0, 0)")
          $(tabEl).css("left", mouseDownOffsetLeft + "px")
          if (deltaX < -mouseDownOffsetLeft) {
            deltaX = -mouseDownOffsetLeft
          } else if ((deltaX + mouseDownOffsetLeft) > $(this.tabContentEl).width() / 2) {
            deltaX = 0
          }
          $(tabEl).css("transform", "translate3d(" + deltaX + "px, 0, 0)");
          // Current index be computed within the event since it can change during the dragMove
          const tabEls = this.tabEls;
          const currentIndex = tabEls.indexOf(tabEl);

          const currentTabPositionX = originalTabPositionX + deltaX;
          const destinationIndex = Math.max(0, Math.min(tabEls.length, Math.floor((currentTabPositionX + (tabEffectiveWidth / 2)) / tabEffectiveWidth)));

          if (currentIndex !== destinationIndex) {
            this.animateTabMove(tabEl, currentIndex, destinationIndex);
          }
        });

        $(window).on('mouseup', (e) => {
          $(window).unbind('mousemove');
          $(window).unbind('mouseup');
          $(tabEl).unbind('dragstart');

          // Animate tab back
          $(tabEl).css("left", "0");
          $(tabEl).css("transform", `translate3d(${mouseDownOffsetLeft + deltaX}px, 0, 0)`);
          $(tabEl).removeClass("is-dragging")
          tabEl.classList.remove('chrome-tab-currently-dragged');
          this.el.classList.remove('chrome-tabs-sorting');
  
          this.setCurrentTab(tabEl);
          tabEl.classList.add('chrome-tab-just-dragged');

          setTimeout(() => {
            tabEl.style.transform = '';
            this.setupDrag();
          }, 10)

        });

      this.cleanUpPreviouslyDraggedTabs();
      tabEl.classList.add('chrome-tab-currently-dragged');
      this.el.classList.add('chrome-tabs-sorting');
      this.fixZIndexes();
      });
    })
  }

  animateTabMove(tabEl, originIndex, destinationIndex) {
    if (destinationIndex < originIndex) {
      tabEl.parentNode.insertBefore(tabEl, this.tabEls[destinationIndex]);
    } else {
      tabEl.parentNode.insertBefore(tabEl, this.tabEls[destinationIndex + 1]);
    }
  }
}