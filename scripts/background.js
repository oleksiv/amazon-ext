'use strict';

const {Observable, combineLatest, of, throwError} = rxjs;
const {map, switchMap, filter, catchError, tap} = rxjs.operators;

const MESSAGE_TYPE_HAZMAT = '1';
const MESSAGE_TYPE_UNGATE = '2';
const MESSAGE_TYPE_RESTRICTIONS = '3';
const MESSAGE_TYPE_DISABLE_EXTENSION = '4';

class AmazonService {
    isHazMat(domain, asin, callback) {
        const URL = 'https://sellercentral.amazon.' + domain + '/hz/m/sourcing/inbound/eligibility?ref_=ag_src-elig_cont_src-mdp&asin=' + asin;
        const http = new HttpService();
        http.get(URL).pipe(
            catchError(result => {
                callback(null);
                return of(null);
            }),
            filter(result => result !== null),
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
            catchError(result => {
                callback(null);
                return of(null);
            }),
            filter(result => result !== null),
            map(result => {
                return !(jQuery(result).find('#myq-application-form-email-input').val() ||
                    jQuery(result).find("[name='appAction']").val() ||
                    jQuery(result).find("#application_dashboard_table").html() ||
                    jQuery(result).find(".su-video-page-container").html() ||
                    jQuery(result).find(".saw-module-header").html() ||
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
            catchError(result => {
                callback(null);
                return of(null);
            }),
            filter(result => result !== null),
            map(result => {
                /**
                 * @param result.products
                 */
                if (!Array.isArray(result.products)) {
                    if (result.indexOf("cross-regional accounts") !== -1) {
                        console.log("Enable single sign-on to access your cross-regional accounts with one set of credentials");
                    }
                    return null;
                }


                if (result.products.length) {

                    /**
                     * @param product.restrictedForAnyCondition
                     * @param product.restrictedForAllConditions
                     * @param product.pathToSellUrl
                     * @param product.qualificationMessages
                     */
                    const product = result.products[0];

                    try {

                        let needApproval = false;

                        if (!needApproval) {
                            needApproval = product.restrictedForAnyCondition && product.restrictedForAllConditions;
                        }

                        if (!needApproval) {
                            const needApprovalUrl = product.pathToSellUrl && product.pathToSellUrl.indexOf("approvalrequest") > -1;
                            needApproval = product.qualificationMessages.filter((item) =>
                                (
                                    /**
                                     * @param item.qualificationMessage
                                     * @param item.conditionList
                                     */
                                    item.qualificationMessage.indexOf("You need approval") ||
                                    item.qualificationMessage.indexOf("You are not approved")
                                ) &&
                                (
                                    !item.conditionList ||
                                    item.conditionList.split(',').filter(y => y.indexOf("New") !== -1).length > 0
                                )
                            ).length > 0 && needApprovalUrl;
                        }

                        return needApproval;
                    } catch (error) {
                        console.log(error);
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
        return new Observable(subscriber => {
            jQuery.ajax(url, {
                method: 'POST',
                data: body,
                success: (response) => {
                    subscriber.next(response);
                },
                error: (error) => {
                    console.log(' ------------- ERROR ----------------');
                    subscriber.error(error);
                }
            });
        });
    }

    get(url) {
        return new Observable(subscriber => {
            jQuery.ajax(url, {
                method: 'GET',
                success: (response) => {
                    subscriber.next(response);
                },
                error: (error) => {
                    console.log(' ------------- ERROR ----------------');
                    subscriber.error(error);
                }
            });
        });
    }
}

class ExtensionService {
    initializeStatus() {
        // Set status for toolbar icon. Define whether the extension is enabled by user.
        chrome.storage.sync.get({
            extensionEnabled: true,
        }, (items) => chrome.browserAction.setIcon({path: items.extensionEnabled ? 'ico/logo_32x32.png' : 'ico/logo_32x32_gray.png'}));
    }

    disable() {
        chrome.storage.sync.set({
            extensionEnabled: false,
        });
        chrome.browserAction.setIcon({path: 'ico/logo_32x32_gray.png'});
    }

    enable() {
        chrome.storage.sync.set({
            extensionEnabled: true,
        });
        chrome.browserAction.setIcon({path: 'ico/logo_32x32.png'});
    }

    toggle() {
        chrome.storage.sync.get({
            extensionEnabled: false,
        }, (items) => {
            items.extensionEnabled ? this.disable() : this.enable();
            // chrome.storage.sync.set({
            //     extensionEnabled: !items.extensionEnabled,
            // });
            // chrome.browserAction.setIcon({path: !items.extensionEnabled ? 'ico/logo_32x32.png' : 'ico/logo_32x32_gray.png'});
        });
    }
}

const amazon = new AmazonService();
const extension = new ExtensionService();

extension.initializeStatus();

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
    // Send callback regarding restrictions
    if (message.type === MESSAGE_TYPE_DISABLE_EXTENSION) {
        extension.disable();
        sendResponse(false);
    }

    return true;
});


// Listen on toolbar icon click
chrome.browserAction.onClicked.addListener(function (tab) {
    extension.toggle();
});







