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
  const [ham, setHam] = useState(false);
  const isRecognizingRef = useRef(false);
  const synth = window.speechSynthesis;

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
    if (!isSpeakingRef.current && !isRecognizingRef.current) {
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
      setTimeout(() => {
        startRecognition(); // ⏳ Delay se race condition avoid hoti hai
      }, 800);
    };
    synth.cancel(); // 🛑 pehle se koi speech ho to band karo
    synth.speak(utterence);
  };

  const handleCommand = (data, newTab = null) => {
    const { type, userInput, response } = data;
    speak(response);

    if (type === "google-search") {
      const query = encodeURIComponent(userInput);
      const url = `https://www.google.com/search?q=${query}`;

      if (newTab) {
        newTab.location.href = url;
      } else {
        window.open(url, "_blank");
      }
    }
    if (type === "calculator-open") {
      window.open(`https://www.google.com/search?q=calculator`, "_blank");
    }
    if (type === "instagram-open") {
      window.open(`https://www.instagram.com/`, "_blank");
    }
    if (type === "facebook-open") {
      window.open(`https://www.facebook.com/`, "_blank");
    }
    if (type === "weather-show") {
      if (type === "weather-show") {
        const query = encodeURIComponent(userInput);

        window.open(`https://www.google.com/search?q=${query}`, "_blank");
      }
    }

    if (type === "youtube-search" || type === "youtube-play") {
      const query = encodeURIComponent(userInput);
      console.log("Opening YouTube...");
      const url = `https://www.youtube.com/results?search_query=${query}`;

      if (newTab) {
        newTab.location.href = url;
      } else {
        window.open(url, "_blank");
      }
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
      if (isMounted && !isSpeakingRef.current) {
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
      if (event.error !== "aborted" && isMounted && !isSpeakingRef.current) {
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
      console.log(event.results[0][0].transcript);
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      if (
        transcript.toLowerCase().includes(userData.assistantName.toLowerCase())
      ) {
        setAiText("");
        setUserText(transcript);
        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);

        const data = await getGroqResponse(transcript);

        handleCommand(data);
        setAiText(data.response);
        setUserText("");
      }
    };

    const greeting = new SpeechSynthesisUtterance(
      `Hello ${userData.name}, what can I help you with?`,
    );
    greeting.lang = "hi-IN";

    window.speechSynthesis.speak(greeting);

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
          Customize your Assistant
        </button>

        <div className="w-full h-[2px] bg-gray-400"></div>
        <div className="w-full flex justify-between items-center">
          <h1 className="text-white font-semibold text-[19px]">History</h1>
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

      <div className="w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg">
        <img
          src={userData?.assistantImage}
          alt=""
          className="h-full object-cover"
        />
      </div>
      <h1 className="text-white text-[18px] font-semibold">
        I'm {userData?.assistantName}
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
