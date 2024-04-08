// ==UserScript==
// @name         Paws
// @namespace    http://tombenner.co/
// @version      0.0.4
// @description  Keyboard shortcuts for the AWS Console
// @author       Tom Benner / xargsuk
// @match        https://*.console.aws.amazon.com/*
// @grant        none
// @require https://code.jquery.com/jquery-1.11.3.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/mousetrap/1.4.6/mousetrap.js
// @require https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore.js
// ==/UserScript==

$.noConflict();

function getCurrentRegion() {
    var url = window.location.href;
    var regionMatch = url.match(/https:\/\/([a-z0-9-]+)\.console\.aws\.amazon\.com/) || url.match(/region=([a-z0-9-]+)/);

    if (regionMatch && regionMatch[1]) {
        return regionMatch[1];
    } else {
        console.error('Paws: Unable to determine AWS region from URL');
        return 'us-east-1'; // Default to 'us-east-1' if the region can't be determined
    }
}

var Paws = {};

Paws.App = (function () {
    var self = this;

    self.commandsCallbacks = {
        //Home
        'home': { href: '/console' },
        // Services
        'cct': { href: '/cloudtrail/home#/events' },
        'ec2': {
            href: function () {
                return window.location.origin + '/ec2/v2/home#Instances:sort=desc:launchTime';
            }
        },
        'iam': { href: '/iam/home#home' },
        'rds': { href: '/rds/home#dbinstances:' },
        's3': { href: '/s3/home' },
        'vpc': { href: '/vpc/home' },
        'cfn': { href: '/cloudformation/home' },
        'clf': { href: '/cloudfront/v3/home' },
        'cd': { href: '/codesuite/codedeploy' },
        'cp': { href: '/codesuite/codepipeline' },
        'ssm': { href: '/systems-manager/home' },
        'da': { href: '/lambda/home' },
        'org': { href: '/organizations' },
        'cw': { href: '/cloudwatch' },
        // Pages
        'elb': { href: '/ec2/v2/home#LoadBalancers:' },
        'sg': { href: '/ec2/v2/home#SecurityGroups:sort=groupId' },
        // Navbar
        'j': { func: ['navbar', 'next'] },
        'k': { func: ['navbar', 'prev'] },
        'l': { func: ['navbar', 'select'] },
        'r': { func: ['navbar', 'toggleRegionSelection'] }, // Region selection
        'return': { func: ['navbar', 'select'] }, // This doesn't work on some services
        // Miscellaneous
        '/': { focus: '.gwt-TextBox:first' },
        '?': { open: 'https://github.com/xargsuk/paws#shortcuts' },
        // lambda searchbox ???? WIP
        'lam': { focus: '.inputAndSuggestions.input' },
        'alb': {
            href: function () {
                var sessionData = jQuery("meta[name='awsc-session-data']").attr("content");
                if (!sessionData) {
                    console.error('Paws: AWS session data not found');
                    return '#'; // Prevent navigation if the session data isn't found
                }

                var sessionDataObject = JSON.parse(sessionData);
                var currentRegion = sessionDataObject.infrastructureRegion;
                if (!currentRegion) {
                    console.error('Paws: Current region not found in session data');
                    return '#'; // Prevent navigation if the region isn't found
                }

                return `https://${currentRegion}.console.aws.amazon.com/ec2/home?region=${currentRegion}#LoadBalancers:v=3`;
            }
        }
    };


    self.init = function () {
        self.navbar = new Paws.Navbar();
        self.initCommands();
        self.log('Initialized');
    };

    self.initCommands = function () {
        _.each(self.commandsCallbacks, function (value, key) {
            var command = key;
            command = command.split('').join(' ');
            var callback;

            // Handling the 'href' as a function for dynamic URL generation (specifically for 'alb')
            if (typeof value['href'] === 'function') {
                callback = function () {
                    var url = value['href']();
                    self.log('Redirecting to ' + url);
                    window.location.href = url;
                };
            } else if (value['href']) {
                callback = function () {
                    self.log('Redirecting to ' + value['href']);
                    window.location.href = value['href'];
                };
            } else if (value['open']) {
                callback = function () {
                    self.log('Opening ' + value['open']);
                    window.open(value['open']);
                };
            } else if (value['focus']) {
                callback = function () {
                    self.log('Selecting ' + value['focus']);
                    jQuery(value['focus']).focus();
                };
            } else if (value['func']) {
                callback = function () {
                    self.log('Calling func');
                    var func = value['func'];
                    self[func[0]][func[1]]();
                };
            } else {
                self.log('Invalid callback');
            }

            Mousetrap.bind(command, function () {
                callback();
                return false;
            });
        });
    };

    self.log = function (message) {
        console.log('Paws: ' + message);
    };

    self.init();

    return self;
});

Paws.Navbar = (function () {
    var self = this;
    self.toggleRegionSelection = function () {
        var regionDropdown = jQuery("button[data-testid='more-menu__awsc-nav-regions-menu-button']");
        if (regionDropdown.length > 0) {
            regionDropdown.click();
            var regionList = jQuery(".nav-menu__regions__list");
            if (regionList.is(":visible")) {
                regionList.focus();
            } else {
                regionList.hide();
            }
        } else {
            self.log("Region dropdown not found");
        }
    };

    self.select = function () {
        var selectedAnchor = self.getSelectedAnchor();
        if (selectedAnchor.length == 0) {
            return;
        }
        // The [0] is necessary for the click to work on RDS
        selectedAnchor[0].click();
    };

    self.unfocus = function () {
        var selectedAnchor = self.getSelectedAnchor();
        if (selectedAnchor.length == 0) {
            return;
        }
        selectedAnchor.blur();
        selectedAnchor.removeClass('ak-navbar-selected');
        selectedAnchor.css('background-color', '');
    };

    self.next = function () {
        self.anchors = jQuery('.gwt-Anchor');
        var selectedAnchor = self.getSelectedAnchor();
        if (selectedAnchor.length == 0) {
            self.selectAnchor(self.anchors.first());
        } else {
            var index = self.anchors.index(selectedAnchor);
            var anchorToSelect = self.anchors.eq(index + 1);
            self.selectAnchor(anchorToSelect);
        }
    };

    self.prev = function () {
        self.anchors = jQuery('.gwt-Anchor');
        var selectedAnchor = self.getSelectedAnchor();
        if (selectedAnchor.length == 0) {
            self.selectAnchor(self.anchors.last());
        } else {
            var index = self.anchors.index(selectedAnchor);
            var anchorToSelect = self.anchors.eq(index - 1);
            self.selectAnchor(anchorToSelect);
        }
    };

    self.getSelectedAnchor = function () {
        return self.anchors.filter('.ak-navbar-selected:first');
    };

    self.selectAnchor = function (anchor) {
        self.anchors.removeClass('ak-navbar-selected');
        self.anchors.css('background-color', '');
        anchor.css('background-color', 'LightCyan');
        anchor.addClass('ak-navbar-selected');
        anchor.focus();
    };
});

new Paws.App();
