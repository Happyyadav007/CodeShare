import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { ref, onValue, update, onDisconnect, serverTimestamp, goOnline, goOffline } from 'firebase/database';
import { db } from '../firebase';
import { FaCopy, FaCheck, FaGlobe, FaCode, FaExclamationTriangle, FaSync } from 'react-icons/fa';

// Connection status constants
const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting'
};

function CodeEditor() {
  const { id } = useParams();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.CONNECTING);
  const [copyStatus, setCopyStatus] = useState('');
  const [error, setError] = useState(null);
  
  const lastSavedRef = useRef(Date.now());
  const pendingUpdateRef = useRef(null);
  const isFirstLoadRef = useRef(true);
  const languageRef = useRef(language);
  const retryCountRef = useRef(0);

  // Debounced update function with retry logic
  const updateFirebase = useCallback((newCode, newLanguage) => {
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
    }

    pendingUpdateRef.current = setTimeout(async () => {
      try {
        const docRef = ref(db, `documents/${id}`);
        await update(docRef, {
          content: newCode,
          language: newLanguage,
          lastUpdated: serverTimestamp()
        });
        lastSavedRef.current = Date.now();
        retryCountRef.current = 0; // Reset retry counter on success
      } catch (err) {
        console.error("Update failed:", err);
        
        // Exponential backoff for retries
        if (retryCountRef.current < 3) {
          retryCountRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 8000);
          setTimeout(() => updateFirebase(newCode, newLanguage), delay);
          setError(`Failed to save (retrying ${retryCountRef.current}/3)...`);
        } else {
          setError("Failed to save changes. Please check your connection.");
          setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
        }
      }
    }, 500); // 500ms debounce
  }, [id]);

  // Handle language changes
  const handleLanguageChange = useCallback((newLanguage) => {
    setLanguage(newLanguage);
    languageRef.current = newLanguage;
    updateFirebase(code, newLanguage);
  }, [code, updateFirebase]);

  // Handle editor changes
  const handleEditorChange = useCallback((value) => {
    setCode(value);
    updateFirebase(value, languageRef.current);
  }, [updateFirebase]);

  // Connection management
  useEffect(() => {
    goOnline(db); // Ensure we're online when component mounts
    
    const docRef = ref(db, `documents/${id}`);
    
    // Set up onDisconnect handler
    const onDisconnectRef = onDisconnect(docRef);
    onDisconnectRef.update({
      connectionStatus: CONNECTION_STATUS.DISCONNECTED
    }).catch(err => {
      console.error("Failed to set onDisconnect:", err);
    });

    const handleData = (snapshot) => {
      try {
        const data = snapshot.val();
        if (!data) {
          setError("Room not found or has been deleted.");
          setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
          return;
        }

        // Skip if this is our own update
        if (!isFirstLoadRef.current && data.lastUpdated && data.lastUpdated <= lastSavedRef.current) {
          return;
        }

        // Update state if remote data is newer
        setCode(prev => data.content || prev);
        if (data.language && data.language !== languageRef.current) {
          setLanguage(data.language);
          languageRef.current = data.language;
        }
        
        setConnectionStatus(CONNECTION_STATUS.CONNECTED);
        setError(null);
        isFirstLoadRef.current = false;
      } catch (err) {
        console.error("Data processing error:", err);
        setError("Error processing data. Try refreshing.");
        setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      }
    };

    const handleError = (error) => {
      console.error("Firebase error:", error);
      setConnectionStatus(CONNECTION_STATUS.RECONNECTING);
      setError("Connection issues. Reconnecting...");
      
      // Attempt reconnection
      const timer = setTimeout(() => {
        goOnline(db);
        setConnectionStatus(CONNECTION_STATUS.CONNECTING);
      }, 2000);
      
      return () => clearTimeout(timer);
    };

    const unsubscribe = onValue(docRef, handleData, handleError);

    return () => {
      unsubscribe();
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }
      onDisconnectRef.cancel().catch(err => {
        console.error("Failed to cancel onDisconnect:", err);
      });
      goOffline(db); // Go offline when component unmounts
    };
  }, [id]);

  // Clipboard functions
  const copyLink = useCallback(async () => {
    try {
      const url = `${window.location.origin}/${id}`;
      await navigator.clipboard.writeText(url);
      setCopyStatus('link');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      setError("Failed to copy link to clipboard");
    }
  }, [id]);

  const copyAllText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus('text');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      setError("Failed to copy code to clipboard");
    }
  }, [code]);

  // Status indicators
  const connectionStatusIndicator = {
    [CONNECTION_STATUS.CONNECTING]: {
      text: 'Connecting...',
      color: 'yellow',
      icon: <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
    },
    [CONNECTION_STATUS.CONNECTED]: {
      text: 'Connected',
      color: 'green',
      icon: <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
    },
    [CONNECTION_STATUS.DISCONNECTED]: {
      text: 'Disconnected',
      color: 'red',
      icon: <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
    },
    [CONNECTION_STATUS.RECONNECTING]: {
      text: 'Reconnecting...',
      color: 'yellow',
      icon: <FaSync className="text-yellow-400 animate-spin" />
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col">
      {/* Toolbar */}
      <div className="w-full bg-gray-800 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select 
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={connectionStatus !== CONNECTION_STATUS.CONNECTED}
          >
            <option value="javascript">JavaScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="plaintext">Plain Text</option>
          </select>
          
          <span className={`text-${connectionStatusIndicator[connectionStatus].color}-400 text-sm flex items-center gap-1`}>
            {connectionStatusIndicator[connectionStatus].icon}
            {connectionStatusIndicator[connectionStatus].text}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-gray-400 text-sm font-mono">Room: {id}</span>
          
          <button 
            onClick={copyLink}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 transition-colors"
            disabled={connectionStatus !== CONNECTION_STATUS.CONNECTED}
          >
            {copyStatus === 'link' ? (
              <FaCheck className="text-green-400" />
            ) : (
              <FaGlobe className="text-blue-400" />
            )}
            <span className="hidden sm:inline">Share</span>
          </button>
          
          <button 
            onClick={copyAllText}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 transition-colors"
            disabled={!code || connectionStatus !== CONNECTION_STATUS.CONNECTED}
          >
            {copyStatus === 'text' ? (
              <FaCheck className="text-green-400" />
            ) : (
              <FaCode className="text-blue-400" />
            )}
            <span className="hidden sm:inline">Copy</span>
          </button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="w-full bg-red-800 text-white p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError(null)} 
            className="px-2 hover:bg-red-700 rounded"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Editor - takes remaining space */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          width="100%"
          language={language}
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            readOnly: connectionStatus !== CONNECTION_STATUS.CONNECTED
          }}
          loading={<div className="text-white">Loading editor...</div>}
        />
      </div>
    </div>
  );
}

export default CodeEditor;