import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface VideoChatProps {
  socket: Socket;
  roomId: string;
  onClose: () => void;
  connectedUsers: any[];
}

export function VideoChat({ socket, roomId, onClose, connectedUsers }: VideoChatProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  
  // Create WebRTC configuration (Google STUN servers)
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    // 1. Get Local Media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Tell everyone in the room that we are ready to receive calls
      socket.emit('webrtc_join', { roomId });
    }).catch(err => {
      console.error('Failed to get local stream', err);
      alert('Could not access camera/microphone');
      onClose();
    });

    return () => {
      // Cleanup: stop local tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      // Close all peer connections
      Object.values(peersRef.current).forEach(peer => peer.close());
      socket.off('webrtc_signal');
      socket.off('webrtc_user_joined');
    };
  }, []); // Run once on mount

  useEffect(() => {
    if (!localStream) return;

    const createPeer = (userSocketId: string, initiator: boolean) => {
      const peer = new RTCPeerConnection(configuration);
      
      // Add local stream tracks to peer
      localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
      });

      // Handle incoming streams
      peer.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setRemoteStreams(prev => ({ ...prev, [userSocketId]: remoteStream }));
      };

      // Handle ICE candidates
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_signal', {
            to: userSocketId,
            signal: { type: 'candidate', candidate: event.candidate }
          });
        }
      };

      if (initiator) {
        peer.createOffer().then(offer => {
          peer.setLocalDescription(offer);
          socket.emit('webrtc_signal', {
            to: userSocketId,
            signal: offer
          });
        });
      }

      peersRef.current[userSocketId] = peer;
      return peer;
    };

    // When a new user joins, WE create the offer (if we are already in the call)
    socket.on('webrtc_user_joined', ({ socketId }) => {
      if (socketId !== socket.id && !peersRef.current[socketId]) {
        createPeer(socketId, true);
      }
    });

    // Handle incoming signals
    socket.on('webrtc_signal', async ({ from, signal }) => {
      let peer = peersRef.current[from];
      
      // If we receive an offer from someone we haven't created a peer for
      if (!peer && signal.type === 'offer') {
        peer = createPeer(from, false);
      }

      if (!peer) return;

      if (signal.type === 'offer') {
        await peer.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit('webrtc_signal', { to: from, signal: answer });
      } else if (signal.type === 'answer') {
        await peer.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.type === 'candidate') {
        await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    });

    // Cleanup listeners
    return () => {
      socket.off('webrtc_user_joined');
      socket.off('webrtc_signal');
    };
  }, [localStream]);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !isMicOn;
      setIsMicOn(!isMicOn);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = !isVideoOn;
      setIsVideoOn(!isVideoOn);
    }
  };

  return (
    <motion.div 
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="absolute top-20 right-8 z-50 bg-[#1e1e1e] border border-gray-700 shadow-2xl rounded-xl overflow-hidden flex flex-col w-72 cursor-move"
    >
      <div className="bg-[#252526] p-2 flex justify-between items-center border-b border-gray-700">
        <span className="text-xs font-bold text-gray-300">Video Call ({Object.keys(remoteStreams).length + 1})</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white rounded-md p-1 hover:bg-red-500/20">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-2 flex flex-col gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {/* Local Video */}
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover ${!isVideoOn ? 'hidden' : ''}`} 
          />
          {!isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-400 text-xs">
              Camera Off
            </div>
          )}
          <div className="absolute bottom-1 left-1 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white">
            You {!isMicOn && '(Muted)'}
          </div>
        </div>

        {/* Remote Videos */}
        {Object.entries(remoteStreams).map(([socketId, stream]) => (
          <RemoteVideo key={socketId} stream={stream} socketId={socketId} />
        ))}
      </div>

      <div className="bg-[#252526] p-3 flex justify-center gap-4 border-t border-gray-700">
        <button 
          onClick={toggleMic}
          className={`p-3 rounded-full shadow-md transition-colors ${isMicOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
        >
          {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button 
          onClick={toggleVideo}
          className={`p-3 rounded-full shadow-md transition-colors ${isVideoOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
        >
          {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
      </div>
    </motion.div>
  );
}

// Helper component for remote video to handle refs correctly
function RemoteVideo({ stream, socketId }: { stream: MediaStream, socketId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover" 
      />
      <div className="absolute bottom-1 left-1 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white">
        Peer
      </div>
    </div>
  );
}
