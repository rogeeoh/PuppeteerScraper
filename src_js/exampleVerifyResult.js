const parsed = {
    elements: {
        title: {
            type: 'String',
            isRequired: true,
            isArray: false,
            from: {
                context: 'Context',
                selector: 'div.card-title',
                evaluate: 'textContent'
            },
            onError: [
                {
                    policy: 'Alternative',
                    type: 'String',
                    isRequired: true,
                    isArray: false,
                    from: {
                        context: 'Context',
                        selector: 'div.card-title2',
                        waitForSelector: 'div.card-title2',
                        evaluate: 'textContent'
                    }
                },
                {policy: 'skip'},
            ],
        },
        writer: {
            type: 'String',
            isRequired: true,
            isArray: false,
            from: {
                context: 'Context',
                selector: 'div.card-writer',
                evaluate: 'textContent'
            }
        },
        content: {
            type: 'String',
            isRequired: false,
            isArray: false,
            from: {
                context: 'Context',
                selector: 'div.content',
                evaluate: 'textContent'
            },
            onError: [
                {
                    policy: 'Callback',
                    name: 'onContentError',
                },
            ]
        },
        date: {
            type: 'Match',
            regex: 'yyyy-mm-dd',
            isRequired: true,
            isArray: false,
            from: {
                context: 'Context',
                xPath: '//*[@id="rso"]/div[3]/div/div/a/h3/span',
                waitForXPath: '//*[@id="rso"]/div[3]/div/div/a/h3/span',
                evaluate: 'textContent'
            }
        },
        video_link: {
            type: 'String',
            isRequired: true,
            isArray: false,
            from: {
                context: 'Frame',
                frameSelector: '#videoFrame',
                selector: 'div.video > video',
                evaluate: {
                    getAttribute: 'src'
                }
            }
        },
        files: {
            type: 'String',
            isRequired: false,
            isArray: true,
            from: {
                context: 'Page',
                selector: 'div.files > a',
                evaluate: 'textContent'
            }
        },
        url: {
            type: 'String',
            isRequired: true,
            isArray: false,
            from: {
                context: 'Callback',
                name: 'getLinkUrl'
            }
        },
        site_name: {
            type: 'String',
            isRequired: true,
            isArray: false,
            staticValue: '금융감독원'
        },
    },
    collect: {
        main: ['title', 'sub_title', 'writer', 'date'],
        sub: ['content', 'content_html', 'files', 'video_link', 'url', 'site_name'],
    }
};