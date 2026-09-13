export type Message = { id: string; text: string };

export type Events = {
  "message.created": {
    channel: `rooms:${string}`;
    payload: Message;
  };
  "presence.changed": {
    channel: `rooms:${string}`;
    payload: { online: number };
  };
};
