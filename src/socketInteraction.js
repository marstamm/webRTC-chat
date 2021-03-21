import io from "socket.io-client";

const initialize = (webcamStream, callback) => {
  const socket = io();

  const peerConnections = {};
  const established = [];

  window.addEventListener(
    "beforeunload",
    function (e) {
      socket.close();
    },
    false
  );

  const getPeerConnection = (id) => {
    if (peerConnections[id]) {
      return peerConnections[id];
    }
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    webcamStream
      .getTracks()
      .forEach((track) => connection.addTrack(track, webcamStream));
    connection.ontrack = ({ streams: [stream] }) => {
      callback({ id, event: "connect", stream });
    };
    peerConnections[id] = connection;
    return connection;
  };

  const call = async (id) => {
    const peerConnection = getPeerConnection(id);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("call-user", {
      offer,
      to: id,
    });
  };

  socket.on("joined", async ({ user }) => {
    call(user);
  });

  socket.on("call-offer", async (data) => {
    const peerConnection = getPeerConnection(data.from);

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );
    const answer = await peerConnection.createAnswer();
    answer.sdp = answer.sdp.replace(
      "useinbandfec=1",
      "useinbandfec=1; stereo=1; maxaveragebitrate=510000"
    );
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));
    console.log("awnsering", data.from);

    socket.emit("make-answer", {
      answer,
      to: data.from,
    });
  });

  socket.on("answer-made", async (data) => {
    const peerConnection = getPeerConnection(data.from);

    console.log("answer=received", data);
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.answer)
    );

    if (!established.includes(data.from)) {
      // Call back to setup 2-way communication
      call(data.from);
      established.push(data.from);
    }
  });

  socket.on("disconnected", async ({ id }) => {
    peerConnections[id].close();
    delete peerConnections[id];

    callback({ event: "disconnected", id });
  });
};

export { initialize };
