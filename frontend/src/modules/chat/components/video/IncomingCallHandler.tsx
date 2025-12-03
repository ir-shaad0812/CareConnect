// ============================================
// INCOMING CALL HANDLER — WebRTC Implementation
// Renders the IncomingCallModal when the
// VideoCallProvider receives a webrtc:call_offer.
// ============================================

"use client";

import { useState, useCallback } from "react";
import { useVideoCall } from "./VideoCallProvider";
import { IncomingCallModal } from "./IncomingCallModal";
import VideoCallModal from "./VideoCallModal";

export function IncomingCallHandler() {
  const { state, acceptCall, declineCall, endCall } = useVideoCall();
  const [callModalOpen, setCallModalOpen] = useState(false);

  const handleAccept = useCallback(async () => {
    await acceptCall();
    setCallModalOpen(true);
  }, [acceptCall]);

  const handleDecline = useCallback(() => {
    declineCall();
  }, [declineCall]);

  const handleCloseCallModal = useCallback(() => {
    endCall();
    setCallModalOpen(false);
  }, [endCall]);

  return (
    <>
      {/* Incoming call notification */}
      {state.incomingCall && (
        <IncomingCallModal
          isOpen={true}
          callerName={state.incomingCall.callerName}
          {...(state.incomingCall.callerAvatar !== undefined
            ? { callerAvatar: state.incomingCall.callerAvatar }
            : {})}
          callType={state.incomingCall.callType}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}

      {/* Active call screen */}
      <VideoCallModal
        isOpen={callModalOpen || (state.isInCall && !state.incomingCall)}
        onClose={handleCloseCallModal}
      />
    </>
  );
}

export default IncomingCallHandler;
