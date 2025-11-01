import React, { useEffect, useState } from 'react';
import { connect, createLocalVideoTrack } from 'twilio-video';

const VideoCall = ({ userId, room }) => {
    const [localVideoTrack, setLocalVideoTrack] = useState(null);
    const [remoteParticipants, setRemoteParticipants] = useState([]);

    useEffect(() => {
        const fetchToken = async () => {
            const response = await fetch('/api/twilio/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, room }),
            });
            const data = await response.json();
            connectToRoom(data.token);
        };

        const connectToRoom = async (token) => {
            const localTrack = await createLocalVideoTrack();
            setLocalVideoTrack(localTrack);

            const room = await connect(token, { name: room, tracks: [localTrack] });
            room.on('participantConnected', participant => {
                setRemoteParticipants(prev => [...prev, participant]);
            });
        };

        fetchToken();

        return () => {
            // Cleanup logic if needed
            if (localVideoTrack) {
                localVideoTrack.stop(); // Stop the local video track on cleanup
            }
        };
    }, [userId, room]);

    return (
        <div>
            <div>
                {localVideoTrack && <div ref={ref => localVideoTrack.attach(ref)} />}
            </div>
            <div>
                {remoteParticipants.map(participant => (
                    <div key={participant.sid}>{participant.identity}</div>
                ))}
            </div>
        </div>
    );
};

export default VideoCall;
