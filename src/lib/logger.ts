import Debug from "debug"; 
const debug = Debug.default || Debug; // Ensures compatibility

// Always enable specific namespaces based on VERBOSE
const namespaces = process.env.VERBOSE === "true" ? "app:*" : "";
debug.enable(namespaces); // Enables logs conditionally

// Define different loggers
const logMain = debug("app:main");
const logDB = debug("app:db");
const logAPI = debug("app:api");

export { logMain, logDB, logAPI };
