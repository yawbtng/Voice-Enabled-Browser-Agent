import '@testing-library/jest-dom'

// Polyfills for Node.js environment
global.TextDecoder = global.TextDecoder || require('util').TextDecoder;
global.TextEncoder = global.TextEncoder || require('util').TextEncoder;
