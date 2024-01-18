import { createContext, useContext, useEffect, useState } from "react";
const ChatContext = createContext();
function ChatProvider({ children }) {
  const [peerConnection,setPeerConnection] = useState();
  useEffect(() => {
  }, []);

  return (
    <ChatContext.Provider
      value={{
        peerConnection,
        setPeerConnection
      }}
    >{children}</ChatContext.Provider>
  )
}
export const ChatState = () => {
  return useContext(ChatContext);
};
export default ChatProvider;