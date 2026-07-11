import React, { useContext, useState, useEffect } from "react";
import { userDataContext } from "../context/UserContext";
import axios from "axios";
import { MdKeyboardBackspace } from "react-icons/md";
import { useNavigate } from "react-router-dom";
function Customize2() {
  const { userData, backendImage, selectedImage, serverUrl, setUserData } =
    useContext(userDataContext);
  const [assistantName, setAssistantName] = useState(
    userData?.AssistantName || "",
  );
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const loadingMessages = [
    "Uploading your assistant's image...",
    "Sending data to the server...",
    "Setting up your assistant...",
    "Almost there...",
  ];
  useEffect(() => {
    let progressInterval, msgInterval;

    if (loading) {
      progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + Math.random() * 4 : prev));
      }, 700);

      msgInterval = setInterval(() => {
        setMsgIndex((prev) =>
          prev < loadingMessages.length - 1 ? prev + 1 : prev,
        );
      }, 10000);
    } else {
      setProgress(0);
      setMsgIndex(0);
    }

    return () => {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
    };
  }, [loading]);

  const handleUpdateAssistant = async () => {
    setLoading(true);
    try {
      let formData = new FormData();
      formData.append("assistantName", assistantName);
      if (backendImage) {
        formData.append("assistantImage", backendImage);
      } else {
        formData.append("imageUrl", selectedImage);
      }
      const result = await axios.post(
        `${serverUrl}/api/user/update`,
        formData,
        { withCredentials: true },
      );
      setLoading(false);
      console.log(result.data);
      setUserData(result.data);
      navigate("/");
    } catch (error) {
      setLoading(false);
      console.log(error);
    }
  };

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-[black] to-[#030353] flex justify-center items-center flex-col p-[20px] relative">
      {loading ? (
        // ---- LOADING UI ----
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-400 animate-spin"></div>
          </div>

          <p className="text-white text-lg font-medium text-center">
            {loadingMessages[msgIndex]}
          </p>

          <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-white/60 text-sm">{Math.floor(progress)}%</p>
        </div>
      ) : (
        <>
          <MdKeyboardBackspace
            className="absolute top-[30px] left-[30px] text-white cursor-pointer w-[25px] h-[25px]"
            onClick={() => navigate("/customize")}
          />
          <h1 className="text-white mb-[40px] text-[30px] text-center ">
            Name Your <span className="text-blue-200">Assistant </span>
          </h1>
          <input
            type="text"
            placeholder="e.g.  Nova, Luna, Orion"
            className="w-full max-w-[600px] h-[60px] outline-none border-2 border-white bg-transparent text-white placeholder-gray-300 px-[20px] py-[10px] rounded-full text-[18px]"
            required
            onChange={(e) => setAssistantName(e.target.value)}
            value={assistantName}
          />
          {assistantName && (
            <button
              className="min-w-[300px] h-[60px] mt-[30px] text-black font-semibold cursor-pointer bg-white rounded-full text-[19px]"
              disabled={loading}
              onClick={() => {
                handleUpdateAssistant();
              }}
            >
              Create Assistant
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default Customize2;
