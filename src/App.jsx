import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { ChatState } from "./Context/ChatProvider";
var socket;
function App() {
  const [offerRcvd,setOfferRcvd]=useState();
  const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
  const id=234;
async function playVideoFromCamera() {
    try {
        const constraints = {'video': true, 'audio': true};
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.querySelector('video#localVideo');
        videoElement.srcObject = stream;
    } catch(error) {
        console.error('Error opening video camera.', error);
    }
}
function generateHexCode() {
  const randomHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
  return randomHex;
}
async function Connect()
{
  playVideoFromCamera();
  const peerConnection= new RTCPeerConnection(configuration);
    const offer=await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer);
    socket.emit("send",{'offer': offer,"id":id});
    socket.on("send",async (payload)=>{
      if(payload.answer&&confirm("Should i accept answer"))
       {
        const answer=payload.answer;
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
          console.log(peerConnection)
          peerConnection.addEventListener('icecandidate', event => {
            console.log("runs")
            if (event.candidate) {
              console.log(event.candidate)
                socket.emit("send",{'iceOfSender': event.candidate,"id":id});
            }
            else{
              console.log("not sent ice")
            }
        });
        } catch (error) {
          console.log("error",error.message)
        }
        }
     })
    //  socket.on("iceAnsFwd",(ice,id)=>{
    //   try {
    //     console.log("iceAns",ice)
    //     peerConnection.setRemoteDescription(new RTCSessionDescription(ice))
    //     peerConnection.addEventListener('icecandidate', event => {
    //       if (event.candidate) {
    //           socket.emit("ice",{'new-ice-candidate': event.candidate},id);
    //       }
    //   });
    //   } catch (error) {
    //     console.log("error",error.message)
    //   }
    //  })
}
async function Receive(offerRcvd){

  const peerConnection = new RTCPeerConnection(configuration);
       peerConnection.setRemoteDescription(new RTCSessionDescription(offerRcvd));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit("send",{"answer":answer,"id":id});
         
          socket.on("send",(payload)=>{
            if(payload.iceOfSender)
            {
            const ice=payload.iceOfSender;
            console.log("iceSender",ice)
            peerConnection.addIceCandidate(new RTCIceCandidate(ice))
            peerConnection.addEventListener('icecandidate', event => {
              if (event.candidate) {
                // console.log("runs")
                  socket.emit("iceAns",{'new-ice-candidate': event.candidate},id);
              }
          });
        }
          })
}
useEffect(()=>{
  socket = io("http://localhost:3000");
  socket.emit("connection");
  socket.emit('join',id);
},[])
useEffect(()=>{
if(socket)
{
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
}
})
  
return (
    <div>
    <video id="localVideo" height={"60px"} width={"90px"} autoPlay playsInline muted />
    <video id="remoteVideo" height={"60px"} width={"90px"} autoPlay playsInline muted />
    <button onClick={Connect} className="bg-orange-300 m-4 p-2">Connect</button>
    {/* <input type="text" 
    className=""
    value={id}
    onChange={(e)=>setId(e.target.value)}
    /> */}

    <input 
    className="bg-gray-500 p-4"
    type="text" 
    placeholder="Enter the offer here"
    value={offerRcvd}
    onChange={(e)=>setOfferRcvd(e.target.value)}
    />
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
