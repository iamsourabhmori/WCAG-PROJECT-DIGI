// import { createRoot } from 'react-dom/client'
// import App from './App.tsx'
// import './index.css'

// createRoot(document.getElementById("root")!).render(<App />);


//---------------------------------------------------------------------------------------------------------------

// main.tsx
// import React from 'react';
// import { createRoot } from 'react-dom/client';
// import App from './App';
// import './index.css';

// // Get root element
// const rootElement = document.getElementById('root');

// if (!rootElement) {
//   throw new Error('Root element not found. Make sure there is a <div id="root"></div> in index.html');
// }

// // Create React root and render the App
// createRoot(rootElement).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );


//------------------------------------------------------------------------------------------------------------------------------


// main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Get root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a <div id="root"></div> in index.html');
}

// Create React root and render the App
createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);