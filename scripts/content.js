'use strict';


const MESSAGE_TYPE_HAZMAT = 1;
const MESSAGE_TYPE_UNGATE = 2;
const MESSAGE_TYPE_RESTRICTIONS = 3;

const ASIN = window.location.href.match(/(?:[/dp/]|$)([A-Z0-9]{10})/i)[1];
const DOMAIN = 'co.uk';

// Create a container

jQuery('#rightCol').prepend('<div class="amazon-extension"><table><tbody></tbody></table></div>');


chrome.runtime.sendMessage({type: MESSAGE_TYPE_HAZMAT, message: ASIN, domain: DOMAIN}, function (response) {
    console.log(response);
    const hazmat = response.search('Hazmat') !== -1;
    jQuery('.amazon-extension').find('table > tbody').prepend('<tr><td>Hazmat</td><td>' + (hazmat ? 'true' : 'false') + '</td></tr>');
});

chrome.runtime.sendMessage({type: MESSAGE_TYPE_UNGATE, message: ASIN, domain: DOMAIN}, function (response) {
    let ungated = false;

    if (jQuery(response).find('#myq-application-form-email-input').val()) {
        ungated = false;
    } else if (jQuery(response).find("[name='appAction']").val()) {
        ungated = false;
        alert("Please Login To Seller Center");
    } else if (jQuery(response).find("#application_dashboard_table").html()) {
        ungated = false;
    } else if (jQuery(response).find(".su-video-page-container").html()) {
        ungated = false;
    } else if (jQuery(response).find("#myq-performance-check-heading-failure").html()) {
        ungated = false;
    } else {
        ungated = true;
    }

    jQuery('.amazon-extension').find('table > tbody').prepend('<tr><td>Ungated</td><td>' + (ungated ? 'true' : 'false') + '</td></tr>');
});

chrome.runtime.sendMessage({type: MESSAGE_TYPE_RESTRICTIONS, message: ASIN, domain: DOMAIN}, function (response) {
    let restricted = false;

    if (validJson(response)) {

        const JSON = JSON.parse(response);

        if (JSON.products.length) {
            if (JSON.products[0].hasOwnProperty('salesRank')) {
                // Global Rank
            }

            if (JSON.products[0].hasOwnProperty('restrictedForAllConditions')) {
                if (JSON.products[0].restrictedForAllConditions) {
                    restricted = true;
                }
            }

            if (JSON.products[0].hasOwnProperty('qualificationMessages')) {

                for (var i = 0; i < JSON.products[0].qualificationMessages.length; i++) {
                    if (JSON.products[0].qualificationMessages[i].qualificationMessage.indexOf("You need approval to list this brand") >= 0) {
                        if (JSON.products[0].qualificationMessages[i].conditionList != null) {
                            if (JSON.products[0].qualificationMessages[i].conditionList.indexOf("new") >= 0) {
                                restricted = true;
                            } else if (JSON.products[0].qualificationMessages[i].conditionList.indexOf("New") >= 0) {
                                restricted = true;
                            }

                        } else {
                            restricted = true;
                        }
                    } else if (JSON.products[0].qualificationMessages[i].qualificationMessage.indexOf("You need approval") >= 0) {
                        if (JSON.products[0].qualificationMessages[i].conditionList != null) {
                            if (JSON.products[0].qualificationMessages[i].conditionList.indexOf("new") >= 0) {
                                restricted = true;
                            } else if (JSON.products[0].qualificationMessages[i].conditionList.indexOf("New") >= 0) {
                                restricted = true;
                            }
                        }

                    } else if (JSON.products[0].qualificationMessages[i].qualificationMessage.indexOf("You cannot list") >= 0) {
                        if (JSON.products[0].qualificationMessages[i].conditionList != null) {
                            if (JSON.products[0].qualificationMessages[i].conditionList.indexOf("new") >= 0) {
                                restricted = true;
                            } else if (JSON.products[0].qualificationMessages[i].conditionList.indexOf("New") >= 0) {
                                restricted = true;
                            }
                        }
                    }
                }
            }
        }
    }
    jQuery('.amazon-extension').find('table > tbody').prepend('<tr><td>Restricted</td><td>' + (restricted ? 'true' : 'false') + '</td></tr>');
});

console.log(ASIN[1]);

function validJson(string) {
    try {
        JSON.parse(string);
    } catch (e) {
        return false;
    }

    return true;
}




