'use strict';

class Helper {
    isValidJson(string) {
        try {
            JSON.parse(string);
        } catch (e) {
            return false;
        }

        return true;
    }
}

const MESSAGE_TYPE_HAZMAT = 1;
const MESSAGE_TYPE_UNGATE = 2;
const MESSAGE_TYPE_RESTRICTIONS = 3;

const ASIN = window.location.href.match(/(?:[/dp/]|$)([A-Z0-9]{10})/i)[1];
// @todo define domain based on regex
const DOMAIN = 'co.uk';

const HTML = `
<div class="amazon-bar">
    <h1 class="amazon-product-title"></h1>
    <table class="amazon-detail-table"><tbody></tbody></table>
    <div class="amazon-ad-container">Your ad here</div>
    <span class="a-button a-spacing-small a-button-primary a-button-icon ungate-button">
        <span class="a-button-inner">
            <span class="a-button-text" aria-hidden="true">Ungate product</span>
        </span>
    </span>
</div>
`;

// Append bar template
jQuery('#desktop_buybox').prepend(HTML);

// Add title
jQuery('.amazon-product-title').text(jQuery('#productTitle').text());

// EVENTS
jQuery('.ungate-button').on('click', () => {
    jQuery('.ungate-button .a-button-text').html('Please, wait...');

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
        } else ungated = !jQuery(response).find("#myq-performance-check-heading-failure").html();

        jQuery('.ungate-button .a-button-text').text(ungated ? 'Success' : 'Failed to ungate');
    });
});

// Send MESSAGE_TYPE_HAZMAT message on init
chrome.runtime.sendMessage({type: MESSAGE_TYPE_HAZMAT, message: ASIN, domain: DOMAIN}, function (response) {
    console.log(response);
    const hazmat = response.search('Hazmat') !== -1;
    jQuery('.amazon-detail-table').find('tbody').prepend('<tr><td>Hazmat</td><td>' + (hazmat ? '<span class="text-danger">Yes</span>' : '<span class="text-success">No</span>') + '</td></tr>');
});

// Send MESSAGE_TYPE_RESTRICTIONS message on init
chrome.runtime.sendMessage({type: MESSAGE_TYPE_RESTRICTIONS, message: ASIN, domain: DOMAIN}, function (response) {
    let restricted = false;
    const helper = new Helper();
    if (helper.isValidJson(response)) {
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
    // Append result to detail table
    jQuery('.amazon-detail-table').find('tbody').prepend('<tr><td>Restricted</td><td>' + (restricted ? '<span class="text-danger">Yes</span>' : '<span class="text-success">No</span>') + '</td></tr>');
});







