import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import {
    FaMicrophone,
    FaPlay,
    FaMoon,
    FaSun,
    FaPause,
    FaComments,
    FaPaperPlane,
    FaFastBackward,
} from "react-icons/fa";

const API_BASE_URL = "http://localhost:5000";

const App = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [segments, setSegments] = useState([]);
    const [currentBuffer, setCurrentBuffer] = useState([]);
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [activeBox, setActiveBox] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [isBuffering, setIsBuffering] = useState(true);
    const recognitionRef = useRef(null);
    const chatBodyRef = useRef(null);


    useEffect(() => {
        fetch(`${API_BASE_URL}/list-segments?baseName=baseball_segment`)
            .then((response) => response.json())
            .then((data) => {
                setSegments(data.segments);
                setCurrentBuffer(data.segments.slice(0, 5));
            })
            .catch((err) => {
                console.error("Error fetching segments:", err);
              alert("Failed to load video segments.");
            });
    }, []);

    useEffect(() => {
      const video = videoRef.current;
      if (video) {
          video.addEventListener("ended", handleSegmentEnd);
          video.addEventListener("error", handleVideoError);
      }
      return () => {
          if (video) {
              video.removeEventListener("ended", handleSegmentEnd);
            video.removeEventListener("error", handleVideoError);
          }
      };
      // eslint-disable-next-line
    }, [currentSegmentIndex, currentBuffer]);


    useEffect(() => {
        if ("webkitSpeechRecognition" in window) {
            const SpeechRecognition =
                window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = "en-US";

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const newMessage = { sender: "user", text: transcript };
                setChatMessages((prevMessages) => [...prevMessages, newMessage]);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                setIsRecording(false); 
                alert("Speech recognition failed. Please try again."); 
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        } else {
            alert("Speech recognition is not supported in this browser.");
        }
    }, []);


     useEffect(() => {
        if (chatBodyRef.current) {
          chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
      }, [chatMessages]);


    const handleVideoError = (error) => {
      console.error("Video error:", error);
        alert("Error loading video. Please try again."); 
    }

    const handleBoxToggle = (button) => {
        if (activeBox === button) {
            setActiveBox(null);
        } else {
            setActiveBox(button);
        }
    };

    const toggleChat = () => {
        setIsChatOpen(!isChatOpen);
    };

    const sendChatMessage = () => {
        if (chatInput.trim()) {
            const newMessage = { sender: "user", text: chatInput };
            setChatMessages((prevMessages) => [...prevMessages, newMessage]);
            setChatInput("");

            setTimeout(() => {
                const botReply = { sender: "bot", text: "I'm here to help!" };
                setChatMessages((prevMessages) => [...prevMessages, botReply]);
            }, 1000);
        }
    };

    const handlePlayPause = () => {
        const video = videoRef.current;
        if (video) {
            if (isPlaying) {
                video.pause();
            } else {
                video.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSegmentEnd = () => {
        if (currentSegmentIndex < currentBuffer.length - 1) {
            setCurrentSegmentIndex((prevIndex) => prevIndex + 1);
        } else if (currentBuffer.length < segments.length) {
            loadMoreSegments();
        }
    };

    const loadMoreSegments = () => {
        const nextBufferStart = currentBuffer.length;
        const nextBuffer = segments.slice(nextBufferStart, nextBufferStart + 5);
        if (nextBuffer.length > 0) {
            setTimeout(() => {
                setCurrentBuffer((prevBuffer) => [...prevBuffer, ...nextBuffer]);
            }, 3000);
        }
    };

    const handleRewind = () => {
        const video = videoRef.current;
        if (video) {
            video.currentTime -= 10;
        }
    };

      const handleAudioInput = () => {
    if (recognitionRef.current) {
      if (isRecording) {
        recognitionRef.current.stop();
      } else {
        setIsRecording(true);
        recognitionRef.current.start();
      }
    }
  };

    useEffect(() => {
        const bufferTimeout = setTimeout(() => {
            setIsBuffering(false);
        }, 5000);
        return () => clearTimeout(bufferTimeout);
    }, []);

    return (
        <div className={`app-container ${isDarkMode ? "dark" : "light"}`}>
            <button
                className="theme-toggle"
                onClick={() => setIsDarkMode(!isDarkMode)}
                 aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
                {isDarkMode ? <FaSun /> : <FaMoon />}
            </button>

            <div className="video-section">
              <div className="buffering-container" style={{ display: isBuffering ? 'block' : 'none' }}>
                  <div className="buffering-icon"></div>
              </div>
                <video
                  ref={videoRef}
                  autoPlay={!isBuffering}
                  src={currentBuffer[currentSegmentIndex] ? `${API_BASE_URL}/stream-segment?segmentName=${currentBuffer[currentSegmentIndex]}` : ""}
                  key={currentBuffer[currentSegmentIndex]}
                  className="react-player"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              {!currentBuffer[currentSegmentIndex] && <p>Loading video...</p>}
              <div className="video-buttons" disabled={isBuffering}>
                {["B1", "B2", "B3", "B4"].map((button) => (
                  <button
                    key={button}
                    onClick={() => handleBoxToggle(button)}
                    aria-label={`Toggle ${button} box`}
                  >
                    {button}
                  </button>
                ))}
              </div>
                <button className="pause-play" onClick={handlePlayPause} disabled={isBuffering} aria-label={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? <FaPause /> : <FaPlay />}
                </button>
                <button className="pause-play2" onClick={handleRewind} disabled={isBuffering} aria-label="Rewind 10 seconds">
                    <FaFastBackward />
                </button>
            </div>

            {activeBox && (
                <div className="side-box">
                    <h3>{activeBox} Content</h3>
                    <div className="side-box-content">
                        <p>
                            This is the content for {activeBox}. Add more information or
                            elements as needed.
                        </p>
                        <p>
                            You can make this box scrollable if the content is long. Keep
                            adding more details here.
                        </p>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                        <p>Vivamus lacinia odio vitae vestibulum vestibulum.</p>
                    </div>
                </div>
            )}

            {isChatOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <span>Chatbot</span>
                        <button onClick={toggleChat} aria-label="Close chat">×</button>
                    </div>
                    <div className="chatbot-body" ref={chatBodyRef}>
                        {chatMessages.map((message, index) => (
                            <div
                                key={index}
                                className={`chat-message ${message.sender === "user" ? "user-message" : "bot-message"}`}>
                                {message.text}
                            </div>
                        ))}
                    </div>
                    <div className="chatbot-input">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Type a message..."
                            disabled={isBuffering}
                            aria-label="Chat input"
                        />
                         <button
                           className={`audio ${isRecording ? "recording" : ""}`}
                           onClick={handleAudioInput}
                           disabled={isBuffering}
                            aria-label={isRecording ? "Stop recording" : "Start recording"}
                       >
                           <FaMicrophone />
                       </button>
                        <button
                            className="plane"
                            onClick={sendChatMessage}
                            disabled={isBuffering}
                            aria-label="Send message"
                        >
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
            )}

            <button className="chatbot-toggle" onClick={toggleChat} disabled={isBuffering} aria-label="Open Chat">
                <FaComments />
            </button>
        </div>
    );
};

export default App;