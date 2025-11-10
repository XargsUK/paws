// ==UserScript==
// @name         Paws
// @namespace    http://tombenner.co/
// @version      0.2.0
// @description  Keyboard shortcuts for the AWS Console
// @author       Tom Benner / xargsuk
// @match        https://*.console.aws.amazon.com/*
// @grant        none
// @require https://code.jquery.com/jquery-3.7.1.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/mousetrap/1.6.5/mousetrap.min.js
// ==/UserScript==

const $ = jQuery.noConflict();

const Paws = {
    // AWS Regions list
    regions: [
        { code: 'us-east-1', name: 'US East (N. Virginia)' },
        { code: 'us-east-2', name: 'US East (Ohio)' },
        { code: 'us-west-1', name: 'US West (N. California)' },
        { code: 'us-west-2', name: 'US West (Oregon)' },
        { code: 'af-south-1', name: 'Africa (Cape Town)' },
        { code: 'ap-east-1', name: 'Asia Pacific (Hong Kong)' },
        { code: 'ap-south-1', name: 'Asia Pacific (Mumbai)' },
        { code: 'ap-south-2', name: 'Asia Pacific (Hyderabad)' },
        { code: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)' },
        { code: 'ap-northeast-2', name: 'Asia Pacific (Seoul)' },
        { code: 'ap-northeast-3', name: 'Asia Pacific (Osaka)' },
        { code: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
        { code: 'ap-southeast-2', name: 'Asia Pacific (Sydney)' },
        { code: 'ap-southeast-3', name: 'Asia Pacific (Jakarta)' },
        { code: 'ap-southeast-4', name: 'Asia Pacific (Melbourne)' },
        { code: 'ca-central-1', name: 'Canada (Central)' },
        { code: 'eu-central-1', name: 'Europe (Frankfurt)' },
        { code: 'eu-central-2', name: 'Europe (Zurich)' },
        { code: 'eu-west-1', name: 'Europe (Ireland)' },
        { code: 'eu-west-2', name: 'Europe (London)' },
        { code: 'eu-west-3', name: 'Europe (Paris)' },
        { code: 'eu-south-1', name: 'Europe (Milan)' },
        { code: 'eu-south-2', name: 'Europe (Spain)' },
        { code: 'eu-north-1', name: 'Europe (Stockholm)' },
        { code: 'il-central-1', name: 'Israel (Tel Aviv)' },
        { code: 'me-south-1', name: 'Middle East (Bahrain)' },
        { code: 'me-central-1', name: 'Middle East (UAE)' },
        { code: 'sa-east-1', name: 'South America (São Paulo)' }
    ],

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
    },

    fuzzyMatch(query, text) {
        if (!query) return true;

        const queryLower = query.toLowerCase();
        const textLower = text.toLowerCase();

        // Check if text contains query as substring (most intuitive)
        if (textLower.includes(queryLower)) {
            return true;
        }

        // Fallback to fuzzy matching on word boundaries
        // Split by spaces, hyphens, and parentheses
        const words = textLower.split(/[\s\-()]+/);

        // Check if query matches start of any word
        for (const word of words) {
            if (word.startsWith(queryLower)) {
                return true;
            }
        }

        // More lenient fuzzy: match if all characters appear in order with reasonable gaps
        let queryIndex = 0;
        let lastMatchPos = -1;

        for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
            if (textLower[i] === queryLower[queryIndex]) {
                // Only match if characters are reasonably close (within 3 positions)
                if (lastMatchPos === -1 || i - lastMatchPos <= 3) {
                    queryIndex++;
                    lastMatchPos = i;
                } else {
                    // Gap too large, reset
                    queryIndex = 0;
                    lastMatchPos = -1;
                }
            }
        }

        return queryIndex === queryLower.length;
    }
};

class RegionSelector {
    constructor() {
        this.modal = null;
        this.input = null;
        this.resultsList = null;
        this.filteredRegions = [];
        this.selectedIndex = 0;
    }

    show() {
        if (this.modal) {
            this.modal.remove();
        }

        this.createModal();
        this.bindEvents();
        this.updateResults('');
        this.input.focus();
    }

    createModal() {
        // Detect dark theme
        const awscTheme = $('html').attr('awsc-color-theme') ||
                         $('body').attr('awsc-color-theme') ||
                         localStorage.getItem('awsc-color-theme');

        let isDarkTheme = false;

        if (awscTheme === 'dark') {
            isDarkTheme = true;
        } else if (awscTheme === 'default' || !awscTheme) {
            // Check OS/browser preference when theme is default or not set
            isDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        // Also check for AWS UI dark mode class
        if ($('html').hasClass('awsui-dark-mode')) {
            isDarkTheme = true;
        }

        // Theme colours
        const theme = isDarkTheme ? {
            background: '#1e1e1e',
            containerBg: '#2d2d2d',
            text: '#e0e0e0',
            textMuted: '#a0a0a0',
            border: '#444',
            inputBg: '#3a3a3a',
            inputBorder: '#555',
            inputFocusBorder: '#0073bb',
            hoverBg: '#3a3a3a',
            selectedBg: '#0d3a5c',
            accent: '#5cb3ff'
        } : {
            background: 'rgba(0, 0, 0, 0.7)',
            containerBg: '#fff',
            text: '#000',
            textMuted: '#666',
            border: '#ddd',
            inputBg: '#fff',
            inputBorder: '#ddd',
            inputFocusBorder: '#0073bb',
            hoverBg: '#f5f5f5',
            selectedBg: '#e8f4fd',
            accent: '#0073bb'
        };

        // Create overlay
        this.modal = $('<div>')
            .attr('id', 'paws-region-selector')
            .css({
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: isDarkTheme ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)',
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            });

        // Create search container
        const container = $('<div>')
            .css({
                backgroundColor: theme.containerBg,
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                width: '90%',
                maxWidth: '600px',
                padding: '20px',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            });

        // Create search input
        this.input = $('<input>')
            .attr('type', 'text')
            .attr('placeholder', 'Type to search regions...')
            .css({
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: `2px solid ${theme.inputBorder}`,
                borderRadius: '4px',
                boxSizing: 'border-box',
                marginBottom: '12px',
                outline: 'none',
                backgroundColor: theme.inputBg,
                color: theme.text
            })
            .on('focus', function () {
                $(this).css('border-color', theme.inputFocusBorder);
            })
            .on('blur', function () {
                $(this).css('border-color', theme.inputBorder);
            });

        // Create results list
        this.resultsList = $('<div>')
            .css({
                maxHeight: '400px',
                overflowY: 'auto',
                border: `1px solid ${theme.border}`,
                borderRadius: '4px',
                backgroundColor: theme.containerBg
            });

        // Store theme for later use in rendering
        this.theme = theme;

        container.append(this.input);
        container.append(this.resultsList);
        this.modal.append(container);
        $('body').append(this.modal);
    }

    bindEvents() {
        // Search on input
        this.input.on('input', (e) => {
            this.updateResults(e.target.value);
        });

        // Keyboard navigation
        this.input.on('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectNext();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectPrev();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.selectCurrentRegion();
            }
        });

        // Click outside to close
        this.modal.on('click', (e) => {
            if ($(e.target).is('#paws-region-selector')) {
                this.close();
            }
        });
    }

    updateResults(query) {
        this.filteredRegions = Paws.regions.filter(region => {
            const searchText = `${region.code} ${region.name}`;
            return Paws.fuzzyMatch(query, searchText);
        });

        this.selectedIndex = 0;
        this.renderResults();
    }

    renderResults() {
        this.resultsList.empty();

        if (this.filteredRegions.length === 0) {
            this.resultsList.append(
                $('<div>')
                    .text('No regions found')
                    .css({
                        padding: '20px',
                        textAlign: 'center',
                        color: this.theme.textMuted
                    })
            );
            return;
        }

        this.filteredRegions.forEach((region, index) => {
            const item = $('<div>')
                .css({
                    padding: '12px',
                    cursor: 'pointer',
                    borderBottom: `1px solid ${this.theme.border}`,
                    backgroundColor: index === this.selectedIndex ? this.theme.selectedBg : 'transparent',
                    transition: 'background-color 0.15s'
                })
                .on('mouseenter', function () {
                    if (index !== this.selectedIndex) {
                        $(this).css('backgroundColor', this.theme.hoverBg);
                    }
                }.bind(this))
                .on('mouseleave', function () {
                    if (index !== this.selectedIndex) {
                        $(this).css('backgroundColor', 'transparent');
                    }
                }.bind(this))
                .on('click', () => {
                    this.selectRegion(region.code);
                });

            const code = $('<strong>')
                .text(region.code)
                .css({
                    display: 'block',
                    marginBottom: '4px',
                    color: this.theme.accent
                });

            const name = $('<span>')
                .text(region.name)
                .css({
                    color: this.theme.textMuted,
                    fontSize: '14px'
                });

            item.append(code).append(name);
            this.resultsList.append(item);
        });

        // Scroll selected item into view
        const selectedItem = this.resultsList.children().eq(this.selectedIndex);
        if (selectedItem.length > 0) {
            this.resultsList.scrollTop(
                this.resultsList.scrollTop() + selectedItem.position().top -
                this.resultsList.height() / 2 + selectedItem.height() / 2
            );
        }
    }

    selectNext() {
        if (this.selectedIndex < this.filteredRegions.length - 1) {
            this.selectedIndex++;
            this.renderResults();
        }
    }

    selectPrev() {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.renderResults();
        }
    }

    selectCurrentRegion() {
        if (this.filteredRegions.length > 0) {
            const region = this.filteredRegions[this.selectedIndex];
            this.selectRegion(region.code);
        }
    }

    selectRegion(regionCode) {
        Paws.log(`Switching to region: ${regionCode}`);

        // Parse current URL
        const currentUrl = new URL(window.location.href);

        // Update the region in the subdomain
        const newHostname = `${regionCode}.console.aws.amazon.com`;

        // Update region parameter if it exists in search params
        const searchParams = new URLSearchParams(currentUrl.search);
        if (searchParams.has('region')) {
            searchParams.set('region', regionCode);
        }

        // Check if region is in the hash (some services use this)
        let newHash = currentUrl.hash;
        if (newHash.includes('region=')) {
            newHash = newHash.replace(/region=[a-z0-9-]+/, `region=${regionCode}`);
        }

        // Construct the new URL
        const searchString = searchParams.toString();
        const newUrl = `https://${newHostname}${currentUrl.pathname}${searchString ? '?' + searchString : ''}${newHash}`;

        Paws.log(`Navigating to: ${newUrl}`);
        window.location.href = newUrl;
        this.close();
    }

    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
}

class PawsApp {
    constructor() {
        this.navbar = new PawsNavbar();
        this.regionSelector = new RegionSelector();
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
            // Region search
            'rr': { func: () => this.regionSelector.show() },
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
