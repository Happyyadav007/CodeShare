import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  ref,
  onValue,
  update,
  onDisconnect,
  serverTimestamp,
  goOnline,
  goOffline,
  push,
  remove,
  set
} from "firebase/database";
import { db } from "../firebase";
import {
  FaCopy,
  FaCheck,
  FaGlobe,
  FaCode,
  FaExclamationTriangle,
  FaSync,
  FaSave,
  FaUser,
  FaUsers
} from "react-icons/fa";

const CONNECTION_STATUS = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
};

function CodeEditor() {
  const { id } = useParams();
  const [code, setCode] = useState("// Start coding here!\n");
  const [language, setLanguage] = useState("javascript");
  const [connectionStatus, setConnectionStatus] = useState(
    CONNECTION_STATUS.CONNECTING
  );
  const [copyStatus, setCopyStatus] = useState("");
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);

  const editorRef = useRef(null);
  const lastRemoteUpdate = useRef(0);
  const ignoreNextRemoteUpdate = useRef(false);
  const debounceTimeout = useRef(null);
  const presenceInterval = useRef(null);
  const userListRef = useRef(null);

  // Close user list when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userListRef.current && !userListRef.current.contains(event.target)) {
        setShowUserList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const updateFirebase = useCallback(
    (newCode, newLanguage) => {
      setIsSaving(true);
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      debounceTimeout.current = setTimeout(async () => {
        try {
          const docRef = ref(db, `documents/${id}`);
          await update(docRef, {
            content: newCode,
            language: newLanguage,
            lastUpdated: serverTimestamp(),
          });
          setIsSaving(false);
          ignoreNextRemoteUpdate.current = true;
        } catch (err) {
          console.error("Update failed:", err);
          setError("Failed to save changes. Please check your connection.");
          setIsSaving(false);
        }
      }, 500);
    },
    [id]
  );

  const handleEditorChange = useCallback(
    (value) => {
      setCode(value);
      ignoreNextRemoteUpdate.current = true;
      updateFirebase(value, language);
    },
    [language, updateFirebase]
  );

  const handleLanguageChange = useCallback(
    (newLanguage) => {
      setLanguage(newLanguage);
      updateFirebase(code, newLanguage);
    },
    [code, updateFirebase]
  );

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    goOnline(db);
    const docRef = ref(db, `documents/${id}`);

    // Presence system setup
    const presenceRef = ref(db, `documents/${id}/presence`);
    const userPresenceRef = push(presenceRef);
    const userId = `user_${Date.now()}`;
    const userName = `User${Math.floor(Math.random() * 1000)}`;

    // Set initial presence
    set(userPresenceRef, {
      userId,
      name: userName,
      lastActive: serverTimestamp(),
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
    });

    // Update presence periodically
    presenceInterval.current = setInterval(() => {
      update(userPresenceRef, {
        lastActive: serverTimestamp()
      });
    }, 30000);

    // Clean up presence on disconnect
    onDisconnect(userPresenceRef).remove();

    // Listen for all users' presence
    const presenceListener = onValue(presenceRef, (snapshot) => {
      const presenceData = snapshot.val();
      if (presenceData) {
        const users = Object.values(presenceData)
          .filter(user => user.lastActive)
          .sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
        
        setOnlineUsers(users);
      } else {
        setOnlineUsers([]);
      }
    });

    const unsubscribe = onValue(docRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const updateTime = data.lastUpdated ? new Date(data.lastUpdated).getTime() : 0;
        
        if (updateTime > lastRemoteUpdate.current) {
          lastRemoteUpdate.current = updateTime;

          if (ignoreNextRemoteUpdate.current) {
            ignoreNextRemoteUpdate.current = false;
            return;
          }

          const currentContent = editorRef.current?.getValue();
          if (data.content !== undefined && data.content !== currentContent) {
            setCode(data.content);
            const currentPosition = editorRef.current?.getPosition();
            editorRef.current?.setValue(data.content);
            if (currentPosition) {
              editorRef.current?.setPosition(currentPosition);
            }
          }
          
          if (data.language && data.language !== language) {
            setLanguage(data.language);
          }
        }
        setConnectionStatus(CONNECTION_STATUS.CONNECTED);
        setError(null);
      } else {
        setError("Room not found or has been deleted.");
        setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      }
    });

    return () => {
      if (presenceInterval.current) {
        clearInterval(presenceInterval.current);
      }
      remove(userPresenceRef);
      presenceListener();
      unsubscribe();
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      goOffline(db);
    };
  }, [id, language]);

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(type);
      setTimeout(() => setCopyStatus(""), 2000);
    } catch (err) {
      setError(`Failed to copy ${type} to clipboard`);
    }
  };

  const connectionStatusIndicator = {
    [CONNECTION_STATUS.CONNECTING]: {
      text: "Connecting...",
      color: "yellow",
      icon: <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />,
    },
    [CONNECTION_STATUS.CONNECTED]: {
      text: "Connected",
      color: "green",
      icon: <span className="inline-block w-2 h-2 rounded-full bg-green-400" />,
    },
    [CONNECTION_STATUS.DISCONNECTED]: {
      text: "Disconnected",
      color: "red",
      icon: <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />,
    },
    [CONNECTION_STATUS.RECONNECTING]: {
      text: "Reconnecting...",
      color: "yellow",
      icon: <FaSync className="text-yellow-400 animate-spin" />,
    },
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="w-full bg-gray-800 p-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left side - Language and status */}
        <div className="flex items-center gap-4">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={connectionStatus !== CONNECTION_STATUS.CONNECTED}
          >
            <option value="plaintext">Plain Text</option>
            <option value="javascript">JavaScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>
          
          <div className="flex items-center gap-2">
            <span className={`text-sm flex items-center gap-2 text-${connectionStatusIndicator[connectionStatus].color}-400`}>
              {connectionStatusIndicator[connectionStatus].icon}
              {connectionStatusIndicator[connectionStatus].text}
            </span>
            {isSaving && (
              <span className="text-sm flex items-center gap-2 text-yellow-400">
                <FaSave className="animate-pulse" />
                Saving...
              </span>
            )}
          </div>
        </div>

        {/* Right side - Room info and actions */}
        <div className="flex items-center gap-4">
          {/* Online users */}
          <div className="relative" ref={userListRef}>
            <button 
              onClick={() => setShowUserList(!showUserList)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              {onlineUsers.length > 1 ? (
                <FaUsers className="text-blue-400" />
              ) : (
                <FaUser className="text-blue-400" />
              )}
              <span className="text-sm text-gray-200">
                {onlineUsers.length} online
              </span>
            </button>
            
            {showUserList && onlineUsers.length > 0 && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-50">
                <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-600">
                  Online Users
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {onlineUsers.map((user, index) => (
                    <div key={index} className="flex items-center px-4 py-2 hover:bg-gray-600">
                      <span 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: user.color }}
                      ></span>
                      <span className="text-sm text-gray-200 truncate">
                        {user.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Room ID */}
          <div className="hidden sm:flex items-center bg-gray-700 px-3 py-1.5 rounded">
            <span className="text-sm text-gray-300 font-mono">
              Room: {id}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(`${window.location.origin}/${id}`, "link")}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 transition-colors"
              disabled={connectionStatus !== CONNECTION_STATUS.CONNECTED}
            >
              {copyStatus === "link" ? (
                <FaCheck className="text-green-400" />
              ) : (
                <FaGlobe className="text-blue-400" />
              )}
              <span className="hidden sm:inline text-sm">Share</span>
            </button>
            <button
              onClick={() => copyToClipboard(code, "text")}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 transition-colors"
              disabled={!code || connectionStatus !== CONNECTION_STATUS.CONNECTED}
            >
              {copyStatus === "text" ? (
                <FaCheck className="text-green-400" />
              ) : (
                <FaCode className="text-blue-400" />
              )}
              <span className="hidden sm:inline text-sm">Copy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
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

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          width="100%"
          language={language}
          value={code}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          loading={
            <div className="text-white text-center p-10">Loading Editor...</div>
          }
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            wordWrap: "on",
            automaticLayout: true,
            readOnly: connectionStatus !== CONNECTION_STATUS.CONNECTED,
          }}
        />
      </div>
    </div>
  );
}

export default CodeEditor;