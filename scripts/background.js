'use strict';

const MESSAGE_TYPE_HAZMAT = 1;
const MESSAGE_TYPE_UNGATE = 2;
const MESSAGE_TYPE_RESTRICTIONS = 3;

class AmazonService {
    isHazmat(domain, asin, callback) {
        const URL = 'https://sellercentral.amazon.' + domain + '/hz/m/sourcing/inbound/eligibility?ref_=ag_src-elig_cont_src-mdp&asin=' + asin;
        jQuery.ajax(URL, {
            method: 'GET',
            success: (response) => {
                callback(response);
            },
            error: (error) => {
                callback(false);
            }
        })
    }

    ungate(domain, asin, callback) {
        const URL = "https://sellercentral.amazon." + domain + "/hz/approvalrequest?asin=" + asin;
        jQuery.ajax(URL, {
            method: 'GET',
            success: (response) => {
                callback(response);
            },
            error: (error) => {
                callback(false);
            }
        });
    }

    checkRestrictions(domain, asin, callback) {
        const URL = 'https://sellercentral.amazon.' + domain + '/productsearch/search?query=' + asin + '&page=1';
        jQuery.ajax(URL, {
            method: 'GET',
            success: (response) => {
                callback(response);
            },
            error: (error) => {
                callback(false);
            }
        });
    }
}


const amazon = new AmazonService();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === MESSAGE_TYPE_HAZMAT) {
        amazon.isHazmat(message.domain, message.message, sendResponse);
    }

    if (message.type === MESSAGE_TYPE_UNGATE) {
        amazon.ungate(message.domain, message.message, sendResponse);
    }

    if (message.type === MESSAGE_TYPE_RESTRICTIONS) {
        amazon.checkRestrictions(message.domain, message.message, sendResponse);
    }

    return true;
});







