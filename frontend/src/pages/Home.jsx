import React, { useContext, useEffect, useRef, useState } from "react";
import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import aiImg from "../assets/ai.gif";
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import userImg from "../assets/user.gif";
function Home() {
  const { userData, serverUrl, setUserData, getGroqResponse } =
    useContext(userDataContext);
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const isSpeakingRef = useRef(false);
  const recognitionRef = useRef(null);
  const isActivatedRef = useRef(false);
  const [ham, setHam] = useState(false);
  const isRecognizingRef = useRef(false);
  const synth = window.speechSynthesis;
  const [showHint, setShowHint] = useState(true);
  const [hintCollapsed, setHintCollapsed] = useState(false);
  const isProcessingRef = useRef(false);

  const handleLogOut = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/auth/logout`, {
        withCredentials: true,
      });
      setUserData(null);
      navigate("/signin");
    } catch (error) {
      setUserData(null);
      console.log(error);
    }
  };

  const handleClearHistory = async () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear all history?",
    );
    if (!confirmClear) return;

    try {
      const result = await axios.post(
        `${serverUrl}/api/user/clear-history`,
        {},
        { withCredentials: true },
      );
      setUserData(result.data);
    } catch (error) {
      console.log(error);
    }
  };

  const startRecognition = () => {
    if (
      !isSpeakingRef.current &&
      !isRecognizingRef.current &&
      !isProcessingRef.current
    ) {
      try {
        recognitionRef.current?.start();
        console.log("Recognition requested to start");
      } catch (error) {
        if (error.name !== "InvalidStateError") {
          console.error("Start error:", error);
        }
      }
    }
  };

  const speak = (text) => {
    const utterence = new SpeechSynthesisUtterance(text);
    utterence.lang = "hi-IN";
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find((v) => v.lang === "hi-IN");
    if (hindiVoice) {
      utterence.voice = hindiVoice;
    }

    isSpeakingRef.current = true;
    utterence.onend = () => {
      setAiText("");
      isSpeakingRef.current = false;
      isProcessingRef.current = false; // ✅ only now safe to restart listening
      setTimeout(() => {
        startRecognition();
      }, 800);
    };
    synth.cancel(); // 🛑 pehle se koi speech ho to band karo
    synth.speak(utterence);
  };

  const handleCommand = (data, newTab = null) => {
    const { type, userInput, response } = data;
    speak(response);

    const openUrl = (url) => {
      if (newTab) {
        newTab.location.href = url;
      } else {
        window.open(url, "_blank");
      }
    };

    if (type === "google-search") {
      openUrl(
        `https://www.google.com/search?q=${encodeURIComponent(userInput)}`,
      );
    }
    if (type === "calculator-open") {
      openUrl(`https://www.google.com/search?q=calculator`);
    }
    if (type === "instagram-open") {
      openUrl(`https://www.instagram.com/`);
    }
    if (type === "facebook-open") {
      openUrl(`https://www.facebook.com/`);
    }
    if (type === "weather-show") {
      openUrl(
        `https://www.google.com/search?q=${encodeURIComponent(userInput)}`,
      );
    }
    if (type === "youtube-search" || type === "youtube-play") {
      openUrl(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(userInput)}`,
      );
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognitionRef.current = recognition;

    let isMounted = true; // flag to avoid setState on unmounted component

    // Start recognition after 1 second delay only if component still mounted
    const startTimeout = setTimeout(() => {
      if (isMounted && !isSpeakingRef.current && !isRecognizingRef.current) {
        try {
          recognition.start();
          console.log("Recognition requested to start");
        } catch (e) {
          if (e.name !== "InvalidStateError") {
            console.error(e);
          }
        }
      }
    }, 1000);

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);
      if (isMounted && !isSpeakingRef.current && !isProcessingRef.current) {
        setTimeout(() => {
          if (isMounted) {
            try {
              recognition.start();
              console.log("Recognition restarted");
            } catch (e) {
              if (e.name !== "InvalidStateError") console.error(e);
            }
          }
        }, 1000);
      }
    };

    recognition.onerror = (event) => {
      console.warn("Recognition error:", event.error);
      isRecognizingRef.current = false;
      setListening(false);
      if (
        event.error !== "aborted" &&
        isMounted &&
        !isSpeakingRef.current &&
        !isProcessingRef.current
      ) {
        setTimeout(() => {
          if (isMounted) {
            try {
              recognition.start();
              console.log("Recognition restarted after error");
            } catch (e) {
              if (e.name !== "InvalidStateError") console.error(e);
            }
          }
        }, 1000);
      }
    };
    recognition.onresult = async (e) => {
      console.log("onresult fired");

      // Hard guard — ignore anything heard while Nova is speaking or already processing
      if (isSpeakingRef.current || isProcessingRef.current) {
        console.log(
          "Ignoring result — assistant is currently speaking or processing",
        );
        return;
      }

      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      console.log(transcript);

      const containsName = transcript
        .toLowerCase()
        .includes(userData.assistantName.toLowerCase());

      if (!isActivatedRef.current) {
        if (containsName) {
          isActivatedRef.current = true;
          setHintCollapsed(true);
          await processCommand(transcript);
        }
        return;
      }

      await processCommand(transcript);
    };
    const processCommand = async (transcript) => {
      isProcessingRef.current = true;

      setAiText("");
      setUserText(transcript);
      recognition.stop();
      isRecognizingRef.current = false;
      setListening(false);

      // Quick keyword check — only open a tab synchronously if it's LIKELY a tab-needing command
      const tabKeywords = [
        "youtube",
        "google",
        "search",
        "weather",
        "instagram",
        "facebook",
        "calculator",
        "play",
        "open",
      ];
      const mightNeedTab = tabKeywords.some((word) =>
        transcript.toLowerCase().includes(word),
      );

      const newTab = mightNeedTab ? window.open("", "_blank") : null;

      const data = await getGroqResponse(transcript);

      const needsTab = [
        "google-search",
        "youtube-search",
        "youtube-play",
        "calculator-open",
        "instagram-open",
        "facebook-open",
        "weather-show",
      ].includes(data.type);

      if (needsTab && newTab) {
        handleCommand(data, newTab);
      } else {
        if (newTab) newTab.close(); // only close if we actually opened one
        handleCommand(data);
      }

      setAiText(data.response);
      setUserText("");
    };

    speak(
      `Hello ${userData.name}. I'm ${userData.assistantName}. How can I help you today?`,
    );

    return () => {
      isMounted = false;
      clearTimeout(startTimeout);
      recognition.stop();
      setListening(false);
      isRecognizingRef.current = false;
    };
  }, []);

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden">
      <CgMenuRight
        className="text-white absolute top-[20px] right-[20px] w-[25px] h-[25px] cursor-pointer z-20"
        onClick={() => setHam(true)}
      />
      <div
        className={`absolute top-[20px] left-1/2 -translate-x-1/2 transition-all duration-300 ${hintCollapsed ? "w-[50px] h-[50px]" : "w-[90%] max-w-[400px]"}`}
      >
        {hintCollapsed ? (
          <button
            onClick={() => setHintCollapsed(false)}
            className="w-[50px] h-[50px] rounded-full bg-[#00000053] backdrop-blur-lg flex items-center justify-center text-white text-[20px] cursor-pointer"
          >
            💡
          </button>
        ) : (
          <div className="bg-[#00000053] backdrop-blur-lg rounded-2xl p-[20px] text-white relative">
            <button
              onClick={() => setHintCollapsed(true)}
              className="absolute top-[10px] right-[10px] text-white/60 hover:text-white cursor-pointer"
            >
              ✕
            </button>
            <p className="text-blue-300 font-semibold mb-[10px]">
              💡 Try saying
            </p>
            <p className="mb-[5px]">
              "Hey {userData?.assistantName}, what's the weather?"
            </p>
            <p className="mb-[5px]">
              "Hey {userData?.assistantName}, open YouTube."
            </p>
            <p>"Hey {userData?.assistantName}, tell me a joke."</p>
          </div>
        )}
      </div>
      ;
      <div
        className={`fixed top-0 right-0 h-full w-full lg:w-[400px] bg-[#00000090] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start transition-transform duration-300 z-30 ${ham ? "translate-x-0" : "translate-x-full"}`}
      >
        <RxCross1
          className=" text-white absolute  cursor-pointer top-[20px] right-[20px] w-[25px] h-[25px]"
          onClick={() => setHam(false)}
        />
        <button
          className="w-70 h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px]"
          onClick={handleLogOut}
        >
          Log Out
        </button>
        <button
          className="w-full h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px]"
          onClick={() => navigate("/customize")}
        >
          Customize Assistant
        </button>

        <div className="w-full h-[2px] bg-gray-400"></div>
        <div className="w-full flex justify-between items-center">
          <h1 className="text-white font-semibold text-[21px]">History</h1>
          <button
            onClick={handleClearHistory}
            className="text-red-400 text-[14px] font-medium hover:text-red-300 cursor-pointer"
          >
            Clear All
          </button>
        </div>

        <div className="w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate">
          {userData.history?.map((his, index) => (
            <div
              key={index}
              className="text-gray-200 text-[18px] w-full h-[30px]  "
            >
              {his}
            </div>
          ))}
        </div>
      </div>
      -
      <div className="w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg">
        <img
          src={userData?.assistantImage}
          alt=""
          className="h-full object-cover"
        />
      </div>
      <h1 className="text-white text-[18px] font-semibold">
        Hey I'm {userData?.assistantName}
      </h1>
      {!aiText && <img src={userImg} alt="" className="w-[200px]" />}
      {aiText && <img src={aiImg} alt="" className="w-[200px]" />}
      <h1 className="text-white text-[18px] font-semibold text-wrap">
        {userText ? userText : aiText ? aiText : null}
      </h1>
    </div>
  );
}

export default Home;
