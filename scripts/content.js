'use strict';

const MESSAGE_TYPE_ASIN = 1;

const ASIN = window.location.href.match(/(?:[/dp/]|$)([A-Z0-9]{10})/i);

chrome.runtime.sendMessage({type: MESSAGE_TYPE_ASIN, message: ASIN[1]});

console.log(ASIN[1]);


