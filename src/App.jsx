import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
var socket;
let localStream ;
let remoteStream;
let peerConnection
function App() {
  const [offerRcvd,setOfferRcvd]=useState();
  const id=234;
async function playVideoFromCamera() {
    try {
        const constraints = {'video': true, 'audio': true};
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.querySelector('video#localVideo');
        videoElement.srcObject = localStream;
    } catch(error) {
        console.error('Error opening video camera.', error);
    }
}
async function playRemoteVideo(stream)
{
  try {
    const videoElement = document.querySelector('video#remoteVideo');
    remoteStream=stream;
    videoElement.srcObject = stream;
  } catch (error) {
    console.log(Error.message)
  }
}
const configuration = {
    mandatory: {
        OfferToReceiveAudio: true,
        offerToReceiveVideo:true
    },
  iceServers:[{"urls":"stun:stun.l.google.com:19302"}]
}
async function Connect()
{
  
     peerConnection= new RTCPeerConnection(configuration);



    //play mediastream from other peerconncection
       const videoElement = document.querySelector('video#remoteVideo');
       peerConnection.ontrack=async(event)=>{
        const [remoteStream] = event.streams;
        console.log(remoteStream.getTracks(),"remoteStream")
        videoElement.srcObject = remoteStream;
    }


    //play mediastream from other peerconnection

    //print message once connection is established
    peerConnection.addEventListener('connectionstatechange', event => {
      if (peerConnection.connectionState === 'connected') {
          console.log("Connected");
          
      }
  });
    //adding localStream tracks on peerconnection
    localStream.getTracks().forEach((track)=>{
      console.log("sending",track);
      peerConnection.addTrack(track,localStream);
    })
    
    //as soon as iceCandidate gathering starts , send these iceCandidates over signalling channel to get negotiated at other end
    peerConnection.addEventListener('icecandidate', event => {
      if (event.candidate) {
          socket.emit("iceSend",{'iceOfSender': event.candidate,"id":id});
      }
  });

  //add IceCandidate of other peerconnection
  socket.on("iceSend",async(payload)=>{
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(payload.iceOfReceiver));
    } catch (error) {
      console.log(error.message)
    }
  })

  //creating offer, paramerter is because chrome 39 has updated something which has affected this
    const offer=await peerConnection.createOffer( {
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1
    })

    //setLoacaldesc from offer
    await peerConnection.setLocalDescription(offer);
    socket.emit("send",{'offer': offer,"id":id});
    socket.on("send",async (payload)=>{
      if(payload.answer)
       {
        const answer=payload.answer;
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        } catch (error) {
          console.log("error",error.message)
        }
        }
     })
}
async function Receive(offerRcvd){
            // playVideoFromCamera();
           peerConnection = new RTCPeerConnection(configuration);
           localStream.getTracks().forEach((track)=>{
            console.log(localStream.getTracks())
            peerConnection.addTrack(track,localStream);
            }) 
          peerConnection.addEventListener('connectionstatechange', async (event) => {
            if (peerConnection.connectionState === 'connected') {
                console.log("Connected");
            }
        });
          const remoteVideo = document.querySelector('#remoteVideo');

           peerConnection.addEventListener('track', async (event) => {
    const [remoteStream] = event.streams;
    console.log(remoteStream,"stream from receiver");
    remoteVideo.srcObject = remoteStream;
});
          socket.on("iceSend",(payload)=>{
            if(payload.iceOfSender)
            {
            const ice=payload.iceOfSender;
            peerConnection.addIceCandidate(new RTCIceCandidate(ice))
            peerConnection.addEventListener('icecandidate', event => {
              if (event.candidate) {
                socket.emit("iceSend",{'iceOfReceiver': event.candidate,"id":id});
              }
          });
        }
          })
         
          peerConnection.setRemoteDescription(new RTCSessionDescription(offerRcvd));
          // await playVideoFromCamera();
         
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit("send",{"answer":answer,"id":id});
}

useEffect(()=>
{
   playVideoFromCamera();
  socket = io('http://192.168.241.216:4000/')
  socket.emit("connection");
  socket.emit('join',id);
  socket.on("send",(payload)=>{
    if (payload.offer&&confirm("Do you want to accept the offer")) {
      const offer=payload.offer;
      try {
        Receive(offer)
      } catch (error) {
        console.log("error",error.message);
      }
       }
   })
},[])
  useEffect(()=>{
    console.log("peerConnection chenged");
  })
return (
    <div>
    <video id="localVideo" height={"200px"} width={"200px"} autoPlay playsInline muted />
    <video id="remoteVideo" height={"200px"} width={"200px  "} autoPlay playsInline muted />
    <button onClick={Connect} className="bg-orange-300 m-4 p-2">Connect</button>
    <button
    className="bg-sky-400 m-4 p-2"
    onClick={Receive}
    >
      Receive call
    </button>
    </div>
  )
}

export default App;
