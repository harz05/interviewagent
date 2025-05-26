const { WebhookReceiver } = require('livekit-server-sdk');
const config = require('../config');
const logger = require('../utils/logger');
// const { processUserAudioTrack } = require('../services/livekitAudioService'); // This was for the old STT approach
// const { ensureAIConnected, disconnectAI } = require('../services/aiParticipantService'); // aiParticipantService will be removed
const {
  cleanupRoomResources,
  startUserAudioEgress, // New function to start egress
  stopUserAudioEgress // New function to stop egress
} = require('../services/livekitAudioService');


// Initialize the WebhookReceiver with your LiveKit API key and secret
const receiver = new WebhookReceiver(config.livekit.apiKey, config.livekit.apiSecret);

exports.handleLivekitWebhook = async (req, res) => {
  try {
    // The Egress service posts a JSON body.
    // For other webhooks, LiveKit posts an Authorization header and an empty body.
    // The receiver verifies the signature and decodes the payload.
    // req.rawBody is needed for the receiver to verify the signature
    const event = receiver.receive(req.rawBody, req.get('Authorization'));

    logger.info('Received LiveKit Webhook:', { eventName: event.event, eventId: event.id });

    // Handle specific events
    switch (event.event) {
      case 'track_published':
        // A track was published by a participant
        logger.info('Track Published:', {
          participantIdentity: event.participant?.identity,
          participantName: event.participant?.name,
          trackSid: event.track?.sid,
          trackType: event.track?.type,
          trackSource: event.track?.source,
          roomName: event.room?.name,
        });

        // We are interested in the user's microphone audio track.
        // We need to distinguish the user from the AI participant.
        if (
          event.track?.type === 'audio' &&
          event.track?.source === 'microphone' && // Or 'camera' if it's mixed audio from camera mic
          event.participant?.identity !== config.aiParticipant.identity // Not the AI itself
        ) {
          logger.info(`User audio track published: ${event.track.sid} by ${event.participant.identity} in room ${event.room.name}. Triggering Egress for STT.`);
          // Start Egress for this user's audio track
          startUserAudioEgress(event.room.name, event.participant.identity, event.track.sid)
            .catch(err => logger.error(`[Webhook] Error starting Egress for track ${event.track.sid}:`, err));
        }
        break;
      
      case 'track_unpublished':
        // A track was unpublished
        logger.info('Track Unpublished:', {
          participantIdentity: event.participant?.identity,
          trackSid: event.track?.sid,
          roomName: event.room?.name,
        });
        if (
          event.track?.type === 'audio' &&
          event.track?.source === 'microphone' &&
          event.participant?.identity !== config.aiParticipant.identity
        ) {
          logger.info(`User audio track unpublished: ${event.track.sid}. Stopping Egress if any.`);
          // Stop Egress for this track
          stopUserAudioEgress(event.room.name, event.participant.identity, event.track.sid)
            .catch(err => logger.error(`[Webhook] Error stopping Egress for track ${event.track.sid}:`, err));
        }
        break;

      case 'participant_joined':
        logger.info('Participant Joined:', {
          identity: event.participant?.identity,
          name: event.participant?.name,
          roomName: event.room?.name,
        });
        // AI connection is no longer managed by aiParticipantService.
        // The server itself acts as the "AI" via Server SDK.
        break;

      case 'participant_left':
        logger.info('Participant Left:', {
          identity: event.participant?.identity,
          name: event.participant?.name,
          roomName: event.room?.name,
        });
        // If a user leaves, stop their audio egress
        if (event.participant?.identity !== config.aiParticipant.identity && event.room?.name) {
          logger.info(`User ${event.participant.identity} left room ${event.room.name}. Stopping any active Egress for them.`);
          // We might not have track SID here, so stop all egress for this participant in this room.
          // The stopUserAudioEgress function will need to handle this, perhaps by listing egresses.
          // For simplicity, we might rely on room_finished or a more specific egress management.
          // Or, if we store egress IDs, we can stop them.
          // For now, let's assume stopUserAudioEgress can find egress by participant identity if track SID is unknown.
          stopUserAudioEgress(event.room.name, event.participant.identity, null /* trackSid unknown */)
            .catch(err => logger.error(`[Webhook] Error stopping Egress for participant ${event.participant.identity} in room ${event.room.name}:`, err));
        }
        break;

      case 'room_finished':
        logger.info('Room Finished:', { roomName: event.room?.name });
        if (event.room?.name) {
          await cleanupRoomResources(event.room.name); // This should also handle stopping all egresses for the room.
        }
        break;
      
      // Add more event handlers as needed
      // case 'recording_started':
      // case 'recording_finished':
      // case 'egress_started':
      // case 'egress_ended':

      default:
        logger.info(`Unhandled LiveKit event: ${event.event}`);
    }

    res.status(200).send('Webhook received successfully');
  } catch (error) {
    logger.error('Error handling LiveKit webhook:', error);
    // The receiver throws an error if the signature is invalid
    if (error.message === 'invalid signature') {
      res.status(400).send('Invalid webhook signature');
    } else {
      res.status(500).send('Internal server error');
    }
  }
};