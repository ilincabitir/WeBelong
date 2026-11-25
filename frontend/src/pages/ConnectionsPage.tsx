import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  List,
  Popconfirm,
  Space,
  Tabs,
  Typography,
} from 'antd';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  sendFriendRequest,
  unfriend,
} from '../api/friends';
import type { FriendRequests, FriendStatus } from '../api/friends';
import { searchUsers } from '../api/users';
import type { PublicUser } from '../api/users';
import './ConnectionsPage.css';

function PersonIdentity({ user }: { user: PublicUser }) {
  return (
    <Link to={`/profile/${user.id}`} className="connection-identity">
      <Avatar
        src={user.avatarUrl ?? undefined}
        style={{ background: user.themeColor }}
      >
        {user.displayName?.[0]?.toUpperCase()}
      </Avatar>
      <div>
        <Typography.Text strong>{user.displayName}</Typography.Text>
        <Typography.Text type="secondary" className="connection-username">
          @{user.username}
        </Typography.Text>
      </div>
    </Link>
  );
}

export function ConnectionsPage() {
  const { message } = AntApp.useApp();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);

  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<FriendRequests>({
    incoming: [],
    outgoing: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([getFriends(), getFriendRequests()])
      .then(([friendList, requestList]) => {
        if (!active) return;
        setFriends(friendList);
        setRequests(requestList);
      })
      .catch((e) => {
        if (active) setError(getErrorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      searchUsers(q)
        .then((users) => {
          if (active) setResults(users);
        })
        .catch((e) => {
          if (active) setError(getErrorMessage(e));
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const statusByUser = useMemo(() => {
    const map = new Map<number, { status: FriendStatus; requestId?: number }>();
    friends.forEach((user) => map.set(user.id, { status: 'FRIENDS' }));
    requests.outgoing.forEach((request) =>
      map.set(request.user.id, { status: 'OUTGOING', requestId: request.id }),
    );
    requests.incoming.forEach((request) =>
      map.set(request.user.id, { status: 'INCOMING', requestId: request.id }),
    );
    return map;
  }, [friends, requests]);

  async function addFriend(user: PublicUser) {
    setBusyId(user.id);
    try {
      const created = await sendFriendRequest(user.id);
      setRequests((prev) => ({
        ...prev,
        outgoing: [created, ...prev.outgoing],
      }));
      message.success(`Request sent to ${user.displayName}`);
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function acceptRequest(requestId: number, user: PublicUser) {
    setBusyId(user.id);
    try {
      const accepted = await acceptFriendRequest(requestId);
      setRequests((prev) => ({
        ...prev,
        incoming: prev.incoming.filter((item) => item.id !== requestId),
      }));
      setFriends((prev) => [...prev.filter((f) => f.id !== user.id), accepted.user]);
      message.success(`You and ${user.displayName} are now friends`);
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function declineRequest(requestId: number, user: PublicUser) {
    setBusyId(user.id);
    try {
      await declineFriendRequest(requestId);
      setRequests((prev) => ({
        ...prev,
        incoming: prev.incoming.filter((item) => item.id !== requestId),
      }));
      message.success('Request declined');
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function removeFriend(user: PublicUser) {
    setBusyId(user.id);
    try {
      await unfriend(user.id);
      setFriends((prev) => prev.filter((f) => f.id !== user.id));
      message.success('Friend removed');
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  const searchPanel = (
    <div>
      <div className="connections-toolbar">
        <Input.Search
          placeholder="Search by name or @username"
          allowClear
          value={query}
          loading={searching}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <List
        className="connections-list"
        dataSource={results}
        locale={{
          emptyText: query.trim()
            ? 'No people found'
            : 'Start typing to find people',
        }}
        renderItem={(user) => {
          const entry = statusByUser.get(user.id);
          const status = entry?.status ?? 'NONE';
          const requestId = entry?.requestId;
          const busy = busyId === user.id;

          return (
            <List.Item>
              <div className="connection-row">
                <PersonIdentity user={user} />
                <div className="connection-actions">
                  {status === 'FRIENDS' && (
                    <Popconfirm
                      title="Remove this friend?"
                      okText="Remove"
                      onConfirm={() => void removeFriend(user)}
                    >
                      <Button danger loading={busy}>
                        Unfriend
                      </Button>
                    </Popconfirm>
                  )}
                  {status === 'OUTGOING' && <Button disabled>Request sent</Button>}
                  {status === 'INCOMING' && requestId !== undefined && (
                    <Button
                      type="primary"
                      loading={busy}
                      onClick={() => void acceptRequest(requestId, user)}
                    >
                      Accept
                    </Button>
                  )}
                  {status === 'NONE' && (
                    <Button
                      type="primary"
                      loading={busy}
                      onClick={() => void addFriend(user)}
                    >
                      Add friend
                    </Button>
                  )}
                </div>
              </div>
            </List.Item>
          );
        }}
      />
    </div>
  );

  const friendsPanel = (
    <List
      className="connections-list"
      loading={loading}
      dataSource={friends}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No friends yet — find people to add."
          />
        ),
      }}
      renderItem={(user) => (
        <List.Item>
          <div className="connection-row">
            <PersonIdentity user={user} />
            <Popconfirm
              title="Remove this friend?"
              okText="Remove"
              onConfirm={() => void removeFriend(user)}
            >
              <Button danger loading={busyId === user.id}>
                Unfriend
              </Button>
            </Popconfirm>
          </div>
        </List.Item>
      )}
    />
  );

  const requestsPanel = (
    <div className="requests-panel">
      <Typography.Title level={5}>Incoming</Typography.Title>

      {requests.incoming.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No incoming requests"
        />
      ) : (
        <List
          className="connections-list"
          dataSource={requests.incoming}
          renderItem={(request) => (
            <List.Item>
              <div className="connection-row">
                <PersonIdentity user={request.user} />
                <Space>
                  <Button
                    type="primary"
                    loading={busyId === request.user.id}
                    onClick={() => void acceptRequest(request.id, request.user)}
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() => void declineRequest(request.id, request.user)}
                  >
                    Decline
                  </Button>
                </Space>
              </div>
            </List.Item>
          )}
        />
      )}

      <Typography.Title level={5} className="requests-subtitle">
        Sent
      </Typography.Title>

      {requests.outgoing.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No pending requests"
        />
      ) : (
        <List
          className="connections-list"
          dataSource={requests.outgoing}
          renderItem={(request) => (
            <List.Item>
              <div className="connection-row">
                <PersonIdentity user={request.user} />
                <Typography.Text type="secondary">Pending</Typography.Text>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Card className="connections-card">
      {error && (
        <Alert
          className="connections-alert"
          type="error"
          showIcon
          message={error}
        />
      )}

      <Tabs
        className="connections-tabs"
        items={[
          { key: 'search', label: 'Find people', children: searchPanel },
          {
            key: 'friends',
            label: `Friends (${friends.length})`,
            children: friendsPanel,
          },
          {
            key: 'requests',
            label: (
              <Badge count={requests.incoming.length} size="small" offset={[8, 0]}>
                Requests
              </Badge>
            ),
            children: requestsPanel,
          },
        ]}
      />
    </Card>
  );
}