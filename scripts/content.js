'use strict';

const MESSAGE_TYPE_HAZMAT = '1';
const MESSAGE_TYPE_UNGATE = '2';
const MESSAGE_TYPE_RESTRICTIONS = '3';
const MESSAGE_TYPE_DISABLE_EXTENSION = '4';

const run = function (matches) {
    console.log('----------- Extension box should appear on this page ------------');

    const ASIN = matches[6];
    const DOMAIN = matches[1];

    // Append wrapper
    jQuery('#rightCol').prepend('<div id="app"></div>');

    /**
     * @class Vue
     */
    new Vue({
        el: '#app',
        template: `
        <div class="card amazon-bar mb-3" v-if="extensionEnabled !== false">
            <div class="card-header d-inline-block text-justify"><div class="form-row"><div class="col-10">Restricted or Hazmat</div><div class="col-2 text-right close-btn" v-on:click="disableExtension()"><i class="fa fa-times"></i></div></div></div>
            <div class="card-body">
                <div v-if="!userNotLoggedIn && acceptedAgreement && extensionEnabled">
                    <table class="table table-bordered amazon-detail-table">
                        <tbody>
                            <tr>
                                <td>Restricted</td>
                                <td class="text-center" v-bind:class="{ 'bg-danger': restricted === true, 'bg-success': restricted === false }">
                                    <b v-show="restricted === null"><i class="fa fa-spinner fa-spin"></i></b>
                                    <b v-show="restricted === true" class="text-white">Yes</b>
                                    <b v-show="restricted === false" class="text-white">No</b>
                                </td>
                            </tr>
                            <tr>
                                <td>Hazmat</td>
                                <td class="text-center" v-bind:class="{ 'bg-danger': hazmat === true, 'bg-success': hazmat === false }">
                                    <b v-show="hazmat === null"><i class="fa fa-spinner fa-spin"></i></b>
                                    <b v-show="hazmat === true" class="text-white">Yes</b>
                                    <b v-show="hazmat === false" class="text-white">No</b>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <button class="btn btn-block btn-cyan mb-3" v-show="ungated === null" v-if="restricted" v-on:click="tryToUnGate()">
                        <b v-show="ungated === null && !ungatedLoading">Try to Ungate?</b>
                        <b v-show="ungated === null && ungatedLoading">Loading <i class="ml-2 fa fa-spinner fa-spin"></i></b>
                    </button>
                    <div class="alert alert-danger mb-3 text-center" v-if="ungated === false">Failed to Ungate</div>
                    <div class="alert alert-success mb-3 text-center" v-if="ungated === true">Ungate Success</div>
                </div>
                
                <!-- Extension is not enabled -->
                <div v-if="!extensionEnabled">
                    <div class="alert alert-danger" role="alert">
                        You should enable it
                    </div>                  
                </div>
                
                <!--User has to agree with the term asd conditions-->
                <div v-if="!acceptedAgreement">
                    <div class="alert alert-info" role="alert">
                      You have to agree with the Terms and Conditions before you can start using this extension.
                    </div>
                </div>
               
                <!--User is not logged in -->
                <div v-if="userNotLoggedIn">
                    <div class="alert alert-danger" role="alert">
                      Please login to Seller Central
                    </div>
                </div>
                
                <!-- Go to login page-->
                <div v-if="userNotLoggedIn">
                    <button class="btn btn-block btn-cyan mb-3" v-on:click="goToLoginPage()">Go to login page</button>
                </div>
                
                <!-- Go to options page-->
                <div v-if="!acceptedAgreement">
                    <button class="btn btn-block btn-cyan mb-3" v-on:click="goToOptionsPage()">Terms and Conditions</button>
                </div>
            </div>
            <div class="card-footer"><a href="https://selleramp.com" target="_blank">From Seller Amp</a></div>
        </div>
    `,
        data: {
            restricted: null,
            hazmat: null,
            ungated: null,
            ungatedLoading: false,

            userNotLoggedIn: false,

            extensionEnabled: false,
            acceptedAgreement: false
        },
        created: function () {
            // Check whether the extension is enabled
            chrome.storage.sync.get({extensionEnabled: true}, (items) => {
                this.extensionEnabled = items.extensionEnabled;
            });

            // Check whether the extension is enabled
            chrome.storage.sync.get({acceptedAgreement: false}, (items) => {
                this.acceptedAgreement = items.acceptedAgreement;
            });
        },
        computed: {
            enabled: function () {
                // `.join()` because we don't care about the return value.
                return [this.extensionEnabled, this.acceptedAgreement].join()
            }
        },
        watch: {
            enabled: function () {
                if (this.extensionEnabled && this.acceptedAgreement) {
                    // Hazmat
                    chrome.runtime.sendMessage({type: MESSAGE_TYPE_HAZMAT, message: ASIN, domain: DOMAIN}, (result) => {
                        this.hazmat = result;
                        this.userNotLoggedIn = result === null;
                    });

                    // Restrictions
                    chrome.runtime.sendMessage({
                        type: MESSAGE_TYPE_RESTRICTIONS,
                        message: ASIN,
                        domain: DOMAIN
                    }, (result) => {
                        console.log('Restricted ' + result);
                        this.restricted = result;
                        this.userNotLoggedIn = result === null;
                    });
                }
            }
        },
        methods: {
            disableExtension: function () {
                chrome.runtime.sendMessage({type: MESSAGE_TYPE_DISABLE_EXTENSION}, (result) => {
                    this.extensionEnabled = result;
                });
            },
            tryToUnGate: function () {
                this.ungatedLoading = true;
                this.ungated = null;

                chrome.runtime.sendMessage({type: MESSAGE_TYPE_UNGATE, message: ASIN, domain: DOMAIN}, (ungated) => {
                    this.ungated = ungated;
                    this.restricted = !ungated;
                    this.userNotLoggedIn = ungated === null;
                    this.ungatedLoading = false;
                });
            },
            goToOptionsPage: function () {
                window.open(chrome.runtime.getURL('options.html'), '_blank');
            },
            goToLoginPage: function () {
                window.open('https://sellercentral.amazon.co.uk/', '_blank');
            }
        }
    });
};

const URL_MATCHES = window.location.href.match(/https:\/\/www.amazon.(com|fr|de|co.uk|es|it|ca|com.mx|com.br|co.jp|cn|in|com.au)\/([\w%-]+\/)?(dp|gp\/offer-listing|gp(\/product)?)\/(\w+\/)?(\w{10})/i);

if (URL_MATCHES) {
    run(URL_MATCHES);
}








