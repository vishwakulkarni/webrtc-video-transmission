// getting dom elements
const divSelectRoom = document.getElementById("selectRoom");
const divConsultingRoom = document.getElementById("consultingRoom");
const inputName = document.getElementById("name");
const inputRoomNumber = document.getElementById("roomNumber");
const btnJoinBroadcaster = document.getElementById("joinBroadcaster");
const btnJoinViewer = document.getElementById("joinViewer");
const videoElement = document.querySelector("video");
const broadcasterName = document.getElementById("broadcasterName");
const viewers = document.getElementById("viewers");

// variables
let user;
let rtcPeerConnections = {};

// constants
const iceServers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};
const streamConstraints = { audio: false, video: { height: 480 } };

// Let's do this 💪
var socket = io();
var stream1 = null;

btnJoinBroadcaster.onclick = function () {
  if (inputRoomNumber.value === "" || inputName.value === "") {
    alert("Please type a room number and a name");
  } else {
    user = {
      room: inputRoomNumber.value,
      name: inputName.value,
    };

    divSelectRoom.style = "display: none;";
    divConsultingRoom.style = "display: block;";
    broadcasterName.innerText = user.name + " is broadcasting...";
    //videoElement.src = "my_video.mp4";
    //videoElement.src = "file:///Users/vishwanathkulkarni/Documents/Colorado/Independent_study_2/webrtc-web/webrtc-video-conference-tutorial/public/bbb_sunflower_2160p_30fps_normal.mp4"
    //socket.emit("register as broadcaster", user.room);
    //videoElement.id ='myvideo';

    const input = document.querySelector('#video-url-example');
      
    input.addEventListener('change', () => {
      const file = input.files[0];
      const url = URL.createObjectURL(file);

      // document.querySelector('#video-container').innerHTML = `
      //   <video autoplay loop width="500" src="${url}" />
      // `;
      videoElement.src = url;
      socket.emit("register as broadcaster", user.room);
      videoElement.id ='myvideo';
    });

    //testing
    // creating the MediaSource, just with the "new" keyword, and the URL for it
    //const myMediaSource = new MediaSource();
    //const url = URL.createObjectURL(myMediaSource);

// attaching the MediaSource to the video tag
    //videoElement.src = url;

    // navigator.mediaDevices
    //   .getUserMedia(streamConstraints)
    //   .then(function (stream) {
    //     videoElement.srcObject = stream;
    //     socket.emit("register as broadcaster", user.room);
        
    //   })
    //   .catch(function (err) {
    //     console.log("An error ocurred when accessing media devices", err);
    //   });
  }

  videoElement.addEventListener('canplay', () => {
    const fps = 0;
    if (videoElement.mozCaptureStream) {
      stream1 = videoElement.mozCaptureStream(fps);
    } else if (videoElement.captureStream) {
      stream1 = videoElement.captureStream(fps);
    } else {
      console.error('Stream capture is not supported');
      stream1 = null;
    }
    //rightVideo.srcObject = stream;
  });

};

btnJoinViewer.onclick = function () {
  if (inputRoomNumber.value === "" || inputName.value === "") {
    alert("Please type a room number and a name");
  } else {
    user = {
      room: inputRoomNumber.value,
      name: inputName.value,
    };

    divSelectRoom.style = "display: none;";
    divConsultingRoom.style = "display: block;";

    socket.emit("register as viewer", user);
  }
};

// message handlers
socket.on("new viewer", function (viewer) {
  rtcPeerConnections[viewer.id] = new RTCPeerConnection(iceServers);

  const stream = videoElement.srcObject;
  //const stream = stream1;
  stream1
    .getTracks()
    .forEach((track) => rtcPeerConnections[viewer.id].addTrack(track, stream1));

  rtcPeerConnections[viewer.id].onicecandidate = (event) => {
    if (event.candidate) {
      console.log("sending ice candidate");
      socket.emit("candidate", viewer.id, {
        type: "candidate",
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
      });
    }
  };

  rtcPeerConnections[viewer.id]
    .createOffer()
    .then((sessionDescription) => {
      rtcPeerConnections[viewer.id].setLocalDescription(sessionDescription);
      socket.emit("offer", viewer.id, {
        type: "offer",
        sdp: sessionDescription,
        broadcaster: user,
      });
    })
    .catch((error) => {
      console.log(error);
    });

  let li = document.createElement("li");
  li.innerText = viewer.name + " has joined";
  viewers.appendChild(li);
});

socket.on("candidate", function (id, event) {
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  });
  rtcPeerConnections[id].addIceCandidate(candidate);
});

socket.on("offer", function (broadcaster, sdp) {
  broadcasterName.innerText = broadcaster.name + "is broadcasting...";

  rtcPeerConnections[broadcaster.id] = new RTCPeerConnection(iceServers);

  rtcPeerConnections[broadcaster.id].setRemoteDescription(sdp);

  rtcPeerConnections[broadcaster.id]
    .createAnswer()
    .then((sessionDescription) => {
      rtcPeerConnections[broadcaster.id].setLocalDescription(
        sessionDescription
      );
      socket.emit("answer", {
        type: "answer",
        sdp: sessionDescription,
        room: user.room,
      });
    });

  rtcPeerConnections[broadcaster.id].ontrack = (event) => {
    videoElement.srcObject = event.streams[0];
  };

  rtcPeerConnections[broadcaster.id].onicecandidate = (event) => {
    if (event.candidate) {
      console.log("sending ice candidate");
      socket.emit("candidate", broadcaster.id, {
        type: "candidate",
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
      });
    }
  };
});

socket.on("answer", function (viewerId, event) {
  rtcPeerConnections[viewerId].setRemoteDescription(
    new RTCSessionDescription(event)
  );
});
