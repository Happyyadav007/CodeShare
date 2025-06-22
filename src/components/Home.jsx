import { useNavigate } from "react-router-dom";
import { customAlphabet } from "nanoid";
import { ref, get, set, serverTimestamp } from "firebase/database";
import { db } from "../firebase";
import { useState } from "react";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const generateId = customAlphabet(alphabet, 6);

function Home() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const createNewDocument = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setError("");

    try {
      let id;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        id = generateId();
        const docRef = ref(db, `documents/${id}`);
        const snapshot = await get(docRef);
        if (!snapshot.exists()) {
          await set(docRef, {
            content: "// Welcome to your new collaborative coding room!\n",
            language: "javascript",
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
          });
          navigate(`/${id}`);
          return;
        }
        attempts++;
      } while (attempts < maxAttempts);

      throw new Error("Failed to generate a unique room ID.");
    } catch (error) {
      console.error("Error creating document:", error);
      setError("Failed to create a new room. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-blue-400 mb-4">
          CodeShare Pro
        </h1>
        <p className="text-xl text-gray-400 mb-10">
          Real-time, collaborative code editing made simple.
        </p>
      </div>

      <div className="w-full max-w-sm">
        <button
          onClick={createNewDocument}
          className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
            isCreating
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-1 shadow-lg hover:shadow-blue-500/50"
          }`}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating Room...
            </>
          ) : (
            "Create New Coding Room"
          )}
        </button>

        {error && (
          <div className="mt-4 bg-red-800 text-white px-4 py-3 rounded-lg text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;