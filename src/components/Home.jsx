import { useNavigate } from "react-router-dom";
import { customAlphabet } from "nanoid";
import { ref, get, set, serverTimestamp } from "firebase/database";
import { db } from "../firebase";
import { useState } from "react";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const generateId = customAlphabet(alphabet, 5);

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
      let exists;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        id = generateId();
        const docRef = ref(db, `documents/${id}`);
        const snapshot = await get(docRef);
        exists = snapshot.exists();

        if (!exists) {
          // Initialize the document with default values
          await set(docRef, {
            content: "// Start coding here!\n",
            language: "javascript",
            lastUpdated: serverTimestamp(),
            createdAt: serverTimestamp()
          });
          navigate(`/${id}`);
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error("Failed to generate unique ID after multiple attempts");
        }
      } while (exists);
    } catch (error) {
      console.error("Error creating document:", error);
      setError("Failed to create document. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full h-full flex flex-col items-center justify-center max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-400 mb-4">
            CodeShare Clone
          </h1>
          <p className="text-lg md:text-xl text-gray-400">
            Real-time code collaboration
          </p>
        </div>

        <div className="w-full max-w-md">
          <button
            onClick={createNewDocument}
            className={`
              w-full py-4 px-6 rounded-xl font-bold text-lg
              transition-all duration-200
              ${
                isCreating
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-1"
              }
            `}
            disabled={isCreating}
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-3">
                <svg
                  className="animate-spin h-6 w-6 text-white"
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
              </span>
            ) : (
              "Create New Room"
            )}
          </button>

          <div className="mt-6 bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-300">
              Example Room ID:{" "}
              <span className="font-mono text-blue-300">{generateId()}</span>
            </p>
          </div>
          {error && (
            <div className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;