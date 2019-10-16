'use strict';

const {map, filter, switchMap} = rxjs.operators;
const {Observable} = rxjs;
const {combineLatest, of} = rxjs;

class MainParser {

    MESSAGE_TYPE_ASIN = 1;

    DANGEROUS_GOODS_REGEX = 'This product is not classified as dangerous goods';
    NOT_DANGEROUS_GOODS_REGEX = 'This product is dangerous goods';

    createMessageObservable() {
        return Observable.create(function (observer) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                observer.next(message)
            });
        });
    }

    getCookies() {
        return Observable.create(function (observer) {
            chrome.cookies.get({'url': 'https://sellercentral.amazon.co.uk', 'name': 'x-acbuk'}, function (cookie) {
                console.log(cookie);

                if (cookie) {
                    observer.next(JSON.parse(cookie.value));
                }
            });
        });
    }

    run() {
        const httpHelper = new HttpHelper();
        this.createMessageObservable()
            .pipe(
                filter(message => message.type === this.MESSAGE_TYPE_ASIN),
                map(message => message.message),
                switchMap((ASIN) => {
                    const array = [
                        'client=FullPageHelp',
                        'addHelpConditionalProcessing=true',
                        'directAnswerWidgetId=da-intent-hazmat-paragonforsellers',
                        'workflowId=fba_dangerous_goods',
                    ];
                    return combineLatest(of(ASIN), httpHelper.post('https://sellercentral.amazon.co.uk/help/workflow/execute-workflow?client=FullPageHelp&addHelpConditionalProcessing=true&directAnswerWidgetId=da-intent-hazmat-paragonforsellers&workflowId=fba_dangerous_goods', array.join('&'),
                        {
                            'Accept': 'text/html,*/*',
                            'Content-type': 'application/x-www-form-urlencoded',
                            'Origin': 'https://sellercentral.amazon.co.uk',
                            'Sec-Fetch-Mode': 'cors',
                            'X-Requested-With': 'XMLHttpRequest',
                            'Referer': 'https://sellercentral.amazon.co.uk/gp/help/help.html?itemID=201003400&fbclid=IwAR3db00s1N0mrSZGo0awFq4H7qBj7dI_4fwkc2Uu8YzrjQ35uMTLu0MBgnI&',
                        }
                    ));
                }),
                switchMap(([ASIN, content]) => {
                    const search = jQuery(content).find('.asp-declarative');
                    const tokenAttribute = JSON.parse(search.attr('data-augur_paramount_workflow_clicked'));

                    const array = [
                        'workflowId=fba_dangerous_goods',
                        'requiredAttributes%5B%5D=is_asin_available',
                        'currentStepName=determine_if_seller_has_an_asin_task_1ozyrjg_task_1ozyrjg',
                        'sxaugur.encrypt.newAttributes=' + encodeURI(JSON.stringify({"is_asin_available": "Yes"})),
                        'diagRunId=' + tokenAttribute.diagRunId,
                        'client=FullPageHelp',
                        'paramountEphUser=undefined',
                        'paramountEphUuid=undefined',
                        'isResumingWorkflow=undefined',
                    ];

                    return combineLatest(of(ASIN), of(tokenAttribute.diagRunId), httpHelper.post(' https://sellercentral.amazon.co.uk/help/workflow/execute-workflow?sif_profile=SXAugurExecuteWorkflowParamsEU', array.join('&'),
                        {
                            'Accept': 'text/html,*/*',
                            'Content-type': 'application/x-www-form-urlencoded',
                            'Origin': 'https://sellercentral.amazon.co.uk',
                            'Sec-Fetch-Mode': 'cors',
                            'X-Requested-With': 'XMLHttpRequest',
                            'Referer': 'https://sellercentral.amazon.co.uk/gp/help/help.html?itemID=201003400&fbclid=IwAR3db00s1N0mrSZGo0awFq4H7qBj7dI_4fwkc2Uu8YzrjQ35uMTLu0MBgnI&',
                        }
                    ));
                }),
                switchMap(([ASIN, diagRunId, content]) => {
                    // const search = jQuery(content).find('.asp-declarative');
                    // const tokenAttribute = JSON.parse(search.attr('data-augur_paramount_workflow_clicked'));
                    // console.log(tokenAttribute.diagRunId);

                    const array = [
                        'workflowId=fba_dangerous_goods',
                        'requiredAttributes%5B%5D=item_id',
                        'requiredAttributes%5B%5D=obtain_asin_blurb',
                        'requiredAttributes%5B%5D=continue_task_18ie4by',
                        'currentStepName=obtain_asin_task_18ie4by_task_18ie4by',
                        'sxaugur.encrypt.newAttributes=' + encodeURI(JSON.stringify({
                            "continue_task_18ie4by": "true",
                            "item_id": ASIN
                        })),
                        'diagRunId=' + diagRunId,
                        'client=FullPageHelp',
                        'paramountEphUser=undefined',
                        'paramountEphUuid=undefined',
                        'isResumingWorkflow=false',
                    ];

                    return httpHelper.post('https://sellercentral.amazon.co.uk/help/workflow/execute-workflow?sif_profile=SXAugurExecuteWorkflowParamsEU', array.join('&'),
                        {
                            'Accept': 'text/html,*/*',
                            'Content-type': 'application/x-www-form-urlencoded',
                            'Origin': 'https://sellercentral.amazon.co.uk',
                            'Sec-Fetch-Mode': 'cors',
                            'X-Requested-With': 'XMLHttpRequest',
                            'Referer': 'https://sellercentral.amazon.co.uk/gp/help/help.html?itemID=201003400&fbclid=IwAR3db00s1N0mrSZGo0awFq4H7qBj7dI_4fwkc2Uu8YzrjQ35uMTLu0MBgnI&',
                        },
                    );
                }),
            )
            .subscribe(data => {
                const html = jQuery.parseHTML(data);
                console.log(html);
            });
    }
}

class HttpHelper {
    post(url, data, headers) {
        return Observable.create(function (observer) {
            const Http = new XMLHttpRequest();
            Http.open('POST', url, true);
            if (headers) {
                Object.keys(headers).forEach((key) => {
                    Http.setRequestHeader(key, headers[key]);
                });
            }
            Http.send(data);
            Http.onreadystatechange = (e) => {
                if (Http.readyState === 4 && Http.status === 200) {
                    observer.next(Http.responseText);
                }
            }
        });
    }

    get(url, headers) {
        return Observable.create(function (observer) {
            const Http = new XMLHttpRequest();
            Http.open('GET', url);
            if (headers) {
                Object.keys(headers).forEach((key) => {
                    Http.setRequestHeader(key, headers[key]);
                });
            }
            Http.send();
            Http.onreadystatechange = (e) => {
                if (Http.readyState === 4 && Http.status === 200) {
                    observer.next(Http.responseText);
                }
            }
        });
    }
}


const mainParser = new MainParser();
mainParser.run();





