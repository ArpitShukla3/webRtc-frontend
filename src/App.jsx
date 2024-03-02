import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import toast, { Toaster } from 'react-hot-toast';
var socket;
let localStream ;
let remoteStream;
let peerConnection
function App() {
  const [offerRcvd,setOfferRcvd]=useState();
  const [id, setID] = useState("");
  const [joined,setJoined] =useState(false);
  function Hangup(){
    socket.emit("hangup",{id:id});
    const videoElement = document.querySelector('video#remoteVideo');
    videoElement.srcObject=undefined;
    peerConnection&&peerConnection.close();
  }
  function join_Room()
  {
    if(!id)
    {
      toast.error("Enter valid room deatils");
      return;
    }
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
     setJoined(true);
  }
async function playVideoFromCamera() {
    try {
        const constraints = { video: true};
        localStream = await navigator.mediaDevices.getUserMedia({video: true});
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
        OfferToReceiveAudio: 1,
        offerToReceiveVideo:1
    },
  iceServers:[{"urls":"stun:stun2.l.google.com:19302"}]
}
async function Connect()
{
    toast.success("Offer has been sent")
     peerConnection= new RTCPeerConnection(configuration);
     socket.on("hangup",()=>{
      console.log("haundgv")
      const videoElement = document.querySelector('video#remoteVideo');
      videoElement.srcObject=undefined;
      peerConnection.close();
    })


    //play mediastream from other peerconncection
       const videoElement = document.querySelector('video#remoteVideo');
       peerConnection.ontrack=async(event)=>{
        const [remoteStream] = event.streams;
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
      offerToReceiveAudio: 0,
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
  socket = io('http://localhost:5000');
  // socket = io('https://web-rtc-backend.onrender.com/')
  socket.emit("connection");
  return ()=>{
    socket.off("connection");
    socket.off("hangup",{id:id});
    socket.off("send",{"answer":answer,"id":id});
    socket.off("iceSend",{'iceOfReceiver': event.candidate,"id":id});
    socket.off("iceSend",{'iceOfSender': event.candidate,"id":id});
    socket.off('join',id);
    socket.off("send",{'offer': offer,"id":id});
  }
},[])
return (
    <div>
    <video id="localVideo" className="h-min" autoPlay playsInline muted />
    <video id="remoteVideo" className="max-h-full" autoPlay playsInline muted />
    { !joined &&  <div class="relative mt-6">
  <input
    type="text"
    placeholder="Enter Room .."
    value={id}
    onChange={e => setID(e.target.value)}
    className="block w-full rounded-2xl border border-neutral-300 bg-transparent py-4 pl-6 pr-20 text-base/6 text-neutral-950 ring-4 ring-transparent transition placeholder:text-neutral-500 focus:border-neutral-950 focus:outline-none focus:ring-neutral-950/5"
  />
  <div class="absolute inset-y-1 right-1 flex justify-end">
  </div>
</div>}

   {(!joined)? <button  onClick={join_Room} className="relative py-2 px-8 text-black text-base font-bold nded-full overflow-hidden bg-white rounded-full transition-all duration-400 ease-in-out shadow-md hover:scale-105 hover:text-white hover:shadow-lg active:scale-90 before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-blue-500 before:to-blue-300 before:transition-all before:duration-500 before:ease-in-out before:z-[-1] before:rounded-full hover:before:left-0">join Room</button>:
    <button onClick={Connect} className="relative py-2 px-8 text-black text-base font-bold nded-full overflow-hidden bg-white rounded-full transition-all duration-400 ease-in-out shadow-md hover:scale-105 hover:text-white hover:shadow-lg active:scale-90 before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-blue-500 before:to-blue-300 before:transition-all before:duration-500 before:ease-in-out before:z-[-1] before:rounded-full hover:before:left-0">Connect</button>}
      
      <button
  className="relative px-8 py-2 rounded-md bg-white isolation-auto z-10 border-2 border-lime-500 before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full before:-left-full before:hover:left-0 before:rounded-full before:bg-lime-500 before:-z-10 before:aspect-square before:hover:scale-150 overflow-hidden before:hover:duration-700"
  onClick={Hangup}
>
      Hangup
    </button>
    <Toaster/>
    </div>
  )
}

export default App;
