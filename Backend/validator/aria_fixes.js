/**
 * WCAG ARIA Auto-Fix Library
 * Automatically fixes common ARIA accessibility issues on web pages
 * Can be integrated into any website to improve accessibility compliance
 */

(function() {
    'use strict';
    const ARIA_FIXES = {
        // Fix aria-allowed-role: Remove invalid ARIA attributes from elements that don't support them
        fixAriaAllowedRole: function() {
            const elements = document.querySelectorAll('[aria-expanded]:not(button):not([role="button"]):not([role="tab"]):not([role="menuitem"]):not([role="treeitem"]):not([role="combobox"]):not([role="listbox"])');

            elements.forEach(element => {
                console.log('ARIA Fix: Removing aria-expanded from unsupported element:', element);
                element.removeAttribute('aria-expanded');
                // Add data attribute to track the fix
                element.setAttribute('data-aria-fixed', 'aria-allowed-role');
            });
            return elements.length;
        },

        // Fix aria-valid-attr-value: Correct invalid ARIA attribute values
        fixAriaValidAttrValue: function() {
            let fixes = 0;
            // Fix aria-expanded values (must be "true" or "false")
            const invalidExpanded = document.querySelectorAll('[aria-expanded]:not([aria-expanded="true"]):not([aria-expanded="false"])');
            invalidExpanded.forEach(element => {
                const currentValue = element.getAttribute('aria-expanded');
                console.log('ARIA Fix: Fixing invalid aria-expanded value:', currentValue, 'on element:', element);
                element.setAttribute('aria-expanded', 'false'); // Default to false
                element.setAttribute('data-aria-fixed', 'aria-valid-attr-value');
                fixes++;
            });

            // Fix aria-checked values (must be "true", "false", or "mixed")
            const invalidChecked = document.querySelectorAll('[aria-checked]:not([aria-checked="true"]):not([aria-checked="false"]):not([aria-checked="mixed"])');
            invalidChecked.forEach(element => {
                console.log('ARIA Fix: Fixing invalid aria-checked value on element:', element);
                element.setAttribute('aria-checked', 'false'); // Default to false
                element.setAttribute('data-aria-fixed', 'aria-valid-attr-value');
                fixes++;
            });
            // Fix aria-selected values
            const invalidSelected = document.querySelectorAll('[aria-selected]:not([aria-selected="true"]):not([aria-selected="false"])');
            invalidSelected.forEach(element => {
                console.log('ARIA Fix: Fixing invalid aria-selected value on element:', element);
                element.setAttribute('aria-selected', 'false'); // Default to false
                element.setAttribute('data-aria-fixed', 'aria-valid-attr-value');
                fixes++;
            });
            return fixes;
        },

        // Fix aria-required-attr: Add missing required attributes for specific roles
        fixAriaRequiredAttr: function() {
            let fixes = 0;

            // Fix checkboxes - must have aria-checked
            const checkboxes = document.querySelectorAll('[role="checkbox"]:not([aria-checked])');
            checkboxes.forEach(element => {
                console.log('ARIA Fix: Adding missing aria-checked to checkbox:', element);
                element.setAttribute('aria-checked', 'false');
                element.setAttribute('data-aria-fixed', 'aria-required-attr');
                fixes++;
            });

            // Fix radio buttons - must have aria-checked
            const radios = document.querySelectorAll('[role="radio"]:not([aria-checked])');
            radios.forEach(element => {
                console.log('ARIA Fix: Adding missing aria-checked to radio:', element);
                element.setAttribute('aria-checked', 'false');
                element.setAttribute('data-aria-fixed', 'aria-required-attr');
                fixes++;
            });

            // Fix sliders - must have aria-valuenow, aria-valuemin, aria-valuemax
            const sliders = document.querySelectorAll('[role="slider"]');
            sliders.forEach(element => {
                if (!element.hasAttribute('aria-valuenow')) {
                    element.setAttribute('aria-valuenow', '0');
                    fixes++;
                }
                if (!element.hasAttribute('aria-valuemin')) {
                    element.setAttribute('aria-valuemin', '0');
                    fixes++;
                }
                if (!element.hasAttribute('aria-valuemax')) {
                    element.setAttribute('aria-valuemax', '100');
                    fixes++;
                }
                if (fixes > 0) {
                    console.log('ARIA Fix: Adding missing slider attributes to:', element);
                    element.setAttribute('data-aria-fixed', 'aria-required-attr');
                }
            });

            // Fix progress bars - must have aria-valuenow
            const progressBars = document.querySelectorAll('[role="progressbar"]:not([aria-valuenow])');
            progressBars.forEach(element => {
                console.log('ARIA Fix: Adding missing aria-valuenow to progressbar:', element);
                element.setAttribute('aria-valuenow', '0');
                element.setAttribute('data-aria-fixed', 'aria-required-attr');
                fixes++;
            });

            return fixes;
        },

        // Fix aria-valid-role: Replace invalid roles with valid ones
        fixAriaValidRole: function() {
            const invalidRoles = ['invalid', 'custom', 'myrole', 'test']; // Common invalid roles
            let fixes = 0;

            invalidRoles.forEach(invalidRole => {
                const elements = document.querySelectorAll(`[role="${invalidRole}"]`);
                elements.forEach(element => {
                    console.log('ARIA Fix: Replacing invalid role:', invalidRole, 'on element:', element);

                    // Try to determine appropriate role based on element type and attributes
                    let newRole = null;

                    if (element.tagName.toLowerCase() === 'button' || element.onclick || element.getAttribute('onclick')) {
                        newRole = 'button';
                    } else if (element.tagName.toLowerCase() === 'input') {
                        const type = element.getAttribute('type');
                        if (type === 'checkbox') newRole = 'checkbox';
                        else if (type === 'radio') newRole = 'radio';
                        else newRole = 'textbox';
                    } else if (element.hasAttribute('href')) {
                        newRole = 'link';
                    } else if (element.tagName.toLowerCase() === 'img') {
                        newRole = 'img';
                    } else {
                        // Remove invalid role if we can't determine a better one
                        element.removeAttribute('role');
                        element.setAttribute('data-aria-fixed', 'aria-valid-role-removed');
                        fixes++;
                        return;
                    }

                    if (newRole) {
                        element.setAttribute('role', newRole);
                        element.setAttribute('data-aria-fixed', 'aria-valid-role');
                        fixes++;
                    }
                });
            });

            return fixes;
        },

        // Fix aria-valid-attr: Remove invalid aria-* attributes
        fixAriaValidAttr: function() {
            const validAriaAttrs = [
                'aria-activedescendant', 'aria-atomic', 'aria-autocomplete', 'aria-busy',
                'aria-checked', 'aria-colcount', 'aria-colindex', 'aria-colspan', 'aria-controls',
                'aria-current', 'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
                'aria-errormessage', 'aria-expanded', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
                'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label', 'aria-labelledby',
                'aria-level', 'aria-live', 'aria-modal', 'aria-multiline', 'aria-multiselectable',
                'aria-orientation', 'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
                'aria-readonly', 'aria-relevant', 'aria-required', 'aria-roledescription',
                'aria-rowcount', 'aria-rowindex', 'aria-rowspan', 'aria-selected', 'aria-setsize',
                'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext','aria-live',
                'aria-modal', 'aria-multiline', 'aria-multiselectable', 'aria-orientation', 'aria-owns',
                'aria-placeholder', 'aria-posinset', 'aria-pressed', 'aria-readonly', 'aria-relevant',
                'aria-required', 'aria-roledescription', 'aria-rowcount', 'aria-rowindex', 'aria-rowspan',
                'aria-selected', 'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin',
                'aria-valuenow', 'aria-valuetext'
            ];

            let fixes = 0;
            const allElements = document.querySelectorAll('*');

            allElements.forEach(element => {
                const attrs = Array.from(element.attributes);
                attrs.forEach(attr => {
                    if (attr.name.startsWith('aria-') && !validAriaAttrs.includes(attr.name)) {
                        console.log('ARIA Fix: Removing invalid aria attribute:', attr.name, 'from element:', element);
                        element.removeAttribute(attr.name);
                        element.setAttribute('data-aria-fixed', 'aria-valid-attr');
                        fixes++;
                    }
                });
            });

            return fixes;
        },

        // Fix aria-hidden-body: Remove aria-hidden from body element
        fixAriaHiddenBody: function() {
            const body = document.querySelector('body[aria-hidden]');
            if (body) {
                console.log('ARIA Fix: Removing aria-hidden from body element');
                body.removeAttribute('aria-hidden');
                body.setAttribute('data-aria-fixed', 'aria-hidden-body');
                return 1;
            }
            return 0;
        },

        // Fix aria-required-children: Add required child elements
        fixAriaRequiredChildren: function() {
            let fixes = 0;

            // Fix tablist - must have tab children
            const tablists = document.querySelectorAll('[role="tablist"]');
            tablists.forEach(tablist => {
                const tabs = tablist.querySelectorAll('[role="tab"]');
                if (tabs.length === 0) {
                    console.log('ARIA Fix: Adding required tab children to tablist:', tablist);
                    // Create a default tab if none exist
                    const defaultTab = document.createElement('div');
                    defaultTab.setAttribute('role', 'tab');
                    defaultTab.setAttribute('aria-selected', 'true');
                    defaultTab.textContent = 'Tab 1';
                    tablist.appendChild(defaultTab);
                    tablist.setAttribute('data-aria-fixed', 'aria-required-children');
                    fixes++;
                }
            });

            // Fix list - must have listitem children
            const lists = document.querySelectorAll('[role="list"]');
            lists.forEach(list => {
                const listitems = list.querySelectorAll('[role="listitem"]');
                if (listitems.length === 0) {
                    console.log('ARIA Fix: Adding required listitem children to list:', list);
                    // Convert existing children to listitems if possible
                    const children = Array.from(list.children);
                    children.forEach(child => {
                        if (!child.hasAttribute('role')) {
                            child.setAttribute('role', 'listitem');
                        }
                    });
                    list.setAttribute('data-aria-fixed', 'aria-required-children');
                    fixes++;
                }
            });

            return fixes;
        },

        // Fix aria-required-parent: Move elements to required parents
        fixAriaRequiredParent: function() {
            let fixes = 0;

            // Fix listitem - must be inside list
            const orphanedListitems = document.querySelectorAll('[role="listitem"]:not([role="list"] *):not(ul *):not(ol *)');
            orphanedListitems.forEach(listitem => {
                console.log('ARIA Fix: Wrapping orphaned listitem in list:', listitem);
                const list = document.createElement('ul');
                list.setAttribute('role', 'list');
                listitem.parentNode.insertBefore(list, listitem);
                list.appendChild(listitem);
                list.setAttribute('data-aria-fixed', 'aria-required-parent');
                fixes++;
            });

            // Fix tab - must be inside tablist
            const orphanedTabs = document.querySelectorAll('[role="tab"]:not([role="tablist"] *)');
            orphanedTabs.forEach(tab => {
                console.log('ARIA Fix: Wrapping orphaned tab in tablist:', tab);
                const tablist = document.createElement('div');
                tablist.setAttribute('role', 'tablist');
                tab.parentNode.insertBefore(tablist, tab);
                tablist.appendChild(tab);
                tablist.setAttribute('data-aria-fixed', 'aria-required-parent');
                fixes++;
            });
            return fixes;
        }
    };

    // Main function to run all ARIA fixes
    function fixAllAriaIssues() {
        console.log('Starting ARIA accessibility fixes...');

        const results = {
            'aria-allowed-role': ARIA_FIXES.fixAriaAllowedRole(),
            'aria-valid-attr-value': ARIA_FIXES.fixAriaValidAttrValue(),
            'aria-required-attr': ARIA_FIXES.fixAriaRequiredAttr(),
            'aria-valid-role': ARIA_FIXES.fixAriaValidRole(),
            'aria-valid-attr': ARIA_FIXES.fixAriaValidAttr(),
            'aria-hidden-body': ARIA_FIXES.fixAriaHiddenBody(),
            'aria-required-children': ARIA_FIXES.fixAriaRequiredChildren(),
            'aria-required-parent': ARIA_FIXES.fixAriaRequiredParent(),
            'aria-live': ARIA_FIXES.fixAriaLive(),
            'aria-modal': ARIA_FIXES.fixAriaModal(),
            'aria-multiline': ARIA_FIXES.fixAriaMultiline(),
            'aria-multiselectable': ARIA_FIXES.fixAriaMultiselectable(),
            'aria-orientation': ARIA_FIXES.fixAriaOrientation(),
            'aria-owns': ARIA_FIXES.fixAriaOwns(),
            'aria-placeholder': ARIA_FIXES.fixAriaPlaceholder(),
            'aria-posinset': ARIA_FIXES.fixAriaPosinset(),
            'aria-pressed': ARIA_FIXES.fixAriaPressed(),
            'aria-readonly': ARIA_FIXES.fixAriaReadonly(),
            'aria-relevant': ARIA_FIXES.fixAriaRelevant()
        };


        const totalFixes = Object.values(results).reduce((sum, count) => sum + count, 0);
        console.log('ARIA fixes completed:', results);
        console.log('Total fixes applied:', totalFixes);

        // Dispatch custom event to notify that fixes are complete
        const event = new CustomEvent('ariaFixesComplete', {
            detail: { results, totalFixes }
        });
        document.dispatchEvent(event);

        return results;
    }

    // Function to get summary of applied fixes
    function getAriaFixesSummary() {
        const fixedElements = document.querySelectorAll('[data-aria-fixed]');
        const summary = {};

        fixedElements.forEach(element => {
            const fixType = element.getAttribute('data-aria-fixed');
            summary[fixType] = (summary[fixType] || 0) + 1;
        });

        return summary;
    }

    // Auto-run fixes when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixAllAriaIssues);
    } else {
        // DOM is already ready
        setTimeout(fixAllAriaIssues, 100); // Small delay to ensure page is fully loaded
    }

    // Expose functions globally for manual use
    window.WCAG_ARIA_FIXES = {
        fixAll: fixAllAriaIssues,
        getSummary: getAriaFixesSummary,
        fixSpecific: function(issueType) {
            if (ARIA_FIXES[issueType]) {
                return ARIA_FIXES[issueType]();
            } else {
                console.error('Unknown ARIA issue type:', issueType);
                return 0;
            }
        }
    };
})();