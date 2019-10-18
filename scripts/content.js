'use strict';

const MESSAGE_TYPE_HAZMAT = 1;
const MESSAGE_TYPE_UNGATE = 2;
const MESSAGE_TYPE_RESTRICTIONS = 3;
const RESTRICTED_MESSAGES = ['not approved'];
const ASIN = window.location.href.match(/(?:[/dp/]|$)([A-Z0-9]{10})/i)[1];
const DOMAIN = getDomain(window.location.href);
const WRAPPER = `<div id="amazonWrapper"></div>`;
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
const EXTENSION_DISABLED = `
    <div class="amazon-bar">
        <h1 class="amazon-product-title text-danger">Extension is disabled. You have to agree with the Terms and Conditions before you can start using it.</h1>
        <span class="a-button a-spacing-small a-button-primary a-button-icon ungate-button" id="goToOptions">
            <span class="a-button-inner">
                <span class="a-button-text" aria-hidden="true">Go to options</span>
            </span>
        </span>
    </div>
`;
const EXTENSION_LOGIN = `
    <div class="amazon-bar">
        <h1 class="amazon-product-title text-danger">Please login to Seller Central</h1>
        <span class="a-button a-spacing-small a-button-primary a-button-icon ungate-button" id="goToLogin">
            <span class="a-button-inner">
                <span class="a-button-text" aria-hidden="true">Go to login page</span>
            </span>
        </span>
    </div>
`;

// Append wrapper
jQuery('#rightCol').prepend(WRAPPER);

chrome.storage.sync.get({
    enableExtension: false,
}, function (items) {
    if (items.enableExtension) {
        jQuery('#amazonWrapper').prepend(HTML);

        // Add title
        jQuery('.amazon-product-title').text(jQuery('#productTitle').text());

        // Listen events
        jQuery('.ungate-button').on('click', () => {
            jQuery('.ungate-button .a-button-text').html('Please, wait...');

            chrome.runtime.sendMessage({type: MESSAGE_TYPE_UNGATE, message: ASIN, domain: DOMAIN}, function (response) {
                if (response) {
                    let ungated = false;

                    if (jQuery(response).find('#myq-application-form-email-input').val()) {
                        ungated = false;
                    } else if (jQuery(response).find("[name='appAction']").val()) {
                        ungated = false;
                    } else if (jQuery(response).find("#application_dashboard_table").html()) {
                        ungated = false;
                    } else if (jQuery(response).find(".su-video-page-container").html()) {
                        ungated = false;
                    } else ungated = !jQuery(response).find("#myq-performance-check-heading-failure").html();

                    jQuery('.ungate-button .a-button-text').text(ungated ? 'Success' : 'Failed to ungate');
                } else {
                    userIsNotLoggedIn();
                }
            });
        });

        // Send MESSAGE_TYPE_HAZMAT message on init
        chrome.runtime.sendMessage({type: MESSAGE_TYPE_HAZMAT, message: ASIN, domain: DOMAIN}, function (response) {
            if (response) {
                const hazmat = response.search('Hazmat') !== -1;
                jQuery('.amazon-detail-table').find('tbody').prepend('<tr><td>Hazmat</td><td>' + (hazmat ? '<span class="text-danger">Yes</span>' : '<span class="text-success">No</span>') + '</td></tr>');
            } else {
                userIsNotLoggedIn();
            }
        });

        // Send MESSAGE_TYPE_RESTRICTIONS message on init
        chrome.runtime.sendMessage({
            type: MESSAGE_TYPE_RESTRICTIONS,
            message: ASIN,
            domain: DOMAIN
        }, function (response) {
            if (response) {
                let restricted = false;
                if (typeof response === 'object') {
                    const JSON = response;
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
                            if (JSON.products[0].qualificationMessages.some(message => {
                                return RESTRICTED_MESSAGES.some(restricted_message =>
                                    message.qualificationMessage.indexOf(restricted_message) !== -1)
                            })) {
                                restricted = true;
                            }
                        }
                    }
                }
                // Append result to detail table
                jQuery('.amazon-detail-table').find('tbody').prepend('<tr><td>Restricted</td><td>' + (restricted ? '<span class="text-danger">Yes</span>' : '<span class="text-success">No</span>') + '</td></tr>');
            } else {
                userIsNotLoggedIn();
            }
        });
    } else {
        jQuery('#amazonWrapper').html(EXTENSION_DISABLED);
        jQuery('#goToOptions').on('click', () => {
            window.open(chrome.runtime.getURL('options.html'), '_blank');
        });
    }
});


function userIsNotLoggedIn() {
    jQuery('#amazonWrapper').html(EXTENSION_LOGIN);
    jQuery('#goToLogin').on('click', () => {
        window.open('https://sellercentral.amazon.co.uk/', '_blank');
    });
}

function getDomain(url) {
    if (!url) {
        return null
    }

    const re = /.+amazon\.([a-z.]{2,6})\/.*/;
    const match = url.match(re);
    if (match == null) {
        return null;
    }
    return match.length ? match[1] : null;
}









