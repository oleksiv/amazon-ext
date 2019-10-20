'use strict';

document.getElementById('save-button').addEventListener('click', saveOptions);
document.addEventListener('DOMContentLoaded', restoreOptions);

function saveOptions() {
    chrome.storage.sync.set({
        acceptedAgreement: jQuery('#enableExtension').is(":checked"),
    }, () => {
        // Update status to let user know options were saved.
        jQuery('#messagesContainer').html('<div class="alert alert-success" role="alert">Options saved successfully</div>');
        setTimeout(() => {
            jQuery('#messagesContainer').html(null);
        }, 750);
    });
}

function restoreOptions() {
    chrome.storage.sync.get({
        acceptedAgreement: false,
    }, function (items) {
        jQuery('#enableExtension').prop('checked', items.acceptedAgreement);
    });
}
