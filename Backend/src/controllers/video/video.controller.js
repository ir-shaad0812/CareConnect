// ============================================
// VIDEO CALL CONTROLLER
// WebRTC-based audio/video call endpoints.
// Stream.io has been removed; all signaling
// happens over Socket.IO. This controller
// returns ICE server config and call metadata.
// ============================================

import webrtcService from '../../services/webrtc.service.js';
import chatAccessService from '../../services/chatAccess.service.js';
import { ApiResponse, asyncHandler } from '../../utils/apiResponse.js';

/**
 * GET /api/video/config
 * Returns WebRTC ICE server configuration.
 */
export const getConfig = asyncHandler(async (req, res) => {
  const config = webrtcService.getWebRTCConfig();
  res.status(200).json(
    ApiResponse.success(
      { ...config, provider: 'webrtc' },
      'WebRTC configuration retrieved',
    ),
  );
});

/**
 * GET /api/video/status
 * Health check for the call subsystem.
 */
export const getStatus = asyncHandler(async (req, res) => {
  const status = webrtcService.getStatus();
  res.status(200).json(ApiResponse.success(status, 'WebRTC status retrieved'));
});

/**
 * POST /api/video/call/init
 * Validate that the caller may start a call in the given conversation and
 * return the call ID + ICE config so the frontend can begin the WebRTC
 * handshake via Socket.IO signaling.
 *
 * Body: { conversationId, callType }
 */
export const initializeCall = asyncHandler(async (req, res) => {
  const { conversationId, callType = 'video', recipientId } = req.body;
  const userId = req.user._id;

  if (!conversationId) {
    return res
      .status(400)
      .json(ApiResponse.error('conversationId is required'));
  }

  const access = await chatAccessService.canMakeCall(conversationId, userId);
  if (!access.canCall) {
    return res.status(403).json(ApiResponse.error(access.error || 'Call is not allowed'));
  }

  const callId = webrtcService.generateCallId(conversationId, callType);

  return res.status(200).json(
    ApiResponse.success(
      {
        callId,
        callType,
        conversationId,
        iceConfig: webrtcService.getWebRTCConfig(),
        signaling: 'socket.io',
        callerId: userId.toString(),
      },
      'Call initialised — use Socket.IO for signaling',
    ),
  );
});

/**
 * GET /api/video/call/:callId
 * Return metadata for an in-progress call (e.g., when joining from a deep link).
 */
export const getCallDetails = asyncHandler(async (req, res) => {
  const { callId } = req.params;

  const call = webrtcService.getCall(callId);
  if (!call) {
    // Still return ICE config so the client can attempt to join
    return res.status(200).json(
      ApiResponse.success(
        {
          callId,
          iceConfig: webrtcService.getWebRTCConfig(),
          signaling: 'socket.io',
          active: false,
        },
        'Call not found or already ended',
      ),
    );
  }

  return res.status(200).json(
    ApiResponse.success(
      {
        callId,
        ...call,
        iceConfig: webrtcService.getWebRTCConfig(),
        signaling: 'socket.io',
        active: true,
      },
      'Call details retrieved',
    ),
  );
});

export default { getConfig, getStatus, initializeCall, getCallDetails };
