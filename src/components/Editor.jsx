import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import Editor, { DiffEditor } from "@monaco-editor/react";
import {
  ref,
  onValue,
  update,
  onDisconnect,
  serverTimestamp,
  goOnline,
  goOffline,
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

  const editorRef = useRef(null);
  const lastRemoteUpdate = useRef(0);
  const ignoreNextRemoteUpdate = useRef(false);
  const debounceTimeout = useRef(null);

  const updateFirebase = useCallback(
    (newCode, newLanguage) => {
      if (ignoreNextRemoteUpdate.current) {
        // This change was initiated by the current user, so we don't need to re-apply it from Firebase
        ignoreNextRemoteUpdate.current = false;
        return;
      }

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
    (value, event) => {
      // For a more advanced setup, you would analyze `event.changes` to create operations for OT.
      // For this improved version, we're still sending the full content but with better logic to avoid conflicts.
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

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    // Add undo/redo keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
        editor.trigger('whatever...', 'undo', null);
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
        editor.trigger('whatever...', 'redo', null);
    });
     editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => {
        editor.trigger('whatever...', 'redo', null);
    });
  };

  useEffect(() => {
    goOnline(db);
    const docRef = ref(db, `documents/${id}`);

    const presenceRef = ref(db, `.info/connected`);
    const userRef = ref(db, `documents/${id}/presence/${Date.now()}`); // A simple way to track presence

    onValue(presenceRef, (snapshot) => {
      if (snapshot.val() === false) {
        return;
      }

      onDisconnect(userRef)
        .remove()
        .then(() => {
          set(userRef, true);
        });
    });

    const unsubscribe = onValue(docRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Check if the update is more recent than the last one we received
        if (data.lastUpdated > lastRemoteUpdate.current) {
          lastRemoteUpdate.current = data.lastUpdated;

          if (ignoreNextRemoteUpdate.current) {
            ignoreNextRemoteUpdate.current = false;
            return;
          }

          if (data.content !== editorRef.current?.getValue()) {
            const currentPosition = editorRef.current?.getPosition();
            editorRef.current?.setValue(data.content);
            if (currentPosition) {
              editorRef.current?.setPosition(currentPosition);
            }
          }
          if (data.language !== language) {
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
      icon: (
        <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
      ),
    },
    [CONNECTION_STATUS.CONNECTED]: {
      text: "Connected",
      color: "green",
      icon: <span className="inline-block w-2 h-2 rounded-full bg-green-400" />,
    },
    [CONNECTION_STATUS.DISCONNECTED]: {
      text: "Disconnected",
      color: "red",
      icon: (
        <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
      ),
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
      <div className="w-full bg-gray-800 p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Language Selector and Status */}
        <div className="flex items-center gap-4">
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
          <span
            className={`text-sm flex items-center gap-2 text-${
              connectionStatusIndicator[connectionStatus].color
            }-400`}
          >
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

        {/* Room Info and Actions */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-gray-400 text-sm font-mono">
            Room: {id}
          </span>
          <button
            onClick={() => copyToClipboard(`${window.location.origin}/${id}`, 'link')}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 transition-colors"
            disabled={connectionStatus !== CONNECTION_STATUS.CONNECTED}
          >
            {copyStatus === "link" ? (
              <FaCheck className="text-green-400" />
            ) : (
              <FaGlobe className="text-blue-400" />
            )}
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            onClick={() => copyToClipboard(code, 'text')}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 transition-colors"
            disabled={!code || connectionStatus !== CONNECTION_STATUS.CONNECTED}
          >
            {copyStatus === "text" ? (
              <FaCheck className="text-green-400" />
            ) : (
              <FaCode className="text-blue-400" />
            )}
            <span className="hidden sm:inline">Copy</span>
          </button>
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
          loading={<div className="text-white text-center p-10">Loading Editor...</div>}
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