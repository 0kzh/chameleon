<p align="center">
  <img src="img/icon.png" width="180">
</p>

<div align="center">
  <h1>Oxygen</h1>
</div>

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

Oxygen is a browser designed to provide you with a seamless browsing experience by blending in with whatever site you are visiting. Built on top of `Electron`, it aims to be fast, private, beautiful, and functional all at the same time.


# Features

- **AdBlock** - Browse the web without any ads or trackers. Due to the simplicity of Oxygen, websites load faster and consume less memory compared to modern browsers such as Chrome.
- **Beautiful and minimalistic UI** - The address bar is condensed into a single line to maximize the amount of content on the screen. Everything else, from the download manager to the settings to the history page is designed to do everything you expect, while remaining as simple as possible.
- **Cross-platform gestures** - Do you use Windows and wish you could navigate between pages with trackpad gestures like on Mac? Now you can!

# Screenshots

![image](img/screenshots/reddit.png)

![image](img/screenshots/apple.png)

![image](img/screenshots/dropbox.png)

# [Roadmap](https://github.com/Polunom/oxygen/projects/1)

# Installing

|  [<img src="https://i.imgur.com/POJjnum.png" alt="Windows" width="24px" height="24px" />]()</br> Windows  |          [<img src="https://i.imgur.com/V0YkvU5.png" alt="Mac" width="24px" height="24px" />]()</br> Mac          |         [<img src="https://i.imgur.com/khCS5Ll.png" alt="Linux" width="24px" height="24px" />]()</br> Linux         |
|:---------:|:---------------------:|:---------------------:|
| [Download](https://github.com/Polunom/oxygen/releases/download/1.0/Oxygen.Setup.exe) | [Download](https://github.com/Polunom/oxygen/releases/download/1.0/Oxygen.dmg) | [Download](https://github.com/Polunom/oxygen/releases/download/1.0/Oxygen-linux-x64.zip) |


Alternatively, you can skip to the section below to build Oxygen from source.

### Installation on Linux
* To install the .deb file, use `sudo dpkg -i /path/to/Oxygen_amd64.deb`

# Developing
* Install the latest version of [`Node.js`](https://nodejs.org/en/)
* Run `npm install` to install dependencies
* Start Oxygen by running `npm run start`
* Make your changes
* Press `cmd+shift+r` or `ctrl+shift+r` to restart the browser 

### Building binaries

To build Oxygen from source, follow the instructions above to get the app running, then execute the following commands to build binaries
* Build for all platforms: `npm run build`
* Build for macOS: `npm run build-mac`
* Build for Windows: `npm run build-win`
* Build for Linux: `npm run build-linux`

It might be difficult to build for all platforms on one platform. Depending on the platform you're using, you may need to install additional dependencies:
* If you're using macOS and building for Linux, install [Homebrew](http://brew.sh), and run `brew install fakeroot dpkg` first.
* If you are using macOS/Linux and building a package for Windows, you will need to install [Mono](https://www.mono-project.com/) and [Wine](https://www.winehq.org/).


# Contributing

If you see any bugs with Oxygen or want to suggest a new feature, please feel free open an issue. Oxygen is an open-source project and is still in its early development stages - we have a lot of features planned and would appreciate any help we can get!
