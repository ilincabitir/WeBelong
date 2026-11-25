import { useEffect, useState } from 'react';
import { App as AntApp, Button, Popconfirm } from 'antd';
import { getErrorMessage } from '../api/client';
import {
  acceptFriendRequest,
  getFriendRequests,
  getFriendStatus,
  sendFriendRequest,
  unfriend,
} from '../api/friends';
import type { FriendStatus } from '../api/friends';

export function FriendButton({ userId }: { userId: number }) {
  const { message } = AntApp.useApp();
  const [status, setStatus] = useState<FriendStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus(null);

    getFriendStatus(userId)
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch(() => {
        if (active) setStatus('NONE');
      });

    return () => {
      active = false;
    };
  }, [userId]);

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    try {
      await action();
      message.success(success);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (status === null) {
    return <Button loading>Add friend</Button>;
  }

  if (status === 'FRIENDS') {
    return (
      <Popconfirm
        title="Remove this friend?"
        okText="Remove"
        onConfirm={() =>
          void run(async () => {
            await unfriend(userId);
            setStatus('NONE');
          }, 'Friend removed')
        }
      >
        <Button danger loading={busy}>
          Unfriend
        </Button>
      </Popconfirm>
    );
  }

  if (status === 'OUTGOING') {
    return <Button disabled>Request sent</Button>;
  }

  if (status === 'INCOMING') {
    return (
      <Button
        type="primary"
        loading={busy}
        onClick={() =>
          void run(async () => {
            const { incoming } = await getFriendRequests();
            const request = incoming.find((item) => item.user.id === userId);
            if (!request) throw new Error('Request not found');
            await acceptFriendRequest(request.id);
            setStatus('FRIENDS');
          }, 'Friend request accepted')
        }
      >
        Accept request
      </Button>
    );
  }

  return (
    <Button
      type="primary"
      loading={busy}
      onClick={() =>
        void run(async () => {
          await sendFriendRequest(userId);
          setStatus('OUTGOING');
        }, 'Friend request sent')
      }
    >
      Add friend
    </Button>
  );
}