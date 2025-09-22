import json
import logging
import time
from typing import Dict, List, Any, Optional
from datetime import datetime
from django.conf import settings
from openai import OpenAI
import os
from .models import ValidationReport, ValidationLog
# Removed missing module imports - focusing on core validator functionality

logger = logging.getLogger(__name__)

class ValidatorAgent:
    """
    Intelligent agent for WCAG validation and automated remediation. 
    """

    def __init__(self):
        self.max_retries = 3
        self.timeout = 60
        self.learning_enabled = True
        self.autonomous_mode = True 
        self.memory = ValidatorMemory()

        # Initialize AI client

        try:
            api_key = os.getenv('OPENAI_API_KEY') # ✅ Use OpenAI API key instead of XAI
            if api_key:
                self.client = OpenAI(api_key=api_key)
                # Optional: quick test call to verify key works
                try:
                    self.client.chat.completions.create(
                        model="gpt-4o-mini",  # ✅ lightweight OpenAI model
                        messages=[{"role": "user", "content": "Hello"}],
                        max_tokens=5
                    )
                    logger.info("OpenAI client initialized successfully with gpt-4o-mini")
                except Exception as test_error:
                    logger.warning(f"OpenAI API key found but test call failed: {test_error}")
            else: 
                logger.warning("OPENAI_API_KEY not found in environment variables")
                self.client = None 
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            self.client = None 
            self.client = None 

    def validate_and_remediate(self, url: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Main agent method for autonomous validation and remediation.
        """
        start_time = time.time()  
        options = options or {}

        result = {
            'agent_decisions': [],
            'validation_results': {},
            'remediation_actions': [],
            'ai_services_used': [],
            'learning_insights': [],
            'confidence_score': 0.0,
            'processing_time': 0.0,
            'autonomous_actions_taken': 0
        }

        try:
            # Make autonomous decisions
            agent_decisions = self._make_autonomous_decisions(url, options)
            result['agent_decisions'] = agent_decisions

            # Perform intelligent validation (placeholder for now)
            validation_results = self._perform_intelligent_validation(url, agent_decisions)
            result['validation_results'] = validation_results

            # Autonomous remediation
            if self.autonomous_mode and validation_results.get('errors', []):
                remediation_actions = self._perform_autonomous_remediation(validation_results, url)
                result['remediation_actions'] = remediation_actions
                result['autonomous_actions_taken'] = len(remediation_actions)

            # AI service integration
            ai_services_used = self._integrate_ai_services(validation_results, agent_decisions)
            result['ai_services_used'] = ai_services_used

            # Learning
            if self.learning_enabled: 
                learning_insights = self.memory.learn_from_validation(url, validation_results)
                result['learning_insights'] = learning_insights

            # Calculate confidence
            result['confidence_score'] = self._calculate_agent_confidence(validation_results, agent_decisions)
            result['processing_time'] = time.time() - start_time

        except Exception as e:
            logger.error(f"Agent validation failed for {url}: {e}")
            result['error'] = str(e)

        return result

    def _make_autonomous_decisions(self, url: str, options: Dict[str, Any]) -> List[str]:
        """Agent makes autonomous decisions about validation strategy."""
        decisions = []          
 
        # Decision 1: Validation depth
        if self._should_perform_deep_analysis(url):
            decisions.append("Deep analysis enabled - comprehensive WCAG validation")
        else: 
            decisions.append("Standard analysis - basic WCAG compliance check")

        # Decision 2: AI service utilization
        if self.client and self._should_use_ai_services(url):
            decisions.append("AI services activated - intelligent suggestions and remediation")
        else:
            decisions.append("Manual mode - human review recommended for complex issues")

        # Decision 3: Remediation strategy 
        if self.autonomous_mode and self._should_attempt_autonomous_fixes(url):
            decisions.append("Autonomous remediation enabled - agent will attempt fixes")
        else:
            decisions.append("Conservative mode - manual remediation required")

        return decisions
    
    def _should_perform_deep_analysis(self, url: str) -> bool:
        """Determine if deep analysis is warranted"""
        deep_analysis_domains = ['.gov', '.edu', 'health', 'finance']
        return any(domain in url.lower() for domain in deep_analysis_domains)

    def _should_use_ai_services(self, url: str) -> bool:
        """Determine if AI services should be used"""
        if not self.client:
            return False
        return True  # Default to using AI when available

    def _should_attempt_autonomous_fixes(self, url: str) -> bool:
        """Determine if autonomous fixes should be attempted"""
        return self.autonomous_mode
    
    def _perform_intelligent_validation(self, url: str, decisions: List[str]) -> Dict[str, Any]:
        """
        Perform validation with agent intelligence applied.
        Replace static summary with dynamic counts based on collected issues.
        """

        # Placeholder detected issues (in a real system this will come from your WCAG scanner)
        errors = [
            {"id": "image-alt", "description": "Image missing alt text", "element": "<img src='...'>"},
            {"id": "form-label", "description": "Form input missing label", "element": "<input ...>"}
        ]
        contrast_errors = [
            {"id": "contrast", "description": "Low contrast between text and background", "element": "<p ...>"}
        ]
        alerts = [
            {"id": "heading-order", "description": "Heading order skipped from h2 to h4", "element": "<h4>..." }
        ]
        features = [
            {"id": "landmark", "description": "Page has a main landmark", "element": "<main>...</main>"}
        ]
        suggestions = [
            {"id": "meta-lang", "description": "Consider declaring a page language in <html lang='...'>"}
        ]
        structural_elements = [
            {"id": "section", "description": "Section element detected", "element": "<section>...</section>"}
        ]
        aria = [
            {"id": "aria-role", "description": "Element has ARIA role=button", "element": "<div role='button'>...</div>"}
        ]

        # Build validation results
        validation_results = {
            "compliant": len(errors) == 0 and len(contrast_errors) == 0,
            "errors": errors,
            "contrast_errors": contrast_errors,
            "alerts": alerts,
            "features": features,
            "suggestions": suggestions,
            "structural_elements": structural_elements,
            "aria": aria
        }

        # Build summary dynamically from the actual lists
        validation_results["summary"] = {
            "errors": len(errors),
            "contrast_errors": len(contrast_errors),
            "alerts": len(alerts),
            "features": len(features),
            "structural_elements": len(structural_elements),
            "aria": len(aria)
        }

        return validation_results

    def _perform_autonomous_remediation(self, validation_results: Dict, url: str) -> List[Dict[str, Any]]:
        """Agent autonomously attempts to fix identified issues."""
        actions_taken = []

        # Generate alt text for images (simplified without external dependencies)
        image_errors = [e for e in validation_results.get('errors', [])
                       if e.get('id') == 'image-alt']
        
        if image_errors:
            actions_taken.append({
                'action': 'alt_text_generation',
                'description': f'Identified {len(image_errors)} images needing alt text',
                'success': True,
                'confidence': 0.7,
                'recommendation': 'Add descriptive alt text to all images'
            })
        return actions_taken
    
    def _integrate_ai_services(self, validation_results: Dict, decisions: List[str]) -> List[str]:
        """Integrate with existing AI services."""
        services_used = []

        if 'AI services activated' in decisions and self.client:
            services_used.append('openai_integration')  
            # Core AI functionality remains available through OpenAI client

        return services_used

    def _detect_multi_language_needs(self, validation_results: Dict) -> bool:
        """Detect if site needs multi-language support"""
        return False  # Placeholder

    def _calculate_agent_confidence(self, validation_results: Dict, decisions: List[str]) -> float:
        """Calculate agent's confidence in its analysis and actions"""
        base_confidence = 0.7

        if validation_results.get('summary', {}).get('errors', 0) > 0:
            base_confidence += 0.1 

        if self.client and 'AI services activated' in decisions:
            base_confidence += 0.15

        if self.autonomous_mode: 
            base_confidence += 0.1
        
        return min(1.0, base_confidence)

    def get_agent_status(self) -> Dict[str, Any]:
        """Get current agent status and capabilities"""
        return {
            'active': True,
            'autonomous_mode': self.autonomous_mode,
            'ai_services_available': self.client is not None,
            'learning_enabled': self.learning_enabled,
            'memory_size': len(self.memory.validation_history),
            'last_activity': self.memory.get_last_activity_time()
        }


class ValidatorMemory:  
    """Memory system for the validator agent."""

    def __init__(self):
        self.validation_history = {} 
        self.site_patterns = {} 
        self.ai_success_rates = {}
        self.learning_data = [] 

    def learn_from_validation(self, url: str, results: Dict) -> List[str]:
        """Learn from validation results"""
        insights = []
        domain = self._extract_domain(url)

        if domain not in self.validation_history:
            self.validation_history[domain] = []

        validation_entry = {
            'url': url, 
            'timestamp': datetime.now(), 
            'error_count': results.get('summary', {}).get('errors', 0), 
            'ai_services_used': results.get('ai_services_used', []),
            'autonomous_actions': results.get('autonomous_actions_taken', 0),
            'confidence': results.get('confidence_score', 0)
        }

        self.validation_history[domain].append(validation_entry)

        if len(self.validation_history[domain]) > 50:
            self.validation_history[domain] = self.validation_history[domain][-50:]

        if len(self.validation_history[domain]) > 3:
            avg_errors = sum(v['error_count'] for v in self.validation_history[domain]) / len(self.validation_history[domain])
            insights.append(f"Average errors for {domain}: {avg_errors:.1f}")

        return insights

    def get_site_history(self, url: str) -> Optional[Dict[str, Any]]:
        """Get historical data for a site"""
        domain = self._extract_domain(url)

        if domain not in self.validation_history:
            return None

        validations = self.validation_history[domain]
        if not validations:
            return None

        return {
            'total_validations': len(validations),
            'average_errors': sum(v['error_count'] for v in validations) / len(validations),
            'ai_success_rate': sum(1 for v in validations if v['ai_services_used']) / len(validations),
            'last_validation': max(v['timestamp'] for v in validations),
            'error_count': sum(v['error_count'] for v in validations)
        }

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return parsed.netloc
        except:
            return url.split('/')[0] if '/' in url else url

    def get_last_activity_time(self) -> Optional[datetime]:
        """Get timestamp of last agent activity"""
        all_timestamps = []
        for domain_validations in self.validation_history.values():
            all_timestamps.extend([v['timestamp'] for v in domain_validations])

        return max(all_timestamps) if all_timestamps else None
    
# Global agent instance
validator_agent = ValidatorAgent()