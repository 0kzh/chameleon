import React from 'react';

export const Toolbar = () => {
    return (
        <div id="chrome">
            <div id="controls">
                <div className="titlebar titlebar-mac">
                    <div className="titlebar-stoplight">
                    <div className="titlebar-close">
                        <svg x="0px" y="0px" viewBox="0 0 6.4 6.4" className="stoplight-buttons">
                        <polygon fill="#4d0000"
                            points="6.4,0.8 5.6,0 3.2,2.4 0.8,0 0,0.8 2.4,3.2 0,5.6 0.8,6.4 3.2,4 5.6,6.4 6.4,5.6 4,3.2"></polygon>
                        </svg>
                    </div>
                    <div className="titlebar-minimize">
                        <svg x="0px" y="0px" viewBox="0 0 8 1.1" className="stoplight-buttons">
                        <rect fill="#995700" width="8" height="1.1"></rect>
                        </svg>
                    </div>
                    <div className="titlebar-fullscreen">
                        <svg className="fullscreen-svg stoplight-buttons" x="0px" y="0px" viewBox="0 0 6 5.9">
                        <path fill="#006400" d="M5.4,0h-4L6,4.5V0.6C5.7,0.6,5.3,0.3,5.4,0z"></path>
                        <path fill="#006400" d="M0.6,5.9h4L0,1.4l0,3.9C0.3,5.3,0.6,5.6,0.6,5.9z"></path>
                        </svg>
                        <svg className="maximize-svg stoplight-buttons" x="0px" y="0px" viewBox="0 0 7.9 7.9">
                        <polygon fill="#006400"
                            points="7.9,4.5 7.9,3.4 4.5,3.4 4.5,0 3.4,0 3.4,3.4 0,3.4 0,4.5 3.4,4.5 3.4,7.9 4.5,7.9 4.5,4.5">
                        </polygon>
                        </svg>
                    </div>
                    </div>
                </div>

                <button id="back"></button>
                <button id="refresh"></button>

                <div id="navigation">
                    <div id="tab-bar">
                    <div className="chrome-tabs">
                        <div className="chrome-tabs-content"></div>
                        <div className="chrome-tabs-bottom-bar"></div>
                    </div>
                    <div id="add-tab-container">
                        <button id="add-tab"></button>
                        </div>
                    </div>

                    <div id="ripple-container" className="ripple" style={{display: "none"}}>
                    <span id="navbarIcon"></span>
                    <form id="location-form">
                        <span id="input-span">
                            <input id="location" type="text" placeholder="Search or enter address" disabled></input>
                        </span>
                    </form>
                    </div>
                </div>
                <div className="titlebar titlebar-windows">
                    <div className="control minimize">
                    <svg aria-hidden="true" version="1.1" viewBox="0 0 10 14">
                        <path d="M 0,5 10,5 10,6 0,6 Z" />
                    </svg>
                    </div>
                    <div className="control maximize">
                    <svg aria-hidden="true" version="1.1" viewBox="0 0 10 14">
                        <path className="icon-unmaximize"
                        d="m 2,1e-5 0,2 -2,0 0,8 8,0 0,-2 2,0 0,-8 z m 1,1 6,0 0,6 -1,0 0,-5 -5,0 z m -2,2 6,0 0,6 -6,0 z" />
                        <path className="icon-maximize" d="M 0,0 0,10 10,10 10,0 Z M 1,1 9,1 9,9 1,9 Z" />
                    </svg>
                    </div>
                    <div className="control close">
                    <svg aria-hidden="true" version="1.1" viewBox="0 0 10 14">
                        <path
                        d="M 0,0 0,0.7 4.3,5 0,9.3 0,10 0.7,10 5,5.7 9.3,10 10,10 10,9.3 5.7,5 10,0.7 10,0 9.3,0 5,4.3 0.7,0 Z" />
                    </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}