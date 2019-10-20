'use strict';

const {Observable, combineLatest, of} = rxjs;
const {map, switchMap, filter} = rxjs.operators;

const MESSAGE_TYPE_HAZMAT = '1';
const MESSAGE_TYPE_UNGATE = '2';
const MESSAGE_TYPE_RESTRICTIONS = '3';
const RESTRICTED_MESSAGES = ['not approved'];

class AmazonService {
    isHazMat(domain, asin, callback) {
        const URL = 'https://sellercentral.amazon.' + domain + '/hz/m/sourcing/inbound/eligibility?ref_=ag_src-elig_cont_src-mdp&asin=' + asin;
        const http = new HttpService();
        http.get(URL).pipe(
            map(result => result.search('Hazmat') !== -1),
            switchMap(result => combineLatest(of(result), http.post('https://jsonplaceholder.typicode.com/posts', {
                asin: asin,
                type: 'hazmat',
                marketplace: domain,
                result: result,
            }))),
        ).subscribe(([result]) => {
            console.log(result);
            callback(result);
        });
    }

    unGate(domain, asin, callback) {
        const URL = "https://sellercentral.amazon." + domain + "/hz/approvalrequest?asin=" + asin;
        const http = new HttpService();
        http.get(URL).pipe(
            map(result => {
                return !(jQuery(result).find('#myq-application-form-email-input').val() ||
                    jQuery(result).find("[name='appAction']").val() ||
                    jQuery(result).find("#application_dashboard_table").html() ||
                    jQuery(result).find(".su-video-page-container").html() ||
                    jQuery(result).find("#myq-performance-check-heading-failure").html());
            }),
            switchMap(ungated => combineLatest(of(ungated), http.post('https://jsonplaceholder.typicode.com/posts', {
                asin: asin,
                type: 'ungate',
                marketplace: domain,
                result: ungated,
            }))),
        ).subscribe(([result]) => {
            console.log(result);
            callback(result);
        });
    }

    checkRestrictions(domain, asin, callback) {
        const URL = 'https://sellercentral.amazon.' + domain + '/productsearch/search?query=' + asin + '&page=1';
        const http = new HttpService();
        http.get(URL).pipe(
            map(result => {
                // If user is logged out
                if (jQuery('#ap_signin1a_pagelet, #merchant-picker-auth-status, #signInSubmit', result).length) {
                    return null;
                }

                if (typeof result === 'object') {
                    const JSON = result;
                    if (JSON.products.length) {
                        if (JSON.products[0].hasOwnProperty('salesRank')) {
                            // Global Rank
                        }
                        if (JSON.products[0].hasOwnProperty('restrictedForAllConditions')) {
                            if (JSON.products[0].restrictedForAllConditions) {
                                return true;
                            }
                        }
                        if (JSON.products[0].hasOwnProperty('qualificationMessages')) {
                            if (JSON.products[0].qualificationMessages.some(message => {
                                return RESTRICTED_MESSAGES.some(restricted_message =>
                                    message.qualificationMessage.indexOf(restricted_message) !== -1)
                            })) {
                                return true;
                            }
                        }
                    }
                }

                return false;
            }),
            switchMap(result => combineLatest(of(result), http.post('https://jsonplaceholder.typicode.com/posts', {
                asin: asin,
                type: 'restricted',
                marketplace: domain,
                result: result,
            }))),
        ).subscribe(([result]) => {
            console.log(result);
            callback(result);
        });
    }
}

class HttpService {
    post(url, body) {
        return Observable.create(function (observer) {
            jQuery.ajax(url, {
                method: 'POST',
                data: body,
                success: (response) => {
                    observer.next(response);
                },
                error: (error) => {
                    observer.throw(error);
                }
            });
        });
    }

    get(url) {
        return Observable.create(function (observer) {
            jQuery.ajax(url, {
                method: 'GET',
                success: (response) => {
                    observer.next(response);
                },
                error: (error) => {
                    observer.throw(error);
                }
            });
        });
    }
}

const amazon = new AmazonService();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Send callback regarding hazmat
    if (message.type === MESSAGE_TYPE_HAZMAT) {
        amazon.isHazMat(message.domain, message.message, sendResponse);
    }
    // Send callback regarding ungate
    if (message.type === MESSAGE_TYPE_UNGATE) {
        amazon.unGate(message.domain, message.message, sendResponse);
    }
    // Send callback regarding restrictions
    if (message.type === MESSAGE_TYPE_RESTRICTIONS) {
        amazon.checkRestrictions(message.domain, message.message, sendResponse);
    }

    return true;
});

// Set status for toolbar icon. Define whether the extension is enabled by user.
chrome.storage.sync.get({
    extensionEnabled: false,
}, (items) => chrome.browserAction.setIcon({path: items.extensionEnabled ? 'ico/logo_32x32.png' : 'ico/logo_32x32_gray.png'}));

// Listen on toolbar icon click
chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.storage.sync.get({
        extensionEnabled: false,
    }, (items) => {
        chrome.storage.sync.set({
            extensionEnabled: !items.extensionEnabled,
        });
        chrome.browserAction.setIcon({path: !items.extensionEnabled ? 'ico/logo_32x32.png' : 'ico/logo_32x32_gray.png'});
    });
});






