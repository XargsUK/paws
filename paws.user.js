// ==UserScript==
// @name         Paws
// @namespace    http://tombenner.co/
// @version      0.1.0
// @description  Keyboard shortcuts for the AWS Console
// @author       Tom Benner / xargsuk
// @match        https://*.console.aws.amazon.com/*
// @grant        none
// @require https://code.jquery.com/jquery-3.7.1.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/mousetrap/1.6.5/mousetrap.min.js
// ==/UserScript==

const $ = jQuery.noConflict();

const Paws = {
    getCurrentRegion() {
        const url = window.location.href;
        const regionMatch = url.match(/https:\/\/([a-z0-9-]+)\.console\.aws\.amazon\.com/) || url.match(/region=([a-z0-9-]+)/);

        if (regionMatch?.[1]) {
            return regionMatch[1];
        }

        // Try to get region from AWS session data
        try {
            const sessionData = $("meta[name='awsc-session-data']").attr("content");
            if (sessionData) {
                const sessionDataObject = JSON.parse(sessionData);
                if (sessionDataObject?.infrastructureRegion) {
                    return sessionDataObject.infrastructureRegion;
                }
            }
        } catch (error) {
            console.error('Paws: Error parsing session data', error);
        }

        console.warn('Paws: Unable to determine AWS region from URL, defaulting to us-east-1');
        return 'us-east-1';
    },

    log(message) {
        console.log(`Paws: ${message}`);
    }
};

class PawsApp {
    constructor() {
        this.navbar = new PawsNavbar();
        this.commandsCallbacks = {
            // Home
            'home': { href: '/console' },
            // Services
            'ct': { href: '/cloudtrail/home#/events' },
            'cct': { href: '/cloudtrail/home#/events' }, // Keep for backwards compatibility
            'ec2': {
                href: () => `${window.location.origin}/ec2/v2/home#Instances:sort=desc:launchTime`
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
            'pam': { href: '/ec2/v2/home#Images:visibility=owned-by-me' },
            'peb': { href: '/ec2/v2/home#Volumes:' },
            'pel': { href: '/ec2/v2/home#LoadBalancers:' },
            'psg': { href: '/ec2/v2/home#SecurityGroups:sort=groupId' },
            'elb': { href: '/ec2/v2/home#LoadBalancers:' },
            'sg': { href: '/ec2/v2/home#SecurityGroups:sort=groupId' },
            // Navbar
            'j': { func: () => this.navbar.next() },
            'k': { func: () => this.navbar.prev() },
            'l': { func: () => this.navbar.select() },
            'r': { func: () => this.navbar.toggleRegionSelection() },
            'return': { func: () => this.navbar.select() },
            // Miscellaneous
            '/': { focus: '.gwt-TextBox:first' },
            '?': { open: 'https://github.com/xargsuk/paws#shortcuts' },
            // Lambda searchbox
            'lam': { focus: '.inputAndSuggestions.input' },
            'alb': {
                href: () => {
                    const currentRegion = Paws.getCurrentRegion();
                    return `https://${currentRegion}.console.aws.amazon.com/ec2/home?region=${currentRegion}#LoadBalancers:v=3`;
                }
            }
        };

        this.init();
    }

    init() {
        this.initialiseCommands();
        Paws.log('Initialised');
    }

    initialiseCommands() {
        Object.entries(this.commandsCallbacks).forEach(([key, value]) => {
            const command = key.split('').join(' ');
            let callback;

            if (typeof value.href === 'function') {
                callback = () => {
                    const url = value.href();
                    if (url && url !== '#') {
                        Paws.log(`Redirecting to ${url}`);
                        window.location.href = url;
                    } else {
                        Paws.log('Unable to generate URL for navigation');
                    }
                };
            } else if (value.href) {
                callback = () => {
                    Paws.log(`Redirecting to ${value.href}`);
                    window.location.href = value.href;
                };
            } else if (value.open) {
                callback = () => {
                    Paws.log(`Opening ${value.open}`);
                    window.open(value.open);
                };
            } else if (value.focus) {
                callback = () => {
                    const element = $(value.focus);
                    if (element.length > 0) {
                        Paws.log(`Focussing ${value.focus}`);
                        element.focus();
                    } else {
                        Paws.log(`Element ${value.focus} not found`);
                    }
                };
            } else if (value.func) {
                callback = () => {
                    Paws.log('Calling function');
                    value.func();
                };
            } else {
                Paws.log('Invalid callback');
                return;
            }

            Mousetrap.bind(command, () => {
                callback();
                return false;
            });
        });
    }
}

class PawsNavbar {
    constructor() {
        this.anchors = null;
        this.updateAnchors();
    }

    updateAnchors() {
        this.anchors = $('.gwt-Anchor');
    }

    toggleRegionSelection() {
        const regionDropdown = $("button[data-testid='more-menu__awsc-nav-regions-menu-button']");
        if (regionDropdown.length > 0) {
            regionDropdown.click();
            const regionList = $(".nav-menu__regions__list");
            if (regionList.is(":visible")) {
                regionList.focus();
            } else {
                regionList.hide();
            }
        } else {
            Paws.log("Region dropdown not found");
        }
    }

    select() {
        const selectedAnchor = this.getSelectedAnchor();
        if (selectedAnchor.length === 0) {
            Paws.log("No anchor selected");
            return;
        }
        // The [0] is necessary for the click to work on RDS
        selectedAnchor[0].click();
    }

    unfocus() {
        const selectedAnchor = this.getSelectedAnchor();
        if (selectedAnchor.length === 0) {
            return;
        }
        selectedAnchor.blur();
        selectedAnchor.removeClass('ak-navbar-selected');
        selectedAnchor.css('background-color', '');
    }

    next() {
        this.updateAnchors();
        if (this.anchors.length === 0) {
            Paws.log("No anchors found");
            return;
        }

        const selectedAnchor = this.getSelectedAnchor();
        if (selectedAnchor.length === 0) {
            this.selectAnchor(this.anchors.first());
        } else {
            const index = this.anchors.index(selectedAnchor);
            if (index < this.anchors.length - 1) {
                const anchorToSelect = this.anchors.eq(index + 1);
                this.selectAnchor(anchorToSelect);
            }
        }
    }

    prev() {
        this.updateAnchors();
        if (this.anchors.length === 0) {
            Paws.log("No anchors found");
            return;
        }

        const selectedAnchor = this.getSelectedAnchor();
        if (selectedAnchor.length === 0) {
            this.selectAnchor(this.anchors.last());
        } else {
            const index = this.anchors.index(selectedAnchor);
            if (index > 0) {
                const anchorToSelect = this.anchors.eq(index - 1);
                this.selectAnchor(anchorToSelect);
            }
        }
    }

    getSelectedAnchor() {
        if (!this.anchors) {
            this.updateAnchors();
        }
        return this.anchors.filter('.ak-navbar-selected:first');
    }

    selectAnchor(anchor) {
        if (!anchor || anchor.length === 0) {
            Paws.log("Invalid anchor to select");
            return;
        }

        this.anchors.removeClass('ak-navbar-selected');
        this.anchors.css('background-color', '');
        anchor.css('background-color', 'LightCyan');
        anchor.addClass('ak-navbar-selected');
        anchor.focus();
    }
}

// Initialise the app
new PawsApp();
