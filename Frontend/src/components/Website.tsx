
//website.tsx

import React, { useState, FormEvent, ChangeEvent } from "react";
import axios from "axios";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import "../websiteApp.css"

// ==========================
// 🔹 Interfaces
// ==========================
interface Node {
  html: string;
}

interface Issue {
  id: string;
  description: string;
  impact: string;
  tags?: string[];
  help_url: string;
  nodes?: Node[];
}

interface Suggestion {
  issue_id: string;
  suggestion: string;
  fixed_snippet: string;
}

interface Summary {
  errors: number;
  contrast_errors: number;
  alerts: number;
  features: number;
  structural_elements: number;
  aria: number;
}

interface StructuralElements {
  headings: number;
  lists: number;
  tables: number;
  landmarks: number;
}

interface ValidationResults {
  url: string;
  compliant: boolean;
  summary: Summary;
  errors: Issue[];
  alerts: Issue[];
  features: Issue[];
  suggestions: Suggestion[];
  structural_elements: StructuralElements;
  contrast_errors: Issue[];
  modified_html: string;
}

// ==========================
// 🔹 Main Component
// ==========================
function Website() {
  // 🔹 Validation States
  const [url, setUrl] = useState<string>("");
  const [results, setResults] = useState<ValidationResults | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState<string | null>(null);

  // ==========================
  // 🔹 Validation API Call
  // ==========================
  const handleValidationSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIframeError(null);

    try {
      const response = await axios.post<ValidationResults>(
        "http://localhost:8000/apis/validate/",
        { url },
        { headers: { "Content-Type": "application/json" } }
      );
      setResults(response.data);
    } catch (err: any) {
      setError("Error validating: " + err.message);
    }
    setLoading(false);
  };

  // ==========================
  // 🔹 Render
  // ==========================
  return (
    <div className="App">
      <header className="app-header">
        <h1>AI WCAG Validator & Remediator</h1>
      </header>

      <Tabs>
        <TabList className="main-tab-list">
          <Tab>Validation</Tab>
          {/* <Tab>Narration</Tab> */}
          {/* <Tab>PDF Analyzer</Tab> */}
          {/* <Tab>Accessibility Tool</Tab> */}
        </TabList>

        {/* ==========================
            Validation TAB
        ========================== */}
        <TabPanel>
          <form onSubmit={handleValidationSubmit} className="url-form">
            <input
              type="url"
              value={url}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setUrl(e.target.value)
              }
              placeholder="Enter website URL"
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Validating..." : "Validate"}
            </button>
          </form>
          {error && <p className="error">{error}</p>}

          <div className="split-container">
            <div className="results-sidebar">
              {results && (
                <div className="results">
                  <h2>Results for {results.url}</h2>
                  <p className="compliance">
                    Fully Compliant: {results.compliant ? "Yes" : "No"}
                  </p>
                  <Tabs>
                    <TabList className="tab-list">
                      <Tab>Summary</Tab>
                      <Tab>Details</Tab>
                      <Tab>Reference</Tab>
                      <Tab>Structure</Tab>
                      <Tab>Contrast</Tab>
                    </TabList>

                    <TabPanel>
                      <div className="summary-grid">
                        <div className="summary-box error">
                          Errors: {results.summary.errors}
                        </div>
                        <div className="summary-box contrast">
                          Contrast Errors: {results.summary.contrast_errors}
                        </div>
                        <div className="summary-box alert">
                          Alerts: {results.summary.alerts}
                        </div>
                        <div className="summary-box feature">
                          Features: {results.summary.features}
                        </div>
                        <div className="summary-box structure">
                          Structural Elements:{" "}
                          {results.summary.structural_elements}
                        </div>
                        <div className="summary-box aria">
                          ARIA: {results.summary.aria}
                        </div>
                      </div>
                    </TabPanel>

                    <TabPanel>
                      <h3>Errors</h3>
                      <ul>{renderIssues(results.errors, results.suggestions)}</ul>
                      <h3>Alerts</h3>
                      <ul>{renderIssues(results.alerts, results.suggestions)}</ul>
                    </TabPanel>

                    <TabPanel>
                      <h3>Reference</h3>
                      <p>
                        Based on WCAG 2.2 AA. For each issue, refer to help URLs
                        provided in details.
                      </p>
                    </TabPanel>

                    <TabPanel>
                      <h3>Structure</h3>
                      <ul>
                        <li>Headings: {results.structural_elements.headings}</li>
                        <li>Lists: {results.structural_elements.lists}</li>
                        <li>Tables: {results.structural_elements.tables}</li>
                        <li>
                          Landmarks: {results.structural_elements.landmarks}
                        </li>
                      </ul>
                      <h3>Features</h3>
                      <ul>{renderIssues(results.features, [])}</ul>
                    </TabPanel>

                    <TabPanel>
                      <h3>Contrast Errors</h3>
                      <ul>
                        {renderIssues(results.contrast_errors, results.suggestions)}
                      </ul>
                    </TabPanel>
                  </Tabs>
                </div>
              )}
            </div>

            <div className="preview-area">
              {results && (
                <>
                  <h3>Website Preview (with Highlights)</h3>
                  {iframeError ? (
                    <p className="error">Failed to load preview: {iframeError}</p>
                  ) : (
                    <iframe
                      srcDoc={results.modified_html}
                      title="Website Preview with Highlights"
                      className="website-iframe"
                      onError={() =>
                        setIframeError(
                          "Unable to load highlighted preview. Check console for details."
                        )
                      }
                      sandbox="allow-scripts allow-same-origin"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}

// ==========================
// 🔹 Helper Function
// ==========================
function renderIssues(issues: Issue[], suggestions: Suggestion[]) {
  return issues.map((issue, idx) => {
    const sug = suggestions.find((s) => s.issue_id === issue.id) || {
      suggestion: "",
      fixed_snippet: "",
    };

    return (
      <li key={idx}>
        <strong>{issue.description}</strong> (Impact: {issue.impact}, WCAG:{" "}
        {issue.tags?.join(", ")})
        <p>
          Help:{" "}
          <a href={issue.help_url} target="_blank" rel="noopener noreferrer">
            Reference
          </a>
        </p>
        <details>
          <summary>Affected Elements ({issue.nodes?.length || 0})</summary>
          <ul>
            {issue.nodes?.map((node, nIdx) => (
              <li key={nIdx}>
                <pre>{node.html}</pre>
              </li>
            ))}
          </ul>
        </details>
        <p>
          <strong>Suggestion:</strong> {sug.suggestion}
        </p>
        <pre>{sug.fixed_snippet}</pre>
      </li>
    );
  });
}

export default Website;