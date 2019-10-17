'use strict';


const MESSAGE_TYPE_HAZMAT = 1;
const MESSAGE_TYPE_UNGATE = 2;
const MESSAGE_TYPE_RESTRICTIONS = 3;

const ASIN = window.location.href.match(/(?:[/dp/]|$)([A-Z0-9]{10})/i)[1];
const DOMAIN = 'co.uk';

chrome.runtime.sendMessage({type: MESSAGE_TYPE_HAZMAT, message: ASIN, domain: DOMAIN}, function (response) {
    console.log(response);
});

chrome.runtime.sendMessage({type: MESSAGE_TYPE_UNGATE, message: ASIN, domain: DOMAIN}, function (response) {
    console.log(response);
});

chrome.runtime.sendMessage({type: MESSAGE_TYPE_RESTRICTIONS, message: ASIN, domain: DOMAIN}, function (response) {
    console.log(response);
});

console.log(ASIN[1]);


