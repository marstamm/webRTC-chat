import { initialize as initializeSocket } from "./socketInteraction";

const streams = {};
const videoElements = {};
const container = document.getElementById("container");
const root = document.documentElement;

const constraints = {
  audio: {
    autoGainControl: true,
    channelCount: 2,
    echoCancellation: true,
    latency: 0,
    noiseSuppression: true,
    sampleRate: 48000,
    sampleSize: 16,
    volume: 1.0,
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user",
  },
};

const createVideoElement = (stream, id, muted = false) => {
  const videoElement = document.createElement("video");
  videoElement.id = id;
  videoElement.autoplay = true;
  videoElement.srcObject = stream;
  videoElement.muted = muted;

  return videoElement;
};

const updateView = () => {
  const elements = Object.entries(videoElements);
  root.style.setProperty("--rows", Math.ceil(Math.sqrt(elements.length)));
  elements.forEach(([key, value]) => {
    console.log(key, value);
    if (!document.getElementById(key)) {
      container.appendChild(value);
    }
  });
};

const handleRemoteVideo = ({ id, event, stream }) => {
  if (event === "connect") {
    streams[id] = stream;
    videoElements[id] = createVideoElement(stream, id);
  }
  if (event === "disconnected") {
    delete streams[id];
    console.log("remove", videoElements[id]);
    delete videoElements[id];
    document.getElementById(id).remove();
  }
  updateView();
};

navigator.mediaDevices
  .getUserMedia(constraints)
  .then((stream) => {
    console.log(stream);

    streams["__own"] = stream;
    videoElements["__own"] = createVideoElement(stream, "__own", true);
    updateView();
    initializeSocket(stream, handleRemoteVideo);
  })
  .catch((err) => {
    console.error(err);
  });

window.addStream = () => {
  const id = "" + Date.now();
  stream = streams["__own"];
  streams[id] = stream;
  videoElements[id] = createVideoElement(stream, id, true);
  updateView();
};
