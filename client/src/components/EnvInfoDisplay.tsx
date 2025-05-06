import React from 'react';
import { 
  API_URL, 
  ENV, 
  isIOS, 
  isAndroid, 
  isWeb, 
  isDevelopment 
} from '../utils/env';

/**
 * A component to display environment information
 * This is helpful for debugging and ensuring environment variables are loaded correctly
 * You can remove this in production or hide it behind an admin flag
 */
const EnvInfoDisplay: React.FC = () => {
  return (
    <div className="p-4 bg-blue-50 rounded-lg mb-4 text-sm">
      <h3 className="font-semibold text-blue-800 mb-2">Environment Info</h3>
      <div className="space-y-1">
        <p><span className="font-medium">API URL:</span> {API_URL}</p>
        <p><span className="font-medium">Environment:</span> {ENV}</p>
        <p><span className="font-medium">Platform:</span> {isIOS ? 'iOS' : isAndroid ? 'Android' : isWeb ? 'Web' : 'Unknown'}</p>
        <p><span className="font-medium">Mode:</span> {isDevelopment ? 'Development' : 'Production'}</p>
      </div>
    </div>
  );
};

export default EnvInfoDisplay;