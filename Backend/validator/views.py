from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from axe_selenium_python import Axe
import json
from openai import OpenAI
import os
import logging
import sys
import codecs
from urllib.parse import urljoin, urlparse
from collections import deque
from gtts import gTTS  # New: For AI voice narration
from django.conf import settings  # For MEDIA_ROOT
from .models import ValidationReport, ValidationLog



logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure media folder exists
os.makedirs(settings.MEDIA_ROOT, exist_ok=True)

# Initialize Grok client (updated to latest model: grok-4-0709)
try:
    api_key = os.getenv('OPENAI_API_KEY')
    if api_key:
        client = OpenAI(api_key=api_key)
        # Quick sanity test with timeout
        client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Test"}],
            max_tokens=5,
            timeout=10  # 10 second timeout
        )
    else:
        logger.warning("OPENAI_API_KEY not found in environment variables")
        client = None
except Exception as e:
    logger.error(f"Failed to initialize OpenAI client: {str(e)}")
    client = None

# Configuration for API usage
USE_AI_SUGGESTIONS = os.getenv('USE_AI_SUGGESTIONS', 'true').lower() == 'true'
API_TIMEOUT = int(os.getenv('API_TIMEOUT', '15'))  # seconds

# Global flag to track AI suggestions status
ai_suggestions_enabled = USE_AI_SUGGESTIONS

@csrf_exempt
def validate_website(request)   :
    if request.method == 'POST':
        data = json.loads(request.body)
        url = data.get('url')
        
        if not url:
            return JsonResponse({'error': 'URL required'}, status=400)
        
        try:
            # Step 1: Fetch and render page
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service)
            try:
                driver.get(url)
                html = driver.page_source
                
                # Step 2: Run Axe audit
                axe = Axe(driver)
                axe.inject()
                results = axe.run()
                
                soup = BeautifulSoup(html, 'html.parser')
                
                # Step 3: Categorize Axe results (WAVE-like)
                errors = []
                contrast_errors = []
                alerts = []
                features = []
                
                for violation in results.get('violations', []):
                    issue_type = 'contrast_error' if 'contrast' in violation['id'] else 'error'
                    issue = {
                        'id': violation['id'],
                        'description': violation['description'],
                        'impact': violation['impact'],
                        'tags': violation['tags'],
                        'help_url': violation['helpUrl'],
                        'nodes': [ {
                            'html': node['html'],
                            'target': node['target']
                        } for node in violation['nodes'] ],
                        'type': issue_type
                    }
                    if issue_type == 'contrast_error':
                        contrast_errors.append(issue)
                    else:
                        errors.append(issue)
                
                for incomplete in results.get('incomplete', []):
                    alerts.append({
                        'id': incomplete['id'],
                        'description': incomplete['description'],
                        'impact': incomplete['impact'],
                        'tags': incomplete['tags'],
                        'help_url': incomplete['helpUrl'],
                        'nodes': [ {
                            'html': node['html'],
                            'target': node['target']
                        } for node in incomplete['nodes'] ],
                        'type': 'alert'
                    })
                
                for pass_item in results.get('passes', []):
                    features.append({
                        'id': pass_item['id'],
                        'description': pass_item['description'],
                        'nodes': [node['html'] for node in pass_item['nodes']]
                    })
                
                # Step 4: Count Structural Elements (Enhanced)
                headings = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
                lists = soup.find_all(['ul', 'ol'])
                tables = soup.find_all('table')

                # Enhanced landmark detection - includes both ARIA roles and semantic elements
                landmarks = []
                # ARIA landmark roles
                landmarks.extend(soup.find_all(attrs={'role': ['main', 'navigation', 'complementary', 'contentinfo', 'search', 'banner', 'region']}))
                # Semantic landmark elements
                landmarks.extend(soup.find_all(['main', 'nav', 'aside', 'header', 'footer']))
                # Remove duplicates (elements that have both semantic tag and role)
                unique_landmarks = []
                seen_elements = set()
                for landmark in landmarks:
                    if landmark not in seen_elements:
                        unique_landmarks.append(landmark)
                        seen_elements.add(landmark)

                structural_elements = {
                    'headings': len(headings),
                    'lists': len(lists),
                    'tables': len(tables),
                    'landmarks': len(unique_landmarks)
                }
                total_structural = sum(structural_elements.values())
                
                # Step 5: Count ARIA elements
                aria_elements = len(soup.find_all(lambda tag: any(attr.startswith('aria-') for attr in tag.attrs)))
                
                # Step 6: Manual checks (supplement axe)
                for img in soup.find_all('img'):
                    if not img.get('alt'):
                        errors.append({
                            'id': 'image-alt',
                            'description': 'Image missing alt text',
                            'impact': 'serious',
                            'tags': ['wcag2a', 'wcag111'],
                            'help_url': 'https://www.w3.org/WAI/WCAG22/quickref/#non-text-content',
                            'nodes': [{'html': str(img), 'target': [img.name]}],
                            'type': 'error'
                        })

                # Structural checks
                if not soup.find('h1'):
                    errors.append({
                        'id': 'missing-h1',
                        'description': 'Missing H1 heading element',
                        'impact': 'moderate',
                        'tags': ['wcag2a', 'wcag131'],
                        'help_url': 'https://www.w3.org/WAI/WCAG22/quickref/#info-and-relationships',
                        'nodes': [{'html': 'Document is missing required H1 heading element', 'target': []}],
                        'type': 'error'
                    })

                main_landmarks = soup.find_all(attrs={'role': 'main'})
                if not main_landmarks and not soup.find('main'):
                    errors.append({
                        'id': 'missing-main',
                        'description': 'Missing main landmark',
                        'impact': 'moderate',
                        'tags': ['wcag2a', 'wcag131'],
                        'help_url': 'https://www.w3.org/WAI/WCAG22/quickref/#info-and-relationships',
                        'nodes': [{'html': 'Document is missing required main landmark', 'target': []}],
                        'type': 'error'
                    })
                
                # Step 7: Initialize highlights data early (before site scanning)
                highlights_data = []

                # Step 8: Comprehensive site scanning
                site_content = ""
                multi_page_results = []
                scan_multiple_pages = data.get('scan_all_pages', False)

                if scan_multiple_pages or client:
                    # Enhanced site scanning with multiple pages
                    scanned_pages = scrape_site_comprehensive(url, max_pages=10 if scan_multiple_pages else 3, driver=driver)
                    site_content = scanned_pages['content']
                    multi_page_results = scanned_pages['page_results']

                    # Collect highlights from all scanned pages
                    all_page_highlights = scanned_pages.get('all_highlights', [])
                    if all_page_highlights:
                        # Merge highlights from all pages
                        for page_highlight in all_page_highlights:
                            highlights_data.extend(page_highlight)

                    # Aggregate violations from all scanned pages for accurate summary counts
                    all_violations = scanned_pages.get('all_violations', [])
                    all_incomplete = scanned_pages.get('all_incomplete', [])
                    all_passes = scanned_pages.get('all_passes', [])

                    # Add aggregated violations to main lists
                    for v in all_violations:
                        issue_type = 'contrast_error' if 'contrast' in v['id'] else 'error'
                        issue = {
                            'id': v['id'],
                            'description': v['description'],
                            'impact': v['impact'],
                            'tags': v['tags'],
                            'help_url': v['helpUrl'],
                            'nodes': [ {
                                'html': node['html'],
                                'target': node['target']
                            } for node in v['nodes'] ],
                            'type': issue_type
                        }
                        if issue_type == 'contrast_error':
                            contrast_errors.append(issue)
                        else:
                            errors.append(issue)

                    for inc in all_incomplete:
                        alerts.append({
                            'id': inc['id'],
                            'description': inc['description'],
                            'impact': inc['impact'],
                            'tags': inc['tags'],
                            'help_url': inc['helpUrl'],
                            'nodes': [ {
                                'html': node['html'],
                                'target': node['target']
                            } for node in inc['nodes'] ],
                            'type': 'alert'
                        })

                    for pas in all_passes:
                        features.append({
                            'id': pas['id'],
                            'description': pas['description'],
                            'nodes': [node['html'] for node in pas['nodes']]
                        })

                # Step 8: Comprehensive Remediation Suggestions with Priority and Categories
                all_issues = errors + contrast_errors + alerts
                suggestions = []
                issue_categories = {
                    'critical': [],
                    'serious': [],
                    'moderate': [],
                    'minor': []
                }

                # Categorize issues by impact and type
                for issue in all_issues:
                    impact = issue.get('impact', 'moderate')
                    if impact == 'critical':
                        issue_categories['critical'].append(issue)
                    elif impact == 'serious':
                        issue_categories['serious'].append(issue)
                    elif impact == 'moderate':
                        issue_categories['moderate'].append(issue)
                    else:
                        issue_categories['minor'].append(issue)

                # Generate comprehensive suggestions with enhanced details - process in chunks
                chunk_size = 5  # Process 5 issues at a time to avoid API overload
                all_issues_for_suggestions = []
                for category, issues in issue_categories.items():
                    all_issues_for_suggestions.extend(issues)

                # Process issues in chunks
                for i in range(0, len(all_issues_for_suggestions), chunk_size):
                    chunk = all_issues_for_suggestions[i:i + chunk_size]
                    for issue in chunk:
                        suggestion_data = generate_enhanced_suggestion(issue, site_content, client, issue.get('impact', 'moderate'))
                        suggestions.append(suggestion_data)
                
                # Step 9: Prepare highlights data for JS (only errors, contrast, alerts) with improved specificity
                for issue in all_issues:
                    for node in issue['nodes']:
                        for target in node['target']:
                            # Improve selector specificity to avoid highlighting entire page
                            improved_selector = _improve_selector_specificity(target, soup)
                            if improved_selector:
                                highlights_data.append({
                                    'selector': improved_selector,
                                    'type': issue['type'],
                                    'description': issue['description'],
                                    'id': issue['id'],
                                    'impact': issue.get('impact', 'moderate'),
                                    'tags': issue.get('tags', []),
                                    'solution': _get_quick_solution(issue),
                                    'help_url': issue.get('help_url', '')
                                })
                
                # Step 9: Inject JS for highlights, add base tag, absolutize URLs
                make_absolute(soup, url)
                
                base_tag = soup.new_tag('base', href=url)
                if soup.head:
                    soup.head.insert(0, base_tag)
                
                # Load ARIA fixes script
                aria_fixes_script = ""
                try:
                    script_path = os.path.join(settings.BASE_DIR, 'validator', 'aria_fixes.js')
                    with open(script_path, 'r', encoding='utf-8') as f:
                        aria_fixes_script = f.read()
                except Exception as e:
                    logger.warning(f"Could not load ARIA fixes script: {str(e)}")

                # Create main script tag with enhanced highlights and ARIA fixes
                script_tag = soup.new_tag('script')
                script_tag.string = f"""
                {aria_fixes_script}

                // Persistent WCAG Highlighting System
                (function() {{
                    // Store highlights data persistently
                    const HIGHLIGHTS_KEY = 'wcag_highlights_data';
                    const SITE_URL_KEY = 'wcag_site_url';

                    // Save highlights data to localStorage
                    function saveHighlightsData(highlights, siteUrl) {{
                        try {{
                            localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
                            localStorage.setItem(SITE_URL_KEY, siteUrl);
                        }} catch (e) {{
                            console.warn('Failed to save highlights to localStorage:', e);
                        }}
                    }}

                    // Load highlights data from localStorage
                    function loadHighlightsData() {{
                        try {{
                            const savedHighlights = localStorage.getItem(HIGHLIGHTS_KEY);
                            const savedSiteUrl = localStorage.getItem(SITE_URL_KEY);
                            const currentUrl = window.location.href;

                            // Only use saved data if we're on the same site
                            if (savedHighlights && savedSiteUrl && currentUrl.includes(new URL(savedSiteUrl).hostname)) {{
                                return JSON.parse(savedHighlights);
                            }}
                        }} catch (e) {{
                            console.warn('Failed to load highlights from localStorage:', e);
                        }}
                        return null;
                    }}

                    // Clear highlights data
                    function clearHighlightsData() {{
                        try {{
                            localStorage.removeItem(HIGHLIGHTS_KEY);
                            localStorage.removeItem(SITE_URL_KEY);
                        }} catch (e) {{
                            console.warn('Failed to clear highlights from localStorage:', e);
                        }}
                    }}

                    window.addEventListener('DOMContentLoaded', function() {{
                        let highlights = {json.dumps(highlights_data)};

                        // If no highlights from current scan, try to load from storage
                        if (!highlights || highlights.length === 0) {{
                            highlights = loadHighlightsData() || [];
                        }} else {{
                            // Save current highlights for persistence
                            saveHighlightsData(highlights, '{url}');
                        }}

                        let currentIssueIndex = 0;
                        const highlightedElements = [];

                    // Enhanced highlighting with better visuals and interactions
                    function createEnhancedHighlight(element, issue, index) {{
                        const rect = element.getBoundingClientRect();
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                        // Create main highlight overlay
                        const overlay = document.createElement('div');
                        overlay.className = 'wcag-highlight-overlay';
                        overlay.style.position = 'absolute';
                        overlay.style.top = `${{rect.top + scrollTop - 3}}px`;
                        overlay.style.left = `${{rect.left + scrollLeft - 3}}px`;
                        overlay.style.width = `${{rect.width + 6}}px`;
                        overlay.style.height = `${{rect.height + 6}}px`;
                        overlay.style.zIndex = '9998';
                        overlay.style.pointerEvents = 'none';
                        overlay.style.borderRadius = '4px';
                        overlay.style.boxShadow = '0 0 0 2px rgba(255, 0, 0, 0.8) inset';

                        if (issue.type === 'error') {{
                            overlay.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.8) inset';
                        }} else if (issue.type === 'contrast_error') {{
                            overlay.style.boxShadow = '0 0 0 3px rgba(111, 66, 193, 0.8) inset';
                        }} else if (issue.type === 'alert') {{
                            overlay.style.boxShadow = '0 0 0 3px rgba(255, 193, 7, 0.8) inset';
                        }}

                        // Create issue indicator
                        const indicator = document.createElement('div');
                        indicator.className = 'wcag-issue-indicator';
                        indicator.style.position = 'absolute';
                        indicator.style.top = `${{rect.top + scrollTop - 25}}px`;
                        indicator.style.left = `${{rect.left + scrollLeft}}px`;
                        indicator.style.zIndex = '9999';
                        indicator.style.padding = '4px 8px';
                        indicator.style.color = 'white';
                        indicator.style.fontSize = '12px';
                        indicator.style.fontWeight = 'bold';
                        indicator.style.borderRadius = '4px';
                        indicator.style.cursor = 'pointer';
                        indicator.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                        indicator.style.transition = 'all 0.2s ease';
                        indicator.dataset.issueIndex = index;

                        if (issue.type === 'error') {{
                            indicator.style.background = '#dc3545';
                            indicator.textContent = `E${{index + 1}}`;
                        }} else if (issue.type === 'contrast_error') {{
                            indicator.style.background = '#6f42c1';
                            indicator.textContent = `C${{index + 1}}`;
                        }} else if (issue.type === 'alert') {{
                            indicator.style.background = '#ffc107';
                            indicator.style.color = '#000';
                            indicator.textContent = `A${{index + 1}}`;
                        }}

                        // Enhanced tooltip with solution
                        const solution = issue.solution || 'Click for detailed fix instructions';
                        indicator.title = `${{issue.description}}\\n\\n${{solution}}\\n\\nClick for more details`;

                        // Add hover effects
                        indicator.addEventListener('mouseenter', function() {{
                            this.style.transform = 'scale(1.1)';
                            overlay.style.boxShadow = overlay.style.boxShadow.replace('0.8', '1.0');
                        }});

                        indicator.addEventListener('mouseleave', function() {{
                            this.style.transform = 'scale(1)';
                            overlay.style.boxShadow = overlay.style.boxShadow.replace('1.0', '0.8');
                        }});

                        // Click handler for detailed view
                        indicator.addEventListener('click', function() {{
                            showIssueDetails(issue, element, index);
                        }});

                        document.body.appendChild(overlay);
                        document.body.appendChild(indicator);
                        highlightedElements.push({{overlay, indicator, element, issue, index}});
                    }}

                    // Create detailed issue panel
                    function showIssueDetails(issue, element, index) {{
                        // Remove existing detail panel
                        const existingPanel = document.querySelector('.wcag-detail-panel');
                        if (existingPanel) {{
                            existingPanel.remove();
                        }}

                        const panel = document.createElement('div');
                        panel.className = 'wcag-detail-panel';
                        panel.style.position = 'fixed';
                        panel.style.top = '20px';
                        panel.style.right = '20px';
                        panel.style.width = '350px';
                        panel.style.maxHeight = '70vh';
                        panel.style.background = 'white';
                        panel.style.border = '2px solid #007bff';
                        panel.style.borderRadius = '8px';
                        panel.style.padding = '15px';
                        panel.style.zIndex = '10000';
                        panel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                        panel.style.overflowY = 'auto';
                        panel.style.fontFamily = 'Arial, sans-serif';

                        const issueTypeColor = issue.type === 'error' ? '#dc3545' :
                                              issue.type === 'contrast_error' ? '#6f42c1' : '#ffc107';

                        const solution = issue.solution || 'Review WCAG guidelines for this issue type';
                        const helpUrl = issue.help_url || '';

                        panel.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h3 style="margin: 0; color: ${{issueTypeColor}};">Issue #${{index + 1}} - ${{issue.id}}</h3>
                                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <strong>Type:</strong> <span style="color: ${{issueTypeColor}};">${{issue.type.replace('_', ' ').toUpperCase()}}</span>
                                <span style="margin-left: 10px; padding: 2px 6px; background: ${{issueTypeColor}}; color: white; border-radius: 3px; font-size: 11px;">${{issue.impact.toUpperCase()}}</span>
                            </div>
                            <div style="margin-bottom: 15px;">
                                <strong>Description:</strong> ${{issue.description}}
                            </div>
                            <div style="margin-bottom: 15px;">
                                <strong>Element:</strong> <code style="background: #f8f9fa; padding: 2px 4px; border-radius: 3px; font-family: monospace;">${{element.tagName.toLowerCase()}}${{element.id ? '#' + element.id : ''}}${{element.className ? '.' + element.className.split(' ')[0] : ''}}</code>
                            </div>
                            <div style="border: 2px solid #e9ecef; border-radius: 6px; padding: 12px; margin-bottom: 15px; background: #f8f9fa;">
                                <strong style="color: #28a745;">✓ Solution:</strong>
                                <div style="margin-top: 8px; font-size: 14px; line-height: 1.4;">
                                    ${{solution}}
                                </div>
                                ${{helpUrl ? `<div style="margin-top: 8px;"><a href="${{helpUrl}}" target="_blank" style="color: #007bff; text-decoration: none;">📖 View WCAG Guidelines</a></div>` : ''}}
                            </div>
                            <div style="border-top: 1px solid #dee2e6; padding-top: 10px;">
                                <strong>Actions:</strong>
                                <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                                    <button onclick="navigator.clipboard.writeText('${{element.outerHTML}}')" style="background: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                        📋 Copy HTML
                                    </button>
                                    <button onclick="console.log('Element:', ${{element.outerHTML}})" style="background: #17a2b8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                        🔍 Inspect
                                    </button>
                                </div>
                            </div>
                        `;

                        document.body.appendChild(panel);
                    }}

                    // Apply highlights to all issues with better error handling and specificity
                    let totalHighlightsApplied = 0;
                    const maxTotalHighlights = 30; // Reduced total highlights per page

                    highlights.forEach((h, index) => {{
                        try {{
                            const elements = document.querySelectorAll(h.selector);
                            if (elements.length === 0) {{
                                console.warn('WCAG: No elements found for selector:', h.selector);
                                return;
                            }}

                            // Limit highlighting per selector to prevent overwhelming
                            const maxHighlightsPerSelector = 3;
                            const elementsToHighlight = Array.from(elements).slice(0, maxHighlightsPerSelector);

                            elementsToHighlight.forEach(el => {{
                                // Skip if we've reached the total limit
                                if (totalHighlightsApplied >= maxTotalHighlights) {{
                                    return;
                                }}

                                // Skip elements that are already highlighted
                                if (!el.classList.contains('wcag-highlighted')) {{
                                    el.classList.add('wcag-highlighted');
                                    createEnhancedHighlight(el, h, index);
                                    totalHighlightsApplied++;
                                }}
                            }});

                            if (elements.length > maxHighlightsPerSelector) {{
                                console.warn(`WCAG: Limited highlighting to ${{maxHighlightsPerSelector}} of ${{elements.length}} elements for selector:`, h.selector);
                            }}
                        }} catch (error) {{
                            console.error('WCAG: Error applying highlight for selector:', h.selector, error);
                        }}
                    }});

                    console.log(`WCAG: Applied ${{totalHighlightsApplied}} highlights out of ${{highlights.length}} issues`);

                    // Create summary panel
                    if (highlights.length > 0) {{
                        const summaryPanel = document.createElement('div');
                        summaryPanel.className = 'wcag-summary-panel';
                        summaryPanel.style.position = 'fixed';
                        summaryPanel.style.bottom = '20px';
                        summaryPanel.style.left = '20px';
                        summaryPanel.style.background = 'white';
                        summaryPanel.style.border = '2px solid #007bff';
                        summaryPanel.style.borderRadius = '8px';
                        summaryPanel.style.padding = '15px';
                        summaryPanel.style.zIndex = '10000';
                        summaryPanel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                        summaryPanel.style.maxWidth = '300px';
                        summaryPanel.style.fontFamily = 'Arial, sans-serif';

                        const errorCount = highlights.filter(h => h.type === 'error').length;
                        const contrastCount = highlights.filter(h => h.type === 'contrast_error').length;
                        const alertCount = highlights.filter(h => h.type === 'alert').length;

                        summaryPanel.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <h4 style="margin: 0; color: #007bff;">WCAG Issues Found</h4>
                                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #666;">×</button>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                                    <div style="cursor: pointer;" onclick="filterHighlights('error')">
                                        <span style="color: #dc3545;">●</span> Errors: <strong>${{errorCount}}</strong>
                                    </div>
                                    <div style="cursor: pointer;" onclick="filterHighlights('contrast_error')">
                                        <span style="color: #6f42c1;">●</span> Contrast: <strong>${{contrastCount}}</strong>
                                    </div>
                                    <div style="cursor: pointer;" onclick="filterHighlights('alert')">
                                        <span style="color: #ffc107;">●</span> Alerts: <strong>${{alertCount}}</strong>
                                    </div>
                                </div>
                            </div>
                            <div style="margin-bottom: 15px;">
                                <button onclick="showAllHighlights()" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                    Show All Issues
                                </button>
                                <button onclick="hideAllHighlights()" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-left: 8px;">
                                    Hide All Issues
                                </button>
                            </div>
                            <div style="font-size: 12px; color: #666; border-top: 1px solid #dee2e6; padding-top: 8px;">
                                Click issue indicators for solutions • Click categories to filter
                            </div>
                        `;

                        document.body.appendChild(summaryPanel);
                    }}

                    // Add ARIA fixes summary display
                    window.addEventListener('ariaFixesComplete', function(e) {{
                        const summary = e.detail;
                        console.log('ARIA Fixes Applied:', summary);

                        // Create enhanced notification
                        const notification = document.createElement('div');
                        notification.style.position = 'fixed';
                        notification.style.top = '20px';
                        notification.style.left = '50%';
                        notification.style.transform = 'translateX(-50%)';
                        notification.style.background = '#28a745';
                        notification.style.color = 'white';
                        notification.style.padding = '12px 20px';
                        notification.style.borderRadius = '6px';
                        notification.style.zIndex = '10001';
                        notification.style.fontSize = '14px';
                        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                        notification.style.fontFamily = 'Arial, sans-serif';
                        notification.innerHTML = `
                            <div style="display: flex; align-items: center;"> 
                                <span style="font-size: 18px; margin-right: 10px;">✓</span> <strong>ARIA Issues Auto-Fixed!</strong>
                                <div>
                                    <strong>ARIA Issues Auto-Fixed!</strong><br>
                                    <span style="font-size: 12px;">${{summary.totalFixes}} fixes applied automatically</span>
                                </div>
                            </div>
                        `;

                        // Auto-hide after 6 seconds
                        setTimeout(() => {{
                            notification.style.opacity = '0';
                            notification.style.transform = 'translateX(-50%) translateY(-20px)';
                            notification.style.transition = 'all 0.5s ease';
                            setTimeout(() => notification.remove(), 500);
                        }}, 6000);

                        document.body.appendChild(notification);
                    }});

                    // Add keyboard navigation
                    document.addEventListener('keydown', function(e) {{
                        if (e.key === 'Escape') {{
                            const panel = document.querySelector('.wcag-detail-panel');
                            if (panel) panel.remove();
                        }}
                    }});

                    // Add clear highlights function to window for external access
                    window.clearWCAGHighlights = clearHighlightsData;
                    window.getWCAGHighlights = loadHighlightsData;

                    // Add filtering functions
                    window.filterHighlights = function(type) {{
                        const overlays = document.querySelectorAll('.wcag-highlight-overlay');
                        const indicators = document.querySelectorAll('.wcag-issue-indicator');

                        overlays.forEach((overlay, index) => {{
                            const issue = highlightedElements[index];
                            if (issue && issue.issue.type === type) {{
                                overlay.style.display = 'block';
                                indicators[index].style.display = 'block';
                            }} else {{
                                overlay.style.display = 'none';
                                indicators[index].style.display = 'none';
                            }}
                        }});
                    }};

                    window.showAllHighlights = function() {{
                        const overlays = document.querySelectorAll('.wcag-highlight-overlay');
                        const indicators = document.querySelectorAll('.wcag-issue-indicator');
                        overlays.forEach(el => el.style.display = 'block');
                        indicators.forEach(el => el.style.display = 'block');
                    }};

                    window.hideAllHighlights = function() {{
                        const overlays = document.querySelectorAll('.wcag-highlight-overlay');
                        const indicators = document.querySelectorAll('.wcag-issue-indicator');
                        overlays.forEach(el => el.style.display = 'none');
                        indicators.forEach(el => el.style.display = 'none');
                    }};
                }}); // End of DOMContentLoaded

                // Inject highlighting script on all pages of the site
                if (window.location.hostname === new URL('{url}').hostname) {{
                    // Create a persistent script that loads on every page
                    const persistentScript = document.createElement('script');
                    persistentScript.textContent = `
                        (function() {{
                            const HIGHLIGHTS_KEY = 'wcag_highlights_data';
                            const SITE_URL_KEY = 'wcag_site_url';

                            function loadAndApplyHighlights() {{
                                try {{
                                    const savedHighlights = localStorage.getItem(HIGHLIGHTS_KEY);
                                    const savedSiteUrl = localStorage.getItem(SITE_URL_KEY);
                                    const currentUrl = window.location.href;

                                    if (savedHighlights && savedSiteUrl && currentUrl.includes(new URL(savedSiteUrl).hostname)) {{
                                        const highlights = JSON.parse(savedHighlights);
                                        if (highlights && highlights.length > 0) {{
                                            // Apply highlights to current page
                                            highlights.forEach((h, index) => {{
                                                const elements = document.querySelectorAll(h.selector);
                                                elements.forEach(el => {{
                                                    // Apply the same highlighting logic as main script
                                                    const rect = el.getBoundingClientRect();
                                                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                                                    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                                                    const overlay = document.createElement('div');
                                                    overlay.className = 'wcag-highlight-overlay';
                                                    overlay.style.position = 'absolute';
                                                    overlay.style.top = (rect.top + scrollTop - 3) + 'px';
                                                    overlay.style.left = (rect.left + scrollLeft - 3) + 'px';
                                                    overlay.style.width = (rect.width + 6) + 'px';
                                                    overlay.style.height = (rect.height + 6) + 'px';
                                                    overlay.style.zIndex = '9998';
                                                    overlay.style.pointerEvents = 'none';
                                                    overlay.style.borderRadius = '4px';
                                                    overlay.style.boxShadow = '0 0 0 2px rgba(255, 0, 0, 0.8) inset';

                                                    if (h.type === 'error') {{
                                                        overlay.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.8) inset';
                                                    }} else if (h.type === 'contrast_error') {{
                                                        overlay.style.boxShadow = '0 0 0 3px rgba(111, 66, 193, 0.8) inset';
                                                    }} else if (h.type === 'alert') {{
                                                        overlay.style.boxShadow = '0 0 0 3px rgba(255, 193, 7, 0.8) inset';
                                                    }}

                                                    document.body.appendChild(overlay);
                                                }});
                                            }});
                                        }}
                                    }}
                                }} catch (e) {{
                                    console.warn('Failed to apply persistent highlights:', e);
                                }}
                            }}

                            // Apply highlights after DOM is ready
                            if (document.readyState === 'loading') {{
                                document.addEventListener('DOMContentLoaded', loadAndApplyHighlights);
                            }} else {{
                                loadAndApplyHighlights();
                            }}
                        }})();
                    `;
                    document.head.appendChild(persistentScript);
                }}

                }})(); // End of persistent WCAG highlighting system
                """
                if soup.head:
                    soup.head.append(script_tag)
                else:
                    soup.html.insert(0, script_tag)
                
                modified_html = str(soup)
                
                # Step 10: Generate Comprehensive Solution
                comprehensive_solution = _generate_comprehensive_solution(
                    errors, contrast_errors, alerts, structural_elements, soup
                )

                # Step 11: Summary Counts
                summary = {
                    'errors': len(errors),
                    'contrast_errors': len(contrast_errors),
                    'alerts': len(alerts),
                    'features': len(features),
                    'structural_elements': total_structural,
                    'aria': aria_elements
                }

                # Step 12: Is Compliant?
                is_compliant = summary['errors'] + summary['contrast_errors'] == 0

                # Step 13: Save validation results to database
                try:
                    report = ValidationReport.objects.create(
                        url=url,
                        compliant=is_compliant,
                        summary=summary,
                        errors=errors,
                        contrast_errors=contrast_errors,
                        alerts=alerts,
                        features=features,
                        suggestions=suggestions,
                        agent_data={
                            'multi_page_scan': {
                                'enabled': scan_multiple_pages,
                                'pages_scanned': len(multi_page_results),
                                'page_results': multi_page_results
                            } if scan_multiple_pages else None,
                            'structural_elements': structural_elements,
                            'comprehensive_solution': comprehensive_solution
                        }
                    )

                    # Log the validation operation
                    ValidationLog.objects.create(
                        log_type='manual_validation',
                        url=url,
                        operation_details={
                            'action': 'validate_website',
                            'report_id': report.id,
                            'summary_counts': summary
                        },
                        success=True
                    )

                    logger.info(f"Validation report saved successfully for {url} with ID {report.id}")

                except Exception as save_error:
                    logger.error(f"Failed to save validation report for {url}: {str(save_error)}")
                    # Continue with response even if save fails

                return JsonResponse({
                    'compliant': is_compliant,
                    'summary': summary,
                    'errors': errors,
                    'contrast_errors': contrast_errors,
                    'alerts': alerts,
                    'features': features,
                    'structural_elements': structural_elements,
                    'suggestions': suggestions,
                    'comprehensive_solution': comprehensive_solution,
                    'modified_html': modified_html,  # Enhanced: For highlighted preview
                    'url': url,
                    'multi_page_scan': {
                        'enabled': scan_multiple_pages,
                        'pages_scanned': len(multi_page_results),
                        'page_results': multi_page_results
                    } if scan_multiple_pages else None
                })
            
            except Exception as e:
                logger.error(f"Axe or Selenium error: {str(e)}")
                return JsonResponse({'error': f'Failed to process page: {str(e)}'}, status=500)
            finally:
                driver.quit()
        
        except Exception as e:
            logger.error(f"Processing error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'POST required'}, status=405)

@csrf_exempt
def save_validation_report(request):
    """Save validation results to database"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            # Extract required fields
            url = data.get('url')
            compliant = data.get('compliant', False)
            summary = data.get('summary', {})
            errors = data.get('errors', [])
            contrast_errors = data.get('contrast_errors', [])
            alerts = data.get('alerts', [])
            features = data.get('features', [])
            suggestions = data.get('suggestions', [])
            agent_data = data.get('agent_data', {})

            if not url:
                return JsonResponse({'error': 'URL is required'}, status=400)

            # Create and save the validation report
            report = ValidationReport.objects.create(
                url=url,
                compliant=compliant,
                summary=summary,
                errors=errors,
                contrast_errors=contrast_errors,
                alerts=alerts,
                features=features,
                suggestions=suggestions,
                agent_data=agent_data
            )

            # Log the save operation
            ValidationLog.objects.create(
                log_type='manual_validation',
                url=url,
                operation_details={
                    'action': 'save_validation_report',
                    'report_id': report.id,
                    'summary_counts': summary
                },
                success=True
            )

            return JsonResponse({
                'success': True,
                'report_id': report.id,
                'message': 'Validation report saved successfully'
            })

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON data'}, status=400)
        except Exception as e:
            logger.error(f"Error saving validation report: {str(e)}")
            return JsonResponse({'error': f'Failed to save report: {str(e)}'}, status=500)

    return JsonResponse({'error': 'POST required'}, status=405)

def extract_fixed_code(suggestion):
    if '```' in suggestion:
        parts = suggestion.split('```')
        return parts[1] if len(parts) > 1 else 'No auto-fix generated'
    return 'No auto-fix generated'

def generate_enhanced_suggestion(issue, site_content, client, priority_category):
    """Generate comprehensive suggestion with enhanced details and priority information."""

    issue_id = issue['id']
    description = issue['description']
    impact = issue.get('impact', 'moderate')
    tags = issue.get('tags', [])
    nodes = issue.get('nodes', [])

    # Base suggestion data
    suggestion_data = {
        'issue_id': issue_id,
        'description': description,
        'impact': impact,
        'priority_category': priority_category,
        'wcag_guidelines': tags,
        'affected_elements': len(nodes),
        'suggestion': '',
        'quick_fix': '',
        'fixed_snippet': '',
        'implementation_steps': [],
        'estimated_effort': '',
        'resources': []
    }

    # Enhanced suggestions based on issue type
    if issue_id == 'image-alt':
        suggestion_data.update({
            'suggestion': 'Images must have descriptive alt text for screen readers. Alt text should convey the purpose and content of the image, not repeat adjacent text.',
            'quick_fix': 'Add alt attribute: <img src="image.jpg" alt="Brief description of image content">',
            'fixed_snippet': 'Add alt attribute: <img src="image.jpg" alt="Brief description of image content">',
            'implementation_steps': [
                'Identify all <img> elements without alt attributes',
                'Determine the purpose of each image (decorative vs informative vs functional)',
                'Write concise, descriptive alt text (under 125 characters)',
                'Use empty alt="" for purely decorative images',
                'Avoid repeating adjacent link/button text in alt attributes',
                'For complex images, consider longdesc or aria-describedby',
                'Test alt text with screen readers to ensure clarity'
            ],
            'estimated_effort': 'Low (5-15 minutes per image)',
            'resources': [
                'https://www.w3.org/WAI/tutorials/images/',
                'https://webaim.org/techniques/alttext/',
                'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html'
            ],
            'code_examples': [
                '<img src="logo.png" alt="Company Name"> <!-- Good: describes logo -->',
                '<img src="search.png" alt=""> <!-- Good: decorative icon in button -->',
                '<a href="/contact"><img src="phone.png" alt="Contact us by phone"></a> <!-- Good: describes function -->',
                '<img src="photo.jpg" alt="Photo of our team"> <!-- Avoid: too generic -->'
            ],
            'testing_procedures': [
                'Turn off images in browser to see if alt text makes sense',
                'Use screen reader to hear alt text announcements',
                'Verify alt text is not redundant with adjacent text',
                'Check that alt text conveys the same information as the image'
            ]
        })

    elif 'image-redundant' in issue_id.lower() or 'redundant' in issue_id.lower():
        suggestion_data.update({
            'suggestion': 'Button and link text should not be repeated as image alternative text. This creates redundant announcements for screen reader users.',
            'quick_fix': 'Use empty alt for images within buttons/links: <button><img src="icon.png" alt="">Search</button>',
            'fixed_snippet': 'Use empty alt for images within buttons/links: <button><img src="icon.png" alt="">Search</button>',
            'implementation_steps': [
                'Find images within <a>, <button>, or link elements',
                'Check if image alt text repeats the link/button text', 
                'Remove redundant alt text or make it empty (alt="")',
                'Ensure the link/button text alone provides sufficient context',
                'For icon-only buttons, use aria-label instead of alt text',
                'Test with screen readers to avoid double announcements'
            ],
            'estimated_effort': 'Low (2-5 minutes per instance)',
            'resources': [
                'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html',
                'https://webaim.org/techniques/alttext/#decorative',
                'https://www.w3.org/WAI/tutorials/images/functional/'
            ],
            'code_examples': [
                '<button><img src="search.png" alt="">Search</button> <!-- Good: empty alt, text provides context -->',
                '<a href="/home"><img src="home.png" alt="Home">Home</a> <!-- Bad: redundant alt text -->',
                '<button aria-label="Search"><img src="search.png" alt=""></button> <!-- Good: aria-label for icon-only -->'
            ],
            'testing_procedures': [
                'Use screen reader to navigate links/buttons',
                'Listen for double announcements of the same text',
                'Verify that removing alt text doesn\'t lose important information',
                'Test keyboard navigation to ensure functionality is clear'
            ]
        })

    elif issue_id == 'button-name':
        suggestion_data.update({
            'suggestion': 'Interactive elements must have accessible names that clearly describe their function. Buttons without proper names cannot be operated by assistive technologies.',
            'quick_fix': 'Add aria-label or visible text: <button aria-label="Search products">🔍</button>',
            'fixed_snippet': 'Add aria-label or visible text: <button aria-label="Search products">🔍</button>',
            'implementation_steps': [
                'Identify all <button> elements without text content or aria-label',
                'For icon-only buttons: Add descriptive aria-label attribute',
                'For image buttons: Add alt text to <img> and aria-labelledby if needed',
                'For custom controls: Add role="button" and aria-label',
                'Test with screen readers (NVDA, JAWS, VoiceOver) to verify names are announced correctly',
                'Ensure button names are unique and descriptive of their specific function'
            ],
            'estimated_effort': 'Low (2-5 minutes per button)',
            'resources': [
                'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html',
                'https://www.w3.org/WAI/ARIA/apg/patterns/button/',
                'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/forms/Basic_form_hints'
            ],
            'code_examples': [
                '<button>Search</button> <!-- Good: visible text -->',
                '<button aria-label="Search products">🔍</button> <!-- Good: aria-label for icon -->',
                '<button aria-label="Close dialog"><span aria-hidden="true">×</span></button> <!-- Good: hidden icon with label -->'
            ],
            'testing_procedures': [
                'Use screen reader to navigate to button',
                'Verify the announced name describes the button\'s function',
                'Test keyboard navigation (Tab key) to button',
                'Ensure button can be activated with Enter/Space keys'
            ]
        })

    elif issue_id == 'missing-h1':
        suggestion_data.update({
            'suggestion': 'Pages must have exactly one H1 heading that describes the main topic or purpose. Missing H1 headings make it difficult for users to understand the page structure.',
            'quick_fix': '<h1>Main Page Title or Purpose</h1> (place near top of main content)',
            'fixed_snippet': '<h1>Main Page Title or Purpose</h1> (place near top of main content)',
            'implementation_steps': [
                'Identify the main topic or purpose of the page',
                'Add a single H1 element near the top of the main content area',
                'Ensure H1 text is descriptive and unique to the page',
                'Verify heading hierarchy flows logically (H1→H2→H3→H4→etc.)',
                'Avoid using H1 for site-wide branding (use CSS instead)',
                'Test heading navigation with screen readers'
            ],
            'estimated_effort': 'Low (2-5 minutes)',
            'resources': [
                'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
                'https://www.w3.org/WAI/tutorials/page-structure/headings/',
                'https://webaim.org/techniques/semanticstructure/'
            ],
            'code_examples': [
                '<main>\n  <h1>Product Catalog</h1>\n  <h2>Electronics</h2>\n  <h3>Smartphones</h3>\n</main> <!-- Good hierarchy -->',
                '<header><h1>Site Name</h1></header>\n<main><h1>Page Title</h1></main> <!-- Multiple H1s - avoid -->'
            ],
            'testing_procedures': [
                'Use screen reader heading navigation (H key)',
                'Verify logical heading order when linearized',
                'Check that H1 describes the page\'s main purpose',
                'Ensure no heading levels are skipped inappropriately'
            ]
        })

    elif 'heading' in issue_id.lower() and 'order' in issue_id.lower():
        suggestion_data.update({
            'suggestion': 'Heading elements must be used in a semantically correct order. Skipping heading levels (e.g., H1 to H3) breaks the document structure.',
            'quick_fix': 'Fix heading hierarchy: Change <h3> to <h2> if following <h1>, or add missing intermediate headings',
            'fixed_snippet': 'Fix heading hierarchy: Change <h3> to <h2> if following <h1>, or add missing intermediate headings',
            'implementation_steps': [
                'Audit all heading elements on the page',
                'Identify skipped heading levels',
                'Either: Add missing intermediate headings, or change heading levels to maintain proper hierarchy',
                'Ensure the hierarchy reflects the document structure',
                'Use headings for structure, not just visual styling',
                'Test with screen reader heading navigation'
            ],
            'estimated_effort': 'Medium (10-20 minutes)',
            'resources': [
                'https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html',
                'https://webaim.org/techniques/semanticstructure/',
                'https://www.w3.org/WAI/tutorials/page-structure/headings/'
            ],
            'code_examples': [
                '<h1>Main Title</h1>\n<h2>Section A</h2>\n<h2>Section B</h2>\n<h3>Subsection B1</h3> <!-- Correct hierarchy -->',
                '<h1>Main Title</h1>\n<h3>Wrong Level</h3> <!-- Incorrect: skipped H2 -->'
            ],
            'testing_procedures': [
                'Navigate headings with screen reader (H key)',
                'Verify outline makes logical sense',
                'Check that subsections are properly nested under main sections',
                'Ensure no important content is missed when navigating by headings'
            ]
        })

    elif issue_id == 'missing-main':
        suggestion_data.update({
            'suggestion': 'Pages must have a main landmark to identify the primary content area.',
            'quick_fix': '<main>\n  <!-- Primary page content -->\n</main>',
            'fixed_snippet': '<main>\n  <!-- Primary page content -->\n</main>',
            'implementation_steps': [
                'Identify the main content area of the page',
                'Wrap main content in <main> element or <div role="main">',
                'Ensure only one main landmark per page',
                'Remove any competing main landmarks'
            ],
            'estimated_effort': 'Low (5-10 minutes)',
            'resources': ['https://www.w3.org/WAI/WCAG22/Understanding/main-content.html']
        })

    elif 'contrast' in issue_id.lower():
        suggestion_data.update({
            'suggestion': 'Text must have sufficient color contrast against its background for readability.',
            'quick_fix': 'Adjust colors to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)',
            'fixed_snippet': 'Adjust colors to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)',
            'implementation_steps': [
                'Use contrast checking tools to measure current ratios',
                'Adjust text color or background color as needed',
                'Test with different color combinations',
                'Consider user preferences for high contrast modes'
            ],
            'estimated_effort': 'Medium (15-30 minutes per element)',
            'resources': ['https://webaim.org/resources/contrastchecker/', 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html']
        })

    elif issue_id.startswith('aria-'):
        # ARIA-specific suggestions
        aria_suggestions = {
            'aria-allowed-role': {
                'suggestion': 'ARIA attributes must be valid for the element\'s role.',
                'quick_fix': 'Remove invalid ARIA attributes or change element role',
                'fixed_snippet': 'Remove invalid ARIA attributes or change element role',
                'steps': ['Check ARIA specification for valid attribute-role combinations', 'Remove or correct invalid attributes']
            },
            'aria-valid-attr-value': {
                'suggestion': 'ARIA attribute values must be valid according to the specification.',
                'quick_fix': 'Fix invalid values (e.g., aria-expanded must be "true" or "false")',
                'fixed_snippet': 'Fix invalid values (e.g., aria-expanded must be "true" or "false")',
                'steps': ['Review ARIA attribute value requirements', 'Correct invalid values']
            },
            'aria-required-attr': {
                'suggestion': 'Certain ARIA roles require specific attributes to function properly.',
                'quick_fix': 'Add required attributes for the specific role',
                'fixed_snippet': 'Add required attributes for the specific role',
                'steps': ['Identify required attributes for the role', 'Add missing attributes with appropriate values']
            }
        }

        aria_data = aria_suggestions.get(issue_id, {
            'suggestion': f'Review ARIA specification for {issue_id}',
            'quick_fix': 'Consult ARIA authoring practices guide',
            'fixed_snippet': 'Consult ARIA authoring practices guide',
            'steps': ['Check ARIA specification', 'Implement correct ARIA usage']
        })

        suggestion_data.update({
            'suggestion': aria_data['suggestion'],
            'quick_fix': aria_data['quick_fix'],
            'fixed_snippet': aria_data['fixed_snippet'],
            'implementation_steps': aria_data['steps'],
            'estimated_effort': 'Medium (10-20 minutes)',
            'resources': ['https://www.w3.org/WAI/ARIA/apg/', 'https://www.w3.org/TR/wai-aria/']
        })

    else:
        # Generic suggestion for unknown issues
        suggestion_data.update({
            'suggestion': f'Review WCAG guidelines for {issue_id}: {description}',
            'quick_fix': 'Manual review required - check WCAG documentation',
            'fixed_snippet': 'Manual review required - check WCAG documentation',
            'implementation_steps': ['Review WCAG guidelines', 'Implement appropriate fixes', 'Test with assistive technologies'],
            'estimated_effort': 'Varies',
            'resources': ['https://www.w3.org/WAI/WCAG22/quickref/']
        })

    # Add AI-enhanced suggestions if client is available and enabled
    global ai_suggestions_enabled
    if client and ai_suggestions_enabled and not suggestion_data['suggestion'].startswith('AI suggestion'):
        try:
            ai_prompt = f"""
            Enhance this accessibility suggestion for: {description}
            Current suggestion: {suggestion_data['suggestion']}
            Issue type: {issue_id}, Impact: {impact}, Tags: {', '.join(tags)}
            Site context: {site_content[:300] if site_content else 'No context'}

            Provide:
            1. More specific implementation guidance
            2. Common pitfalls to avoid
            3. Testing recommendations
            Keep response under 120 words.
            """

            ai_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": ai_prompt}],
                max_tokens=150,  # Further reduced token limit
                temperature=0.3,
                timeout=API_TIMEOUT  # Add timeout
            )

            ai_enhancement = ai_response.choices[0].message.content.strip()
            suggestion_data['ai_enhanced_guidance'] = ai_enhancement

        except Exception as e:
            error_msg = str(e).lower()
            if 'quota' in error_msg or '429' in error_msg or 'insufficient_quota' in error_msg:
                logger.warning(f"OpenAI quota exceeded for {issue_id}, using fallback suggestions")
                suggestion_data['ai_enhanced_guidance'] = "AI enhancement unavailable due to API quota limits. Using standard WCAG recommendations."
                # Disable AI suggestions for remaining issues in this session
                ai_suggestions_enabled = False
            elif 'timeout' in error_msg or 'time' in error_msg:
                logger.warning(f"AI request timeout for {issue_id}, using fallback suggestions")
                suggestion_data['ai_enhanced_guidance'] = "AI enhancement timed out. Using standard WCAG recommendations."
            else:
                logger.warning(f"AI enhancement failed for {issue_id}: {str(e)}")
                suggestion_data['ai_enhanced_guidance'] = "AI enhancement temporarily unavailable. Please refer to WCAG guidelines for detailed implementation."
    else:
        suggestion_data['ai_enhanced_guidance'] = "AI suggestions disabled. Using standard WCAG recommendations."

    return suggestion_data

def _generate_comprehensive_solution(errors, contrast_errors, alerts, structural_elements, soup):
    """Generate a comprehensive remediation solution based on all issues found."""

    solution = {
        'priority_actions': [],
        'structural_fixes': [],
        'aria_fixes': [],
        'content_fixes': [],
        'estimated_effort': 'Unknown',
        'compliance_level': 'Unknown'
    }

    all_issues = errors + contrast_errors + alerts

    # Priority 1: Critical structural issues
    if structural_elements['landmarks'] == 0:
        solution['priority_actions'].append({
            'priority': 1,
            'issue': 'Missing landmarks',
            'action': 'Add main landmark and navigation structure',
            'code': '<main>\n  <h1>Page Title</h1>\n  <!-- Main content -->\n</main>\n<nav>\n  <!-- Navigation -->\n</nav>',
            'impact': 'High - Screen readers cannot navigate the page effectively'
        })

    if structural_elements['headings'] == 0:
        solution['priority_actions'].append({
            'priority': 1,
            'issue': 'Missing headings',
            'action': 'Add proper heading hierarchy starting with H1',
            'code': '<h1>Main Page Title</h1>\n<h2>Section Title</h2>\n<h3>Subsection</h3>',
            'impact': 'High - Users cannot understand page structure'
        })

    # Priority 2: ARIA issues
    aria_issues = [issue for issue in all_issues if 'aria' in issue['id'].lower()]
    if aria_issues:
        solution['aria_fixes'].extend([{
            'issue': issue['id'],
            'description': issue['description'],
            'fix': f"Review and fix {len([i for i in all_issues if i['id'] == issue['id']])} instances",
            'example': _get_aria_fix_example(issue['id'])
        } for issue in aria_issues[:5]])  # Top 5 ARIA issues

    # Priority 3: Content issues
    image_issues = [issue for issue in all_issues if 'image' in issue['id'].lower()]
    if image_issues:
        solution['content_fixes'].append({
            'issue': 'Missing alt text',
            'count': len(image_issues),
            'action': 'Add descriptive alt text to all images',
            'example': '<img src="photo.jpg" alt="Description of the photo content">'
        })

    button_issues = [issue for issue in all_issues if 'button' in issue['id'].lower()]
    if button_issues:
        solution['content_fixes'].append({
            'issue': 'Buttons without accessible names',
            'count': len(button_issues),
            'action': 'Add text content or aria-label to buttons',
            'example': '<button aria-label="Search">🔍</button>'
        })

    # Priority 4: Contrast issues
    if contrast_errors:
        solution['content_fixes'].append({
            'issue': 'Insufficient color contrast',
            'count': len(contrast_errors),
            'action': 'Adjust text and background colors to meet WCAG AA standards (4.5:1 ratio)',
            'example': 'color: #000000; background-color: #FFFFFF; /* Check with contrast tools */'
        })

    # Calculate estimated effort
    total_issues = len(all_issues)
    if total_issues == 0:
        solution['estimated_effort'] = 'None - Fully compliant'
        solution['compliance_level'] = 'WCAG AA Compliant'
    elif total_issues < 10:
        solution['estimated_effort'] = 'Low - 1-2 hours'
        solution['compliance_level'] = 'Minor issues to fix'
    elif total_issues < 50:
        solution['estimated_effort'] = 'Medium - 4-8 hours'
        solution['compliance_level'] = 'Moderate accessibility issues'
    else:
        solution['estimated_effort'] = 'High - 1-2 days'
        solution['compliance_level'] = 'Significant accessibility barriers'

    return solution

def _get_aria_fix_example(issue_id):
    """Get example fix for specific ARIA issues."""
    examples = {
        'aria-allowed-role': "Remove aria-expanded from <div> or change to <button aria-expanded='false'>",
        'aria-valid-attr-value': "Change aria-expanded='maybe' to aria-expanded='true' or 'false'",
        'aria-hidden-body': "Remove aria-hidden from <body> element",
        'aria-required-attr': "Add aria-checked to <div role='checkbox'> → <div role='checkbox' aria-checked='false'>",
        'aria-required-children': "Add <li role='listitem'> inside <ul role='list'>",
        'aria-required-parent': "Move <li role='listitem'> inside <ul role='list'>",
        'aria-valid-role': "Change role='invalid' to role='button' or remove role",
        'aria-valid-attr': "Remove invalid aria-* attributes"
    }
    return examples.get(issue_id, "Review ARIA specification and fix accordingly")

def _improve_selector_specificity(selector, soup):
    """Improve selector specificity to avoid highlighting entire page sections."""
    try:
        # Skip very broad selectors that would highlight large portions
        broad_selectors = ['body', 'html', 'div', 'span', 'p', 'section', 'article', 'main', 'header', 'footer', 'nav', 'ul', 'ol', 'li']

        if selector in broad_selectors:
            return None

        # If selector is too generic (just tag name), try to make it more specific
        if selector and not any(char in selector for char in ['#', '.', '[', '>', ' ', '+', '~']):
            # Try to find elements with this tag and add more specificity
            elements = soup.select(selector)
            if len(elements) > 5:  # Reduced threshold - if many elements match, it's too broad
                return None
            elif len(elements) == 1:
                # Add nth-child or other specificity
                element = elements[0]
                if element.get('id'):
                    return f"#{element['id']}"
                elif element.get('class'):
                    classes = element['class']
                    if isinstance(classes, list):
                        # Use first class for specificity
                        return f"{selector}.{classes[0]}"
                    else:
                        return f"{selector}.{classes}"
                else:
                    # Find position among siblings
                    parent = element.parent
                    if parent:
                        siblings = [s for s in parent.children if s.name == selector]
                        if len(siblings) == 1:
                            return selector  # Keep as is if unique
                        else:
                            index = siblings.index(element) + 1
                            return f"{selector}:nth-of-type({index})"

        # For complex selectors, validate they don't match too many elements
        if ' ' in selector or '>' in selector:  # Complex selectors
            elements = soup.select(selector)
            if len(elements) > 10:  # Reduced threshold - too many matches
                return None
            elif len(elements) == 0:
                return None  # No matches found

        return selector

    except Exception as e:
        logger.warning(f"Error improving selector specificity for {selector}: {str(e)}")
        return None

def _get_quick_solution(issue):
    """Get a quick solution for the given issue."""
    issue_id = issue.get('id', '')
    issue_type = issue.get('type', '')

    # Quick solutions for common issues
    solutions = {
        'image-alt': 'Add alt attribute: <img src="..." alt="Brief description">',
        'button-name': 'Add text content or aria-label: <button aria-label="Action">',
        'missing-h1': 'Add main heading: <h1>Page Title</h1>',
        'heading-order': 'Fix heading hierarchy (H1→H2→H3)',
        'aria-valid-attr-value': 'Fix ARIA value (true/false/mixed)',
        'aria-required-attr': 'Add required ARIA attribute',
        'contrast': 'Adjust colors to meet 4.5:1 contrast ratio'
    }

    # Get specific solution or generic one
    solution = solutions.get(issue_id, f"Review WCAG guidelines for {issue_id}")

    # Add impact-based urgency
    impact = issue.get('impact', 'moderate')
    if impact == 'critical':
        solution = f"URGENT: {solution}"
    elif impact == 'serious':
        solution = f"IMPORTANT: {solution}"

    return solution

def make_absolute(soup, base_url):
    for tag in soup.find_all(True):
        for attr in ['href', 'src', 'poster', 'data-src']:  # Common attrs
            if tag.has_attr(attr):
                tag[attr] = urljoin(base_url, tag[attr])
    # For style attrs with url()
    for tag in soup.find_all(style=True):
        style = tag['style']
        if 'url(' in style:
            # Simple replace; for accuracy, use cssutils if needed
            style = style.replace('url("', f'url("{base_url}').replace("url('", f"url('{base_url}")
            tag['style'] = style

def scrape_site_comprehensive(base_url, max_pages=5, driver=None):
    """Comprehensive site scraping with accessibility analysis for multiple pages."""
    try:
        parsed_base = urlparse(base_url)
        base_domain = parsed_base.netloc
        visited = set()
        queue = deque([base_url])
        content = []
        page_results = []
        all_highlights = []
        all_violations = []
        all_incomplete = []
        all_passes = []

        while queue and len(visited) < max_pages:
            current_url = queue.popleft()
            if current_url in visited:
                continue
            visited.add(current_url)

            try:
                response = requests.get(current_url, timeout=15)
                if response.status_code != 200:
                    continue

                soup = BeautifulSoup(response.text, 'html.parser')

                # Extract text content
                for script in soup(["script", "style"]):
                    script.extract()
                text = soup.get_text(separator=' ', strip=True)

                # Quick accessibility analysis for this page
                page_analysis = {
                    'url': current_url,
                    'title': soup.title.string if soup.title else 'No title',
                    'headings': len(soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])),
                    'images': len(soup.find_all('img')),
                    'images_without_alt': len([img for img in soup.find_all('img') if not img.get('alt')]),
                    'links': len(soup.find_all('a', href=True)),
                    'forms': len(soup.find_all('form')),
                    'aria_elements': len(soup.find_all(lambda tag: any(attr.startswith('aria-') for attr in tag.attrs))),
                    'landmarks': len(soup.find_all(attrs={'role': ['main', 'navigation', 'complementary', 'contentinfo', 'search', 'banner', 'region']})) +
                                len(soup.find_all(['main', 'nav', 'aside', 'header', 'footer']))
                }

                # If driver is provided, run axe analysis on this page to collect highlights
                # Skip Axe for base_url to avoid double-counting (already analyzed in main function)
                if driver and current_url != base_url:
                    try:
                        driver.get(current_url)
                        axe = Axe(driver)
                        axe.inject()
                        page_results_axe = axe.run()

                        # Extract highlights from this page
                        page_highlights = []
                        for violation in page_results_axe.get('violations', []):
                            issue_type = 'contrast_error' if 'contrast' in violation['id'] else 'error'
                            for node in violation['nodes']:
                                for target in node['target']:
                                    page_highlights.append({
                                        'selector': target,
                                        'type': issue_type,
                                        'description': violation['description'],
                                        'id': violation['id'],
                                        'impact': violation['impact'],
                                        'tags': violation['tags'],
                                        'url': current_url  # Track which page this highlight is from
                                    })

                        if page_highlights:
                            all_highlights.append(page_highlights)

                        # Aggregate violations for summary counts
                        all_violations.extend(page_results_axe.get('violations', []))
                        all_incomplete.extend(page_results_axe.get('incomplete', []))
                        all_passes.extend(page_results_axe.get('passes', []))

                    except Exception as e:
                        logger.warning(f"Failed to analyze page {current_url} with axe: {str(e)}")

                content.append(f"Page: {current_url}\nTitle: {page_analysis['title']}\n{text[:1500]}...")  # Increased limit
                page_results.append(page_analysis)

                # Find links to same domain (prioritize important pages)
                links = soup.find_all('a', href=True)
                important_pages = []

                for link in links:
                    href = urljoin(current_url, link['href'])
                    parsed_href = urlparse(href)

                    if parsed_href.netloc == base_domain and href not in visited:
                        link_text = link.get_text().strip().lower()
                        # Prioritize navigation, main content, and important pages
                        if any(keyword in link_text for keyword in ['about', 'contact', 'services', 'products', 'home', 'main', 'navigation']):
                            important_pages.insert(0, href)  # Add to front
                        else:
                            important_pages.append(href)

                # Add important pages first, then others
                for href in important_pages[:max_pages - len(visited)]:
                    if href not in visited:
                        queue.append(href)

            except Exception as e:
                logger.warning(f"Error scraping {current_url}: {str(e)}")
                continue

        return {
            'content': "\n\n".join(content),
            'page_results': page_results,
            'all_highlights': all_highlights,
            'all_violations': all_violations,
            'all_incomplete': all_incomplete,
            'all_passes': all_passes,
            'total_pages_scanned': len(page_results),
            'site_summary': {
                'total_pages': len(page_results),
                'avg_images_per_page': sum(p['images'] for p in page_results) / len(page_results) if page_results else 0,
                'avg_alt_issues': sum(p['images_without_alt'] for p in page_results) / len(page_results) if page_results else 0,
                'total_aria_elements': sum(p['aria_elements'] for p in page_results),
                'total_landmarks': sum(p['landmarks'] for p in page_results),
                'total_highlights': sum(len(h) for h in all_highlights) if all_highlights else 0
            }
        }
    except Exception as e:
        logger.error(f"Comprehensive site scraping error: {str(e)}")
        return {    
            'content': "",
            'page_results': [],
            'all_highlights': [],
            'all_violations': [],
            'all_incomplete': [],
            'all_passes': [],
            'total_pages_scanned': 0,
            'site_summary': {'error': str(e)}
        }

def scrape_site_content(base_url, max_pages=5):
    """Legacy function for backward compatibility."""
    result = scrape_site_comprehensive(base_url, max_pages)
    return result['content']